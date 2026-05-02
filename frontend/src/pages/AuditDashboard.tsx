import { useParams } from 'react-router-dom';

function AuditDashboard() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Security Audit Dashboard
          </h1>
          <p className="text-text-secondary">
            Audit ID: <span className="text-gold font-mono">{id}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="card">
            <h3 className="text-sm font-medium text-text-tertiary mb-2">
              Total Vulnerabilities
            </h3>
            <p className="text-3xl font-bold text-gold">0</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-text-tertiary mb-2">
              Files Scanned
            </h3>
            <p className="text-3xl font-bold text-blue-400">0</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-text-tertiary mb-2">
              Patches Generated
            </h3>
            <p className="text-3xl font-bold text-green-400">0</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Feed Placeholder */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gold">
              Activity Feed
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg">
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="font-medium">Connected</p>
                  <p className="text-sm text-text-tertiary">
                    Waiting for audit to start...
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerability Map Placeholder */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 text-gold">
              Vulnerability Overview
            </h2>
            <div className="flex items-center justify-center h-64 text-text-tertiary">
              <p>No vulnerabilities detected yet</p>
            </div>
          </div>
        </div>

        {/* File Tree Placeholder */}
        <div className="mt-8 card">
          <h2 className="text-xl font-semibold mb-4 text-gold">
            Scanned Files
          </h2>
          <div className="flex items-center justify-center h-32 text-text-tertiary">
            <p>No files scanned yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditDashboard;

// Made with Bob
