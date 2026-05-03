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
 * Fast Analysis Node (Architecture Layer 1 - Triage)
 * Refines file priorities and builds the context bundle metadata
 */
export const fastAnalysisNode = async (state) => {
  try {
    logger.info(`Starting Fast Analysis/Triage for audit: ${state.auditId}`);
    
    sseService.sendProgress(state.auditId, {
      message: 'Building context bundle and refining priorities...',
      step: 'fast_analysis',
    });

    // 1. Calculate approximate tokens (heuristic: 1 token ≈ 4 chars)
    // Architecture Target: ~60,000 tokens for code context
    const TOKEN_BUDGET = 60000;
    const CHAR_BUDGET = TOKEN_BUDGET * 4;
    
    let currentChars = 0;
    const contextBundleFiles = [];
    const skippedFromBundle = [];

    // Files are already sorted by priority (1-5) from scanFilesNode
    for (const file of state.files) {
      const fileChars = file.content?.length || 0;
      
      if (currentChars + fileChars <= CHAR_BUDGET) {
        contextBundleFiles.push(file.path);
        currentChars += fileChars;
      } else {
        skippedFromBundle.push(file.path);
      }
    }

    logger.info(`Context bundle: ${contextBundleFiles.length} files, ~${Math.round(currentChars/4)} tokens`);

    // 2. Identify high-risk files via AI (Optional refinement)
    const model = getLangChainModel('redteam');
    const fileList = state.files.slice(0, 100).map(f => `${f.path} (Priority: ${f.priority})`).join('\n');
    
    const identifyPrompt = `You are a security expert. Review the top 100 files (already prioritized 1-5). 
Identify the TOP 15 files that are absolute CRITICAL for understanding the attack surface.

Files:
${fileList}

Return ONLY a JSON array of file paths.`;

    let highRiskFiles = [];
    try {
      const identifyResponse = await model.invoke([
        new SystemMessage('You are a security auditor. Respond with ONLY a valid JSON array.'),
        new HumanMessage(identifyPrompt),
      ]);
      highRiskFiles = robustParseJSON(identifyResponse.content, []);
    } catch (e) {
      logger.warn('AI priority refinement failed, using deterministic priorities');
    }

    // 3. Mark files in state
    const filesWithMetadata = state.files.map(f => ({
      ...f,
      isInContextBundle: contextBundleFiles.includes(f.path),
      isHighPriority: highRiskFiles.includes(f.path) || f.priority <= 2
    }));

    // 4. Send targeted search queries (Architecture layer: "Logic flaw scan")
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

    // Update state with bundle metadata
    return {
      ...state,
      files: filesWithMetadata,
      contextBundleSize: Math.round(currentChars / 4),
      currentStep: 'fast_analysis_complete'
    };

  } catch (error) {
    logger.error('Fast Analysis failed:', error);
    return { ...state, currentStep: 'fast_analysis_failed' };
  }
};

export default fastAnalysisNode;
