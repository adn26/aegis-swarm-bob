import orchestrator from '../src/agents/orchestrator.js';
import storageService from '../src/services/storage.service.js';
import logger from '../src/utils/logger.js';

// Test configuration
const TEST_REPO = {
  repoUrl: 'https://github.com/adn26/vulnerable-test-repo', // Use a small known repo
  branch: 'main',
};

async function testWorkflow() {
  console.log('\n🧪 Testing Aegis Swarm Workflow Integration\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Start Audit
    console.log('\n📍 Step 1: Starting Audit');
    const audit = await orchestrator.startAudit(TEST_REPO);
    const auditId = audit.id;
    console.log(`✅ Audit started: ${auditId}`);

    // 2. Monitor for Red Team Narratives
    console.log('\n📍 Step 2: Monitoring for Red Team progress...');
    
    const maxWaitTime = 600000; // 10 minutes (cloning + scanning + analysis + redteam)
    const startTime = Date.now();
    let lastStatus = '';
    let redTeamStarted = false;
    let redTeamFinished = false;

    while ((Date.now() - startTime) < maxWaitTime) {
      const currentAudit = await storageService.getAudit(auditId);
      const status = currentAudit.status;
      
      if (status !== lastStatus) {
        console.log(`📊 Current Status: ${status}`);
        lastStatus = status;
      }

      // Check for vulnerabilities with narratives
      const vulns = await storageService.getVulnerabilities(auditId);
      const withNarratives = vulns.filter(v => v.description?.includes('**Attack Narrative:**') || v.exploit_code);
      
      if (vulns.length > 0 && !redTeamStarted) {
        console.log(`🔍 Found ${vulns.length} vulnerabilities. Waiting for Red Team narratives...`);
        redTeamStarted = true;
      }

      if (withNarratives.length > 0) {
        console.log(`✅ Red Team active! Found ${withNarratives.length}/${vulns.length} vulnerabilities with narratives.`);
        
        // Print a sample narrative
        const sample = withNarratives[0];
        console.log(`\n📝 Sample Narrative for ${sample.file_path}:`);
        console.log(`   Title: ${sample.title || 'Vulnerability'}`);
        console.log(`   Exploit PoC: ${sample.exploit_code ? 'YES' : 'NO'}`);
        
        redTeamFinished = true;
        break;
      }

      if (status === 'completed' || status === 'failed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (redTeamFinished) {
      console.log('\n✅ Red Team Integration Test Passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Red Team Integration Test Timed Out or Failed');
      const finalAudit = await storageService.getAudit(auditId);
      console.log(`Final Status: ${finalAudit.status}`);
      if (finalAudit.errorMessage) console.log(`Error: ${finalAudit.errorMessage}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testWorkflow();
