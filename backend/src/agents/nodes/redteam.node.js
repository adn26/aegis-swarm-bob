import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addVulnerability, addMessage, moveToNextFile } from '../graph/state.js';

// Hard limits 
const MAX_FILE_SIZE_KB = 40;
const MAX_VULNS_PER_FILE = 10;
const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

// Files that should never be analyzed
const SKIP_PATTERNS = [
  /node_modules/,
  /[/\\]vendor[/\\]/,
  /\.min\.(js|css)$/,
  /bootstrap/i,
  /jquery/i,
  /raphael/i,
  /html5shiv/i,
  /morris/i,
  /assets[/\\](vendor|lib|plugins)/i,
  /assets[/\\]js[/\\]tour/i,
  /\.map$/,
  /\.lock$/,
  /package-lock/,
];

const shouldSkipFile = (filePath) =>
  SKIP_PATTERNS.some((p) => p.test(filePath));

// Main node 
export const redTeamAnalysisNode = async (state) => {
  try {
    if (!state.currentFile) {
      logger.info('No more files to analyze');
      return { ...state, currentStep: 'analysis_complete' };
    }

    const file = state.currentFile;

    // Skip vendor / noisy files
    if (shouldSkipFile(file.path)) {
      logger.info(`Skipping (pattern match): ${file.path}`);
      return addMessage(moveToNextFile(state), {
        role: 'system',
        content: `Skipped ${file.path}: excluded by pattern`,
        step: 'redteam_skip',
      });
    }

    logger.info(`Red Team analyzing: ${file.path}`);

    sseService.sendRedTeamAnalyzing(state.auditId, {
      message: `Analyzing ${file.path}`,
      filePath: file.path,
      fileIndex: state.currentFileIndex + 1,
      totalFiles: state.files.length,
    });

    // Read & size-check file
    const filePath = path.join(state.workspacePath, file.path);
    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (readErr) {
      logger.warn(`Cannot read ${file.path}: ${readErr.message}`);
      return addMessage(moveToNextFile(state), {
        role: 'system',
        content: `Skipped ${file.path}: unreadable`,
        step: 'redteam_skip',
      });
    }

    const fileSizeKB = Buffer.byteLength(fileContent, 'utf-8') / 1024;
    if (fileSizeKB > MAX_FILE_SIZE_KB) {
      logger.info(`Skipping ${file.path} — too large (${fileSizeKB.toFixed(1)} KB)`);
      return addMessage(moveToNextFile(state), {
        role: 'system',
        content: `Skipped ${file.path}: too large (${fileSizeKB.toFixed(1)} KB)`,
        step: 'redteam_skip',
      });
    }

    // Truncate content sent to model to keep prompt tight
    const contentForModel = fileContent.slice(0, 8000);

    // AI call
    const model = getLangChainModel('redteam');
    const prompt = createRedTeamPrompt(file.path, contentForModel, file.language);

    let rawContent;
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = await model.invoke([
        new SystemMessage(
          'You are a security auditor. You MUST respond with ONLY a valid JSON array. ' +
          'No explanation, no markdown outside the array, no prose. ' +
          'If there are no vulnerabilities, respond with exactly: []'
        ),
        new HumanMessage(prompt),
      ]);
      rawContent = response.content;
    } catch (aiErr) {
      logger.error(`AI call failed for ${file.path}: ${aiErr.message}`);
      return addMessage(moveToNextFile(state), {
        role: 'system',
        content: `Analysis failed for ${file.path}: ${aiErr.message}`,
        step: 'redteam_error',
      });
    }

    // Parse & strictly validate
    const vulnerabilities = parseAndValidate(rawContent, file.path);
    logger.info(`Found ${vulnerabilities.length} vulnerabilities in ${file.path}`);

    // Persist
    let updatedState = state;
    for (const vuln of vulnerabilities) {
      let dbVuln;
      try {
        dbVuln = await storageService.createVulnerability({
          auditId: state.auditId,
          filePath: vuln.filePath,
          lineNumber: vuln.lineNumber,
          lineEnd: vuln.lineEnd,
          type: vuln.type,
          category: vuln.category,
          severity: vuln.severity,
          description: vuln.description,
          exploitCode: vuln.exploitCode,
          isAiRelated: vuln.isAiRelated,
          owaspCategory: vuln.owaspCategory,
          cweId: vuln.cweId,
          cvssScore: vuln.cvssScore,
        });
      } catch (dbErr) {
        logger.warn(`Failed to save vuln in ${vuln.filePath}: ${dbErr.message}`);
        continue;
      }

      updatedState = addVulnerability(updatedState, {
        ...vuln,
        id: dbVuln.id,
      });
      sseService.sendVulnerabilityFound(state.auditId, { ...vuln, id: dbVuln.id });
    }

    await storageService.updateAudit(state.auditId, {
      scannedFiles: state.currentFileIndex + 1,
      totalVulnerabilities: updatedState.stats.totalVulnerabilities,
      criticalCount: updatedState.stats.criticalCount,
      highCount: updatedState.stats.highCount,
      mediumCount: updatedState.stats.mediumCount,
      lowCount: updatedState.stats.lowCount,
    });

    updatedState = { ...updatedState, currentStep: 'redteam_complete' };

    return addMessage(updatedState, {
      role: 'redteam',
      content: `Analyzed ${file.path}: Found ${vulnerabilities.length} vulnerabilities`,
      step: 'redteam_analysis',
      vulnerabilities: vulnerabilities.length,
    });

  } catch (error) {
    logger.error('Red Team analysis failed:', error);

    sseService.sendError(state.auditId, {
      message: 'Red Team analysis failed',
      error: error.message,
      file: state.currentFile?.path,
    });

    return addMessage(moveToNextFile(state), {
      role: 'system',
      content: `Analysis failed for ${state.currentFile?.path}: ${error.message}`,
      step: 'redteam_analysis_error',
    });
  }
};

// Prompt
const createRedTeamPrompt = (filePath, fileContent, language) => {
  return `Analyze this ${language} file for security vulnerabilities.

File: ${filePath}

\`\`\`${language}
${fileContent}
\`\`\`

Return ONLY a JSON array (max ${MAX_VULNS_PER_FILE} items). Each item must have exactly these fields:
{
  "type": string,
  "severity": "Critical" | "High" | "Medium" | "Low",
  "lineNumber": number,
  "lineEnd": number,
  "description": string (max 200 chars),
  "exploitCode": string or null,
  "isAiRelated": boolean,
  "owaspCategory": string,
  "cweId": string,
  "cvssScore": number (0-10),
  "category": string
}

Focus on: SQL Injection, XSS, CSRF, Path Traversal, Hardcoded Secrets, Command Injection, Auth issues, Prompt Injection.
If no real vulnerabilities exist, return [].`;
};

// Parser with strict validation 
const parseAndValidate = (raw, filePath) => {
  try {
    if (!raw || typeof raw !== 'string') return [];

    // Extract JSON array — try fenced block first, then bare array
    let jsonStr = null;

    const fenced = raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (fenced) {
      jsonStr = fenced[1];
    } else {
      const bare = raw.match(/(\[[\s\S]*\])/);
      if (bare) jsonStr = bare[1];
    }

    if (!jsonStr) {
      logger.warn('No JSON array found in AI response, treating as no vulns');
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.warn('JSON parse failed, treating as no vulns');
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    // Validate & sanitize each item — drop anything malformed
    const valid = parsed
      .filter((v) => {
        if (typeof v !== 'object' || v === null) return false;
        if (!v.type || typeof v.type !== 'string') return false;
        if (!VALID_SEVERITIES.includes(v.severity)) return false;
        if (typeof v.lineNumber !== 'number' || v.lineNumber < 1) return false;
        if (!v.description || typeof v.description !== 'string') return false;
        return true;
      })
      .map((v) => ({
        filePath,
        type: String(v.type).slice(0, 100),
        severity: v.severity,
        lineNumber: Math.floor(v.lineNumber),
        lineEnd: typeof v.lineEnd === 'number' ? Math.floor(v.lineEnd) : Math.floor(v.lineNumber),
        description: String(v.description).slice(0, 500),
        exploitCode: v.exploitCode ? String(v.exploitCode).slice(0, 1000) : null,
        isAiRelated: Boolean(v.isAiRelated),
        owaspCategory: v.owaspCategory ? String(v.owaspCategory).slice(0, 100) : 'Unknown',
        cweId: v.cweId ? String(v.cweId).slice(0, 20) : 'CWE-000',
        cvssScore: typeof v.cvssScore === 'number'
          ? Math.min(10, Math.max(0, v.cvssScore))
          : 5.0,
        category: v.category ? String(v.category).slice(0, 100) : v.type,
      }))
      .slice(0, MAX_VULNS_PER_FILE); // Hard cap AFTER validation

    logger.info(`Validated ${valid.length} / ${parsed.length} raw findings in ${filePath}`);
    return valid;

  } catch (err) {
    logger.error('parseAndValidate crashed:', err);
    return [];
  }
};

export default redTeamAnalysisNode;

// Made with Bob