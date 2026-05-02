import { cloneRepository } from '../../github/clone.service.js';
import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage } from '../graph/state.js';

/**
 * Clone Repository Node
 * Clones the GitHub repository to a local workspace
 */
export const cloneRepositoryNode = async (state) => {
  try {
    logger.info(`Cloning repository: ${state.repoUrl}`);

    // Send SSE event
    sseService.sendAuditStarted(state.auditId, {
      message: 'Starting repository clone',
      repoUrl: state.repoUrl,
      branch: state.branch,
    });

    // Clone the repository
    const workspacePath = await cloneRepository(
      state.repoUrl,
      state.branch,
      state.prNumber
    );

    // Update audit in database
    await storageService.updateAudit(state.auditId, {
      workspacePath,
      status: 'cloning',
    });

    // Send SSE event
    sseService.sendRepoCloned(state.auditId, {
      message: 'Repository cloned successfully',
      workspacePath,
    });

    logger.info(`Repository cloned to: ${workspacePath}`);

    // Return updated state
    return addMessage(
      {
        ...state,
        workspacePath,
        currentStep: 'clone_complete',
        status: 'scanning',
      },
      {
        role: 'system',
        content: `Repository cloned to ${workspacePath}`,
        step: 'clone_repository',
      }
    );

  } catch (error) {
    logger.error('Failed to clone repository:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Failed to clone repository',
      error: error.message,
    });

    // Update audit status
    await storageService.updateAudit(state.auditId, {
      status: 'failed',
      errorMessage: `Clone failed: ${error.message}`,
    });

    return {
      ...state,
      status: 'failed',
      error: error.message,
      currentStep: 'clone_failed',
    };
  }
};

export default cloneRepositoryNode;

// Made with Bob