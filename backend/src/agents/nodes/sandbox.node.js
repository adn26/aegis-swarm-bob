import storageService from '../../services/storage.service.js';
import sandboxService from '../../services/sandbox.service.js';
import sseService from '../../services/sse.service.js';
import logger from '../../utils/logger.js';
import { addMessage } from '../graph/state.js';

/**
 * Sandbox Test Node
 * Tests patches in an isolated Docker container
 */
export const sandboxTestNode = async (state) => {
  try {
    const file = state.currentFile;
    
    if (!file) {
      logger.warn('No current file for sandbox testing');
      return state;
    }

    // Update status for sequential flow
    if (state.currentStep === 'start_sandbox' || state.currentFileIndex === 0) {
       await storageService.updateAudit(state.auditId, { status: 'testing' });
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

    // Run tests in real Docker sandbox
    const testResults = await sandboxService.runTests(
      state.workspacePath,
      file.path,
      filePatches
    );

    // Update patches in database
    for (const result of testResults) {
      await storageService.updatePatch(result.patchId, {
        testPassed: result.passed,
        testOutput: result.output,
      });
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

    // Update state with test results
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
    sseService.sendError(state.auditId, {
      message: 'Sandbox testing failed',
      error: error.message,
      file: state.currentFile?.path,
    });
    return addMessage(state, {
      role: 'system',
      content: `Sandbox testing failed for ${state.currentFile?.path}: ${error.message}`,
      step: 'sandbox_test_error',
    });
  }
};

export default sandboxTestNode;
