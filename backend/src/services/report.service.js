import storageService from './storage.service.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '../../../workspace/reports');

class ReportService {
  constructor() {
    this.ensureReportsDir();
  }

  async ensureReportsDir() {
    try {
      await fs.mkdir(REPORTS_DIR, { recursive: true });
    } catch (err) {
      console.error('Failed to create reports directory:', err);
    }
  }

  /**
   * Generates a Markdown report for a completed audit
   * @param {string} auditId 
   * @returns {Promise<string>} path to the generated report
   */
  async generateMarkdownReport(auditId) {
    const audit = await storageService.getAudit(auditId);
    if (!audit) throw new Error(`Audit not found: ${auditId}`);
    
    // We assume vulnerabilities have been updated with consensus severity in finalize.node.js
    const vulnerabilities = await storageService.getVulnerabilities(auditId);

    const activeVulns = vulnerabilities.filter(v => !v.consensusExcluded);
    const falsePositives = vulnerabilities.filter(v => v.consensusExcluded);

    const critical = activeVulns.filter(v => v.severity === 'Critical');
    const high = activeVulns.filter(v => v.severity === 'High');
    const medium = activeVulns.filter(v => v.severity === 'Medium');
    const low = activeVulns.filter(v => v.severity === 'Low' || v.severity === 'Info');

    const top3Critical = critical.slice(0, 3);
    const riskRating = critical.length > 0 ? 'CRITICAL' : (high.length > 0 ? 'HIGH' : (medium.length > 0 ? 'MEDIUM' : 'LOW'));

    let md = `# Aegis Swarm Security Audit Report\n\n`;
    md += `**Audit ID:** ${auditId}\n`;
    md += `**Target:** ${audit.repoUrl}\n`;
    md += `**Date:** ${new Date().toISOString()}\n\n`;

    md += `## Executive Summary\n\n`;
    md += `- **Overall Risk Rating:** ${riskRating}\n`;
    md += `- **Total Findings:** ${activeVulns.length}\n`;
    md += `  - Critical: ${critical.length}\n`;
    md += `  - High: ${high.length}\n`;
    md += `  - Medium: ${medium.length}\n`;
    md += `  - Low/Info: ${low.length}\n\n`;

    if (top3Critical.length > 0) {
      md += `### Top Critical Risks\n`;
      top3Critical.forEach((v, i) => {
        md += `${i + 1}. **${v.title}** (${v.file}:${v.line_start || 'unknown'})\n`;
      });
      md += `\n`;
    }

    const renderFindings = (findings, level, subtitle) => {
      if (findings.length === 0) return '';
      let out = `## ${level} Findings [${subtitle}]\n\n`;
      findings.forEach(v => {
        out += `### ${v.title} [${v.severity}]\n`;
        out += `- **File:** \`${v.file}:${v.line_start || '?'}-${v.line_end || '?'}\`\n`;
        out += `- **Source:** ${v.source || 'Unknown'} (${v.rule_id || 'N/A'})\n`;
        out += `- **Verdict:** ${v.verdict || 'N/A'}\n\n`;
        
        if (v.description) {
          out += `**Attack Narrative:**\n${v.description}\n\n`;
        }

        if (v.severity_justification) {
          out += `**Blue Team Justification:**\n${v.severity_justification}\n\n`;
        }

        if (v.patch && v.patch.code_after) {
          out += `**Patched Code (${v.remediation_complexity || 'unknown'} complexity):**\n`;
          out += `\`\`\`${path.extname(v.file).replace('.', '') || 'text'}\n`;
          out += v.patch.code_after;
          out += `\n\`\`\`\n\n`;
        }
        
        if (v.additional_hardening && Array.isArray(v.additional_hardening)) {
           out += `**Additional Hardening:**\n`;
           v.additional_hardening.forEach(h => out += `- ${h}\n`);
           out += `\n`;
        }
      });
      return out;
    };

    md += renderFindings(critical, 'Critical', 'immediate action required');
    md += renderFindings(high, 'High', 'fix within 1 sprint');
    md += renderFindings(medium, 'Medium', 'fix within 1 quarter');
    md += renderFindings(low, 'Low / Info', 'backlog');

    md += `## Appendix\n\n`;
    md += `### False Positives / Disputed\n`;
    if (falsePositives.length === 0) {
      md += `None identified.\n\n`;
    } else {
      falsePositives.forEach(v => {
        md += `- **${v.title}** (${v.file}): ${v.verdict} - ${v.severity_justification || 'No justification provided'}\n`;
      });
      md += `\n`;
    }

    md += `### Scan Coverage\n`;
    md += `- **Files Analyzed:** ${audit.scannedFiles || 0}\n`;
    md += `- **Total Files:** ${audit.totalFiles || 0}\n`;

    const reportPath = path.join(REPORTS_DIR, `audit-${auditId}.md`);
    await fs.writeFile(reportPath, md, 'utf-8');
    
    return reportPath;
  }
}

export default new ReportService();
