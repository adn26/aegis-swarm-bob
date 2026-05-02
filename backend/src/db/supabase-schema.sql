-- Aegis Swarm Database Schema for Supabase (PostgreSQL)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Audits table: Main audit records
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  tests_passed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Vulnerabilities table: Detected security issues
CREATE TABLE IF NOT EXISTS vulnerabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INTEGER,
  line_end INTEGER,
  type TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')),
  description TEXT NOT NULL,
  exploit_code TEXT,
  is_ai_related BOOLEAN DEFAULT false,
  owasp_category TEXT,
  cwe_id TEXT,
  cvss_score DECIMAL(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patches table: Generated security patches
CREATE TABLE IF NOT EXISTS patches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vulnerability_id UUID NOT NULL REFERENCES vulnerabilities(id) ON DELETE CASCADE,
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_code TEXT,
  patched_code TEXT,
  diff TEXT,
  explanation TEXT,
  test_passed BOOLEAN DEFAULT false,
  test_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table: Generated PDF reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  pdf_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scanned files table: Files metadata
CREATE TABLE IF NOT EXISTS scanned_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  lines_of_code INTEGER,
  language TEXT,
  has_vulnerabilities BOOLEAN DEFAULT false,
  vulnerability_count INTEGER DEFAULT 0,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
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

-- Enable Row Level Security (RLS)
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all operations for service role, read-only for anon)
-- Audits
CREATE POLICY "Allow service role all operations on audits" ON audits
  FOR ALL USING (true);

CREATE POLICY "Allow anon read access to audits" ON audits
  FOR SELECT USING (true);

-- Vulnerabilities
CREATE POLICY "Allow service role all operations on vulnerabilities" ON vulnerabilities
  FOR ALL USING (true);

CREATE POLICY "Allow anon read access to vulnerabilities" ON vulnerabilities
  FOR SELECT USING (true);

-- Patches
CREATE POLICY "Allow service role all operations on patches" ON patches
  FOR ALL USING (true);

CREATE POLICY "Allow anon read access to patches" ON patches
  FOR SELECT USING (true);

-- Reports
CREATE POLICY "Allow service role all operations on reports" ON reports
  FOR ALL USING (true);

CREATE POLICY "Allow anon read access to reports" ON reports
  FOR SELECT USING (true);

-- Scanned Files
CREATE POLICY "Allow service role all operations on scanned_files" ON scanned_files
  FOR ALL USING (true);

CREATE POLICY "Allow anon read access to scanned_files" ON scanned_files
  FOR SELECT USING (true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Add updated_at column to audits if you want to track updates
-- ALTER TABLE audits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Made with Bob
