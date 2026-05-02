
/**
 * Test script for Aegis Swarm workflow
 * Tests the complete audit workflow with a sample repository
 */

import orchestrator from '../src/agents/orchestrator.js';
import logger from '../src/utils/logger.js';
import { getSupabase } from '../src/db/supabase.js';

// Test configuration
const TEST_REPO = {
  repoUrl: 'https://github.com/OWASP/NodeGoat', // Intentionally vulnerable Node.js app
  branch: 'master',
  prNumber: null,
};

async function testWorkflow() {
  console.log('\n🧪 Testing Aegis Swarm Workflow\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Database Connection
    console.log('\n📍 Test 1: Database Connection');
    const supabase = getSupabase();
    const { data, error } = await supabase.from('audits').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Database connection successful');

    // Test 2: Start Audit
    console.log('\n📍 Test 2: Starting Audit');
    console.log(`   Repository: ${TEST_REPO.repoUrl}`);
    console.log(`   Branch: ${TEST_REPO.branch}`);
    
    const audit = await orchestrator.startAudit(TEST_REPO);
    console.log(`✅ Audit started: ${audit.id}`);
    console.log(`   Status: ${audit.status}`);
    console.log(`   Created: ${audit.created_at}`);

    // Test 3: Monitor Progress
    console.log('\n📍 Test 3: Monitoring Workflow Progress');
    console.log('   (Workflow running in background...)\n');

    // Poll for updates every 5 seconds
    let completed = false;
    let lastStatus = '';
    const maxWaitTime = 300000; // 5 minutes
    const startTime = Date.now();

    while (!completed && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = await orchestrator.getAuditStatus(audit.id);
      
      if (status.status !== lastStatus) {
        console.log(`   📊 Status: ${status.status}`);
        if (status.total_files) {
          console.log(`   📁 Files: ${status.scanned_files || 0}/${status.total_files}`);
        }
        if (status.total_vulnerabilities) {
          console.log(`   🔴 Vulnerabilities: ${status.total_vulnerabilities}`);
          console.log(`      Critical: ${status.critical_count || 0}`);
          console.log(`      High: ${status.high_count || 0}`);
          console.log(`      Medium: ${status.medium_count || 0}`);
          console.log(`      Low: ${status.low_count || 0}`);
        }
        if (status.patches_applied) {
          console.log(`   🔵 Patches: ${status.patches_applied}`);
        }
        lastStatus = status.status;
      }

      if (status.status === 'completed' || status.status === 'failed') {
        completed = true;
      }
    }

    if (!completed) {
      console.log('\n⚠️  Workflow timeout (5 minutes exceeded)');
      console.log('   Check logs for details');
      return;
    }

    // Test 4: Get Results
    console.log('\n📍 Test 4: Retrieving Results');
    const results = await orchestrator.getAuditResults(audit.id);
    
    console.log('\n📊 Final Results:');
    console.log('=' .repeat(60));
    console.log(`Status: ${results.audit.status}`);
    console.log(`Files Scanned: ${results.scannedFiles.length}`);
    console.log(`Total Vulnerabilities: ${results.summary.totalVulnerabilities}`);
    console.log(`  - Critical: ${results.summary.criticalCount}`);
    console.log(`  - High: ${results.summary.highCount}`);
    console.log(`  - Medium: ${results.summary.mediumCount}`);
    console.log(`  - Low: ${results.summary.lowCount}`);
    console.log(`  - AI-Related: ${results.summary.aiRelatedCount}`);
    console.log(`Patches Generated: ${results.summary.patchesApplied}`);
    console.log(`Patches Successful: ${results.summary.patchesSuccessful}`);

    // Display sample vulnerabilities
    if (results.vulnerabilities.length > 0) {
      console.log('\n🔴 Sample Vulnerabilities:');
      results.vulnerabilities.slice(0, 3).forEach((vuln, i) => {
        console.log(`\n${i + 1}. ${vuln.type} (${vuln.severity})`);
        console.log(`   File: ${vuln.file_path}:${vuln.line_number}`);
        console.log(`   ${vuln.description.substring(0, 100)}...`);
      });
    }

    // Display sample patches
    if (results.patches.length > 0) {
      console.log('\n🔵 Sample Patches:');
      results.patches.slice(0, 2).forEach((patch, i) => {
        console.log(`\n${i + 1}. ${patch.file_path}`);
        console.log(`   ${patch.explanation.substring(0, 100)}...`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log(`\nAudit ID: ${audit.id}`);
    console.log('View full results in Supabase dashboard');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

