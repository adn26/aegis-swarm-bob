import { StateGraph, END } from '@langchain/langgraph';
import { AuditState, moveToNextFile } from './state.js';
import logger from '../../utils/logger.js';

// Import node implementations
import { cloneRepositoryNode } from '../nodes/clone.node.js';
import { scanFilesNode } from '../nodes/scan.node.js';
import { redTeamAnalysisNode } from '../nodes/redteam.node.js';
import { blueTeamPatchNode } from '../nodes/blueteam.node.js';
import { sandboxTestNode } from '../nodes/sandbox.node.js';
import { finalizeAuditNode } from '../nodes/finalize.node.js';

/**
 * Helper node to move to next file
 */
const moveToNextFileNode = async (state) => {
  logger.info(`Moving to next file. Current index: ${state.currentFileIndex}`);
  return moveToNextFile(state);
};

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
  workflow.addNode('move_to_next_file', moveToNextFileNode);
  workflow.addNode('blueteam_patch', blueTeamPatchNode);
  workflow.addNode('sandbox_test', sandboxTestNode);
  workflow.addNode('finalize_audit', finalizeAuditNode);

  // Set entry point
  workflow.addEdge('__start__', 'clone_repository');

  // Define edges - check for failures after clone
  workflow.addConditionalEdges(
    'clone_repository',
    shouldContinueAfterClone,
    {
      continue: 'scan_files',
      end: END,
    }
  );
  
  // After scanning files, start Red Team analysis
  workflow.addEdge('scan_files', 'redteam_analysis');

  // Conditional edge after Red Team analysis
  workflow.addConditionalEdges(
    'redteam_analysis',
    shouldContinueScanning,
    {
      continue: 'move_to_next_file', // More files to scan, move to next
      patch: 'blueteam_patch',       // Vulnerabilities found, generate patches
      finalize: 'finalize_audit',    // No more files, finalize
    }
  );

  // After moving to next file, analyze it
  workflow.addEdge('move_to_next_file', 'redteam_analysis');

  // After Blue Team patches, test in sandbox
  workflow.addEdge('blueteam_patch', 'sandbox_test');

  // After sandbox testing, continue to next file or finalize
  workflow.addConditionalEdges(
    'sandbox_test',
    shouldContinueAfterTest,
    {
      continue: 'move_to_next_file', // More files to scan
      finalize: 'finalize_audit',    // All files scanned
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
 * Conditional edge function: Should continue after clone?
 *
 * Returns:
 * - 'continue': Clone successful, proceed to scanning
 * - 'end': Clone failed, stop workflow
 */
const shouldContinueAfterClone = (state) => {
  if (state.status === 'failed' || state.error) {
    logger.error('Clone failed, stopping workflow');
    return 'end';
  }
  return 'continue';
};

/**
 * Conditional edge function: Should continue scanning files?
 *
 * Returns:
 * - 'continue': More files to scan, no serious vulnerabilities in current file
 * - 'patch': Critical/High severity vulnerabilities found, need to generate patches
 * - 'finalize': All files scanned
 */
const shouldContinueScanning = (state) => {
  // Check if current file has vulnerabilities
  const currentFileVulns = state.vulnerabilities.filter(
    v => v.filePath === state.currentFile?.path
  );

  // Only patch Critical or High severity — skip Medium/Low for speed
  const seriousVulns = currentFileVulns.filter(
    v => v.severity === 'Critical' || v.severity === 'High'
  );

  if (seriousVulns.length > 0) {
    logger.info(`${seriousVulns.length} serious vulnerabilities found in ${state.currentFile?.path}, generating patches`);
    return 'patch';
  }

  // No serious vulnerabilities in current file, move to next file
  const nextIndex = state.currentFileIndex + 1;
  
  // Check if there are more files to scan
  if (nextIndex >= state.files.length) {
    logger.info('All files scanned, finalizing audit');
    return 'finalize';
  }

  // Continue to next file
  if (currentFileVulns.length > 0) {
    logger.info(`${currentFileVulns.length} low-priority vulnerabilities in ${state.currentFile?.path}, skipping patches`);
  } else {
    logger.info(`No vulnerabilities in ${state.currentFile?.path}, continuing to next file`);
  }
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
  // Move to next file after testing current file's patches
  const nextIndex = state.currentFileIndex + 1;
  
  // Check if there are more files to scan
  if (nextIndex >= state.files.length) {
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

    // Use streaming to get updates after each node execution
    logger.info('Starting workflow stream...');
    let finalState = initialState;
    
    // Stream the workflow execution with increased recursion limit
    const stream = await app.stream(initialState, {
      recursionLimit: 500, // Allow up to 500 iterations for large repos (handles ~125 files with patching)
    });
    
    // Process each state update
    for await (const output of stream) {
      // output is an object with node names as keys
      // e.g., { clone_repository: { ...state } }
      const nodeName = Object.keys(output)[0];
      const state = output[nodeName];
      
      logger.info(`Node '${nodeName}' completed, status: ${state.status}`);
      
      // Update final state
      finalState = state;
      
      // Call update callback if provided
      if (onUpdate) {
        await onUpdate(state);
      }
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