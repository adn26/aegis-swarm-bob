
import { getAIProvider } from '../src/services/ai-provider.service.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

async function testGemini() {
  try {
    const provider = getAIProvider('redteam');
    const model = provider.getModel();
    
    console.log('Testing raw LangChain invoke...');
    const sys = new SystemMessage('You are a helpful assistant.');
    const human = new HumanMessage('Hello!');
    
    // Alias getType if missing
    if (!sys.getType && sys._getType) sys.getType = sys._getType.bind(sys);
    if (!human.getType && human._getType) human.getType = human._getType.bind(human);

    console.log('sys.content:', sys.content);
    console.log('human.content:', human.content);

    const response = await model.invoke([sys, human]);
    console.log('Response:', response.content);

  } catch (error) {
    console.error('\nFAILED:', error);
  }
}

testGemini();
