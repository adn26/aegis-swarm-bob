import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Shield, Bug, Zap, ShieldCheck, Terminal } from 'lucide-react';
import { apiService } from '../services/api.service';
import { sseService } from '../services/sse.service';
import { Audit, Vulnerability, Patch, SSEEvent } from '../types/audit.types';
import '../styles/command-center.css';

function AuditDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [audit, setAudit] = useState<Audit | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial audit data
  useEffect(() => {
    if (!id) return;

    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const auditData = await apiService.getAudit(id);
        setAudit(auditData);

        if (auditData.status !== 'pending') {
          const [vulns, patchesData] = await Promise.all([
            apiService.getVulnerabilities(id),
            apiService.getPatches(id),
          ]);
          setVulnerabilities(vulns);
          setPatches(patchesData);
        }
      } catch (err) {
        console.error('Failed to fetch audit:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audit');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [id]);

  // Setup SSE connection
  useEffect(() => {
    if (!id) return;

    sseService.connect(id);
    setConnected(true);

    const handleEvent = (event: SSEEvent) => {
      setEvents(prev => [...prev, event].slice(-50)); // Keep last 50 events

      if (event.type === 'vulnerability_found' && event.data) {
        // Map backend snake_case to frontend expected field names if necessary
        // and ensure we handle nested data correctly
        const vuln = {
          ...event.data,
          file_path: event.data.file_path || event.data.filePath,
          line_number: event.data.line_number || event.data.lineNumber,
          exploit_code: event.data.exploit_code || event.data.exploitCode,
          cwe_id: event.data.cwe_id || event.data.cweId,
          cvss_score: event.data.cvss_score || event.data.cvssScore
        };

        setVulnerabilities(prev => {
          const exists = prev.some(v => v.id === (vuln as any).id);
          if (exists) return prev;
          return [...prev, vuln as Vulnerability];
        });
      }
      
      if (event.type === 'patch_generated' && event.data) {
        setPatches(prev => {
          const exists = prev.some(p => p.id === event.data.id);
          if (exists) return prev;
          return [...prev, event.data as Patch];
        });
      }

      if (event.type === 'audit_completed') {
        if (id) apiService.getAudit(id).then(setAudit);
      }
      
      if (event.data && event.data.status) {
         setAudit(prev => prev ? { ...prev, status: event.data.status } : null);
      }
    };

    sseService.on('all', handleEvent);

    return () => {
      sseService.disconnect();
      setConnected(false);
    };
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
          <h2 className="text-xl font-semibold text-red-500 mb-2">Failed to Load Audit</h2>
          <p className="text-red-400 mb-4">{error || 'Audit not found'}</p>
          <button onClick={() => navigate('/')} className="cc-btn cc-btn-gold inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  const statusOrder = ['pending', 'cloning', 'scanning', 'analyzing', 'patching', 'testing', 'completed'];
  const getStatusIndex = (status: string) => statusOrder.indexOf(status);
  const currentIdx = getStatusIndex(audit.status);

  return (
    <div className="flex justify-center p-6 w-full max-w-6xl mx-auto">
      <div className="w-full">
        <div className="cc-root">
          <div className="cc-pr-header">
            <div className={`cc-status-dot ${audit.status === 'completed' ? '' : 'active'}`} style={{ animation: audit.status === 'completed' ? 'none' : 'cc-pulse 1.5s infinite', background: audit.status === 'completed' ? '#27ae60' : '#c9a84c' }}></div>
            <div>
              <div className="cc-pr-title">Sequential Security Audit #{audit.id.slice(0, 8)}</div>
              <div className="cc-pr-name">{audit.repo_url}</div>
            </div>
            <div className="cc-pr-meta" style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="text-gold-500 font-mono text-xs mb-1 uppercase tracking-widest">{audit.status}</div>
              <div className="text-[10px] text-gray-500">Aegis Swarm · {vulnerabilities.length} vulnerabilities found</div>
            </div>
          </div>

          <div className="cc-timeline" style={{ marginBottom: '24px' }}>
            <div className={`cc-tl-step`}>
              <div className={`cc-tl-dot ${currentIdx >= 2 ? 'done' : 'active'}`}>{currentIdx >= 2 ? '✓' : '→'}</div>
              <div className={`cc-tl-label ${currentIdx < 2 ? 'active' : ''}`}>Ingestion</div>
            </div>
            <div className={`cc-tl-step`}>
              <div className={`cc-tl-dot ${currentIdx >= 4 ? 'done' : currentIdx >= 3 ? 'active' : 'idle'}`}>{currentIdx >= 4 ? '✓' : currentIdx >= 3 ? '→' : '□'}</div>
              <div className={`cc-tl-label ${currentIdx === 3 ? 'active' : ''}`}>Red Team</div>
            </div>
            <div className={`cc-tl-step`}>
              <div className={`cc-tl-dot ${currentIdx >= 5 ? 'done' : currentIdx === 4 ? 'active' : 'idle'}`}>{currentIdx >= 5 ? '✓' : currentIdx === 4 ? '→' : '□'}</div>
              <div className={`cc-tl-label ${currentIdx === 4 ? 'active' : ''}`}>Blue Team</div>
            </div>
            <div className={`cc-tl-step`}>
              <div className={`cc-tl-dot ${currentIdx >= 6 ? 'done' : currentIdx === 5 ? 'active' : 'idle'}`}>{currentIdx >= 6 ? '✓' : currentIdx === 5 ? '→' : '□'}</div>
              <div className={`cc-tl-label ${currentIdx === 5 ? 'active' : ''}`}>Sandbox</div>
            </div>
            <div className={`cc-tl-step`}>
              <div className={`cc-tl-dot ${currentIdx >= 6 ? 'done' : 'idle'}`}>{currentIdx >= 6 ? '✓' : '□'}</div>
              <div className={`cc-tl-label ${currentIdx >= 6 ? 'active' : ''}`}>Verdict</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="cc-metric-card">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <Bug className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-tighter">Threats Detected</span>
                </div>
                <div className="text-3xl font-bold text-white">{vulnerabilities.length}</div>
             </div>
             <div className="cc-metric-card">
                <div className="flex items-center gap-2 text-gold-500 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-tighter">Remediations</span>
                </div>
                <div className="text-3xl font-bold text-white">{patches.length}</div>
             </div>
             <div className="cc-metric-card">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-tighter">Verified Fixes</span>
                </div>
                <div className="text-3xl font-bold text-white">{patches.filter(p => p.test_passed).length}</div>
             </div>
          </div>

          <div className="cc-arena">
            <div className="cc-team" style={{ background: '#080400' }}>
              <div className="cc-team-header">
                <div className="cc-team-icon red">⚔</div>
                <span className="cc-team-name red">Red Team</span>
                <span className="cc-team-status uppercase">
                  {currentIdx > 3 ? 'COMPLETE' : audit.status === 'analyzing' ? 'ANALYZING...' : 'QUEUED'}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto pr-2 font-mono text-[11px]">
                {events
                  .filter((e) => e.type.includes('redteam') || e.type === 'vulnerability_found')
                  .map((event, i) => (
                    <div key={i} className="cc-log-entry">
                      <div className="cc-log-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
                      <div
                        className={`cc-log-msg ${
                          event.type === 'vulnerability_found' ? 'danger' : ''
                        }`}
                      >
                        {event.type === 'vulnerability_found'
                          ? `ALERT: ${event.data?.type} detected in ${event.data?.file_path || event.data?.filePath} at line ${event.data?.line_number || event.data?.lineNumber}`
                          : event.data?.message || event.type}
                      </div>
                      {event.type === 'vulnerability_found' && event.data?.exploit_code && (
                        <div className="cc-code-block mt-2 mb-4 border-l-red-500 border-l-2">
                          <div className="cc-log-time mb-1 text-[9px] uppercase">Exploit Proof-of-Concept:</div>
                          <pre className="whitespace-pre-wrap text-red-400/80">
                            {event.data.exploit_code}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="cc-divider"></div>
            <div className="cc-team" style={{ background: '#040408' }}>
              <div className="cc-team-header">
                <div className="cc-team-icon blue">🛡</div>
                <span className="cc-team-name blue">Blue Team</span>
                <span
                  className="cc-team-status uppercase"
                  style={audit.status === 'patching' ? { animation: 'cc-pulse 1.5s infinite', color: '#c9a84c' } : {}}
                >
                  {currentIdx > 4 ? 'COMPLETE' : audit.status === 'patching' ? 'PATCHING...' : 'QUEUED'}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto pr-2 font-mono text-[11px]">
                {events
                  .filter((e) => e.type.includes('blueteam') || e.type === 'patch_generated')
                  .map((event, i) => (
                    <div key={i} className="cc-log-entry">
                      <div className="cc-log-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
                      <div className={`cc-log-msg ${event.type === 'patch_generated' ? 'highlight' : ''}`}>
                        {event.type === 'patch_generated'
                          ? `Strategy: Generated patch for ${event.data?.file_path}`
                          : event.data?.message || event.type}
                      </div>
                      {event.type === 'patch_generated' && event.data?.explanation && (
                        <div className="cc-code-block mt-2 mb-4 border-l-blue-500 border-l-2">
                           <div className="cc-log-time mb-1 text-[9px] uppercase">Remediation Explanation:</div>
                           <div className="text-blue-300/80 italic">{event.data.explanation}</div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="cc-action-row mt-8 flex flex-wrap gap-4">
            <Link to={`/report/red-team/${id}`} className={`cc-btn ${currentIdx >= 3 ? 'cc-btn-gold' : 'cc-btn-ghost opacity-50 cursor-not-allowed'}`}>
              View Red Report
            </Link>
            <Link to={`/report/blue-team/${id}`} className={`cc-btn ${currentIdx >= 4 ? 'cc-btn-gold' : 'cc-btn-ghost opacity-50 cursor-not-allowed'}`}>
              View Blue Report
            </Link>
            <button className="cc-btn cc-btn-ghost ml-auto" onClick={() => navigate('/')}>
              Terminal Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditDashboard;
