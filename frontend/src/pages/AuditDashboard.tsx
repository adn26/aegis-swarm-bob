import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileCode, 
  Bug,
  Wrench,
  ArrowLeft,
  Loader2,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api.service';
import { sseService } from '../services/sse.service';
import type { Audit, Vulnerability, Patch, SSEEvent } from '../types/audit.types';
import { EVENT_ICONS, STATUS_LABELS } from '../utils/constants';

function AuditDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [audit, setAudit] = useState<Audit | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial audit data
  useEffect(() => {
    if (!id) return;

    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const auditData = await apiService.getAudit(id);
        setAudit(auditData);

        // Fetch vulnerabilities and patches if audit is completed or in progress
        if (auditData.status !== 'pending') {
          const [vulns, patchesData] = await Promise.all([
            apiService.getVulnerabilities(id),
            apiService.getPatches(id),
          ]);
          setVulnerabilities(vulns);
          setPatches(patchesData);
        }
      } catch (err) {
        console.error('Failed to fetch audit:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audit');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [id]);

  // Setup SSE connection
  useEffect(() => {
    if (!id) return;

    console.log('Connecting to SSE for audit:', id);
    
    sseService.connect(id);
    setConnected(true);

    // Listen for all events
    const handleEvent = (event: SSEEvent) => {
      console.log('SSE Event:', event);
      setEvents(prev => [...prev, event]);

      // Update audit data based on events
      if (event.type === 'vulnerability_found' && event.data) {
        setVulnerabilities(prev => [...prev, event.data as Vulnerability]);
      }
      
      if (event.type === 'patch_generated' && event.data) {
        setPatches(prev => [...prev, event.data as Patch]);
      }

      if (event.type === 'audit_completed') {
        // Refresh audit data
        if (id) {
          apiService.getAudit(id).then(setAudit);
        }
      }
    };

    sseService.on('connected', handleEvent);
    sseService.on('audit_started', handleEvent);
    sseService.on('repo_cloned', handleEvent);
    sseService.on('files_scanned', handleEvent);
    sseService.on('redteam_analyzing', handleEvent);
    sseService.on('vulnerability_found', handleEvent);
    sseService.on('blueteam_patching', handleEvent);
    sseService.on('patch_generated', handleEvent);
    sseService.on('sandbox_deploying', handleEvent);
    sseService.on('tests_running', handleEvent);
    sseService.on('test_results', handleEvent);
    sseService.on('audit_completed', handleEvent);
    sseService.on('error', handleEvent);
    sseService.on('progress', handleEvent);

    return () => {
      console.log('Disconnecting SSE');
      sseService.disconnect();
      setConnected(false);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 text-center mb-2">
              Failed to Load Audit
            </h2>
            <p className="text-red-700 text-center mb-4">
              {error || 'Audit not found'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const severityCounts = {
    critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
    high: vulnerabilities.filter(v => v.severity === 'High').length,
    medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
    low: vulnerabilities.filter(v => v.severity === 'Low').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Security Audit Dashboard
              </h1>
              <p className="text-slate-600">
                {audit.repo_url}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Audit ID: <span className="font-mono">{id}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                <Activity className={`w-4 h-4 ${connected ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium">
                  {connected ? 'Live' : 'Disconnected'}
                </span>
              </div>
              
              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-lg font-medium ${
                audit.status === 'completed' ? 'bg-green-100 text-green-800' :
                audit.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {STATUS_LABELS[audit.status as keyof typeof STATUS_LABELS] || audit.status}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">
                Total Vulnerabilities
              </h3>
              <Bug className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {audit.total_vulnerabilities || 0}
            </p>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                {severityCounts.critical} Critical
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                {severityCounts.high} High
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">
                Files Scanned
              </h3>
              <FileCode className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {audit.scanned_files || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              of {audit.total_files || 0} total
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">
                Patches Generated
              </h3>
              <Wrench className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {audit.patches_applied || 0}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {audit.tests_passed ? 'Tests passed' : 'Testing...'}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">
                Duration
              </h3>
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {audit.completed_at && audit.started_at
                ? Math.round((new Date(audit.completed_at).getTime() - new Date(audit.started_at).getTime()) / 1000)
                : '-'}
            </p>
            <p className="text-sm text-slate-500 mt-1">seconds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Activity Feed
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Waiting for events...</p>
                </div>
              ) : (
                events.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-2xl flex-shrink-0">
                      {EVENT_ICONS[event.type as keyof typeof EVENT_ICONS] || '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">
                        {event.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      {event.data?.message && (
                        <p className="text-sm text-slate-600 mt-1">
                          {event.data.message}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vulnerabilities List */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Vulnerabilities
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vulnerabilities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No vulnerabilities detected yet</p>
                </div>
              ) : (
                vulnerabilities.slice(0, 10).map((vuln, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 rounded-lg border-l-4"
                    style={{
                      borderLeftColor: 
                        vuln.severity === 'Critical' ? '#ef4444' :
                        vuln.severity === 'High' ? '#f97316' :
                        vuln.severity === 'Medium' ? '#eab308' : '#3b82f6'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">
                          {vuln.type}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 truncate">
                          {vuln.file_path}:{vuln.line_number}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        vuln.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                        vuln.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                        vuln.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {vuln.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditDashboard;

// Made with Bob
