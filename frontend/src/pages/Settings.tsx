import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import CommandBar from '../components/layout/CommandBar';
import '../styles/command-center.css';

function Settings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.to('.cc-root', { opacity: 1, duration: 0.1 })
      .from('.cc-topbar', { y: -12, opacity: 0, duration: 0.4 })
      .from('.cc-module', { opacity: 0, y: 10, stagger: 0.1, duration: 0.4 }, '-=0.2');

    return () => {
      tl.kill();
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    
    // Mock save delay
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1200);
  };

  return (
    <div className="cc-body">
      <div className="cc-root" style={{ minHeight: 'calc(100vh - 48px)', margin: '24px', opacity: 0 }}>
        <CommandBar badgeText="SYSTEM_CONFIG" badgeClass="amber" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          
          <div className="cc-module">
            <div className="cc-module-header">
              <div className="cc-module-icon" style={{ color: '#c9a84c' }}>⚙</div>
              <div className="cc-module-title">AGENT CONFIGURATION</div>
            </div>
            <div className="cc-module-content" style={{ padding: '24px' }}>
              <form className="cc-form" onSubmit={handleSave}>
                <div className="cc-field">
                  <label className="cc-label">RedTeam LLM Provider</label>
                  <select className="cc-input" defaultValue="gemini">
                    <option value="gemini">Google Gemini (Default)</option>
                    <option value="glm5">GLM-5 (Custom)</option>
                    <option value="openai">OpenAI GPT-4</option>
                  </select>
                </div>
                
                <div className="cc-field">
                  <label className="cc-label">BlueTeam LLM Provider</label>
                  <select className="cc-input" defaultValue="gemini">
                    <option value="gemini">Google Gemini (Default)</option>
                    <option value="glm5">GLM-5 (Custom)</option>
                    <option value="openai">OpenAI GPT-4</option>
                  </select>
                </div>

                <div className="cc-field">
                  <label className="cc-label">Max Token Limit</label>
                  <input type="number" className="cc-input" defaultValue={8192} />
                  <span className="cc-hint">Maximum output tokens for AI analysis.</span>
                </div>

                <div className="cc-field" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                  <input type="checkbox" id="auto-patch" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#c9a84c' }} />
                  <label htmlFor="auto-patch" className="cc-label" style={{ marginBottom: 0 }}>Enable Auto-Patch Generation</label>
                </div>
              </form>
            </div>
          </div>

          <div className="cc-module">
            <div className="cc-module-header">
              <div className="cc-module-icon" style={{ color: '#c9a84c' }}>🔑</div>
              <div className="cc-module-title">SECRETS & API KEYS</div>
            </div>
            <div className="cc-module-content" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ color: '#2ecc71', fontSize: '1.2rem' }}>🔒</span>
                <div>
                  <div style={{ color: '#2ecc71', fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9rem' }}>LOCAL ONLY ENVIRONMENT</div>
                  <div style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    Aegis-Swarm runs entirely on your local machine. Your API keys and secrets are stored locally and are never transmitted to any third-party servers outside of their direct official APIs.
                  </div>
                </div>
              </div>
              <form className="cc-form" onSubmit={handleSave}>
                <div className="cc-field">
                  <label className="cc-label">GitHub Personal Access Token (PAT)</label>
                  <input type="password" className="cc-input" placeholder="ghp_***************************" />
                  <span className="cc-hint">Used for cloning private repositories.</span>
                </div>

                <div className="cc-field">
                  <label className="cc-label">Gemini API Key</label>
                  <input type="password" className="cc-input" placeholder="AIzaSy***************************" />
                </div>

                <div className="cc-field">
                  <label className="cc-label">GLM-5 API Key</label>
                  <input type="password" className="cc-input" placeholder="Enter GLM-5 Key..." />
                </div>
              </form>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <Link to="/" className="cc-btn">BACK TO HOME</Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {saved && <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ CONFIGURATION SAVED</span>}
            <button 
              className="cc-btn cc-btn-gold cc-btn-large" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'UPDATING SECRETS...' : 'APPLY CONFIGURATION'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;
