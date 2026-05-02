import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, ShieldCheck, Box, Github, Loader2 } from 'lucide-react';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    repoUrl: '',
    branch: '',
    prNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement API call
      console.log('Starting audit:', formData);
      // simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // navigate(`/audit/${auditId}`);
    } catch (error) {
      console.error('Failed to start audit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-6 shadow-sm">
            <Shield className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 tracking-tight">
            Aegis Swarm Security
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Adversarial multi-agent security auditing powered by AI. Uncover vulnerabilities before they reach production.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="card max-w-3xl mx-auto animate-slide-up mb-16">
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
            <Github className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">
              New Security Audit
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="repoUrl" className="block text-sm font-medium mb-2 text-slate-700">
                Repository URL
              </label>
              <input
                type="url"
                id="repoUrl"
                className="input"
                placeholder="https://github.com/username/repository"
                value={formData.repoUrl}
                onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="branch" className="block text-sm font-medium mb-2 text-slate-700">
                  Branch <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="branch"
                  className="input"
                  placeholder="main"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="prNumber" className="block text-sm font-medium mb-2 text-slate-700">
                  PR Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  id="prNumber"
                  className="input"
                  placeholder="123"
                  value={formData.prNumber}
                  onChange={(e) => setFormData({ ...formData, prNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="btn btn-primary w-full text-base shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Agents...
                  </span>
                ) : (
                  'Start Audit'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-hover">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Red Team Analysis</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              AI-powered vulnerability detection that proactively searches for structural and logical flaws in your codebase.
            </p>
          </div>

          <div className="card-hover">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Blue Team Remediation</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Automated patch generation and security hardening recommendations tailored to your specific framework.
            </p>
          </div>

          <div className="card-hover">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
              <Box className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Isolated Sandbox</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Secure, isolated environments where generated patches are verified against existing test suites safely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
