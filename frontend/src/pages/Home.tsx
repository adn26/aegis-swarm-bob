import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { apiService } from '../services/api.service';
import { AuditRequest } from '../types/audit.types';
import CommandBar from '../components/layout/CommandBar';
import '../styles/command-center.css';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

                <div className="cc-field-row">
                  <div className="cc-field">
                    <label className="cc-label">PR Number <span className="cc-optional">(OPTIONAL)</span></label>
                    <input 
                      type="number" 
                      className="cc-input" 
                      placeholder="e.g. 142" 
                      value={formData.prNumber || ''}
                      onChange={(e) => setFormData({...formData, prNumber: e.target.value ? parseInt(e.target.value) : undefined})}
                      disabled={loading}
                    />
                  </div>
                  <div className="cc-field">
                    <label className="cc-label">Target Branch <span className="cc-optional">(DEFAULT: MAIN)</span></label>
                    <input 
                      type="text" 
                      className="cc-input" 
                      placeholder="main" 
                      value={formData.branch || 'main'}
                      onChange={(e) => setFormData({...formData, branch: e.target.value})}
                      disabled={loading}
                    />
                  </div>
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
                <div className="cc-module-title">RECENT ACTIVITY (MOCK)</div>
              </div>
              <div className="cc-module-content">
                <div className="cc-audit-item">
                  <div className="cc-audit-status safe">✓</div>
                  <div className="cc-audit-info">
                    <div className="cc-audit-name">iWealthX / core-api</div>
                    <div className="cc-audit-meta">PR #246 • Passed • 2h ago</div>
                  </div>
                </div>
                <div className="cc-audit-item">
                  <div className="cc-audit-status critical">⚠</div>
                  <div className="cc-audit-info">
                    <div className="cc-audit-name">finance-utils / auth</div>
                    <div className="cc-audit-meta">PR #12 • 2 Vulns • 5h ago</div>
                  </div>
                </div>
                <div className="cc-audit-item">
                  <div className="cc-audit-status warning">●</div>
                  <div className="cc-audit-info">
                    <div className="cc-audit-name">deficorp / smart-contracts</div>
                    <div className="cc-audit-meta">PR #99 • 1 High Vuln • 1d ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
