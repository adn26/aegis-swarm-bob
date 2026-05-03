import orchestrator from '../src/agents/orchestrator.js';
import storageService from '../src/services/storage.service.js';
import logger from '../src/utils/logger.js';

// Test configuration
const TEST_REPO = {
  repoUrl: 'https://github.com/adn26/vulnerable-test-repo', // Use a small known repo
  branch: 'main',
};

async function testWorkflow() {
  console.log('\n🧪 Testing Aegis Swarm Workflow Integration - Blue Team & Sandbox\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Start Audit
    console.log('\n📍 Step 1: Starting Audit');
    const audit = await orchestrator.startAudit(TEST_REPO);
    const auditId = audit.id;
    console.log(`✅ Audit started: ${auditId}`);

    // 2. Monitor for Blue Team Patches and Sandbox Results
    console.log('\n📍 Step 2: Monitoring for Blue Team progress & Sandbox validation...');
    
    const maxWaitTime = 600000; // 10 minutes (cloning + scanning + analysis + redteam + blueteam + sandbox)
    const startTime = Date.now();
    let lastStatus = '';
    let blueTeamStarted = false;
    let blueTeamFinished = false;

    while ((Date.now() - startTime) < maxWaitTime) {
      const currentAudit = await storageService.getAudit(auditId);
      const status = currentAudit.status;
      
      if (status !== lastStatus) {
        console.log(`📊 Current Status: ${status}`);
        lastStatus = status;
      }

      // Check for patches
      const patches = await storageService.getPatches(auditId);
      
      if (patches.length > 0 && !blueTeamStarted) {
        console.log(`🛡️ Blue Team active! Found ${patches.length} patches generated. Waiting for Sandbox tests...`);
        blueTeamStarted = true;
      }

      // Check if tests have run (we assume sandbox runs testing and updates the patches or audit)
      // We will look for patches that have test_output or if the workflow is completed.
      const testedPatches = patches.filter(p => p.test_output !== null || p.test_passed === true);
      
      if (testedPatches.length > 0) {
        console.log(`✅ Blue Team & Sandbox completed! Tested ${testedPatches.length}/${patches.length} patches.`);
        
        // Print a sample patch
        const sample = testedPatches[0];
        console.log(`\n📝 Sample Patch for ${sample.file_path}:`);
        console.log(`   Explanation: ${sample.explanation?.substring(0, 100)}...`);
        console.log(`   Test Passed: ${sample.test_passed ? 'YES ✅' : 'NO ❌'}`);
        if (sample.test_output) {
          console.log(`   Test Output:\n${sample.test_output.substring(0, 200)}...`);
        }
        blueTeamFinished = true;
        break;
      }

      if (status === 'completed' || status === 'failed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (blueTeamFinished) {
      console.log('\n✅ Blue Team Integration Test Passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Blue Team Integration Test Timed Out or Failed');
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
