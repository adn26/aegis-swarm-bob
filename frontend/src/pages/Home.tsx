import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { apiService } from '../services/api.service';
import { AuditRequest, Audit } from '../types/audit.types';
import CommandBar from '../components/layout/CommandBar';
import '../styles/command-center.css';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<Audit[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const audits = await apiService.getAudits(3);
        setRecentAudits(audits);
      } catch (err) {
        console.error('Failed to fetch recent audits:', err);
      } finally {
        setAuditsLoading(false);
      }
    };
    fetchAudits();
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.to('.cc-root', { opacity: 1, duration: 0.1 })
      .from('.cc-topbar', {
        y: -12,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out'
      })
      .from('.cc-status-bar', {
        opacity: 0,
        y: -6,
        duration: 0.35
      }, '-=0.2')
      .from('.cc-home-left', {
        opacity: 0,
        x: -10,
        duration: 0.45
      }, '-=0.1')
      .from('.cc-form-module, .cc-nav-cards', {
        opacity: 0,
        y: 8,
        stagger: 0.07,
        duration: 0.35
      }, '-=0.3')
      .from('.cc-home-right', {
        opacity: 0,
        x: 10,
        duration: 0.45
      }, '-=0.5')
      .from('.cc-audit-item', {
        opacity: 0,
        x: 6,
        stagger: 0.1,
        duration: 0.3
      }, '-=0.25');

    return () => {
      tl.kill();
    };
  }, []);

  const [formData, setFormData] = useState<AuditRequest>({
    repoUrl: '',
    prNumber: undefined,
    branch: 'main'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.startAudit(formData);
      if (response && response.data && response.data.auditId) {
        navigate(`/audit/${response.data.auditId}`);
      } else {
        setError('Failed to start audit. No ID received.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to start audit: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cc-body">
      <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px', opacity: 0 }}>
        <CommandBar badgeText="SYSTEM_ONLINE" badgeClass="live" />

        <div className="cc-home-grid">
          <div className="cc-home-left">
            <div className="cc-form-module">
              <div className="cc-form-header">
                <div className="cc-form-icon" style={{ color: '#c9a84c' }}>⚡</div>
                <div className="cc-form-title">INITIALIZE NEW AUDIT</div>
              </div>
              
              <form className="cc-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="cc-error-banner">
                    <span className="cc-error-icon">⚠</span>
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="cc-field">
                  <label className="cc-label">Target Repository URL</label>
                  <input 
                    type="url" 
                    className="cc-input" 
                    placeholder="https://github.com/org/repo" 
                    required 
                    value={formData.repoUrl}
                    onChange={(e) => setFormData({...formData, repoUrl: e.target.value})}
                    disabled={loading}
                  />
                  <span className="cc-hint">Public repositories or authenticated via internal tokens.</span>
                </div>

                <div className="cc-field">
                  <label className="cc-label">Target Branch <span className="cc-optional">(DEFAULT: MAIN)</span></label>
                  <input 
                    type="text" 
                    className="cc-input" 
                    placeholder="main" 
                    value={formData.branch !== undefined ? formData.branch : 'main'}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    disabled={loading}
                  />
                </div>

                <button 
                  type="submit" 
                  className="cc-btn cc-btn-gold cc-btn-large" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="cc-loading">
                      <div className="cc-spinner"></div>
                      INITIATING SWARM...
                    </span>
                  ) : (
                    "DEPLOY AGENTS"
                  )}
                </button>
              </form>
            </div>

            <div className="cc-nav-cards" style={{ marginTop: '24px' }}>
              <Link to="/audits" className="cc-nav-card blue">
                <div className="cc-nav-icon">
                  <span style={{ color: '#3498db' }}>≡</span>
                </div>
                <div className="cc-nav-content">
                  <div className="cc-nav-title">Audit History</div>
                  <div className="cc-nav-desc">View past reports</div>
                </div>
                <div className="cc-nav-arrow">→</div>
              </Link>
              
              <Link to="/settings" className="cc-nav-card amber">
                <div className="cc-nav-icon">
                  <span style={{ color: '#c9a84c' }}>⚙</span>
                </div>
                <div className="cc-nav-content">
                  <div className="cc-nav-title">Config</div>
                  <div className="cc-nav-desc">Agent settings</div>
                </div>
                <div className="cc-nav-arrow">→</div>
              </Link>
            </div>
          </div>

          <div className="cc-home-right">
            <div className="cc-module" style={{ height: '100%' }}>
              <div className="cc-module-header">
                <div className="cc-module-icon" style={{ color: '#6a5820' }}>◷</div>
                <div className="cc-module-title">RECENT ACTIVITY</div>
              </div>
              <div className="cc-module-content">
                {auditsLoading ? (
                  <div style={{ color: '#6a5820', padding: '12px' }}>Loading...</div>
                ) : recentAudits.length === 0 ? (
                  <div style={{ color: '#6a5820', padding: '12px' }}>No recent activity.</div>
                ) : (
                  recentAudits.map((audit) => {
                    const isCompleted = audit.status === 'completed';
                    const isFailed = audit.status === 'failed';
                    const hasVulns = audit.total_vulnerabilities > 0;
                    
                    let statusClass = 'warning';
                    let statusIcon = '●';
                    
                    if (isCompleted && !hasVulns) {
                      statusClass = 'safe';
                      statusIcon = '✓';
                    } else if (isFailed || (isCompleted && audit.critical_count > 0)) {
                      statusClass = 'critical';
                      statusIcon = '⚠';
                    }

                    const timeAgo = new Date(audit.created_at).toLocaleDateString();
                    const repoName = audit.repo_url.split('/').slice(-2).join('/');
                    const prText = audit.pr_number ? `PR #${audit.pr_number} • ` : `Branch: ${audit.branch} • `;
                    const statusText = isCompleted ? (hasVulns ? `${audit.total_vulnerabilities} Vulns` : 'Passed') : audit.status;

                    return (
                      <Link to={`/audit/${audit.id}`} key={audit.id} style={{ textDecoration: 'none' }}>
                        <div className="cc-audit-item">
                          <div className={`cc-audit-status ${statusClass}`}>{statusIcon}</div>
                          <div className="cc-audit-info">
                            <div className="cc-audit-name">{repoName}</div>
                            <div className="cc-audit-meta">{prText}{statusText} • {timeAgo}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
