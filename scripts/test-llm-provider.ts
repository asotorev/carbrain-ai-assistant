// Test script for LLM provider abstraction layer
// Validates OllamaLLMProvider implementation through ILLMProvider interface

import { OllamaLLMProvider } from '../src/infrastructure/ai/providers/ollama-llm-provider';
import { ChatMessage } from '../src/application/interfaces/llm-provider.interface';

async function testLLMProvider(): Promise<void> {
  console.log('='.repeat(60));
  console.log('LLM Provider Abstraction Test');
  console.log('='.repeat(60));
  console.log();

  const provider = new OllamaLLMProvider();

  // Test 1: Provider availability
  console.log('Test 1: Provider Availability Check');
  console.log('-'.repeat(60));
  const isAvailable = await provider.isAvailable();
  console.log(`Provider: ${provider.getModelName()}`);
  console.log(`Status: ${isAvailable ? 'Available' : 'Unavailable'}`);

  if (!isAvailable) {
    console.error('ERROR: Provider is not available');
    console.log('Please ensure Ollama is running and models are installed');
    process.exit(1);
  }
  console.log('SUCCESS: Provider is available');
  console.log();

  // Test 2: Simple text generation
  console.log('Test 2: Simple Text Generation');
  console.log('-'.repeat(60));
  const prompt = 'Name one popular family SUV in one sentence.';
  console.log(`Prompt: ${prompt}`);
  console.log();
  console.log('Generating response...');
  console.log();

  try {
    const response = await provider.generateText(prompt, { temperature: 0.7 });
    console.log('Response:');
    console.log(response);
    console.log();
    console.log('SUCCESS: Text generation working');
  } catch (error) {
    console.error('ERROR: Text generation failed:', error);
    process.exit(1);
  }
  console.log();

  // Test 3: Multi-turn conversation
  console.log('Test 3: Multi-Turn Conversation');
  console.log('-'.repeat(60));

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful automotive sales assistant. Be concise.'
    },
    {
      role: 'user',
      content: 'Recommend one family SUV in one sentence.'
    }
  ];

  console.log('System message:', messages[0]?.content || 'N/A');
  console.log('User message:', messages[1]?.content || 'N/A');
  console.log();
  console.log('Generating response...');
  console.log();

  try {
    const chatResponse = await provider.chat(messages, { temperature: 0.8 });
    console.log('Assistant response:');
    console.log(chatResponse.content);
    console.log();
    console.log(`Model: ${chatResponse.model}`);
    console.log(`Finish reason: ${chatResponse.finishReason || 'N/A'}`);
    console.log();
    console.log('SUCCESS: Chat conversation working');
  } catch (error) {
    console.error('ERROR: Chat failed:', error);
    process.exit(1);
  }
  console.log();

  // Test 4: Follow-up conversation
  console.log('Test 4: Follow-Up Conversation');
  console.log('-'.repeat(60));

  messages.push({
    role: 'assistant',
    content: 'I recommend the Honda CR-V for families.'
  });
  messages.push({
    role: 'user',
    content: 'What is its price range? One sentence.'
  });

  console.log('Follow-up question:', messages[3]?.content || 'N/A');
  console.log();
  console.log('Generating response...');
  console.log();

  try {
    const followUpResponse = await provider.chat(messages);
    console.log('Assistant response:');
    console.log(followUpResponse.content);
    console.log();
    console.log('SUCCESS: Follow-up conversation working');
  } catch (error) {
    console.error('ERROR: Follow-up conversation failed:', error);
    process.exit(1);
  }

  console.log();
  console.log('='.repeat(60));
  console.log('All LLM Provider Tests Passed');
  console.log('='.repeat(60));
  console.log();
  console.log('The provider abstraction layer is working correctly.');
  console.log('You can now swap providers without changing application logic.');
}

testLLMProvider().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
