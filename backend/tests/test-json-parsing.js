import { robustParseJSON } from '../src/utils/json.js';

console.log('🧪 Testing robustParseJSON...');

const testCases = [
  {
    name: 'Standard JSON',
    input: '{"a": 1, "b": "test"}',
    expected: { a: 1, b: "test" }
  },
  {
    name: 'Markdown Fenced JSON',
    input: 'Here is the JSON: ```json\n{"a": 1, "b": "test"}\n``` Hope you like it!',
    expected: { a: 1, b: "test" }
  },
  {
    name: 'Trailing Comma',
    input: '{"a": 1, "b": "test",}',
    expected: { a: 1, b: "test" }
  },
  {
    name: 'Unterminated String',
    input: '{"a": 1, "b": "unterminated',
    expected: { a: 1, b: "unterminated" }
  },
  {
    name: 'Missing Closing Brackets',
    input: '[{"a": 1}, {"b": 2}',
    expected: [{ a: 1 }, { b: 2 }]
  },
  {
    name: 'Comments in JSON',
    input: '{\n  "a": 1, // some comment\n  "b": "test"\n}',
    expected: { a: 1, b: "test" }
  },
  {
    name: 'Bad Control Character (Newline in string)',
    input: '{"a": "hello\nworld"}',
    expected: { a: "hello\\nworld" }
  }
];

let passed = 0;
for (const tc of testCases) {
  const result = robustParseJSON(tc.input);
  const resultStr = JSON.stringify(result);
  const expectedStr = JSON.stringify(tc.expected);
  
  if (resultStr === expectedStr) {
    console.log(`✅ PASSED: ${tc.name}`);
    passed++;
  } else {
    console.log(`❌ FAILED: ${tc.name}`);
    console.log(`   Input:    ${tc.input}`);
    console.log(`   Expected: ${expectedStr}`);
    console.log(`   Got:      ${resultStr}`);
  }
}

console.log(`\nSummary: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
  process.exit(0);
} else {
  process.exit(1);
}
