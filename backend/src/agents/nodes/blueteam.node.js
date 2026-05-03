import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { robustParseJSON } from '../../utils/json.js';
import { addPatch, addMessage } from '../graph/state.js';

/**
 * Blue Team Node (Adversarial Verifier & Patcher)
 * Verifies Red Team attack narratives and generates stable patches
 */
export const blueTeamPatchNode = async (state) => {
  try {
    const vulnerabilities = state.vulnerabilities || [];
    if (vulnerabilities.length === 0) {
      return { ...state, currentStep: 'blueteam_complete' };
    }

    logger.info(`Blue Team verifying and patching ${vulnerabilities.length} vulnerabilities`);

    // Group by file
    const vulnsByFile = vulnerabilities.reduce((acc, v) => {
      if (!acc[v.filePath]) acc[v.filePath] = [];
      acc[v.filePath].push(v);
      return acc;
    }, {});

    const updatedVulnerabilities = [...vulnerabilities];
    const newPatches = [];
    let patchesCount = 0;

    // Send initial patching event
    sseService.sendBlueTeamPatching(state.auditId, {
      message: `Blue Team verifying ${vulnerabilities.length} findings across ${Object.keys(vulnsByFile).length} files`,
      totalFindings: vulnerabilities.length,
      status: 'blueteam_patching'
    });

    // Architecture Layer 1: Context Bundle Format
    const buildContextBundle = (files) => {
      const bundle = [];
      bundle.push('=== FILE TREE ===');
      bundle.push(files.map(f => f.path).join('\n'));
      bundle.push('');

      files.filter(f => f.isInContextBundle).forEach(f => {
        bundle.push(`=== FILE: ${f.path} ===`);
        bundle.push(f.content);
        bundle.push('');
      });

      return bundle.join('\n');
    };

    const contextBundle = buildContextBundle(state.files);

    for (const filePath in vulnsByFile) {
      const fileVulns = vulnsByFile[filePath];
      
      sseService.sendProgress(state.auditId, {
        message: `Blue Team: Verifying findings for ${filePath}`,
        step: 'blueteam_verification',
        currentFile: filePath,
        vulnerabilitiesCount: vulnerabilities.length,
        patchesCount: patchesCount
      });

      // Read file content
      let fileContent = '';
      try {
        fileContent = await fs.readFile(path.join(state.workspacePath, filePath), 'utf-8');
      } catch (err) {
        logger.warn(`Could not read file ${filePath} for Blue Team context`);
      }

      const model = getLangChainModel('blueteam');
      const prompt = createBlueTeamPrompt(filePath, fileContent, fileVulns);

      try {
        const response = await model.invoke([
          new SystemMessage('You are a senior defensive security engineer. Respond with ONLY valid JSON.'),
          new HumanMessage(prompt),
        ]);

        const verificationResults = robustParseJSON(response.content, []);
        
        for (const res of verificationResults) {
          const vIndex = updatedVulnerabilities.findIndex(v => v.id === res.id || (v.filePath === filePath && v.ruleId === res.ruleId));
          if (vIndex === -1) continue;

          // Update vulnerability with Blue Team verdict
          updatedVulnerabilities[vIndex] = {
            ...updatedVulnerabilities[vIndex],
            verdict: res.verdict,
            severity_final: res.severity_final,
            justification_final: res.justification,
            existing_mitigations: res.existing_mitigations,
            remediation_complexity: res.remediation_complexity || null,
            additional_hardening: res.additional_hardening || [],
          };

          // Save patch if provided and confirmed
          if (res.verdict.startsWith('confirmed') && res.patch) {
            try {
              const dbPatch = await storageService.createPatch({
                vulnerabilityId: updatedVulnerabilities[vIndex].id,
                auditId: state.auditId,
                filePath: filePath,
                originalCode: res.patch.code_before,
                patchedCode: res.patch.code_after,
                explanation: res.patch.description,
                testPassed: false,
              });

              patchesCount++;
              
              newPatches.push({
                ...dbPatch,
                filePath: filePath
              });
              
              // Send SSE event for this specific patch
              sseService.sendPatchGenerated(state.auditId, {
                id: dbPatch.id,
                file_path: filePath,
                vulnerability_id: updatedVulnerabilities[vIndex].id,
                explanation: res.patch.description,
              });
            } catch (pErr) {
              logger.error(`Failed to save patch: ${pErr.message}`);
            }
          }

          // Severity NOT written here — consensus applied in finalize.node.js
          storageService.updateVulnerability(updatedVulnerabilities[vIndex].id, {
            description: `${updatedVulnerabilities[vIndex].description}\n\n**Blue Team Verdict:** ${res.verdict}\n${res.justification}`,
          }).catch(err => logger.error(`Failed to update vuln verdict: ${err.message}`));
        }

      } catch (aiErr) {
        logger.error(`Blue Team AI verification failed for ${filePath}: ${aiErr.message}`);
      }
    }

    // Update audit statistics and status
    await storageService.updateAudit(state.auditId, {
      patchesApplied: patchesCount,
      status: 'patching', // Transition status
    });

    // Send final patching progress update
    sseService.sendProgress(state.auditId, {
      message: `Blue Team: Generated ${patchesCount} patches for ${vulnerabilities.length} vulnerabilities.`,
      step: 'blueteam_complete',
      status: 'blueteam_complete',
      patchesCount: patchesCount
    });

    return addMessage({
      ...state,
      vulnerabilities: updatedVulnerabilities,
      patches: [...(state.patches || []), ...newPatches],
      currentStep: 'blueteam_complete',
    }, {
      role: 'blueteam',
      content: `Blue Team verified ${updatedVulnerabilities.length} findings and generated ${patchesCount} patches.`,
      step: 'blueteam_complete',
    });

  } catch (error) {
    logger.error('Blue Team phase failed:', error);
    return {
      ...state,
      status: 'failed',
      error: error.message,
    };
  }
};

const createBlueTeamPrompt = (filePath, fileContent, vulnerabilities) => {
  // No context bundle — too long, causes truncation
  return `You are a defensive security engineer. Review these findings and generate patches.

File: ${filePath}
\`\`\`
${fileContent.slice(0, 4000)}
\`\`\`

Findings:
${JSON.stringify(vulnerabilities.map(v => ({
  id: v.id,
  title: v.title,
  severity: v.severity,
  line: v.line_start || 0,
  description: v.description?.slice(0, 200),
})), null, 2)}

Return ONLY a JSON array. Keep all string values under 300 chars. No newlines inside strings — use \\n instead.

[{"id":"same_id","verdict":"confirmed","severity_final":"High","justification":"one sentence","existing_mitigations":"none or brief","remediation_complexity":"line-change","additional_hardening":[],"patch":{"description":"brief fix","code_before":"original snippet","code_after":"fixed snippet"}}]`;
};

export default blueTeamPatchNode;
