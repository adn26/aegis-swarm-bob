import toolScanner from '../src/services/tool-scanner.service.js';
import path from 'path';

async function testTrufflehog() {
  try {
    const args = process.argv.slice(2);
    const repoPath = args[0] ? path.resolve(args[0]) : path.resolve(process.cwd());
    console.log(`Testing Trufflehog on: ${repoPath}`);
    
    const findings = await toolScanner.runTruffleHog(repoPath);
    
    console.log(`Found ${findings.length} findings:`);
    console.log(JSON.stringify(findings, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTrufflehog();
