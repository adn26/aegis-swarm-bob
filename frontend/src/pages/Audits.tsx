import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { apiService } from '../services/api.service';
import { Audit } from '../types/audit.types';
import CommandBar from '../components/layout/CommandBar';
import '../styles/command-center.css';

function Audits() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.to('.cc-root', { opacity: 1, duration: 0.1 })
      .from('.cc-topbar', { y: -12, opacity: 0, duration: 0.4 })
      .from('.cc-module', { opacity: 0, y: 10, duration: 0.4 }, '-=0.2');

    if (!loading && audits.length > 0) {
      tl.from('.cc-audit-item', { opacity: 0, x: -10, stagger: 0.05, duration: 0.3 }, '-=0.2');
    }

    return () => {
      tl.kill();
    };
  }, [loading, audits.length]);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const data = await apiService.getAudits(50);
        setAudits(data);
      } catch (err) {
        console.error('Failed to fetch audits:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, []);

  return (
    <div className="cc-body">
      <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px', opacity: 0 }}>
        <CommandBar badgeText="AUDIT_LOGS" badgeClass="info" />

        <div className="cc-module" style={{ marginTop: '24px' }}>
          <div className="cc-module-header">
            <div className="cc-module-icon" style={{ color: '#3498db' }}>≡</div>
            <div className="cc-module-title">SYSTEM AUDIT HISTORY</div>
            <Link to="/" className="cc-btn cc-btn-sm" style={{ marginLeft: 'auto' }}>BACK TO HOME</Link>
          </div>
          
          <div className="cc-module-content" style={{ padding: '24px' }}>
            {loading ? (
              <div className="cc-loading">
                <div className="cc-spinner"></div>
                FETCHING LOGS...
              </div>
            ) : audits.length === 0 ? (
              <div style={{ color: '#3498db' }}>No historical audits found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {audits.map((audit) => {
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

                  const timeAgo = new Date(audit.created_at).toLocaleString();
                  const repoName = audit.repo_url.split('/').slice(-2).join('/');
                  const prText = audit.pr_number ? `PR #${audit.pr_number}` : `Branch: ${audit.branch}`;
                  
                  return (
                    <Link to={`/audit/${audit.id}`} key={audit.id} style={{ textDecoration: 'none' }}>
                      <div className="cc-audit-item" style={{ display: 'flex', alignItems: 'center', padding: '16px', border: '1px solid #1a2b3c', background: '#0a1018' }}>
                        <div className={`cc-audit-status ${statusClass}`} style={{ fontSize: '1.2rem', marginRight: '16px' }}>{statusIcon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#e0e0e0', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px' }}>{repoName}</div>
                          <div style={{ color: '#888', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                            {prText} • {audit.status.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#e0e0e0', marginBottom: '4px' }}>
                            {isCompleted ? (
                              <span style={{ color: hasVulns ? '#e74c3c' : '#2ecc71' }}>
                                {audit.total_vulnerabilities} Vulns ({audit.critical_count} Critical)
                              </span>
                            ) : (
                              <span style={{ color: '#f39c12' }}>SCANNING...</span>
                            )}
                          </div>
                          <div style={{ color: '#555', fontSize: '0.85rem' }}>{timeAgo}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Audits;
