import express from 'express';
import { asyncHandler } from '../../utils/errors.js';
import sseService from '../../services/sse.service.js';
import storage from '../../services/storage.service.js';
import { NotFoundError } from '../../utils/errors.js';

const router = express.Router();

/**
 * GET /api/stream/:auditId
 * Server-Sent Events endpoint for real-time audit updates
 */
router.get('/:auditId', asyncHandler(async (req, res) => {
  const { auditId } = req.params;
  
  // Verify audit exists
  try {
    await storage.getAudit(auditId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Audit not found',
      });
    }
    throw error;
  }
  
  // Add SSE connection
  sseService.addConnection(auditId, res);
}));

export default router;

// Made with Bob
