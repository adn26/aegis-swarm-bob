import { getAIProvider } from '../src/services/ai-provider.service.js';

async function test() {
  const provider = getAIProvider('redteam');
  const prompt = `Return a JSON array containing a single object with "code_before" field containing this code snippet: 
console.log("hello");
return {"status": true};
`;
  console.log("Generating...");
  const res = await provider.generateCompletion([prompt]);
  console.log("RAW RESPONSE:");
  console.log(res);
  
  import('../src/utils/json.js').then(m => {
    console.log("PARSED:");
    console.log(m.robustParseJSON(res, []));
  });
}

test();