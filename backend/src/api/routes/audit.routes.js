import express from 'express';
import { asyncHandler } from '../../utils/errors.js';
import auditController from '../controllers/audit.controller.js';
import { validateAuditRequest } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * POST /api/audit
 * Start a new security audit
 */
router.post('/', validateAuditRequest, asyncHandler(auditController.startAudit));

/**
 * GET /api/audit/:id
 * Get audit details and results
 */
router.get('/:id', asyncHandler(auditController.getAudit));

/**
 * GET /api/audit
 * Get all audits (with pagination)
 */
router.get('/', asyncHandler(auditController.getAllAudits));

/**
 * GET /api/audit/:id/vulnerabilities
 * Get vulnerabilities for an audit
 */
router.get('/:id/vulnerabilities', asyncHandler(auditController.getVulnerabilities));

/**
 * GET /api/audit/:id/patches
 * Get patches for an audit
 */
router.get('/:id/patches', asyncHandler(auditController.getPatches));

/**
 * GET /api/audit/:id/report
 * Download PDF report for an audit
 */
router.get('/:id/report', asyncHandler(auditController.downloadReport));

export default router;

// Made with Bob
