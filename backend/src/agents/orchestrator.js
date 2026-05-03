import { runAuditWorkflow } from './graph/workflow.js';
import storageService from '../services/storage.service.js';
import sseService from '../services/sse.service.js';
import logger from '../utils/logger.js';

/**
 * Audit Orchestrator
 * Manages the execution of security audits using LangGraph workflow
 */
class AuditOrchestrator {
  constructor() {
    // Track running audits
    this.runningAudits = new Map();
  }

  /**
   * Start a new audit
   * 
   * @param {Object} auditData - Audit configuration
   * @param {string} auditData.repoUrl - GitHub repository URL
   * @param {number} auditData.prNumber - Pull request number (optional)
   * @param {string} auditData.branch - Branch name (optional)
   * @returns {Promise<Object>} Audit record
   */
  async startAudit(auditData) {
    try {
      logger.info(`Starting audit for: ${auditData.repoUrl}`);

      // Create audit record in database
      const audit = await storageService.createAudit({
        repoUrl: auditData.repoUrl,
        prNumber: auditData.prNumber,
        branch: auditData.branch,
      });

      logger.info(`Created audit record: ${audit.id}`);

      // Start workflow in background (non-blocking)
      // Use a delay to ensure the frontend has time to establish SSE connection
      setTimeout(() => {
        this.runWorkflow(audit.id, {
          auditId: audit.id,
          repoUrl: auditData.repoUrl,
          prNumber: auditData.prNumber,
          branch: auditData.branch,
        }).catch(error => {
          logger.error(`Workflow execution failed for audit ${audit.id}:`, error);
        });
      }, 2000); // 2 second buffer for SSE handshake

      return audit;

    } catch (error) {
      logger.error('Failed to start audit:', error);
      throw error;
    }
  }

  /**
   * Run the audit workflow
   * Executes in background and updates via SSE
   */
  async runWorkflow(auditId, auditData) {
    try {
      // Mark as running
      this.runningAudits.set(auditId, {
        startTime: Date.now(),
        status: 'running',
      });

      logger.info(`Running workflow for audit: ${auditId}`);
      
      // Notify frontend that audit has started
      sseService.sendAuditStarted(auditId, {
        auditId,
        repoUrl: auditData.repoUrl,
        branch: auditData.branch,
      });

      // Run the LangGraph workflow with state updates
      const finalState = await runAuditWorkflow(auditData, async (state) => {
        // This callback is called after each node execution
        // We can use it to send real-time updates via SSE
        
        // Send progress update
        sseService.sendProgress(auditId, {
          step: state.currentStep,
          filesScanned: state.currentFileIndex,
          totalFiles: state.files.length,
          vulnerabilitiesCount: state.vulnerabilities?.length || 0,
          patchesCount: state.patches?.length || 0,
        });

        // Transition frontend UI based on step
        if (state.currentStep === 'redteam_analysis') {
          sseService.sendRedTeamAnalyzing(auditId, {
            totalFindings: state.vulnerabilities?.length || 0
          });
        } else if (state.currentStep === 'blueteam_patch') {
          sseService.sendBlueTeamPatching(auditId, {
            totalFindings: state.vulnerabilities?.length || 0
          });
        }

        // Update running audit info
        this.runningAudits.set(auditId, {
          startTime: this.runningAudits.get(auditId)?.startTime || Date.now(),
          status: state.status,
          currentStep: state.currentStep,
        });
      });

      logger.info(`Workflow completed for audit: ${auditId}`);

      // Mark as completed
      this.runningAudits.set(auditId, {
        startTime: this.runningAudits.get(auditId)?.startTime || Date.now(),
        status: 'completed',
        endTime: Date.now(),
      });

      // Close SSE connections after a delay
      setTimeout(() => {
        sseService.closeAuditConnections(auditId);
        this.runningAudits.delete(auditId);
      }, 5000);

      return finalState;

    } catch (error) {
      logger.error(`Workflow failed for audit ${auditId}:`, error);

      // Update audit status
      await storageService.updateAudit(auditId, {
        status: 'failed',
        errorMessage: error.message,
      });

      // Send error event
      sseService.sendError(auditId, {
        message: 'Audit workflow failed',
        error: error.message,
      });

      // Mark as failed
      this.runningAudits.set(auditId, {
        startTime: this.runningAudits.get(auditId)?.startTime || Date.now(),
        status: 'failed',
        error: error.message,
        endTime: Date.now(),
      });

      // Close SSE connections after a delay
      setTimeout(() => {
        sseService.closeAuditConnections(auditId);
        this.runningAudits.delete(auditId);
      }, 5000);

      throw error;
    }
  }

  /**
   * Get audit status
   */
  async getAuditStatus(auditId) {
    try {
      // Get from database
      const audit = await storageService.getAudit(auditId);

      // Get runtime info if available
      const runtimeInfo = this.runningAudits.get(auditId);

      return {
        ...audit,
        runtime: runtimeInfo || null,
      };

    } catch (error) {
      logger.error('Failed to get audit status:', error);
      throw error;
    }
  }

  /**
   * Get audit results with full details
   */
  async getAuditResults(auditId) {
    try {
      const stats = await storageService.getAuditStats(auditId);
      return stats;

    } catch (error) {
      logger.error('Failed to get audit results:', error);
      throw error;
    }
  }

  /**
   * Check if audit is running
   */
  isAuditRunning(auditId) {
    const info = this.runningAudits.get(auditId);
    return info && info.status === 'running';
  }

  /**
   * Get all running audits
   */
  getRunningAudits() {
    return Array.from(this.runningAudits.entries()).map(([id, info]) => ({
      auditId: id,
      ...info,
    }));
  }

  /**
   * Cancel a running audit
   * Note: LangGraph doesn't support cancellation out of the box
   * This is a placeholder for future implementation
   */
  async cancelAudit(auditId) {
    logger.warn(`Audit cancellation not yet implemented: ${auditId}`);
    
    // Update status in database
    await storageService.updateAudit(auditId, {
      status: 'cancelled',
      errorMessage: 'Audit cancelled by user',
    });

    // Remove from running audits
    this.runningAudits.delete(auditId);

    // Close SSE connections
    sseService.closeAuditConnections(auditId);
  }
}

// Export singleton instance
export default new AuditOrchestrator();

// Made with Bob