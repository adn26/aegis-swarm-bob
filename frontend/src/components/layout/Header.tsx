import { Link } from 'react-router-dom';
import '../../styles/command-center.css';

function Header() {
  return (
    <header className="cc-body" style={{ minHeight: 'auto', padding: '16px 24px', borderBottom: '0.5px solid #2a2000' }}>
      <div className="w-full">
        <div className="cc-topbar" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <Link to="/" className="cc-logo" style={{ textDecoration: 'none' }}>
            Aegis<span> //</span> Swarm
          </Link>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="cc-status-dot online"></span>
            <span className="cc-status-label" style={{ fontSize: '11px', letterSpacing: '1.5px' }}>SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
