import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="bg-bg-secondary border-b border-border-primary sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="text-3xl">🛡️</div>
            <div>
              <h1 className="text-xl font-bold text-gradient group-hover:opacity-80 transition-opacity">
                Aegis Swarm
              </h1>
              <p className="text-xs text-text-tertiary">Security Command Center</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-text-secondary hover:text-gold transition-colors"
            >
              Home
            </Link>
            <a
              href="https://github.com/adn26/aegis-swarm-bob"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-gold transition-colors flex items-center gap-2"
            >
              <span>GitHub</span>
              <span className="text-sm">↗</span>
            </a>
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-tertiary hidden sm:inline">
              Online
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

// Made with Bob
