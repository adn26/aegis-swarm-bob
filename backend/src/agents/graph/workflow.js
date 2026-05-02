import { StateGraph, END } from '@langchain/langgraph';
import { AuditState } from './state.js';
import logger from '../../utils/logger.js';

// Import node implementations
import { cloneRepositoryNode } from '../nodes/clone.node.js';
import { scanFilesNode } from '../nodes/scan.node.js';
import { redTeamAnalysisNode } from '../nodes/redteam.node.js';
import { blueTeamPatchNode } from '../nodes/blueteam.node.js';
import { sandboxTestNode } from '../nodes/sandbox.node.js';
import { finalizeAuditNode } from '../nodes/finalize.node.js';

/**
 * Create the Aegis Swarm workflow graph
 * 
 * Workflow:
 * 1. Clone repository
 * 2. Scan files
 * 3. For each file:
 *    a. Red Team analyzes for vulnerabilities
 *    b. If vulnerabilities found, Blue Team generates patches
 *    c. Sandbox tests patches
 * 4. Finalize audit and generate report
 */
export const createAuditWorkflow = () => {
  // Create the state graph
  const workflow = new StateGraph(AuditState);

  // Add nodes
  workflow.addNode('clone_repository', cloneRepositoryNode);
  workflow.addNode('scan_files', scanFilesNode);
  workflow.addNode('redteam_analysis', redTeamAnalysisNode);
  workflow.addNode('blueteam_patch', blueTeamPatchNode);
  workflow.addNode('sandbox_test', sandboxTestNode);
  workflow.addNode('finalize_audit', finalizeAuditNode);

  // Set entry point
  workflow.addEdge('__start__', 'clone_repository');

  // Define edges
  workflow.addEdge('clone_repository', 'scan_files');
  
  // After scanning files, start Red Team analysis
  workflow.addEdge('scan_files', 'redteam_analysis');

  // Conditional edge after Red Team analysis
  workflow.addConditionalEdges(
    'redteam_analysis',
    shouldContinueScanning,
    {
      continue: 'redteam_analysis', // More files to scan
      patch: 'blueteam_patch',      // Vulnerabilities found, generate patches
      finalize: 'finalize_audit',   // No more files, finalize
    }
  );

  // After Blue Team patches, test in sandbox
  workflow.addEdge('blueteam_patch', 'sandbox_test');

  // After sandbox testing, continue to next file or finalize
  workflow.addConditionalEdges(
    'sandbox_test',
    shouldContinueAfterTest,
    {
      continue: 'redteam_analysis', // More files to scan
      finalize: 'finalize_audit',   // All files scanned
    }
  );

  // Finalize ends the workflow
  workflow.addEdge('finalize_audit', END);

  // Compile the graph
  const app = workflow.compile();

  logger.info('Aegis Swarm workflow graph compiled successfully');

  return app;
};

/**
 * Conditional edge function: Should continue scanning files?
 * 
 * Returns:
 * - 'continue': More files to scan, no vulnerabilities in current file
 * - 'patch': Vulnerabilities found, need to generate patches
 * - 'finalize': All files scanned
 */
const shouldContinueScanning = (state) => {
  // Check if all files have been scanned
  if (state.currentFileIndex >= state.files.length) {
    logger.info('All files scanned, finalizing audit');
    return 'finalize';
  }

  // Check if current file has vulnerabilities
  const currentFileVulns = state.vulnerabilities.filter(
    v => v.filePath === state.currentFile?.path
  );

  if (currentFileVulns.length > 0) {
    logger.info(`Vulnerabilities found in ${state.currentFile?.path}, generating patches`);
    return 'patch';
  }

  // No vulnerabilities, continue to next file
  logger.info(`No vulnerabilities in ${state.currentFile?.path}, continuing to next file`);
  return 'continue';
};

/**
 * Conditional edge function: Should continue after sandbox test?
 * 
 * Returns:
 * - 'continue': More files to scan
 * - 'finalize': All files scanned
 */
const shouldContinueAfterTest = (state) => {
  // Check if there are more files to scan
  if (state.currentFileIndex >= state.files.length) {
    logger.info('All files scanned after testing, finalizing audit');
    return 'finalize';
  }

  logger.info('Continuing to next file after testing');
  return 'continue';
};

/**
 * Run the audit workflow
 * 
 * @param {Object} auditData - Initial audit data
 * @param {Function} onUpdate - Callback for state updates
 * @returns {Promise<Object>} Final state
 */
export const runAuditWorkflow = async (auditData, onUpdate = null) => {
  try {
    logger.info(`Starting audit workflow for: ${auditData.repoUrl}`);

    // Create workflow
    const app = createAuditWorkflow();

    // Create initial state
    const initialState = {
      auditId: auditData.auditId,
      repoUrl: auditData.repoUrl,
      prNumber: auditData.prNumber || null,
      branch: auditData.branch || 'main',
      workspacePath: null,
      files: [],
      currentFileIndex: 0,
      currentFile: null,
      vulnerabilities: [],
      patches: [],
      testResults: [],
      status: 'running',
      currentStep: 'init',
      error: null,
      stats: {
        totalFiles: 0,
        scannedFiles: 0,
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        patchesApplied: 0,
        testsPassed: 0,
      },
      messages: [],
    };

    // Run the workflow with streaming
    let finalState = initialState;

    for await (const state of await app.stream(initialState)) {
      // Get the latest state from the stream
      const nodeOutput = Object.values(state)[0];
      finalState = { ...finalState, ...nodeOutput };

      // Call update callback if provided
      if (onUpdate) {
        await onUpdate(finalState);
      }

      logger.debug(`Workflow step completed: ${finalState.currentStep}`);
    }

    logger.info(`Audit workflow completed for: ${auditData.repoUrl}`);
    return finalState;

  } catch (error) {
    logger.error('Audit workflow error:', error);
    throw error;
  }
};

export default { createAuditWorkflow, runAuditWorkflow };

// Made with Bob