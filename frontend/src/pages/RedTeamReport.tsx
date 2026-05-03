import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Bug, Shield, Terminal, Zap } from 'lucide-react';
import { apiService } from '../services/api.service';
import { Audit, Vulnerability } from '../types/audit.types';
import '../styles/reports.css';

const RedTeamReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [auditData, vulns] = await Promise.all([
          apiService.getAudit(id),
          apiService.getVulnerabilities(id),
        ]);
        setAudit(auditData);
        setVulnerabilities(vulns);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-500 mb-2">Failed to Load Report</h2>
          <p className="text-red-400 mb-4">{error || 'Audit not found'}</p>
          <Link to="/" className="cc-btn cc-btn-gold inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="report-container">
      <div className="rh">
        <div>
          <div className="rtitle">Red Team — Exploit Report</div>
          <div className="rname">Audit #{(audit.id || '').slice(0, 8)} — {audit.repo_url || (audit as any).repoUrl}</div>
          <div className="rmeta">
            Analyzed by: Aegis Swarm &nbsp;|&nbsp; 
            {audit.completed_at || (audit as any).completedAt ? new Date(audit.completed_at || (audit as any).completedAt).toLocaleString() : 'In Progress'} &nbsp;|&nbsp; 
            {audit.branch || 'main'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`risk-badge ${(audit.critical_count || (audit as any).criticalCount || 0) > 0 ? 'risk-critical' : 'risk-high'}`}>
            {(audit.critical_count || (audit as any).criticalCount || 0) > 0 ? 'CRITICAL RISK' : 'HIGH RISK'}
          </div>
          <div style={{ fontSize: '9px', color: '#3a2c10' }}>{vulnerabilities.length} vulnerabilities found</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Threat Analysis Overview</div>
        <div className="vuln-card high">
          <p className="text-gold-200">
            The Red Team has completed a deep-dive security analysis of the repository. 
            A total of <span className="text-red-500 font-bold">{vulnerabilities.length}</span> security flaws were identified.
            The primary attack vectors discovered include <span className="text-white italic">{Array.from(new Set(vulnerabilities.map(v => v.type))).slice(0, 3).join(', ')}</span>.
          </p>
        </div>
      </div>

      {vulnerabilities.length > 0 ? (
        vulnerabilities.map((vuln, index) => (
          <div className="sec" key={vuln.id}>
            <div className="sec-label">Vulnerability {String(index + 1).padStart(2, '0')} — {vuln.severity}</div>
            <div className={`vuln-card ${vuln.severity.toLowerCase()}`}>
              <div className="vuln-top">
                <span className="vuln-id flex items-center gap-1">
                  <Bug className="w-3 h-3" /> {vuln.cwe_id || 'CWE-Unknown'}
                </span>
                <span className="vuln-name">{vuln.type}</span>
                <span className={`risk-badge risk-${vuln.severity.toLowerCase()}`}>{vuln.severity}</span>
              </div>
              <div className="vuln-desc p-4 bg-black/40 rounded border border-red-500/10 mb-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex flex-col gap-4 text-sm text-gray-300">
                    {vuln.description.split('\n\n**').map((part, i) => {
                      if (i === 0) return <p key={i}>{part}</p>;
                      
                      const [title, ...content] = part.split(':**\n');
                      if (!content.length) return <p key={i}>**{part}</p>;

                      return (
                        <div key={i} className="mt-2">
                          <h4 className="text-red-400 font-bold uppercase tracking-wide text-xs mb-1">{title}</h4>
                          <p className="whitespace-pre-wrap">{content.join(':**\n')}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="vuln-meta-row">
                <div className="vmeta">
                  <div className="vmeta-label">File Path</div>
                  <div className="vmeta-val truncate max-w-xs">{vuln.file_path || (vuln as any).filePath}</div>
                </div>
                <div className="vmeta">
                  <div className="vmeta-label">Location</div>
                  <div className="vmeta-val">Line {vuln.line_number || (vuln as any).lineNumber || (vuln as any).line || 'N/A'}</div>
                </div>
                <div className="vmeta">
                  <div className="vmeta-label">CVSS</div>
                  <div className={`vmeta-val font-bold ${(vuln.cvss_score || (vuln as any).cvssScore) && (vuln.cvss_score || (vuln as any).cvssScore) > 7 ? 'text-red-500' : 'text-orange-500'}`}>
                    {vuln.cvss_score || (vuln as any).cvssScore || '5.0'}
                  </div>
                </div>
              </div>

              {(vuln.exploit_code || (vuln as any).exploitCode) && (
                <>
                  <div className="code-label flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> Proof-of-concept exploit evidence
                  </div>
                  <div className="code-block" style={{ borderLeftColor: '#ef4444' }}>
                    <pre className="whitespace-pre-wrap text-red-400 font-mono text-sm">
                      {vuln.exploit_code || (vuln as any).exploitCode}
                    </pre>
                  </div>
                </>
              )}

              <div className="mt-4">
                <div className="code-label flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Vulnerable Code Section
                </div>
                <div className="code-block" style={{ borderLeftColor: '#ef4444', background: '#0a0505' }}>
                  <pre className="whitespace-pre-wrap text-red-200/70 font-mono text-xs">
                    {`File: ${vuln.file_path || (vuln as any).filePath}:${vuln.line_number || (vuln as any).lineNumber || (vuln as any).line}\n\n// ... scanning code context ...\n// Vulnerability detected in this segment\n`}
                    {/* Note: In a real app, we would fetch the actual code snippet from the backend */}
                  </pre>
                </div>
              </div>
              
              <div className="mt-4 p-2 bg-gold-500/5 rounded text-[10px] text-gold-500/50 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> Detected via Swarm Intelligence Analysis
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="sec">
          <div className="vuln-card safe text-center p-12">
            <div className="text-xl text-gold-500 font-bold mb-2">No Vulnerabilities Found</div>
            <p className="text-gold-200">The Red Team did not find any critical or high severity vulnerabilities in this audit.</p>
          </div>
        </div>
      )}

      <div className="divider"></div>

      <div className="footer-row">
        <Link to={`/report/blue-team/${id}`} className="btn btn-gold">Review Remediation Plan ↗</Link>
        <Link to={`/audit/${id}`} className="btn btn-ghost">Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default RedTeamReport;
