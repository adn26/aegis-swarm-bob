import { Annotation } from '@langchain/langgraph';

/**
 * LangGraph State Schema for Aegis Swarm
 * Defines the state structure that flows through the agent workflow
 */

export const AuditState = Annotation.Root({
  // Audit metadata
  auditId: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  repoUrl: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  prNumber: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  branch: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 'main',
  }),
  
  workspacePath: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  // File scanning results
  files: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => [],
  }),
  
  currentFileIndex: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 0,
  }),
  
  currentFile: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  // vulnerabilities
  vulnerabilities: Annotation({
    reducer: (prev, next) => {
      if (!next || !Array.isArray(next)) return prev;
      const existingKeys = new Set(
        prev.map(v => v.id || `${v.filePath}:${v.lineNumber}:${v.type}`)
      );
      const newItems = next.filter(v => {
        const key = v.id || `${v.filePath}:${v.lineNumber}:${v.type}`;
        return !existingKeys.has(key);
      });
      const combined = [...prev, ...newItems];
      return combined.slice(-200); // cap at 200 vulns in state
    },
    default: () => [],
  }),

  // patches
  patches: Annotation({
    reducer: (prev, next) => {
      if (!next || !Array.isArray(next)) return prev;
      const existingIds = new Set(prev.map(p => p.id));
      const newItems = next.filter(p => p.id && !existingIds.has(p.id));
      return [...prev, ...newItems];
    },
    default: () => [],
  }),

  // testResults — no good unique key, dedupe by patchId+filePath
  testResults: Annotation({
    reducer: (prev, next) => {
      if (!next || !Array.isArray(next)) return prev;
      const existingKeys = new Set(prev.map(r => `${r.patchId}:${r.filePath}`));
      const newItems = next.filter(r => !existingKeys.has(`${r.patchId}:${r.filePath}`));
      return [...prev, ...newItems];
    },
    default: () => [],
  }),
  
  // Workflow control
  status: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 'pending',
  }),
  
  currentStep: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 'init',
  }),
  
  error: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null,
  }),
  
  // Statistics
  stats: Annotation({
    reducer: (prev, next) => {
      if (!next) return prev;
      // Only take next values that are explicitly set, don't blindly merge
      return { ...prev, ...next };
    },
    default: () => ({
      totalFiles: 0,
      scannedFiles: 0,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      patchesApplied: 0,
      testsPassed: 0,
    }),
  }),
  
  // Agent messages and reasoning
  messages: Annotation({
    reducer: (prev, next) => {
      if (!next) return prev;
      const combined = [...prev, ...next];
      return combined.slice(-20); // only keep last 20 messages
    },
    default: () => [],
  }),
});

/**
 * Helper function to create initial state
 */
export const createInitialState = (auditData) => {
  return {
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
    status: 'pending',
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
};

/**
 * Helper function to update statistics
 */
export const updateStats = (state, updates) => {
  return {
    ...state,
    stats: {
      ...state.stats,
      ...updates,
    },
  };
};

/**
 * Helper function to add vulnerability
 */
export const addVulnerability = (state, vulnerability) => {
  const newVulnerabilities = [...state.vulnerabilities, vulnerability];
  
  // Update stats
  const severityCounts = {
    criticalCount: newVulnerabilities.filter(v => v.severity === 'Critical').length,
    highCount: newVulnerabilities.filter(v => v.severity === 'High').length,
    mediumCount: newVulnerabilities.filter(v => v.severity === 'Medium').length,
    lowCount: newVulnerabilities.filter(v => v.severity === 'Low').length,
  };
  
  return {
    ...state,
    vulnerabilities: newVulnerabilities,
    stats: {
      ...state.stats,
      totalVulnerabilities: newVulnerabilities.length,
      ...severityCounts,
    },
  };
};

/**
 * Helper function to add patch
 */
export const addPatch = (state, patch) => {
  const newPatches = [...state.patches, patch];
  
  return {
    ...state,
    patches: newPatches,
    stats: {
      ...state.stats,
      patchesApplied: newPatches.length,
    },
  };
};

/**
 * Helper function to add message
 */
export const addMessage = (state, message) => {
  return {
    ...state,
    messages: [...state.messages, {
      ...message,
      timestamp: new Date().toISOString(),
    }],
  };
};

/**
 * Helper function to move to next file
 */
export const moveToNextFile = (state) => {
  const nextIndex = state.currentFileIndex + 1;
  
  if (nextIndex >= state.files.length) {
    return {
      ...state,
      currentFileIndex: nextIndex,
      currentFile: null,
      currentStep: 'all_files_scanned',
    };
  }
  
  return {
    ...state,
    currentFileIndex: nextIndex,
    currentFile: state.files[nextIndex],
    stats: {
      ...state.stats,
      scannedFiles: nextIndex,
    },
  };
};

export default AuditState;

// Made with Bob