function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border-primary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-tertiary">
            © {currentYear} Aegis Swarm. Built with ❤️ for secure code.
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://github.com/adn26/aegis-swarm-bob"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-gold transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://github.com/adn26/aegis-swarm-bob/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-gold transition-colors"
            >
              Report Issue
            </a>
            <span className="text-text-tertiary">
              Powered by <span className="text-gold">Vertex AI</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

// Made with Bob
