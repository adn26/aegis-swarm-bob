import { getSupabase } from '../db/supabase.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Storage service for Supabase database operations
 */
class StorageService {
  constructor() {
    this.supabase = getSupabase();
  }

  // ==================== AUDITS ====================

  /**
   * Create a new audit
   */
  async createAudit(data) {
    try {
      const { data: audit, error } = await this.supabase
        .from('audits')
        .insert({
          repo_url: data.repoUrl,
          pr_number: data.prNumber || null,
          branch: data.branch || null,
          commit_sha: data.commitSha || null,
          workspace_path: data.workspacePath || null,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created audit: ${audit.id}`);
      return audit;
    } catch (error) {
      logger.error('Failed to create audit:', error);
      throw new DatabaseError('Failed to create audit', error.message);
    }
  }

  /**
   * Get audit by ID
   */
  async getAudit(id) {
    try {
      const { data: audit, error } = await this.supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Audit');
        }
        throw error;
      }

      return audit;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get audit:', error);
      throw new DatabaseError('Failed to get audit', error.message);
    }
  }

  /**
   * Update audit
   */
  async updateAudit(id, data) {
    try {
      const updates = {};

      if (data.status !== undefined) updates.status = data.status;
      if (data.totalFiles !== undefined) updates.total_files = data.totalFiles;
      if (data.scannedFiles !== undefined) updates.scanned_files = data.scannedFiles;
      if (data.totalVulnerabilities !== undefined) updates.total_vulnerabilities = data.totalVulnerabilities;
      if (data.criticalCount !== undefined) updates.critical_count = data.criticalCount;
      if (data.highCount !== undefined) updates.high_count = data.highCount;
      if (data.mediumCount !== undefined) updates.medium_count = data.mediumCount;
      if (data.lowCount !== undefined) updates.low_count = data.lowCount;
      if (data.patchesApplied !== undefined) updates.patches_applied = data.patchesApplied;
      if (data.testsPassed !== undefined) updates.tests_passed = data.testsPassed;
      if (data.errorMessage !== undefined) updates.error_message = data.errorMessage;
      
      if (data.status === 'completed' || data.status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }

      if (Object.keys(updates).length === 0) {
        return this.getAudit(id);
      }

      const { data: audit, error } = await this.supabase
        .from('audits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Updated audit: ${id}`);
      return audit;
    } catch (error) {
      logger.error('Failed to update audit:', error);
      throw new DatabaseError('Failed to update audit', error.message);
    }
  }

  /**
   * Get all audits with pagination
   */
  async getAudits(limit = 50, offset = 0) {
    try {
      const { data: audits, error } = await this.supabase
        .from('audits')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return audits;
    } catch (error) {
      logger.error('Failed to get audits:', error);
      throw new DatabaseError('Failed to get audits', error.message);
    }
  }

  // ==================== VULNERABILITIES ====================

  /**
   * Create vulnerability
   */
  async createVulnerability(data) {
    try {
      const { data: vulnerability, error } = await this.supabase
        .from('vulnerabilities')
        .insert({
          audit_id: data.auditId,
          file_path: data.filePath,
          line_number: data.lineNumber || null,
          line_end: data.lineEnd || null,
          type: data.type,
          category: data.category || null,
          severity: data.severity,
          description: data.description,
          exploit_code: data.exploitCode || null,
          is_ai_related: data.isAiRelated || false,
          owasp_category: data.owaspCategory || null,
          cwe_id: data.cweId || null,
          cvss_score: data.cvssScore || null,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created vulnerability: ${vulnerability.id}`);
      return vulnerability;
    } catch (error) {
      logger.error('Failed to create vulnerability:', error);
      throw new DatabaseError('Failed to create vulnerability', error.message);
    }
  }

  /**
   * Get vulnerabilities for an audit
   */
  async getVulnerabilities(auditId) {
    try {
      const { data: vulnerabilities, error } = await this.supabase
        .from('vulnerabilities')
        .select('*')
        .eq('audit_id', auditId)
        .order('severity', { ascending: true })
        .order('file_path', { ascending: true });

      if (error) throw error;

      // Sort by severity (Critical, High, Medium, Low)
      const severityOrder = { Critical: 1, High: 2, Medium: 3, Low: 4 };
      return vulnerabilities.sort((a, b) => 
        severityOrder[a.severity] - severityOrder[b.severity]
      );
    } catch (error) {
      logger.error('Failed to get vulnerabilities:', error);
      throw new DatabaseError('Failed to get vulnerabilities', error.message);
    }
  }

  // ==================== PATCHES ====================

  /**
   * Create patch
   */
  async createPatch(data) {
    try {
      const { data: patch, error } = await this.supabase
        .from('patches')
        .insert({
          vulnerability_id: data.vulnerabilityId,
          audit_id: data.auditId,
          file_path: data.filePath,
          original_code: data.originalCode || null,
          patched_code: data.patchedCode || null,
          diff: data.diff || null,
          explanation: data.explanation || null,
          test_passed: data.testPassed || false,
          test_output: data.testOutput || null,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created patch: ${patch.id}`);
      return patch;
    } catch (error) {
      logger.error('Failed to create patch:', error);
      throw new DatabaseError('Failed to create patch', error.message);
    }
  }

  /**
   * Get patches for an audit
   */
  async getPatches(auditId) {
    try {
      const { data: patches, error } = await this.supabase
        .from('patches')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return patches;
    } catch (error) {
      logger.error('Failed to get patches:', error);
      throw new DatabaseError('Failed to get patches', error.message);
    }
  }

  // ==================== SCANNED FILES ====================

  /**
   * Create scanned file record
   */
  async createScannedFile(data) {
    try {
      const { data: scannedFile, error } = await this.supabase
        .from('scanned_files')
        .insert({
          audit_id: data.auditId,
          file_path: data.filePath,
          file_size: data.fileSize || null,
          lines_of_code: data.linesOfCode || null,
          language: data.language || null,
          has_vulnerabilities: data.hasVulnerabilities || false,
          vulnerability_count: data.vulnerabilityCount || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return scannedFile;
    } catch (error) {
      logger.error('Failed to create scanned file:', error);
      throw new DatabaseError('Failed to create scanned file', error.message);
    }
  }

  /**
   * Get scanned files for an audit
   */
  async getScannedFiles(auditId) {
    try {
      const { data: scannedFiles, error } = await this.supabase
        .from('scanned_files')
        .select('*')
        .eq('audit_id', auditId)
        .order('file_path', { ascending: true });

      if (error) throw error;

      return scannedFiles;
    } catch (error) {
      logger.error('Failed to get scanned files:', error);
      throw new DatabaseError('Failed to get scanned files', error.message);
    }
  }

  // ==================== REPORTS ====================

  /**
   * Create report record
   */
  async createReport(data) {
    try {
      const { data: report, error } = await this.supabase
        .from('reports')
        .insert({
          audit_id: data.auditId,
          pdf_path: data.pdfPath,
          file_size: data.fileSize || null,
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Created report: ${report.id}`);
      return report;
    } catch (error) {
      logger.error('Failed to create report:', error);
      throw new DatabaseError('Failed to create report', error.message);
    }
  }

  /**
   * Get report for an audit
   */
  async getReport(auditId) {
    try {
      const { data: report, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('audit_id', auditId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return report;
    } catch (error) {
      logger.error('Failed to get report:', error);
      throw new DatabaseError('Failed to get report', error.message);
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get audit statistics
   */
  async getAuditStats(auditId) {
    try {
      const audit = await this.getAudit(auditId);
      const vulnerabilities = await this.getVulnerabilities(auditId);
      const patches = await this.getPatches(auditId);
      const scannedFiles = await this.getScannedFiles(auditId);

      return {
        audit,
        vulnerabilities,
        patches,
        scannedFiles,
        summary: {
          totalVulnerabilities: vulnerabilities.length,
          criticalCount: vulnerabilities.filter(v => v.severity === 'Critical').length,
          highCount: vulnerabilities.filter(v => v.severity === 'High').length,
          mediumCount: vulnerabilities.filter(v => v.severity === 'Medium').length,
          lowCount: vulnerabilities.filter(v => v.severity === 'Low').length,
          aiRelatedCount: vulnerabilities.filter(v => v.is_ai_related).length,
          patchesApplied: patches.length,
          patchesSuccessful: patches.filter(p => p.test_passed).length,
          filesScanned: scannedFiles.length,
          filesWithVulnerabilities: scannedFiles.filter(f => f.has_vulnerabilities).length,
        },
      };
    } catch (error) {
      logger.error('Failed to get audit stats:', error);
      throw new DatabaseError('Failed to get audit stats', error.message);
    }
  }
}

export default new StorageService();

// Made with Bob
