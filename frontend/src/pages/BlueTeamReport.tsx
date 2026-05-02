import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Shield, Bug, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api.service';
import { Audit, Patch, Vulnerability } from '../types/audit.types';
import '../styles/reports.css';

const BlueTeamReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [auditData, patchesData, vulnsData] = await Promise.all([
          apiService.getAudit(id),
          apiService.getPatches(id),
          apiService.getVulnerabilities(id),
        ]);
        setAudit(auditData);
        setPatches(patchesData);
        setVulnerabilities(vulnsData);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [id]);

  const getVulnerabilityForPatch = (patch: Patch) => {
    return vulnerabilities.find(v => v.id === patch.vulnerability_id);
  };

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
          <div className="rtitle">Blue Team — Patch & Remediation Report</div>
          <div className="rname">Audit #{audit.id.slice(0, 8)} — {audit.repo_url}</div>
          <div className="rmeta">
            Remediated by: Aegis Swarm &nbsp;|&nbsp; 
            {audit.completed_at ? new Date(audit.completed_at).toLocaleString() : 'In Progress'} &nbsp;|&nbsp; 
            {audit.status === 'completed' ? 'Verified & Secured' : 'Remediation In Progress'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`risk-badge ${audit.status === 'completed' ? 'risk-low' : 'risk-high'}`}>
            {audit.status === 'completed' ? 'SECURED' : 'PATCHING'}
          </div>
          <div style={{ fontSize: '9px', color: '#3a2c10' }}>{patches.length} patches applied</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-label">Executive Summary</div>
        <div className="vuln-card safe">
          <p className="text-gold-200">
            The Blue Team has analyzed the {vulnerabilities.length} vulnerabilities identified by the Red Team and generated {patches.length} mitigation patches. 
            {audit.status === 'completed' ? ' All patches have been verified in the Aegis Sandbox.' : ' Patches are currently being validated.'}
          </p>
        </div>
      </div>

      {patches.length > 0 ? (
        patches.map((patch, index) => {
          const linkedVuln = getVulnerabilityForPatch(patch);
          return (
            <div className="sec" key={patch.id}>
              <div className="sec-label">Mitigation {String(index + 1).padStart(2, '0')} — {linkedVuln?.type || 'Security Patch'}</div>
              <div className={`vuln-card ${patch.test_passed ? 'safe' : 'high'}`}>
                <div className="vuln-top">
                  <span className="vuln-id flex items-center gap-1">
                    <Shield className="w-3 h-3" /> PATCH-{patch.id.slice(0, 4)}
                  </span>
                  <span className="vuln-name">{patch.file_path}</span>
                  <span className={`risk-badge ${patch.test_passed ? 'risk-low' : 'risk-high'}`}>
                    {patch.test_passed ? 'Verified' : 'Pending'}
                  </span>
                </div>

                {linkedVuln && (
                  <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 rounded text-sm">
                    <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                      <Bug className="w-3 h-3" /> Fixing Vulnerability:
                    </div>
                    <div className="text-gold-200">{linkedVuln.description}</div>
                  </div>
                )}

                <div className="vuln-desc font-mono text-sm bg-black/40 p-3 rounded border border-gold-500/10 mb-4">
                  {patch.explanation || 'Automatically generated patch to resolve security vulnerability.'}
                </div>

                <div className="vuln-meta-row">
                  <div className="vmeta">
                    <div className="vmeta-label">File Path</div>
                    <div className="vmeta-val truncate max-w-xs">{patch.file_path}</div>
                  </div>
                  <div className="vmeta">
                    <div className="vmeta-label">Verification Status</div>
                    <div className={`vmeta-val flex items-center gap-1 ${patch.test_passed ? 'safe' : 'warn'}`}>
                      {patch.test_passed ? <><CheckCircle className="w-3 h-3" /> Passed Sandbox</> : 'Awaiting Sandbox Result...'}
                    </div>
                  </div>
                </div>

                {patch.diff && (
                  <>
                    <div className="code-label">Unified Remediation Diff</div>
                    <div className="code-block">
                      <pre className="whitespace-pre-wrap text-xs md:text-sm">
                        {patch.diff.split('\n').map((line, i) => {
                          const color = line.startsWith('+') ? '#4ade80' : line.startsWith('-') ? '#f87171' : 'inherit';
                          return <div key={i} style={{ color }}>{line}</div>;
                        })}
                      </pre>
                    </div>
                  </>
                )}

                {patch.test_output && (
                  <>
                    <div className="code-label">Sandbox Verification Output</div>
                    <div className="code-block" style={{ backgroundColor: '#0a0a0a', borderColor: '#1e1e1e' }}>
                      <pre className="whitespace-pre-wrap text-xs opacity-70 italic">{patch.test_output}</pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="sec">
          <div className="vuln-card high text-center p-12">
            <div className="text-xl text-gold-500 font-bold mb-2">No Patches Generated</div>
            <p className="text-gold-200">The Blue Team has not yet generated any patches for this audit.</p>
          </div>
        </div>
      )}

      <div className="divider"></div>

      <div className="footer-row">
        <Link to={`/report/red-team/${id}`} className="btn btn-ghost">← Back to Red Team findings</Link>
        <Link to={`/audit/${id}`} className="btn btn-gold">Return to Dashboard</Link>
      </div>
    </div>
  );
};

export default BlueTeamReport;
