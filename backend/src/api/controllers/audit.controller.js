import orchestrator from '../../agents/orchestrator.js';
import storageService from '../../services/storage.service.js';
import logger from '../../utils/logger.js';
import { NotFoundError } from '../../utils/errors.js';

/**
 * Audit Controller
 * Handles HTTP requests for security audits
 */
class AuditController {
  /**
   * Start a new security audit
   * POST /api/audit
   */
  async startAudit(req, res) {
    try {
      const { repoUrl, prNumber, branch } = req.body;

      logger.info(`Starting audit request for: ${repoUrl}`);

      // Start the audit (non-blocking)
      const audit = await orchestrator.startAudit({
        repoUrl,
        prNumber,
        branch: branch || 'main',
      });

      // Return audit ID immediately
      res.status(202).json({
        success: true,
        message: 'Audit started successfully',
        data: {
          auditId: audit.id,
          status: audit.status,
          repoUrl: audit.repo_url,
          branch: audit.branch,
          createdAt: audit.created_at,
        },
      });

    } catch (error) {
      logger.error('Failed to start audit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start audit',
        message: error.message,
      });
    }
  }

  /**
   * Get audit details and status
   * GET /api/audit/:id
   */
  async getAudit(req, res) {
    try {
      const { id } = req.params;

      const auditStatus = await orchestrator.getAuditStatus(id);

      res.json({
        success: true,
        data: auditStatus,
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: 'Audit not found',
          message: error.message,
        });
      } else {
        logger.error('Failed to get audit:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get audit',
          message: error.message,
        });
      }
    }
  }

  /**
   * Get all audits with pagination
   * GET /api/audit?limit=50&offset=0
   */
  async getAllAudits(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const audits = await storageService.getAudits(limit, offset);

      res.json({
        success: true,
        data: {
          audits,
          limit,
          offset,
          count: audits.length,
        },
      });

    } catch (error) {
      logger.error('Failed to get audits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audits',
        message: error.message,
      });
    }
  }

  /**
   * Get vulnerabilities for an audit
   * GET /api/audit/:id/vulnerabilities
   */
  async getVulnerabilities(req, res) {
    try {
      const { id } = req.params;

      // Verify audit exists
      await storageService.getAudit(id);

      const vulnerabilities = await storageService.getVulnerabilities(id);

      res.json({
        success: true,
        data: {
          auditId: id,
          vulnerabilities,
          count: vulnerabilities.length,
        },
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: 'Audit not found',
          message: error.message,
        });
      } else {
        logger.error('Failed to get vulnerabilities:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get vulnerabilities',
          message: error.message,
        });
      }
    }
  }

  /**
   * Get patches for an audit
   * GET /api/audit/:id/patches
   */
  async getPatches(req, res) {
    try {
      const { id } = req.params;

      // Verify audit exists
      await storageService.getAudit(id);

      const patches = await storageService.getPatches(id);

      res.json({
        success: true,
        data: {
          auditId: id,
          patches,
          count: patches.length,
        },
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: 'Audit not found',
          message: error.message,
        });
      } else {
        logger.error('Failed to get patches:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get patches',
          message: error.message,
        });
      }
    }
  }

  /**
   * Download PDF report for an audit
   * GET /api/audit/:id/report
   */
  async downloadReport(req, res) {
    try {
      const { id } = req.params;

      // Verify audit exists
      const audit = await storageService.getAudit(id);

      if (audit.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Report not available',
          message: 'Audit must be completed before generating report',
        });
      }

      // Check if report exists
      const report = await storageService.getReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
          message: 'PDF report has not been generated yet',
        });
      }

      // TODO: Implement PDF report generation in Phase 8
      // For now, return report metadata
      res.json({
        success: true,
        message: 'PDF report generation will be implemented in Phase 8',
        data: report,
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: 'Audit not found',
          message: error.message,
        });
      } else {
        logger.error('Failed to download report:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to download report',
          message: error.message,
        });
      }
    }
  }

  /**
   * Get audit results with full details
   * GET /api/audit/:id/results
   */
  async getAuditResults(req, res) {
    try {
      const { id } = req.params;

      const results = await orchestrator.getAuditResults(id);

      res.json({
        success: true,
        data: results,
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: 'Audit not found',
          message: error.message,
        });
      } else {
        logger.error('Failed to get audit results:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get audit results',
          message: error.message,
        });
      }
    }
  }
}

export default new AuditController();

// Made with Bob