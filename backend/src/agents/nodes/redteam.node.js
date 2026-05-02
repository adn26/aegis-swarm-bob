import fs from 'fs/promises';
import path from 'path';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addVulnerability, addMessage, moveToNextFile } from '../graph/state.js';

/**
 * Red Team Analysis Node
 * Analyzes code for security vulnerabilities using AI
 */
export const redTeamAnalysisNode = async (state) => {
  try {
    // Check if we have a file to analyze
    if (!state.currentFile) {
      logger.info('No more files to analyze');
      return {
        ...state,
        currentStep: 'analysis_complete',
      };
    }

    const file = state.currentFile;
    logger.info(`Red Team analyzing: ${file.path}`);

    // Send SSE event
    sseService.sendRedTeamAnalyzing(state.auditId, {
      message: `Analyzing ${file.path}`,
      filePath: file.path,
      fileIndex: state.currentFileIndex + 1,
      totalFiles: state.files.length,
    });

    // Read file content
    const filePath = path.join(state.workspacePath, file.path);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Get Red Team AI model
    const model = getLangChainModel('redteam');

    // Create analysis prompt
    const prompt = createRedTeamPrompt(file.path, fileContent, file.language);

    // Analyze with AI
    const response = await model.invoke([
      { role: 'user', content: prompt }
    ]);

    // Parse vulnerabilities from response
    const vulnerabilities = parseVulnerabilities(response.content, file.path);

    logger.info(`Found ${vulnerabilities.length} vulnerabilities in ${file.path}`);

    // Store vulnerabilities in database and state
    let updatedState = state;
    
    for (const vuln of vulnerabilities) {
      // Save to database
      await storageService.createVulnerability({
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

      // Add to state
      updatedState = addVulnerability(updatedState, vuln);

      // Send SSE event for each vulnerability
      sseService.sendVulnerabilityFound(state.auditId, vuln);
    }

    // Update scanned file record
    await storageService.updateAudit(state.auditId, {
      scannedFiles: state.currentFileIndex + 1,
      totalVulnerabilities: updatedState.stats.totalVulnerabilities,
      criticalCount: updatedState.stats.criticalCount,
      highCount: updatedState.stats.highCount,
      mediumCount: updatedState.stats.mediumCount,
      lowCount: updatedState.stats.lowCount,
    });

    // If no vulnerabilities, move to next file
    if (vulnerabilities.length === 0) {
      updatedState = moveToNextFile(updatedState);
    }

    return addMessage(updatedState, {
      role: 'redteam',
      content: `Analyzed ${file.path}: Found ${vulnerabilities.length} vulnerabilities`,
      step: 'redteam_analysis',
      vulnerabilities: vulnerabilities.length,
    });

  } catch (error) {
    logger.error('Red Team analysis failed:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Red Team analysis failed',
      error: error.message,
      file: state.currentFile?.path,
    });

    // Move to next file on error
    const updatedState = moveToNextFile(state);

    return addMessage(updatedState, {
      role: 'system',
      content: `Analysis failed for ${state.currentFile?.path}: ${error.message}`,
      step: 'redteam_analysis_error',
    });
  }
};

/**
 * Create Red Team analysis prompt
 */
const createRedTeamPrompt = (filePath, fileContent, language) => {
  return `You are a Red Team security expert analyzing code for vulnerabilities.

**File**: ${filePath}
**Language**: ${language}

**Code**:
\`\`\`${language}
${fileContent}
\`\`\`

**Task**: Analyze this code for security vulnerabilities. Focus on:

**Traditional Vulnerabilities**:
- SQL Injection
- Cross-Site Scripting (XSS)
- CSRF
- Authentication/Authorization issues
- Path Traversal
- Insecure Dependencies
- Hardcoded Secrets
- Command Injection
- Insecure Deserialization

**AI-Specific Vulnerabilities**:
- Prompt Injection (user input in LLM prompts)
- Insecure LLM Configuration (exposed API keys, missing rate limits)
- Data Leakage (PII sent to LLM context)
- Model DoS (no token limits or cost controls)
- Insecure Output Handling (LLM output executed without validation)
- Training Data Poisoning (unvalidated data in RAG/vector stores)

**Response Format** (JSON array):
\`\`\`json
[
  {
    "type": "SQL Injection",
    "severity": "Critical|High|Medium|Low",
    "lineNumber": 42,
    "lineEnd": 45,
    "description": "Detailed description of the vulnerability",
    "exploitCode": "Example exploit code (optional)",
    "isAiRelated": false,
    "owaspCategory": "A03:2021 - Injection",
    "cweId": "CWE-89",
    "cvssScore": 9.8,
    "category": "Injection"
  }
]
\`\`\`

If no vulnerabilities are found, return an empty array: \`[]\`

Analyze thoroughly and provide actionable findings.`;
};

/**
 * Parse vulnerabilities from AI response
 */
const parseVulnerabilities = (response, filePath) => {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try to parse the entire response as JSON
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.map(v => ({ ...v, filePath })) : [];
    }

    const vulnerabilities = JSON.parse(jsonMatch[1]);
    
    // Add filePath to each vulnerability
    return vulnerabilities.map(vuln => ({
      ...vuln,
      filePath,
    }));

  } catch (error) {
    logger.error('Failed to parse vulnerabilities:', error);
    return [];
  }
};

export default redTeamAnalysisNode;

// Made with Bob