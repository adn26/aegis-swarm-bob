import fs from 'fs/promises';
import path from 'path';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addPatch, addMessage, moveToNextFile } from '../graph/state.js';

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
      return moveToNextFile(state);
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

    // Generate patches with AI
    const response = await model.invoke([
      { role: 'user', content: prompt }
    ]);

    // Parse patches from response
    const patches = parsePatches(response.content, file.path);

    logger.info(`Generated ${patches.length} patches for ${file.path}`);

    // Store patches in database and state
    let updatedState = state;

    for (const patch of patches) {
      // Find corresponding vulnerability
      const vulnerability = fileVulnerabilities.find(
        v => v.lineNumber === patch.lineNumber
      );

      if (vulnerability) {
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

    // Move to next file on error
    const updatedState = moveToNextFile(state);

    return addMessage(updatedState, {
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
    // Extract JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      // Try to parse the entire response as JSON
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.map(p => ({ ...p, filePath })) : [];
    }

    const patches = JSON.parse(jsonMatch[1]);
    
    // Add filePath to each patch
    return patches.map(patch => ({
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