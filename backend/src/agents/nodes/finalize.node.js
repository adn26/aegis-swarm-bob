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

    // Calculate final statistics
    const summary = {
      totalFiles: state.files.length,
      scannedFiles: state.files.length,
      totalVulnerabilities: state.vulnerabilities.length,
      criticalCount: state.vulnerabilities.filter(v => v.severity === 'Critical').length,
      highCount: state.vulnerabilities.filter(v => v.severity === 'High').length,
      mediumCount: state.vulnerabilities.filter(v => v.severity === 'Medium').length,
      lowCount: state.vulnerabilities.filter(v => v.severity === 'Low').length,
      aiRelatedCount: state.vulnerabilities.filter(v => v.isAiRelated).length,
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

export default finalizeAuditNode;

// Made with Bob