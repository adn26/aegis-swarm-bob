export interface Audit {
  id: string;
  repo_url: string;
  pr_number?: number;
  branch?: string;
  commit_sha?: string;
  workspace_path?: string;
  status: 'pending' | 'cloning' | 'scanning' | 'analyzing' | 'patching' | 'testing' | 'completed' | 'failed';
  total_files: number;
  scanned_files: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  patches_applied: number;
  tests_passed: boolean;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface AuditRequest {
  repoUrl: string;
  prNumber?: number;
  branch?: string;
}

export interface AuditResponse {
  success: boolean;
  message: string;
  data: {
    auditId: string;
    status: string;
    repoUrl: string;
    branch?: string;
    createdAt: string;
  };
}

export interface AuditResults {
  audit: Audit;
  vulnerabilities: Vulnerability[];
  patches: Patch[];
  scannedFiles: ScannedFile[];
}

export interface Vulnerability {
  id: string;
  audit_id: string;
  file_path: string;
  line_number?: number;
  line_end?: number;
  type: string;
  category?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  exploit_code?: string;
  is_ai_related: boolean;
  owasp_category?: string;
  cwe_id?: string;
  cvss_score?: number;
  created_at: string;
}

export interface Patch {
  id: string;
  vulnerability_id: string;
  audit_id: string;
  file_path: string;
  original_code?: string;
  patched_code?: string;
  diff?: string;
  explanation?: string;
  test_passed: boolean;
  test_output?: string;
  created_at: string;
}

export interface ScannedFile {
  id: string;
  audit_id: string;
  file_path: string;
  file_size: number;
  lines_of_code: number;
  language?: string;
  has_vulnerabilities: boolean;
  vulnerability_count: number;
  scanned_at: string;
}

export interface Report {
  id: string;
  audit_id: string;
  pdf_path: string;
  file_size: number;
  generated_at: string;
}

export interface SSEEvent {
  type: string;
  timestamp: string;
  data?: any;
}

// Made with Bob
