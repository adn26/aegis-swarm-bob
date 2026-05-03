import fs from 'fs/promises';
import path from 'path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getLangChainModel } from '../../services/ai-provider.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { robustParseJSON } from '../../utils/json.js';
import { addMessage } from '../graph/state.js';

// Hard limits
const MAX_CONTEXT_VULNS = 20;

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

/**
 * Red Team Narrative Node
 * Takes deterministic findings and generates attack narratives
 */
export const redTeamAnalysisNode = async (state) => {
  try {
    // If no vulnerabilities were found by deterministic tools, 
    // Red Team can still perform a logic flaw scan on high-priority files
    const vulnerabilities = state.vulnerabilities || [];
    
    if (vulnerabilities.length === 0) {
      logger.info('No SAST findings — running logic flaw scan on top 10 priority files');

      const topFiles = [...state.files]
        .sort((a, b) => (a.priority || 99) - (b.priority || 99))
        .slice(0, 10);

      if (topFiles.length === 0) {
        return { ...state, currentStep: 'redteam_complete' };
      }

      const contextBundle = buildContextBundle(topFiles);

      sseService.sendProgress(state.auditId, {
        message: 'Red Team: Independent logic flaw scan (no SAST findings)',
        step: 'redteam_logic_scan',
      });

      const model = getLangChainModel('redteam');
      const prompt = createLogicFlawPrompt(topFiles.map(f => f.path).join('\n'), contextBundle);

      try {
        const response = await model.invoke([
          new SystemMessage('You are a senior offensive security researcher. Respond with ONLY valid JSON array.'),
          new HumanMessage(prompt),
        ]);

        let logicFindings = robustParseJSON(response.content, []);
        if (!Array.isArray(logicFindings)) logicFindings = [];

        const logicVulns = logicFindings.map((f, i) => ({
          id: `LOGIC-${i + 1}`,
          auditId: state.auditId,
          filePath: f.file || topFiles[0]?.path || 'unknown',
          lineNumber: f.line || 0,
          severity: f.severity || 'Medium',
          type: 'logic-flaw',
          title: f.title,
          description: f.description,
          attackVector: f.attackVector,
          impact: f.impact,
          exploitCode: f.exploitCode || '',
          source: 'redteam-logic',
          status: 'detected',
          metadata: { chainedWith: f.chainedWith || [] },
        }));

        for (const v of logicVulns) {
          storageService.createVulnerability(v)
            .catch(err => logger.warn(`Failed to save logic flaw: ${err.message}`));
        }

        return addMessage({
          ...state,
          vulnerabilities: logicVulns,
          currentStep: 'redteam_complete',
        }, {
          role: 'redteam',
          content: `Logic flaw scan found ${logicVulns.length} issues.`,
          step: 'redteam_logic_complete',
        });
      } catch (aiErr) {
        logger.error(`Logic flaw scan failed: ${aiErr.message}`);
        return { ...state, currentStep: 'redteam_complete' };
      }
    }

    logger.info(`Red Team narrating ${vulnerabilities.length} findings`);

    // Group vulnerabilities by file to provide better context
    const vulnsByFile = vulnerabilities.reduce((acc, v) => {
      if (!acc[v.filePath]) acc[v.filePath] = [];
      acc[v.filePath].push(v);
      return acc;
    }, {});

    const updatedVulnerabilities = [...vulnerabilities];

    // Send initial analyzing event
    sseService.sendRedTeamAnalyzing(state.auditId, {
      message: `Red Team analyzing ${vulnerabilities.length} findings across ${Object.keys(vulnsByFile).length} files`,
      totalFindings: vulnerabilities.length,
      status: 'redteam_analyzing'
    });

    const contextBundle = buildContextBundle(state.files);

    for (const filePath in vulnsByFile) {
      const fileVulns = vulnsByFile[filePath];
      
      sseService.sendProgress(state.auditId, {
        message: `Red Team: Generating attack narratives for ${filePath}`,
        step: 'redteam_narrative',
        currentFile: filePath,
        vulnerabilitiesCount: updatedVulnerabilities.length
      });

      // Read file content for specific context
      let fileContent = '';
      try {
        fileContent = await fs.readFile(path.join(state.workspacePath, filePath), 'utf-8');
      } catch (err) {
        logger.warn(`Could not read file ${filePath} for Red Team context`);
      }

      const model = getLangChainModel('redteam');
      const prompt = createRedTeamNarrativePrompt(filePath, fileContent.slice(0, 10000), fileVulns, contextBundle);

      try {
        const response = await model.invoke([
          new SystemMessage('You are a senior offensive security researcher. Respond with ONLY valid JSON array of objects.'),
          new HumanMessage(prompt),
        ]);

        let narratives = robustParseJSON(response.content, []);
        if (!Array.isArray(narratives) && narratives && typeof narratives === 'object') {
          narratives = [narratives];
        }
        
        // Update vulnerabilities with narratives
        narratives.forEach(n => {
          const index = updatedVulnerabilities.findIndex(v => v.id === n.id || (v.filePath === filePath && v.ruleId === n.ruleId));
          if (index !== -1) {
            const severity = n.severity || updatedVulnerabilities[index].severity;
            updatedVulnerabilities[index] = {
              ...updatedVulnerabilities[index],
              attackVector: n.attackVector,
              impact: n.impact,
              exploitCode: n.exploitCode,
              severity: severity,
              justification: n.justification,
              metadata: {
                ...updatedVulnerabilities[index].metadata,
                chainedWith: Array.isArray(n.chainedWith) ? n.chainedWith : [],
              },
            };

            // Persist narrative update
            storageService.updateVulnerability(updatedVulnerabilities[index].id, {
              exploitCode: n.exploitCode,
              severity: severity,
              description: `${updatedVulnerabilities[index].description}\n\n**Attack Narrative:**\n${n.attackVector}\n\n**Impact:**\n${n.impact}\n\n**Justification:**\n${n.justification}`
            }).catch(err => logger.error(`Failed to update vuln narrative: ${err.message}`));
            
            // Send SSE event for this specific vulnerability finding
            sseService.sendVulnerabilityFound(state.auditId, updatedVulnerabilities[index]);
          }
        });

      } catch (aiErr) {
        logger.error(`Red Team AI narrative failed for ${filePath}: ${aiErr.message}`);
      }
    }

    // Update audit status to redteam_complete
    await storageService.updateAudit(state.auditId, {
      status: 'analyzing', // Backend state for next nodes
    }).catch(err => logger.warn(`Failed to update audit status to analyzing: ${err.message}`));

    // Send progress event with status
    sseService.sendProgress(state.auditId, {
      message: `Generated attack narratives for ${updatedVulnerabilities.length} vulnerabilities.`,
      step: 'redteam_narrative_complete',
      status: 'redteam_complete',
    });

    return addMessage({
      ...state,
      vulnerabilities: updatedVulnerabilities,
      currentStep: 'redteam_complete',
    }, {
      role: 'redteam',
      content: `Generated attack narratives for ${updatedVulnerabilities.length} vulnerabilities.`,
      step: 'redteam_narrative_complete',
    });

  } catch (error) {
    logger.error('Red Team narrative phase failed:', error);
    return {
      ...state,
      status: 'failed',
      error: error.message,
    };
  }
};

const createRedTeamNarrativePrompt = (filePath, fileContent, findings, contextBundle) => {
  return `You are a senior offensive security researcher conducting a red team assessment.

You have been given:
1. Static analysis findings from Semgrep, Trufflehog, and Trivy (ground truth)
2. The relevant source code around each finding
3. The full context bundle (file tree + high priority files)

---
CONTEXT BUNDLE:
${contextBundle}
---

Your tasks:
1. For each SAST finding, write a concrete attack narrative:
   - How would an attacker discover this vulnerability?
   - What is the exact exploit (HTTP request, payload, sequence of steps)?
   - What is the impact if successfully exploited?
   - Is this finding more or less severe in context than the tool rated it?

2. Identify chains: can multiple findings be combined for greater impact?
   Example: a secret in code (Trufflehog) + an exposed admin endpoint (Semgrep) = full account takeover chain.

3. Logic flaw scan: review auth flows, access control, and session management in the code for issues SAST tools cannot detect.

CRITICAL: Return a JSON array of objects. Even if there is only one finding, return it in an array [].

File Under Analysis: ${filePath}
Target File Content:
\`\`\`
${fileContent}
\`\`\`

Findings to narrate:
${JSON.stringify(findings.map(f => ({ 
  id: f.id, 
  ruleId: f.ruleId, 
  title: f.title, 
  description: f.description, 
  line: f.line,
  metadata: f.metadata // Includes verified status for secrets, detector types, etc.
})), null, 2)}

CRITICAL INSTRUCTION: If a finding has "metadata.verified": true, it means the secret was confirmed active against a live API. Treat these as automatic Critical severity.

For each finding, provide:
1. ATTACK-VECTOR: A step-by-step exploit simulation. How would an attacker discover and trigger this?
2. IMPACT: What the attacker achieves (e.g., data theft, RCE).
3. EXPLOIT-CODE: A functional PoC (curl command, JS snippet, etc.). MAX 200 CHARACTERS.
4. SEVERITY: Review the tool's severity and adjust if necessary (Critical, High, Medium, Low).
5. JUSTIFICATION: Why you chose this severity.

Return a JSON array of objects:
[
  {
    "id": "original_id",
    "ruleId": "original_ruleId",
    "attackVector": "...",
    "impact": "...",
    "exploitCode": "...",
    "severity": "...",
    "justification": "...",
    "chainedWith": ["SEMGREP-2", "TRUFFLEHOG-0"]
  }
]

chainedWith: list IDs of other findings that combine with this one for greater impact. Use [] if standalone.`;
};

const createLogicFlawPrompt = (fileList, contextBundle) => {
  return `You are a senior offensive security researcher. SAST tools found no issues. Find logic flaws that static analysis cannot detect.

Context bundle:
---
${contextBundle}
---

Files analyzed:
${fileList}

Check specifically — only report what you can point to in the code:
1. IDOR — endpoint returns data keyed by user-controlled ID without ownership check
2. Broken auth — password reset skips email verification, 2FA can be bypassed, session fixation
3. Mass assignment — route/ORM accepts all fields without an allowlist
4. Race conditions — concurrent requests can bypass rate limits or double-spend
5. JWT algorithm confusion — accepts alg:none, or conflates RS256/HS256 keys
6. GraphQL — introspection enabled and resolvers missing auth checks

Return a JSON array. Return [] if you find nothing.

[
  {
    "title": "Short descriptive title",
    "file": "relative/path/to/file.js",
    "line": 42,
    "description": "What the logic flaw is and where in the code",
    "attackVector": "Step-by-step exploit",
    "impact": "What attacker achieves",
    "exploitCode": "curl/payload (max 200 chars)",
    "severity": "Critical" | "High" | "Medium" | "Low",
    "chainedWith": []
  }
]`;
};

export default redTeamAnalysisNode;
