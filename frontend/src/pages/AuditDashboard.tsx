import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Bug, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api.service';
import { sseService } from '../services/sse.service';
import { Audit, Vulnerability, Patch, SSEEvent } from '../types/audit.types';
import CommandBar from '../components/layout/CommandBar';
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

    // Connect immediately to avoid missing early events (cloning, ingestion)
    // even if the initial audit data is still loading
    sseService.connect(id);
    
    // Auto-scroll logic for team logs
    const scrollInterval = setInterval(() => {
      try {
        const teamContainers = document.querySelectorAll('.cc-team .overflow-y-auto');
        if (teamContainers.length >= 1) {
          const redTeamLog = teamContainers[0];
          redTeamLog.scrollTop = redTeamLog.scrollHeight;
        }
        if (teamContainers.length >= 2) {
          const blueTeamLog = teamContainers[1];
          blueTeamLog.scrollTop = blueTeamLog.scrollHeight;
        }
      } catch (err) {
        console.error('Scroll error:', err);
      }
    }, 1000);

    const handleEvent = (event: SSEEvent) => {
      // Log all events for debugging
      console.log('SSE Event received:', event);

      if (event.type === 'error') {
        setError(event.data?.message || 'Connection lost');
        return;
      }

      setEvents(prev => [...prev, event].slice(-50)); // Keep last 50 events

      if (event.type === 'vulnerability_found' && event.data) {
        // Map backend snake_case to frontend expected field names if necessary
        // and ensure we handle nested data correctly
        const vuln = {
          ...event.data,
          file_path: event.data.file_path || event.data.filePath,
          line_number: event.data.line_number || event.data.line,
          exploit_code: event.data.exploit_code || event.data.exploitCode,
          cwe_id: event.data.cwe_id || event.data.cweId,
          cvss_score: event.data.cvss_score || event.data.cvssScore,
          attack_vector: event.data.attack_vector || event.data.attackVector,
        };

        setVulnerabilities(prev => {
          const exists = prev.some(v => v.id === (vuln as any).id);
          if (exists) {
            // Update existing vulnerability with new data (like narratives)
            return prev.map(v => v.id === (vuln as any).id ? { ...v, ...vuln } : v);
          }
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
      
      if (event.type === 'progress' && event.data?.status) {
         setAudit(prev => prev ? { ...prev, status: event.data.status } : null);
      }

      // Handle generic progress events for ingestion and other phases
      if (
        event.type === 'progress' || 
        event.type === 'audit_started' || 
        event.type === 'repo_cloned' || 
        event.type === 'files_scanned' ||
        event.type === 'redteam_analyzing' ||
        event.type === 'blueteam_patching' ||
        event.type === 'sandbox_deploying'
      ) {
        setEvents(prev => {
          // SSEEvent might not have id if it's not explicitly set, use timestamp as fallback for uniqueness
          const eventId = (event as any).id || `${event.type}-${event.timestamp}`;
          const exists = prev.some(e => ((e as any).id || `${e.type}-${e.timestamp}`) === eventId);
          if (exists) return prev;
          return [...prev, event].slice(-100); // Allow more history
        });
      }
    };

    sseService.on('all', handleEvent);

    return () => {
      sseService.disconnect();
      clearInterval(scrollInterval);
    };
  }, [id]);

  // GSAP animations removed to prevent black screen issue

  if (loading) {
    return (
      <div className="cc-body" style={{ opacity: 1, visibility: 'visible' }}>
        <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="cc-spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
            <div className="cc-metric-label">ESTABLISHING UPLINK TO COMMAND CENTER...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="cc-body">
        <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="cc-module" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="cc-module-header" style={{ background: '#2a0505', borderColor: '#5a1010' }}>
              <span style={{ color: '#e74c3c' }}>⚠</span>
              <span className="cc-module-title" style={{ color: '#e74c3c' }}>ERROR_DETECTED</span>
            </div>
            <div className="cc-module-content" style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#e74c3c', marginBottom: '16px', fontSize: '13px' }}>{error || 'Audit session not found.'}</p>
              <Link to="/" className="cc-btn cc-btn-ghost">← RETURN TO BASE</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusOrder = [
    'pending', 
    'ingestion_started', 
    'cloning', 
    'ingestion_complete', 
    'scanning', 
    'deterministic_analysis_started',
    'deterministic_analysis_complete', 
    'redteam_analyzing',
    'redteam_complete', 
    'blueteam_patching',
    'blueteam_complete', 
    'testing', 
    'completed'
  ];
  const getStatusIndex = (status: string) => statusOrder.indexOf(status);
  const currentIdx = getStatusIndex(audit.status);

  return (
    <div className="cc-body">
      <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px' }}>
        
        <CommandBar badgeText="SESSION_ACTIVE" badgeClass="live" />

        <div className="cc-pr-header">
          <div className={`cc-status-dot ${audit.status === 'completed' ? '' : 'active'}`} style={{ animation: audit.status === 'completed' ? 'none' : 'cc-pulse 1.5s infinite', background: audit.status === 'completed' ? '#27ae60' : '#c9a84c' }}></div>
          <div>
            <div className="cc-pr-title">TARGET_REPOSITORY</div>
            <div className="cc-pr-name">{audit.repo_url}</div>
          </div>
          <div className="cc-pr-meta" style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ color: '#c9a84c', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>{audit.status?.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: '10px', color: '#5a5c4a' }}>Aegis Swarm · {vulnerabilities.length} vulnerabilities found</div>
          </div>
        </div>

        <div className="cc-timeline" style={{ marginBottom: '24px' }}>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 3 ? 'done' : currentIdx >= 1 ? 'active' : 'idle'}`}>{currentIdx >= 3 ? '✓' : currentIdx >= 1 ? '→' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx >= 1 && currentIdx < 3 ? 'active' : ''}`}>Ingestion</div>
          </div>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 6 ? 'done' : currentIdx >= 4 ? 'active' : 'idle'}`}>{currentIdx >= 6 ? '✓' : currentIdx >= 4 ? '→' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx >= 4 && currentIdx < 6 ? 'active' : ''}`}>Scanners</div>
          </div>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 8 ? 'done' : currentIdx >= 7 ? 'active' : 'idle'}`}>{currentIdx >= 8 ? '✓' : currentIdx >= 7 ? '→' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx >= 7 && currentIdx < 8 ? 'active' : ''}`}>Red Team</div>
          </div>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 10 ? 'done' : currentIdx >= 9 ? 'active' : 'idle'}`}>{currentIdx >= 10 ? '✓' : currentIdx >= 9 ? '→' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx >= 9 && currentIdx < 10 ? 'active' : ''}`}>Blue Team</div>
          </div>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 11 ? 'done' : currentIdx === 11 ? 'active' : 'idle'}`}>{currentIdx >= 12 ? '✓' : currentIdx === 11 ? '→' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx === 11 ? 'active' : ''}`}>Sandbox</div>
          </div>
          <div className="cc-tl-step">
            <div className={`cc-tl-dot ${currentIdx >= 12 ? 'done' : 'idle'}`}>{currentIdx >= 12 ? '✓' : '□'}</div>
            <div className={`cc-tl-label ${currentIdx >= 12 ? 'active' : ''}`}>Verdict</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="cc-metric-card" style={{ background: '#060400', border: '0.5px solid #1a1200', borderRadius: '6px', padding: '16px 20px' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: '#e74c3c' }}>
                <Bug className="w-4 h-4" />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>Threats Detected</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: '#c0392b' }}>{Array.isArray(vulnerabilities) ? vulnerabilities.length : 0}</div>
           </div>
           <div className="cc-metric-card" style={{ background: '#060400', border: '0.5px solid #1a1200', borderRadius: '6px', padding: '16px 20px' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: '#c9a84c' }}>
                <Shield className="w-4 h-4" />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>Remediations</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: '#d4a843' }}>{Array.isArray(patches) ? patches.length : 0}</div>
           </div>
           <div className="cc-metric-card" style={{ background: '#060400', border: '0.5px solid #1a1200', borderRadius: '6px', padding: '16px 20px' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: '#27ae60' }}>
                <ShieldCheck className="w-4 h-4" />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px' }}>Verified Fixes</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: '#27ae60' }}>{Array.isArray(patches) ? patches.filter(p => p?.test_passed).length : 0}</div>
           </div>
        </div>

        <div className="cc-arena">
          <div className="cc-team" style={{ background: '#080400' }}>
            <div className="cc-team-header">
              <div className="cc-team-icon red">⚔</div>
              <span className="cc-team-name red">Red Team</span>
              <span className="cc-team-status uppercase">
                {currentIdx > 4 ? 'COMPLETE' : (audit.status === 'analyzing' || audit.status === 'deterministic_analysis') ? 'ANALYZING...' : 'QUEUED'}
              </span>
            </div>
            <div className="max-h-[300px] overflow-y-auto pr-2 font-mono text-[11px]">
              {events
                .filter((e) => 
                  e.type.includes('redteam') || 
                  e.type === 'vulnerability_found' || 
                  e.type === 'progress' || 
                  e.type === 'audit_started' || 
                  e.type === 'repo_cloned' || 
                  e.type === 'files_scanned'
                )
                .map((event, i) => (
                  <div key={i} className="cc-log-entry">
                    <div className="cc-log-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
                    <div
                      className={`cc-log-msg ${
                        event.type === 'vulnerability_found' ? 'danger' : ''
                      }`}
                    >
                      {event.type === 'vulnerability_found'
                        ? `ALERT: ${event.data?.type} detected in ${event.data?.file_path || event.data?.filePath} at line ${event.data?.line_number || event.data?.lineNumber || event.data?.line}`
                        : event.data?.message || (typeof event.data === 'string' ? event.data : event.type)}
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
                {currentIdx > 5 ? 'COMPLETE' : audit.status === 'patching' ? 'PATCHING...' : 'QUEUED'}
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
  );
}

export default AuditDashboard;
