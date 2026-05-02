import { useState, useEffect } from 'react';
import '../../styles/command-center.css';

interface CommandBarProps {
  badgeText?: string;
  badgeClass?: string;
}

function CommandBar({ badgeText = 'SYSTEM_ONLINE', badgeClass = 'live' }: CommandBarProps) {
  const [time, setTime] = useState(new Date().toISOString().split('T')[1].split('.')[0]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toISOString().split('T')[1].split('.')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ marginBottom: '24px' }}>
      <div className="cc-topbar">
        <div className="cc-logo">AEGIS<span>SWARM</span> // CMD_CTR</div>
        <div className={`cc-badge ${badgeClass}`}>{badgeText}</div>
      </div>
      
      <div className="cc-status-bar">
        <div className="cc-status-item">
          <div className="cc-status-dot online"></div>
          <div className="cc-status-label">RED_TEAM</div>
          <div className="cc-status-val">READY</div>
        </div>
        <div className="cc-status-item">
          <div className="cc-status-dot online"></div>
          <div className="cc-status-label">BLUE_TEAM</div>
          <div className="cc-status-val">READY</div>
        </div>
        <div className="cc-status-item">
          <div className="cc-status-dot online"></div>
          <div className="cc-status-label">SANDBOX</div>
          <div className="cc-status-val">PROVISIONED</div>
        </div>
        <div className="cc-status-item" style={{ marginLeft: 'auto' }}>
          <div className="cc-status-label">SERVER_TIME</div>
          <div className="cc-status-val">{time} UTC</div>
        </div>
      </div>
    </div>
  );
}

export default CommandBar;