export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface SSEEvent {
  id: string;
  type: SSEEventType;
  timestamp: string;
  data: any;
}

export type SSEEventType =
  | 'connected'
  | 'audit_started'
  | 'repo_cloned'
  | 'files_scanned'
  | 'redteam_analyzing'
  | 'vulnerability_found'
  | 'blueteam_patching'
  | 'patch_generated'
  | 'sandbox_deploying'
  | 'tests_running'
  | 'test_results'
  | 'audit_completed'
  | 'error'
  | 'progress'
  | 'agent_thinking';

export interface SSEConnectionStatus {
  connected: boolean;
  error?: string;
  reconnecting?: boolean;
}

// Made with Bob
