import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, ShieldCheck, Box, Github, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api.service';

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    repoUrl: '',
    branch: '',
    prNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting scan:', formData);
      
      // Call the API to start the audit
      const response = await apiService.startAudit({
        repoUrl: formData.repoUrl,
        branch: formData.branch || undefined,
        prNumber: formData.prNumber ? parseInt(formData.prNumber) : undefined,
      });

      console.log('Audit started:', response);

      // Navigate to the audit dashboard
      if (response.data?.auditId) {
        navigate(`/audit/${response.data.auditId}`);
      } else {
        throw new Error('No audit ID returned from server');
      }
    } catch (err) {
      console.error('Failed to start scan:', err);
      setError(err instanceof Error ? err.message : 'Failed to start scan. Please try again.');
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">Failed to start audit</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

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
                  'Start Security Audit'
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
