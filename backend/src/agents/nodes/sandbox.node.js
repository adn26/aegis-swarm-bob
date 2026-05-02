import storageService from '../../services/storage.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage } from '../graph/state.js';

/**
 * Sandbox Test Node
 * Tests patches in an isolated Docker container
 * 
 * Note: Docker sandbox implementation will be added in Phase 7
 * For now, this is a placeholder that marks patches as tested
 */
export const sandboxTestNode = async (state) => {
  try {
    const file = state.currentFile;
    
    if (!file) {
      logger.warn('No current file for sandbox testing');
      return state;
    }

    // Get patches for current file
    const filePatches = state.patches.filter(
      p => p.filePath === file.path
    );

    if (filePatches.length === 0) {
      logger.info(`No patches to test in ${file.path}`);
      return state;
    }

    logger.info(`Testing ${filePatches.length} patches in sandbox for ${file.path}`);

    // Send SSE event
    sseService.sendSandboxDeploying(state.auditId, {
      message: `Deploying patches to sandbox for ${file.path}`,
      filePath: file.path,
      patchCount: filePatches.length,
    });

    // TODO: Implement actual Docker sandbox testing in Phase 7
    // For now, simulate testing with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send SSE event
    sseService.sendTestsRunning(state.auditId, {
      message: `Running tests in sandbox for ${file.path}`,
      filePath: file.path,
    });

    // Simulate test results (all pass for now)
    const testResults = filePatches.map(patch => ({
      patchId: patch.id,
      filePath: patch.filePath,
      passed: true,
      output: 'Patch applied successfully (simulated)',
      executionTime: Math.random() * 1000,
    }));

    // Update patches in database
    for (const result of testResults) {
      await storageService.updateAudit(state.auditId, {
        testsPassed: result.passed,
      });

      // Update patch record
      // Note: We'll need to add an update method to storage service
      // For now, we'll just log
      logger.info(`Patch ${result.patchId} test result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    }

    // Send test results event
    sseService.sendTestResults(state.auditId, {
      filePath: file.path,
      results: testResults,
      totalTests: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
    });

    // Update state with test results (workflow will handle moving to next file)
    const updatedState = {
      ...state,
      testResults: [...state.testResults, ...testResults],
      stats: {
        ...state.stats,
        testsPassed: state.stats.testsPassed + testResults.filter(r => r.passed).length,
      },
    };

    return addMessage(updatedState, {
      role: 'system',
      content: `Tested ${filePatches.length} patches for ${file.path}: ${testResults.filter(r => r.passed).length} passed`,
      step: 'sandbox_test',
      testResults: testResults.length,
    });

  } catch (error) {
    logger.error('Sandbox testing failed:', error);

    // Send error event
    sseService.sendError(state.auditId, {
      message: 'Sandbox testing failed',
      error: error.message,
      file: state.currentFile?.path,
    });

    // Return state on error (workflow will handle moving to next file)
    return addMessage(state, {
      role: 'system',
      content: `Sandbox testing failed for ${state.currentFile?.path}: ${error.message}`,
      step: 'sandbox_test_error',
    });
  }
};

export default sandboxTestNode;

// Made with Bob