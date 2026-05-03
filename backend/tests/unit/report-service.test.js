import fs from 'fs/promises';
import path from 'path';
import { jest } from '@jest/globals';
import storageService from '../../src/services/storage.service.js';
import reportService from '../../src/services/report.service.js';

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate a markdown report successfully', async () => {
    const auditId = 'test-audit-123';
    const mockAudit = {
      repoUrl: 'https://github.com/test/repo',
      scannedFiles: 10,
      totalFiles: 15
    };

    const mockVulnerabilities = [
      {
        id: 'vuln-1',
        title: 'SQL Injection',
        file: 'src/db.js',
        line_start: 10,
        line_end: 12,
        severity: 'Critical',
        source: 'semgrep',
        rule_id: 'sql-inj',
        verdict: 'confirmed',
        description: 'An attacker can inject SQL...',
        severity_justification: 'High impact to DB',
        patch: { code_after: 'sanitized()' },
        consensusExcluded: false
      },
      {
        id: 'vuln-2',
        title: 'False Positive Secret',
        file: 'src/config.js',
        severity: 'High',
        verdict: 'false-positive',
        consensusExcluded: true,
        severity_justification: 'It is a test key'
      }
    ];

    jest.spyOn(storageService, 'getAudit').mockResolvedValue(mockAudit);
    jest.spyOn(storageService, 'getVulnerabilities').mockResolvedValue(mockVulnerabilities);
    
    // Stub fs.writeFile so we don't actually write to disk during unit tests
    const writeFileSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    const reportPath = await reportService.generateMarkdownReport(auditId);
    
    expect(reportPath).toContain(`audit-${auditId}.md`);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    
    const writtenContent = writeFileSpy.mock.calls[0][1];
    expect(writtenContent).toContain('Aegis Swarm Security Audit Report');
    expect(writtenContent).toContain('**Target:** https://github.com/test/repo');
    expect(writtenContent).toContain('**Overall Risk Rating:** CRITICAL');
    expect(writtenContent).toContain('SQL Injection');
    expect(writtenContent).toContain('False Positive Secret');
    expect(writtenContent).toContain('It is a test key');
    expect(writtenContent).toContain('sanitized()');
  });

  it('should throw if audit not found', async () => {
    jest.spyOn(storageService, 'getAudit').mockResolvedValue(null);

    await expect(reportService.generateMarkdownReport('nonexistent')).rejects.toThrow('Audit not found');
  });
});
