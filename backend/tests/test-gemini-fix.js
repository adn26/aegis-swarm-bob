
import { getAIProvider } from '../src/services/ai-provider.service.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import logger from '../src/utils/logger.js';

async function testGemini() {
  try {
    const provider = getAIProvider('redteam');
    console.log('Testing Gemini with direct message objects...');
    
    // Test case 1: Raw objects like LangGraph might pass
    const rawMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    
    console.log('Invoking with raw objects...');
    console.log('Messages passed to provider:', JSON.stringify(rawMessages, null, 2));
    const response1 = await provider.generateCompletion(rawMessages);
    console.log('Response 1:', response1);
    
    // Test case 2: LangChain message objects
    const langchainMessages = [
      new SystemMessage('You are a helpful assistant.'),
      new HumanMessage('What is 2+2?')
    ];
    
    console.log('\nInvoking with LangChain objects...');
    const response2 = await provider.generateCompletion(langchainMessages);
    console.log('Response 2:', response2);
    
    console.log('\nSUCCESS: Gemini handled both raw objects and LangChain objects.');
  } catch (error) {
    console.error('\nFAILED:', error);
    process.exit(1);
  }
}

testGemini();
