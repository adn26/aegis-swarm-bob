-- Aegis Swarm Database Schema
-- SQLite database for tracking security audits

-- Audits table: Main audit records
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  pr_number INTEGER,
  branch TEXT,
  commit_sha TEXT,
  workspace_path TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'cloning', 'scanning', 'analyzing', 'patching', 'testing', 'completed', 'failed')),
  total_files INTEGER DEFAULT 0,
  scanned_files INTEGER DEFAULT 0,
  total_vulnerabilities INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  patches_applied INTEGER DEFAULT 0,
  tests_passed BOOLEAN DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

-- Vulnerabilities table: Detected security issues
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  line_end INTEGER,
  type TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT NOT NULL,
  exploit_code TEXT,
  is_ai_related BOOLEAN DEFAULT 0,
  owasp_category TEXT,
  cwe_id TEXT,
  cvss_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Patches table: Generated security patches
CREATE TABLE IF NOT EXISTS patches (
  id TEXT PRIMARY KEY,
  vulnerability_id TEXT NOT NULL,
  audit_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_code TEXT,
  patched_code TEXT,
  diff TEXT,
  explanation TEXT,
  test_passed BOOLEAN DEFAULT 0,
  test_output TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Reports table: Generated PDF reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Files table: Scanned files metadata
CREATE TABLE IF NOT EXISTS scanned_files (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  lines_of_code INTEGER,
  language TEXT,
  has_vulnerabilities BOOLEAN DEFAULT 0,
  vulnerability_count INTEGER DEFAULT 0,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_audit_id ON vulnerabilities(audit_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_is_ai_related ON vulnerabilities(is_ai_related);
CREATE INDEX IF NOT EXISTS idx_patches_audit_id ON patches(audit_id);
CREATE INDEX IF NOT EXISTS idx_patches_vulnerability_id ON patches(vulnerability_id);
CREATE INDEX IF NOT EXISTS idx_scanned_files_audit_id ON scanned_files(audit_id);

-- Made with Bob
