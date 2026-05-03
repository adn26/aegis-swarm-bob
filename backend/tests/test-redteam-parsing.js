const mockModelResponse = `
\`\`\`json
[
  {
    "id": "TRUFFLEHOG-GitHub-0",
    "ruleId": "GitHub",
    "attackVector": "An attacker can use this token to access private repositories and sensitive data on GitHub.",
    "impact": "Full access to source code and potential CI/CD pipelines.",
    "exploitCode": "curl -H \\"Authorization: token ghp_xxxx\\" https://api.github.com/user",
    "severity": "Critical",
    "justification": "Verified secrets are always critical as they provide immediate access."
  }
]
\`\`\`
`;

import { robustParseJSON } from '../src/utils/json.js';

async function testRedTeamParsing() {
  console.log('🧪 Testing Red Team Parsing Logic...');
  
  // Directly provide a clean JSON string to test if the extraction works
  const cleanJson = JSON.stringify([
    {
      "id": "TRUFFLEHOG-GitHub-0",
      "ruleId": "GitHub",
      "attackVector": "An attacker can use this token to access private repositories and sensitive data on GitHub.",
      "impact": "Full access to source code and potential CI/CD pipelines.",
      "exploitCode": 'curl -H "Authorization: token ghp_xxxx" https://api.github.com/user',
      "severity": "Critical",
      "justification": "Verified secrets are always critical as they provide immediate access."
    }
  ]);
  
  const markdownInput = `Here is the results:\n\`\`\`json\n${cleanJson}\n\`\`\`\nHope this helps.`;
  
  const narratives = robustParseJSON(markdownInput, []);
  
  if (Array.isArray(narratives) && narratives.length > 0) {
    const n = narratives[0];
    console.log('✅ Narratives parsed successfully from markdown');
    console.log('   Attack Vector:', n.attackVector);
    console.log('   Severity:', n.severity);
    
    if (n.severity === 'Critical') {
      console.log('✅ Severity correctly parsed');
    }
  } else {
    console.log('❌ Narrative parsing failed');
    console.log('Input was:', markdownInput);
    process.exit(1);
  }
}

testRedTeamParsing();
