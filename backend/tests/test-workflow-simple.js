import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000';
const REPO_URL = 'https://github.com/adn26/aegis-swarm-bob';

console.log('🧪 Simple Workflow Test\n');

async function testWorkflow() {
  try {
    // Start audit
    console.log('📍 Starting audit...');
    const startResponse = await fetch(`${API_URL}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: REPO_URL }),
    });
    
    if (!startResponse.ok) {
      throw new Error(`HTTP error! status: ${startResponse.status}`);
    }
    
    const startData = await startResponse.json();
    console.log('Start response:', JSON.stringify(startData, null, 2));
    
    // API returns: { success: true, data: { auditId, status, ... } }
    const auditId = startData.data?.auditId;
    
    if (!auditId) {
      throw new Error('No audit ID in response: ' + JSON.stringify(startData));
    }
    
    console.log(`✅ Audit started: ${auditId}\n`);
    
    // Monitor for 5 minutes (enough time for full workflow)
    console.log('📍 Monitoring progress for 5 minutes...\n');
    
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`${API_URL}/api/audit/${auditId}`);
      const statusData = await statusResponse.json();
      const audit = statusData.data || statusData;
      
      console.log(`[${i + 1}/60] Status: ${audit.status} | Files: ${audit.scanned_files || 0}/${audit.total_files || 0} | Vulns: ${audit.total_vulnerabilities || 0}`);
      
      if (audit.status === 'completed' || audit.status === 'failed') {
        console.log('\n✅ Workflow completed!');
        console.log(JSON.stringify(audit, null, 2));
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWorkflow();

// Made with Bob
