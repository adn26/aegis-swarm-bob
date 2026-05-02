import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addPatch, addMessage } from '../graph/state.js';

/**
 * Blue Team Patch Node
 * Generates secure patches for detected vulnerabilities
 */
export const blueTeamPatchNode = async (state) => {
  try {
    const file = state.currentFile;
    
    if (!file) {
      logger.warn('No current file for patching');
      return state;
    }

    // Get vulnerabilities for current file
    const fileVulnerabilities = state.vulnerabilities.filter(
      v => v.filePath === file.path
    );

    if (fileVulnerabilities.length === 0) {
      logger.info(`No vulnerabilities to patch in ${file.path}`);
      return state;
    }

    logger.info(`Blue Team patching ${fileVulnerabilities.length} vulnerabilities in ${file.path}`);

    // Send SSE event
    sseService.sendBlueTeamPatching(state.auditId, {
      message: `Generating patches for ${file.path}`,
      filePath: file.path,
      vulnerabilityCount: fileVulnerabilities.length,
    });

    // Read file content
    const filePath = path.join(state.workspacePath, file.path);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Get Blue Team AI model
    const model = getLangChainModel('blueteam');

    // Generate patches for all vulnerabilities in this file
    const prompt = createBlueTeamPrompt(file.path, fileContent, fileVulnerabilities, file.language);

    // Generate patches with AI using proper LangChain message instances
    const response = await model.invoke([
      new SystemMessage('You are a Blue Team security expert. Respond only with valid JSON arrays as instructed.'),
      new HumanMessage(prompt)
    ]);

    // Parse patches from response
    const patches = parsePatches(response.content, file.path);

    logger.info(`Generated ${patches.length} patches for ${file.path}`);

    // Store patches in database and state
    let updatedState = state;

    for (const patch of patches) {
      // Try exact line match first, then fuzzy match, then just use first vuln
      const vulnerability =
        fileVulnerabilities.find(v => v.lineNumber === patch.lineNumber) ||
        fileVulnerabilities.find(v =>
          Math.abs((v.lineNumber || 0) - (patch.lineNumber || 0)) <= 5
        ) ||
        fileVulnerabilities[0]; // fallback — always link to something

      if (!vulnerability?.id) {
        logger.warn(`No vulnerability match for patch at line ${patch.lineNumber}, skipping`);
        continue; // skip instead of crashing
      }

      try {
        // Save to database
        const dbPatch = await storageService.createPatch({
          vulnerabilityId: vulnerability.id,
          auditId: state.auditId,
          filePath: patch.filePath,
          originalCode: patch.originalCode,
          patchedCode: patch.patchedCode,
          diff: patch.diff,
          explanation: patch.explanation,
          testPassed: false, // Will be updated after sandbox testing
        });

        // Add to state
        updatedState = addPatch(updatedState, {
          ...patch,
          id: dbPatch.id,
          vulnerabilityId: vulnerability.id,
        });

        // Send SSE event for each patch
        sseService.sendPatchGenerated(state.auditId, {
          filePath: patch.filePath,
          vulnerabilityType: vulnerability.type,
          severity: vulnerability.severity,
          explanation: patch.explanation,
        });
      } catch (patchErr) {
        // Log but don't crash the whole node — keep processing remaining patches
        logger.warn(`Skipped patch for ${patch.filePath}:${patch.lineNumber} — ${patchErr.message}`);
      }
    }

    // Update audit statistics
    await storageService.updateAudit(state.auditId, {
      patchesApplied: updatedState.stats.patchesApplied,
    });

    return addMessage(updatedState, {
      role: 'blueteam',
      content: `Generated ${patches.length} patches for ${file.path}`,
      step: 'blueteam_patch',
      patches: patches.length,
    });

  } catch (error) {
    logger.error('Blue Team patching failed:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Blue Team patching failed',
      error: error.message,
      file: state.currentFile?.path,
    });

    // Return state on error (workflow will handle moving to next file)
    return addMessage(state, {
      role: 'system',
      content: `Patching failed for ${state.currentFile?.path}: ${error.message}`,
      step: 'blueteam_patch_error',
    });
  }
};

/**
 * Create Blue Team patching prompt
 */
const createBlueTeamPrompt = (filePath, fileContent, vulnerabilities, language) => {
  const vulnList = vulnerabilities.map((v, i) => 
    `${i + 1}. **${v.type}** (${v.severity}) at line ${v.lineNumber}:\n   ${v.description}`
  ).join('\n');

  return `You are a Blue Team security expert generating secure patches for vulnerabilities.

**File**: ${filePath}
**Language**: ${language}

**Original Code**:
\`\`\`${language}
${fileContent}
\`\`\`

**Vulnerabilities to Fix**:
${vulnList}

**Task**: Generate secure patches for each vulnerability. Follow security best practices:

**Security Principles**:
- Input validation and sanitization
- Parameterized queries (prevent SQL injection)
- Output encoding (prevent XSS)
- Proper authentication and authorization
- Secure configuration
- Rate limiting and resource controls
- Error handling without information disclosure
- Principle of least privilege

**For AI-Specific Issues**:
- Validate and sanitize user input before LLM prompts
- Implement rate limiting and token budgets
- Never expose API keys or credentials
- Validate LLM outputs before execution
- Implement content filtering
- Use secure prompt templates

**Response Format** (JSON array):
\`\`\`json
[
  {
    "lineNumber": 42,
    "originalCode": "const query = 'SELECT * FROM users WHERE id = ' + userId;",
    "patchedCode": "const query = 'SELECT * FROM users WHERE id = ?';\\nconst result = await db.query(query, [userId]);",
    "diff": "- const query = 'SELECT * FROM users WHERE id = ' + userId;\\n+ const query = 'SELECT * FROM users WHERE id = ?';\\n+ const result = await db.query(query, [userId]);",
    "explanation": "Replaced string concatenation with parameterized query to prevent SQL injection. The user input is now safely passed as a parameter."
  }
]
\`\`\`

Generate complete, working patches that fix the vulnerabilities while maintaining functionality.`;
};

/**
 * Parse patches from AI response
 */
const parsePatches = (response, filePath) => {
  try {
    if (!response || typeof response !== 'string') return [];

    // Extract JSON array — try fenced block first, then bare array
    let jsonStr = null;

    const fenced = response.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (fenced) {
      jsonStr = fenced[1];
    } else {
      const bare = response.match(/(\[[\s\S]*\])/);
      if (bare) jsonStr = bare[1];
    }

    if (!jsonStr) {
      logger.warn('No JSON array found in Blue Team response, treating as no patches');
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.warn('JSON parse failed in Blue Team response, treating as no patches');
      return [];
    }

    if (!Array.isArray(parsed)) return [];
    
    // Add filePath to each patch
    return parsed.map(patch => ({
      ...patch,
      filePath,
    }));

  } catch (error) {
    logger.error('Failed to parse patches:', error);
    return [];
  }
};

export default blueTeamPatchNode;

// Made with Bob