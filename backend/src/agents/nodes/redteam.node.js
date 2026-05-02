import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { robustParseJSON } from '../../utils/json.js';
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
  /pnpm-lock.yaml/,
  /dist[/\\]/,
  /docs[/\\]/,
];

const shouldSkipFile = (filePath, repoUrl = '') => {
  // If analyzing Aegis Swarm itself, skip its internal architecture to avoid "self-audit" noise in demo
  if (repoUrl.includes('aegis-swarm')) {
    const internalPaths = [
      /backend[/\\]src[/\\]agents/,
      /backend[/\\]src[/\\]services/,
      /backend[/\\]src[/\\]utils/,
      /frontend[/\\]src/,
    ];
    if (internalPaths.some((p) => p.test(filePath))) return true;
  }

  return SKIP_PATTERNS.some((p) => p.test(filePath));
};

// Main node 
export const redTeamAnalysisNode = async (state) => {
  try {
    if (!state.currentFile) {
      logger.info('No more files to analyze');
      return { ...state, currentStep: 'analysis_complete' };
    }

    const file = state.currentFile;

    // Fast Path: Only analyze high priority files or if we explicitly want a deep scan
    // In Fast Mode, we might want to skip low-priority files to save time/cost
    if (state.fastMode && !file.isHighPriority) {
      logger.info(`Fast Mode: Skipping low-priority file ${file.path}`);
      return addMessage(state, {
        role: 'system',
        content: `Skipped ${file.path} (Fast Mode)`,
        step: 'redteam_skip',
      });
    }

    // Update status for sequential flow
    if (state.currentStep === 'start_redteam' || state.currentFileIndex === 0) {
       await storageService.updateAudit(state.auditId, { status: 'analyzing' });
    }

    // Skip vendor / noisy files
    if (shouldSkipFile(file.path, state.repoUrl)) {
      logger.info(`Skipping (pattern match): ${file.path}`);
      return addMessage(state, {
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
      return addMessage(state, {
        role: 'system',
        content: `Skipped ${file.path}: unreadable`,
        step: 'redteam_skip',
      });
    }

    const fileSizeKB = Buffer.byteLength(fileContent, 'utf-8') / 1024;
    if (fileSizeKB > MAX_FILE_SIZE_KB) {
      logger.info(`Skipping ${file.path} — too large (${fileSizeKB.toFixed(1)} KB)`);
      return addMessage(state, {
        role: 'system',
        content: `Skipped ${file.path}: too large (${fileSizeKB.toFixed(1)} KB)`,
        step: 'redteam_skip',
      });
    }

    // AI call
    const model = getLangChainModel('redteam');
    const prompt = createRedTeamPrompt(file.path, fileContent.slice(0, 8000), file.language);

    let response;
    try {
      response = await model.invoke([
        new SystemMessage('You are a security auditor. Respond with ONLY a valid JSON array.'),
        new HumanMessage(prompt),
      ]);
    } catch (aiErr) {
      logger.error(`AI call failed for ${file.path}: ${aiErr.message}`);
      return addMessage(state, {
        role: 'system',
        content: `Analysis failed for ${file.path}: ${aiErr.message}`,
        step: 'redteam_error',
      });
    }

    // Parse & strictly validate
    const vulnerabilities = parseAndValidate(response.content, file.path);
    logger.info(`Found ${vulnerabilities.length} vulnerabilities in ${file.path}`);

    // Persist
    let updatedState = state;
    for (const vuln of vulnerabilities) {
      try {
        const dbVuln = await storageService.createVulnerability({
          auditId: state.auditId,
          ...vuln
        });

        updatedState = addVulnerability(updatedState, {
          ...vuln,
          id: dbVuln.id,
        });
        sseService.sendVulnerabilityFound(state.auditId, { ...vuln, id: dbVuln.id });
      } catch (dbErr) {
        logger.warn(`Failed to save vuln in ${vuln.filePath}: ${dbErr.message}`);
      }
    }

    await storageService.updateAudit(state.auditId, {
      scannedFiles: state.currentFileIndex + 1,
      totalVulnerabilities: updatedState.stats.totalVulnerabilities,
      criticalCount: updatedState.stats.criticalCount,
      highCount: updatedState.stats.highCount,
      mediumCount: updatedState.stats.mediumCount,
      lowCount: updatedState.stats.lowCount,
    });

    return addMessage(updatedState, {
      role: 'redteam',
      content: `Analyzed ${file.path}: Found ${vulnerabilities.length} vulnerabilities`,
      step: 'redteam_analysis',
    });

  } catch (error) {
    logger.error('Red Team analysis failed:', error);
    sseService.sendError(state.auditId, {
      message: 'Red Team analysis failed',
      error: error.message,
      file: state.currentFile?.path,
    });
    return addMessage(state, {
      role: 'system',
      content: `Analysis failed: ${error.message}`,
      step: 'redteam_analysis_error',
    });
  }
};

const createRedTeamPrompt = (filePath, fileContent, language) => {
  return `You are a high-end cyber-security auditor performing a deep-dive analysis of a mission-critical application.
Analyze this ${language} file for real-world, actionable security vulnerabilities.

CRITICAL INSTRUCTIONS:
1. BE SPECIFIC: Identify exact lines where the flaw exists.
2. BE REALISTIC: Do not mark everything as 'Critical'. Use a natural distribution of severities.
3. PROVIDE EXPLOITS: For every finding, generate a clear, functional Proof-of-Concept (PoC) exploit code (e.g. JavaScript snippets, curl commands, or script logic).
4. NO GENERIC FINDINGS: Do not report "Missing Input Validation" without explaining exactly WHAT input and WHY it's dangerous in this specific context.
5. NO SELF-AUDIT: Ignore any code that looks like it belongs to the Aegis Swarm analysis platform itself.

**File Context**:
File Path: ${filePath}
Language: ${language}

**Source Code**:
>>>>>>>
\`\`\`${language}
${fileContent}
\`\`\`
<<<<<<<

Return ONLY a JSON array. Each item must have:
{
  "type": "Specific Vulnerability Name (e.g., NoSQL Injection, CSRF)",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "lineNumber": number (The EXACT line where the flaw starts),
  "description": "Detailed technical explanation of the flaw and its impact in THIS file.",
  "exploitCode": "JavaScript/Bash/Curl code that demonstrates the exploit.",
  "cweId": "CWE-XXX",
  "cvssScore": number (0.0 to 10.0)
}
If no vulnerabilities exist, return [].`;
};

const parseAndValidate = (raw, filePath) => {
  try {
    const parsed = robustParseJSON(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => v.type && VALID_SEVERITIES.includes(v.severity) && v.lineNumber)
      .map((v) => ({
        ...v,
        filePath,
        cvssScore: v.cvssScore || 5.0,
        cweId: v.cweId || 'CWE-000',
      }));
  } catch (err) {
    logger.error(`Error parsing vulnerabilities for ${filePath}: ${err.message}`);
    return [];
  }
};

export default redTeamAnalysisNode;
