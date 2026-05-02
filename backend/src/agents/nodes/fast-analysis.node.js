import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { robustParseJSON } from '../../utils/json.js';
import { addVulnerability, addMessage } from '../graph/state.js';

/**
 * Fast Analysis Node
 * Uses a search-based approach to identify suspicious files and focus analysis
 */
export const fastAnalysisNode = async (state) => {
  try {
    logger.info(`Starting Fast Analysis for audit: ${state.auditId}`);
    
    sseService.sendProgress(state.auditId, {
      message: 'Identifying high-risk files for targeted analysis...',
      step: 'fast_analysis',
    });

    const model = getLangChainModel('redteam');
    
    // 1. Get file list overview
    const fileList = state.files.map(f => f.path).join('\n');
    
    // 2. Ask AI to identify high-risk files based on names and extensions
    const identifyPrompt = `You are a security expert. Given the following list of files in a repository, identify the TOP 10-15 files that are MOST LIKELY to contain security vulnerabilities (e.g., authentication, database queries, API endpoints, sensitive data handling).
    
PRIORITIZATION RULES:
1. Always prioritize files in 'app/data/', 'app/routes/', or 'server.js' if they exist.
2. Specifically look for files like 'user-dao.js', 'contributions.js', or 'allocations-dao.js'.
3. Focus on custom business logic rather than configuration or assets.

Files:
${fileList}

Return ONLY a JSON array of file paths.`;

    const identifyResponse = await model.invoke([
      new SystemMessage('You are a security auditor. Respond with ONLY a valid JSON array.'),
      new HumanMessage(identifyPrompt),
    ]);

    const highRiskFiles = robustParseJSON(identifyResponse.content, []);
    logger.info(`AI identified ${highRiskFiles.length} high-risk files`);

    // 3. Filter state files to prioritize these
    const prioritizedFiles = state.files.filter(f => highRiskFiles.includes(f.path));
    const otherFiles = state.files.filter(f => !highRiskFiles.includes(f.path));
    
    // Reorder files: prioritized first
    const reorderedFiles = [...prioritizedFiles, ...otherFiles];

    // 4. Send targeted search queries to find common patterns across ALL files
    // This is the "Cline-like" search approach
    const searchPatterns = [
      'process.env', 'eval(', 'child_process', 'exec(', 'spawn(', 
      'password', 'secret', 'key', 'token',
      'SELECT', 'INSERT', 'UPDATE', 'DELETE',
      'req.body', 'req.query', 'req.params',
      'dangerouslySetInnerHTML', 'innerHTML'
    ];

    sseService.sendProgress(state.auditId, {
      message: `Performing targeted pattern search across ${state.files.length} files...`,
      step: 'pattern_search',
    });

    const suspiciousFilesFromSearch = new Set();
    
    for (const file of state.files) {
      const filePath = path.join(state.workspacePath, file.path);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        for (const pattern of searchPatterns) {
          if (content.includes(pattern)) {
            suspiciousFilesFromSearch.add(file.path);
            break;
          }
        }
      } catch (e) {
        // Skip unreadable
      }
    }

    logger.info(`Pattern search found ${suspiciousFilesFromSearch.size} suspicious files`);

    // Combine and deduplicate
    const finalPrioritizedPaths = new Set([...highRiskFiles, ...suspiciousFilesFromSearch]);
    const finalFiles = [
      ...state.files.filter(f => finalPrioritizedPaths.has(f.path)),
      ...state.files.filter(f => !finalPrioritizedPaths.has(f.path))
    ];

    // Mark high priority files in the state
    const filesWithMetadata = finalFiles.map(f => ({
      ...f,
      isHighPriority: finalPrioritizedPaths.has(f.path)
    }));

    return {
      ...state,
      files: filesWithMetadata,
      currentFile: filesWithMetadata[0],
      currentStep: 'fast_analysis_complete'
    };

  } catch (error) {
    logger.error('Fast Analysis failed:', error);
    return { ...state, currentStep: 'fast_analysis_failed' };
  }
};

export default fastAnalysisNode;
