import toolScanner from '../../services/tool-scanner.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage } from '../graph/state.js';

/**
 * Deterministic Analysis Node
 * Runs security tools like Semgrep, TruffleHog, and Trivy
 */
export const deterministicAnalysisNode = async (state) => {
  try {
    logger.info(`Starting deterministic analysis in: ${state.workspacePath}`);

    // Send SSE event
    sseService.sendProgress(state.auditId, {
      message: 'Starting deterministic analysis: Semgrep, TruffleHog, Trivy',
      step: 'deterministic_analysis',
      status: 'deterministic_analysis_started'
    });

    // Run the tools
    const toolFindings = await toolScanner.runAllTools(state.workspacePath);
    
    logger.info(`Found ${toolFindings.length} findings from tools`);

    // Map findings to our internal vulnerability schema and save to DB
    const vulnerabilities = [];
    for (const finding of toolFindings) {
      try {
        const vuln = {
          auditId: state.auditId,
          filePath: finding.file,
          lineNumber: finding.line_start,
          lineEnd: finding.line_end,
          severity: finding.severity,
          type: finding.category,
          title: finding.title,
          description: finding.description,
          codeSnippet: finding.code_snippet,
          owaspCategory: finding.owasp_category,
          source: finding.source,
          status: 'detected',
          metadata: {
            verified: finding.verified || false,
            ruleId: finding.rule_id,
            detectorType: finding.detectorType || null,
            link: finding.link || null,
            cveId: finding.cve_id || null,
          },
        };

        // Save to storage
        const savedVuln = await storageService.createVulnerability(vuln);
        const finalVuln = { ...vuln, id: savedVuln.id || finding.id };
        vulnerabilities.push(finalVuln);
        
        // Send SSE event for this vulnerability finding
        sseService.sendVulnerabilityFound(state.auditId, finalVuln);
      } catch (dbErr) {
        logger.warn(`Skipped finding in ${finding.file}: ${dbErr.message}`);
      }
    }

    // Update audit status
    await storageService.updateAudit(state.auditId, {
      totalVulnerabilities: vulnerabilities.length,
      status: 'analyzing', // Keep consistent with DB constraints
    }).catch(err => logger.warn(`Failed to update audit status to analyzing: ${err.message}`));

    // Send SSE event
    sseService.sendProgress(state.auditId, {
      message: `Deterministic analysis complete. Found ${vulnerabilities.length} potential issues.`,
      step: 'deterministic_analysis_complete',
      status: 'deterministic_analysis_complete',
      vulnerabilitiesCount: vulnerabilities.length
    });

    // Return updated state
    return addMessage({
      ...state,
      vulnerabilities,
      currentStep: 'deterministic_analysis_complete',
    }, {
      role: 'system',
      content: `Deterministic tools found ${vulnerabilities.length} vulnerabilities. Passing to Red Team for narrative generation.`,
      step: 'analysis',
    });

  } catch (error) {
    logger.error('Failed deterministic analysis:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Failed deterministic analysis',
      error: error.message,
    });

    return {
      ...state,
      status: 'failed',
      error: error.message,
      currentStep: 'analysis_failed',
    };
  }
};

export default deterministicAnalysisNode;
