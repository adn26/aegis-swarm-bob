
import { getAIProvider } from '../src/services/ai-provider.service.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

async function testGemini() {
  try {
    const provider = getAIProvider('redteam');
    
    console.log('Testing SystemMessage getType...');
    const sys = new SystemMessage('test');
    console.log('SystemMessage.getType:', typeof sys.getType);
    console.log('SystemMessage._getType:', typeof sys._getType);
    if (sys.getType) console.log('SystemMessage.getType():', sys.getType());
    if (sys._getType) console.log('SystemMessage._getType():', sys._getType());
    
    console.log('\nTesting HumanMessage getType...');
    const human = new HumanMessage('test');
    console.log('HumanMessage.getType:', typeof human.getType);
    console.log('HumanMessage._getType:', typeof human._getType);
    if (human.getType) console.log('HumanMessage.getType():', human.getType());
    if (human._getType) console.log('HumanMessage._getType():', human._getType());

  } catch (error) {
    console.error('\nFAILED:', error);
  }
}

testGemini();
