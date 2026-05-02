import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gradient">Aegis Swarm</span>
          </h1>
          <p className="text-xl text-text-secondary">
            Security Command Center
          </p>
          <p className="text-text-tertiary mt-2">
            Adversarial multi-agent security auditing powered by AI
          </p>
        </div>

        <div className="card-hover animate-slide-up">
          <h2 className="text-2xl font-semibold mb-6 text-gold">
            Start Security Audit
          </h2>
          
          <form className="space-y-6">
            <div>
              <label htmlFor="repoUrl" className="block text-sm font-medium mb-2">
                Repository URL
              </label>
              <input
                type="url"
                id="repoUrl"
                className="input"
                placeholder="https://github.com/username/repository"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="branch" className="block text-sm font-medium mb-2">
                  Branch (optional)
                </label>
                <input
                  type="text"
                  id="branch"
                  className="input"
                  placeholder="main"
                />
              </div>

              <div>
                <label htmlFor="prNumber" className="block text-sm font-medium mb-2">
                  PR Number (optional)
                </label>
                <input
                  type="number"
                  id="prNumber"
                  className="input"
                  placeholder="123"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-lg py-3"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Starting Audit...
                </span>
              ) : (
                'Start Audit'
              )}
            </button>
          </form>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-4xl mb-3">🔴</div>
            <h3 className="font-semibold mb-2">Red Team</h3>
            <p className="text-sm text-text-tertiary">
              AI-powered vulnerability detection
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-3">🔵</div>
            <h3 className="font-semibold mb-2">Blue Team</h3>
            <p className="text-sm text-text-tertiary">
              Automated patch generation
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-3">🐳</div>
            <h3 className="font-semibold mb-2">Sandbox</h3>
            <p className="text-sm text-text-tertiary">
              Isolated patch verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

// Made with Bob
