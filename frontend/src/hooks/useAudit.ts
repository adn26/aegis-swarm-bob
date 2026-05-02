import { useState, useEffect } from 'react';
import { apiService } from '../services/api.service';
import { sseService } from '../services/sse.service';
import type { Audit, Vulnerability, Patch } from '../types/audit.types';
import type { SSEEvent } from '../types/api.types';

export function useAudit(auditId?: string) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch initial audit data
  useEffect(() => {
    if (!auditId) return;

    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const auditData = await apiService.getAudit(auditId);
        setAudit(auditData);

        if (auditData.status !== 'pending' && auditData.status !== 'cloning' && auditData.status !== 'scanning') {
          const [vulns, patchesData] = await Promise.all([
            apiService.getVulnerabilities(auditId),
            apiService.getPatches(auditId),
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
  }, [auditId]);

  // Setup SSE connection
  useEffect(() => {
    if (!auditId) return;

    console.log('Connecting to SSE for audit:', auditId);
    
    sseService.connect(auditId);

    const handleEvent = (event: SSEEvent) => {
      console.log('SSE Event:', event);
      setEvents(prev => [...prev, event].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));

      if (event.type === 'vulnerability_found' && event.data) {
        setVulnerabilities(prev => [...prev, event.data as Vulnerability]);
      }
      
      if (event.type === 'patch_generated' && event.data) {
        setPatches(prev => [...prev, event.data as Patch]);
      }

      if (event.type === 'audit_completed' || event.type === 'progress') {
        if (auditId) {
          apiService.getAudit(auditId).then(setAudit);
        }
      }
    };

    const handleConnect = () => setConnected(true);

    sseService.on('all', handleEvent);
    sseService.on('connected', handleConnect);

    return () => {
      console.log('Disconnecting SSE');
      sseService.disconnect();
      setConnected(false);
    };
  }, [auditId]);

  return {
    audit,
    vulnerabilities,
    patches,
    events,
    loading,
    error,
    connected
  };
}