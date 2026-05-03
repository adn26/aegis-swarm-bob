import toolScanner from '../src/services/tool-scanner.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testTrufflehog() {
  try {
    // Test on the current project directory or a specific one
    const repoPath = path.resolve(__dirname, '..');
    console.log(`Testing Trufflehog on: ${repoPath}`);
    
    // We use runAllTools to test the filtering logic
    const findings = await toolScanner.runAllTools(repoPath);
    
    const trufflehogFindings = findings.filter(f => f.source === 'trufflehog');
    
    console.log(`Found ${trufflehogFindings.length} TruffleHog findings (after filtering):`);
    
    const nodeModulesFindings = trufflehogFindings.filter(f => f.file.includes('node_modules'));
    if (nodeModulesFindings.length > 0) {
        console.error(`FAILED: Found ${nodeModulesFindings.length} findings in node_modules!`);
        console.log(JSON.stringify(nodeModulesFindings.slice(0, 5), null, 2));
    } else {
        console.log('SUCCESS: No findings from node_modules.');
    }
    
    console.log(`Total findings from all tools: ${findings.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTrufflehog();
