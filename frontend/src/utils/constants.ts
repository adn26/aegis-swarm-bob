export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api';

export const SEVERITY_COLORS = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;

export const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'] as const;

export const STATUS_LABELS = {
  pending: 'Pending',
  cloning: 'Cloning Repository',
  scanning: 'Scanning Files',
  analyzing: 'Analyzing Code',
  patching: 'Generating Patches',
  testing: 'Testing Patches',
  completed: 'Completed',
  failed: 'Failed',
} as const;

export const EVENT_ICONS = {
  connected: '🔗',
  audit_started: '🚀',
  repo_cloned: '📦',
  files_scanned: '📁',
  redteam_analyzing: '🔴',
  vulnerability_found: '⚠️',
  blueteam_patching: '🔵',
  patch_generated: '✅',
  sandbox_deploying: '🐳',
  tests_running: '🧪',
  test_results: '📊',
  audit_completed: '🎉',
  error: '❌',
  progress: '⏳',
  agent_thinking: '🤔',
} as const;

export const VULNERABILITY_CATEGORIES = [
  'SQL Injection',
  'Cross-Site Scripting (XSS)',
  'CSRF',
  'Authentication Bypass',
  'Path Traversal',
  'Insecure Dependencies',
  'Hardcoded Secrets',
  'Prompt Injection',
  'Insecure LLM Configuration',
  'Data Leakage',
  'Model DoS',
  'Insecure Output Handling',
  'Training Data Poisoning',
] as const;

export const FILE_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx'],
  python: ['.py'],
  java: ['.java'],
  csharp: ['.cs'],
  go: ['.go'],
  rust: ['.rs'],
  php: ['.php'],
  ruby: ['.rb'],
} as const;

// Made with Bob
