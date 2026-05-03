import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage } from '../graph/state.js';

/**
 * Finalize Audit Node
 * Completes the audit and generates summary
 */
export const finalizeAuditNode = async (state) => {
  try {
    logger.info(`Finalizing audit: ${state.auditId}`);

    // Apply Red vs Blue severity consensus rules
    const resolvedVulnerabilities = state.vulnerabilities.map(v => {
      if (!v.verdict) return v;
      const consensusSeverity = resolveSeverity(v.severity, v.severity_final, v.verdict);
      if (consensusSeverity === null) return { ...v, consensusExcluded: true };
      return { ...v, severity: consensusSeverity };
    });

    // Persist consensus severity to DB (non-blocking)
    resolvedVulnerabilities.forEach(v => {
      if (v.verdict && !v.consensusExcluded) {
        storageService.updateVulnerability(v.id, { severity: v.severity })
          .catch(err => logger.warn(`Consensus severity persist failed for ${v.id}: ${err.message}`));
      }
    });

    // Exclude false-positives from counts
    const activeVulns = resolvedVulnerabilities.filter(v => !v.consensusExcluded);

    // Calculate final statistics
    const summary = {
      totalFiles: state.files.length,
      scannedFiles: state.files.length,
      totalVulnerabilities: activeVulns.length,
      criticalCount: activeVulns.filter(v => v.severity === 'Critical').length,
      highCount: activeVulns.filter(v => v.severity === 'High').length,
      mediumCount: activeVulns.filter(v => v.severity === 'Medium').length,
      lowCount: activeVulns.filter(v => v.severity === 'Low').length,
      aiRelatedCount: activeVulns.filter(v => v.isAiRelated).length,
      patchesApplied: state.patches.length,
      patchesSuccessful: state.testResults.filter(r => r.passed).length,
      testsPassed: state.testResults.filter(r => r.passed).length > 0,
    };

    // Update audit with final status
    await storageService.updateAudit(state.auditId, {
      status: 'completed',
      totalFiles: summary.totalFiles,
      scannedFiles: summary.scannedFiles,
      totalVulnerabilities: summary.totalVulnerabilities,
      criticalCount: summary.criticalCount,
      highCount: summary.highCount,
      mediumCount: summary.mediumCount,
      lowCount: summary.lowCount,
      patchesApplied: summary.patchesApplied,
      testsPassed: summary.testsPassed,
    });

    // Send completion event
    sseService.sendAuditCompleted(state.auditId, {
      message: 'Audit completed successfully',
      summary,
      duration: Date.now() - new Date(state.messages[0]?.timestamp || Date.now()).getTime(),
    });

    logger.info(`Audit completed: ${state.auditId}`, summary);

    // Return final state
    return addMessage(
      {
        ...state,
        vulnerabilities: resolvedVulnerabilities,
        status: 'completed',
        currentStep: 'finalized',
        stats: {
          ...state.stats,
          ...summary,
        },
      },
      {
        role: 'system',
        content: `Audit completed: ${summary.totalVulnerabilities} vulnerabilities found, ${summary.patchesApplied} patches generated`,
        step: 'finalize_audit',
        summary,
      }
    );

  } catch (error) {
    logger.error('Failed to finalize audit:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Failed to finalize audit',
      error: error.message,
    });

    // Update audit status
    await storageService.updateAudit(state.auditId, {
      status: 'failed',
      errorMessage: `Finalization failed: ${error.message}`,
    });

    return {
      ...state,
      status: 'failed',
      error: error.message,
      currentStep: 'finalize_failed',
    };
  }
};

function resolveSeverity(redSeverity, blueSeverity, verdict) {
  switch (verdict) {
    case 'confirmed-upgraded':   return blueSeverity;
    case 'confirmed-downgraded': return blueSeverity;
    case 'confirmed':            return blueSeverity;
    case 'disputed':             return 'Low';
    case 'false-positive':       return null;
    default:                     return redSeverity;
  }
}

export default finalizeAuditNode;

// Made with Bob