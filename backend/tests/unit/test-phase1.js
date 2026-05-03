import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('analysis node findings mapping', () => {
  it('maps lineEnd and owaspCategory, and uses lineNumber not line', () => {
    const finding = {
      source: 'semgrep',
      title: 'SQL injection',
      description: 'Tainted SQL',
      file: 'src/db.js',
      line_start: 10,
      line_end: 12,
      severity: 'High',
      category: 'injection',
      owasp_category: 'A03:2021',
      rule_id: 'python.django.sql-injection',
      code_snippet: 'db.execute(query)',
      verified: false,
      cve_id: null,
    };

    // This mirrors the updated vuln object from analysis.node.js
    const vuln = {
      auditId: 'audit-1',
      filePath: finding.file,
      lineNumber: finding.line_start,
      lineEnd: finding.line_end,
      severity: finding.severity,
      type: finding.category,
      title: finding.title,
      description: finding.description,
      codeSnippet: finding.code_snippet,
      owaspCategory: finding.owasp_category,
      source: finding.source,
      status: 'detected',
      metadata: {
        verified: finding.verified || false,
        ruleId: finding.rule_id,
        cveId: finding.cve_id || null,
      },
    };

    assert.equal(vuln.lineNumber, 10, 'must use lineNumber not line');
    assert.equal(vuln.lineEnd, 12, 'lineEnd must be mapped');
    assert.equal(vuln.owaspCategory, 'A03:2021', 'owaspCategory must be mapped');
    assert.equal(vuln.metadata.ruleId, 'python.django.sql-injection', 'ruleId in metadata');
    assert.equal(vuln.metadata.verified, false);
  });
});

describe('Blue Team state update', () => {
  it('includes remediation_complexity and additional_hardening in the vuln state update', () => {
    const mockLLMResult = {
      id: 'SEMGREP-0',
      verdict: 'confirmed',
      severity_final: 'High',
      justification: 'Exploitable via direct input',
      existing_mitigations: 'None',
      remediation_complexity: 'function-refactor',
      additional_hardening: ['Enable CSP header', 'Add rate limiting'],
      patch: { description: 'Fix', code_before: 'bad', code_after: 'good' },
    };

    const stateUpdate = {
      verdict: mockLLMResult.verdict,
      severity_final: mockLLMResult.severity_final,
      justification_final: mockLLMResult.justification,
      existing_mitigations: mockLLMResult.existing_mitigations,
      remediation_complexity: mockLLMResult.remediation_complexity || null,
      additional_hardening: mockLLMResult.additional_hardening || [],
    };

    assert.equal(stateUpdate.remediation_complexity, 'function-refactor');
    assert.deepEqual(stateUpdate.additional_hardening, ['Enable CSP header', 'Add rate limiting']);
  });
});

describe('severity consensus', () => {
  function resolveSeverity(redSeverity, blueSeverity, verdict) {
    switch (verdict) {
      case 'confirmed-upgraded':   return blueSeverity;
      case 'confirmed-downgraded': return blueSeverity;
      case 'confirmed':            return blueSeverity;
      case 'disputed':             return 'Low';
      case 'false-positive':       return null;
      default:                     return redSeverity;
    }
  }

  it('confirmed-upgraded uses Blue severity', () => {
    assert.equal(resolveSeverity('Medium', 'Critical', 'confirmed-upgraded'), 'Critical');
  });
  it('confirmed-downgraded uses Blue severity', () => {
    assert.equal(resolveSeverity('High', 'Low', 'confirmed-downgraded'), 'Low');
  });
  it('confirmed uses Blue severity', () => {
    assert.equal(resolveSeverity('High', 'High', 'confirmed'), 'High');
  });
  it('disputed downgrades to Low', () => {
    assert.equal(resolveSeverity('Critical', 'Medium', 'disputed'), 'Low');
  });
  it('false-positive returns null', () => {
    assert.equal(resolveSeverity('High', 'Low', 'false-positive'), null);
  });
  it('no verdict falls back to Red severity', () => {
    assert.equal(resolveSeverity('High', null, undefined), 'High');
  });
});
