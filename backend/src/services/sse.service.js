import logger from '../utils/logger.js';

/**
 * Server-Sent Events (SSE) service for real-time updates
 */
class SSEService {
  constructor() {
    // Map of auditId -> Set of response objects
    this.connections = new Map();
  }

  /**
   * Add a new SSE connection for an audit
   */
  addConnection(auditId, res) {
    if (!this.connections.has(auditId)) {
      this.connections.set(auditId, new Set());
    }
    
    this.connections.get(auditId).add(res);
    
    logger.info(`SSE connection added for audit: ${auditId}`);
    
    // Setup connection headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    
    // Send initial connection event
    this.sendEvent(auditId, 'connected', {
      message: 'Connected to audit stream',
      auditId,
      timestamp: new Date().toISOString()
    });

    // Send a comment as keep-alive every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
      if (typeof res.flush === 'function') res.flush();
    }, 30000);
    
    // Handle client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.removeConnection(auditId, res);
    });
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(auditId, res) {
    const connections = this.connections.get(auditId);
    if (connections) {
      connections.delete(res);
      
      if (connections.size === 0) {
        this.connections.delete(auditId);
      }
      
      logger.info(`SSE connection removed for audit: ${auditId}`);
    }
  }

  /**
   * Send an event to all connections for an audit
   */
  sendEvent(auditId, event, data) {
    const connections = this.connections.get(auditId);
    
    if (!connections || connections.size === 0) {
      return;
    }
    
    const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    // Send to all connected clients
    for (const res of connections) {
      try {
        res.write(eventData);
        if (typeof res.flush === 'function') res.flush();
      } catch (error) {
        logger.error(`Failed to send SSE event to client:`, error);
        this.removeConnection(auditId, res);
      }
    }
    
    logger.debug(`SSE event sent: ${event} for audit: ${auditId}`);
  }

  /**
   * Send audit started event
   */
  sendAuditStarted(auditId, data) {
    this.sendEvent(auditId, 'audit_started', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Send repository cloned event
   */
  sendRepoCloned(auditId, data) {
    this.sendEvent(auditId, 'repo_cloned', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Send files scanned event
   */
  sendFilesScanned(auditId, data) {
    this.sendEvent(auditId, 'files_scanned', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Send Red Team analyzing event
   */
  sendRedTeamAnalyzing(auditId, data) {
    this.sendEvent(auditId, 'redteam_analyzing', {
      timestamp: new Date().toISOString(),
      agent: 'Red Team',
      ...data,
    });
  }

  /**
   * Send vulnerability found event
   */
  sendVulnerabilityFound(auditId, vulnerability) {
    this.sendEvent(auditId, 'vulnerability_found', {
      timestamp: new Date().toISOString(),
      agent: 'Red Team',
      ...vulnerability,
    });
  }

  /**
   * Send Blue Team patching event
   */
  sendBlueTeamPatching(auditId, data) {
    this.sendEvent(auditId, 'blueteam_patching', {
      timestamp: new Date().toISOString(),
      agent: 'Blue Team',
      ...data,
    });
  }

  /**
   * Send patch generated event
   */
  sendPatchGenerated(auditId, patch) {
    this.sendEvent(auditId, 'patch_generated', {
      timestamp: new Date().toISOString(),
      agent: 'Blue Team',
      ...patch,
    });
  }

  /**
   * Send sandbox deploying event
   */
  sendSandboxDeploying(auditId, data) {
    this.sendEvent(auditId, 'sandbox_deploying', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Send tests running event
   */
  sendTestsRunning(auditId, data) {
    this.sendEvent(auditId, 'tests_running', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Send test results event
   */
  sendTestResults(auditId, results) {
    this.sendEvent(auditId, 'test_results', {
      timestamp: new Date().toISOString(),
      ...results,
    });
  }

  /**
   * Send audit completed event
   */
  sendAuditCompleted(auditId, summary) {
    this.sendEvent(auditId, 'audit_completed', {
      timestamp: new Date().toISOString(),
      ...summary,
    });
  }

  /**
   * Send error event
   */
  sendError(auditId, error) {
    this.sendEvent(auditId, 'error', {
      timestamp: new Date().toISOString(),
      error: error.message || 'An error occurred',
      details: error.details || null,
    });
  }

  /**
   * Send progress update
   */
  sendProgress(auditId, progress) {
    this.sendEvent(auditId, 'progress', {
      timestamp: new Date().toISOString(),
      ...progress,
    });
  }

  /**
   * Send agent thinking event (for streaming agent thoughts)
   */
  sendAgentThinking(auditId, data) {
    this.sendEvent(auditId, 'agent_thinking', {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Close all connections for an audit
   */
  closeAuditConnections(auditId) {
    const connections = this.connections.get(auditId);
    
    if (connections) {
      for (const res of connections) {
        try {
          res.end();
        } catch (error) {
          logger.error('Failed to close SSE connection:', error);
        }
      }
      
      this.connections.delete(auditId);
      logger.info(`All SSE connections closed for audit: ${auditId}`);
    }
  }

  /**
   * Get connection count for an audit
   */
  getConnectionCount(auditId) {
    const connections = this.connections.get(auditId);
    return connections ? connections.size : 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnections() {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.size;
    }
    return total;
  }
}

export default new SSEService();

// Made with Bob
