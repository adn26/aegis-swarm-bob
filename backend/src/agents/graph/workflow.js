import { StateGraph, END } from '@langchain/langgraph';
import { AuditState, moveToNextFile } from './state.js';
import logger from '../../utils/logger.js';

// Import node implementations
import { cloneRepositoryNode } from '../nodes/clone.node.js';
import { scanFilesNode } from '../nodes/scan.node.js';
import { fastAnalysisNode } from '../nodes/fast-analysis.node.js';
import { redTeamAnalysisNode } from '../nodes/redteam.node.js';
import { blueTeamPatchNode } from '../nodes/blueteam.node.js';
import { sandboxTestNode } from '../nodes/sandbox.node.js';
import { finalizeAuditNode } from '../nodes/finalize.node.js';

/**
 * Node to prepare for the next phase
 */
const preparePhaseNode = (phaseName) => async (state) => {
  logger.info(`Switching phase to: ${phaseName}`);
  return {
    ...state,
    currentFileIndex: 0,
    currentFile: state.files.length > 0 ? state.files[0] : null,
    currentStep: `start_${phaseName}`,
  };
};

/**
 * Create the Aegis Swarm workflow graph
 * 
 * SEQUENTIAL Workflow:
 * 1. Clone repository
 * 2. Scan files
 * 3. PHASE 1: Red Team analyzes ALL files
 * 4. PHASE 2: Blue Team generates patches for ALL found vulnerabilities
 * 5. PHASE 3: Sandbox tests ALL generated patches
 * 6. Finalize audit and generate report
 */
export const createAuditWorkflow = () => {
  const workflow = new StateGraph(AuditState);

  // Add nodes
  workflow.addNode('clone_repository', cloneRepositoryNode);
  workflow.addNode('scan_files', scanFilesNode);
  workflow.addNode('fast_analysis', fastAnalysisNode);
  
  // Phase 1 Nodes
  workflow.addNode('redteam_analysis', redTeamAnalysisNode);
  workflow.addNode('redteam_next_file', async (state) => moveToNextFile(state));
  
  // Phase 2 Nodes
  workflow.addNode('prepare_blueteam', preparePhaseNode('blueteam'));
  workflow.addNode('blueteam_patch', blueTeamPatchNode);
  workflow.addNode('blueteam_next_file', async (state) => moveToNextFile(state));
  
  // Phase 3 Nodes
  workflow.addNode('prepare_sandbox', preparePhaseNode('sandbox'));
  workflow.addNode('sandbox_test', sandboxTestNode);
  workflow.addNode('sandbox_next_file', async (state) => moveToNextFile(state));
  
  workflow.addNode('finalize_audit', finalizeAuditNode);

  // --- Graph Edges ---

  // Entry
  workflow.addEdge('__start__', 'clone_repository');

  // Clone -> Scan
  workflow.addConditionalEdges(
    'clone_repository',
    (state) => (state.status === 'failed' ? 'end' : 'continue'),
    { continue: 'scan_files', end: END }
  );
  
  // Scan -> Fast Analysis -> Red Team
  workflow.addEdge('scan_files', 'fast_analysis');
  workflow.addEdge('fast_analysis', 'redteam_analysis');

  // Red Team Loop
  workflow.addConditionalEdges(
    'redteam_analysis',
    (state) => (state.currentFileIndex + 1 >= state.files.length ? 'next_phase' : 'continue'),
    {
      continue: 'redteam_next_file',
      next_phase: 'prepare_blueteam'
    }
  );
  workflow.addEdge('redteam_next_file', 'redteam_analysis');

  // Blue Team Loop
  workflow.addEdge('prepare_blueteam', 'blueteam_patch');
  workflow.addConditionalEdges(
    'blueteam_patch',
    (state) => (state.currentFileIndex + 1 >= state.files.length ? 'next_phase' : 'continue'),
    {
      continue: 'blueteam_next_file',
      next_phase: 'prepare_sandbox'
    }
  );
  workflow.addEdge('blueteam_next_file', 'blueteam_patch');

  // Sandbox Loop
  workflow.addEdge('prepare_sandbox', 'sandbox_test');
  workflow.addConditionalEdges(
    'sandbox_test',
    (state) => (state.currentFileIndex + 1 >= state.files.length ? 'next_phase' : 'continue'),
    {
      continue: 'sandbox_next_file',
      next_phase: 'finalize_audit'
    }
  );
  workflow.addEdge('sandbox_next_file', 'sandbox_test');

  // Finalize
  workflow.addEdge('finalize_audit', END);

  const app = workflow.compile();
  logger.info('Aegis Swarm sequential workflow graph compiled');
  return app;
};

/**
 * Run the audit workflow
 */
export const runAuditWorkflow = async (auditData, onUpdate = null) => {
  try {
    logger.info(`Starting sequential audit workflow for: ${auditData.repoUrl}`);
    const app = createAuditWorkflow();

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
      fastMode: auditData.fastMode !== false, // Default to true if not specified
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

    let finalState = initialState;
    const stream = await app.stream(initialState, { recursionLimit: 1000 });
    
    for await (const output of stream) {
      const nodeName = Object.keys(output)[0];
      const state = output[nodeName];
      finalState = state;
      if (onUpdate) await onUpdate(state);
    }

    return finalState;
  } catch (error) {
    logger.error('Audit workflow error:', error);
    throw error;
  }
};

export default { createAuditWorkflow, runAuditWorkflow };
