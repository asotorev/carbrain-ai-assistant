// Test script for conversation memory persistence
// Validates conversation storage, retrieval, and session resumption

import { DatabaseConnection } from '@infrastructure/database/connection';
import { ConversationRepository } from '@infrastructure/database/repositories/conversation.repository';
import { Conversation, ConversationMessage } from '@domain/entities/conversation';

async function testConversationMemory() {
  console.log('='.repeat(70));
  console.log('Conversation Memory Persistence Test');
  console.log('='.repeat(70));
  console.log();

  const db = DatabaseConnection.getInstance();
  const repository = new ConversationRepository(db);

  try {
    await testCreateConversation(repository);
    await testRetrieveConversation(repository);
    await testUpdateConversation(repository);
    await testFindBySessionId(repository);
    await testFindByCustomerId(repository);
    await testConversationLifecycle(repository);
    await testStaleConversations(repository);

    console.log('\n' + '='.repeat(70));
    console.log('All conversation memory tests completed successfully!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  } finally {
    await db.close();
  }
}

async function testCreateConversation(repository: ConversationRepository) {
  console.log('TEST 1: Create and Save Conversation');
  console.log('-'.repeat(70));

  const conversation = Conversation.create({
    sessionId: 'test-session-' + Date.now(),
    messages: [
      {
        role: 'user',
        content: 'Busco un SUV familiar',
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: 'Perfecto! Tengo varias opciones de SUVs familiares...',
        timestamp: new Date()
      }
    ],
    metadata: {
      lastQuery: 'Busco un SUV familiar',
      language: 'es'
    },
    status: 'active'
  });

  console.log(`Creating conversation with ID: ${conversation.id}`);
  console.log(`Session ID: ${conversation.sessionId}`);
  console.log(`Messages: ${conversation.messageCount}`);

  const saved = await repository.save(conversation);

  console.log('\nConversation saved successfully!');
  console.log(`Stored ${saved.messageCount} messages`);
  console.log(`Status: ${saved.status}`);
  console.log(`Started at: ${saved.startedAt.toISOString()}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testRetrieveConversation(repository: ConversationRepository) {
  console.log('TEST 2: Retrieve Conversation by ID');
  console.log('-'.repeat(70));

  // Create a test conversation
  const conversation = Conversation.create({
    sessionId: 'retrieve-test-' + Date.now(),
    messages: [],
    metadata: {},
    status: 'active'
  });

  await repository.save(conversation);
  console.log(`Created conversation: ${conversation.id}`);

  // Retrieve it
  const retrieved = await repository.findById(conversation.id);

  if (!retrieved) {
    throw new Error('Failed to retrieve conversation');
  }

  console.log('\nConversation retrieved successfully!');
  console.log(`ID matches: ${retrieved.id === conversation.id}`);
  console.log(`Session ID matches: ${retrieved.sessionId === conversation.sessionId}`);
  console.log(`Status: ${retrieved.status}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testUpdateConversation(repository: ConversationRepository) {
  console.log('TEST 3: Update Conversation with New Messages');
  console.log('-'.repeat(70));

  // Create conversation
  const conversation = Conversation.create({
    sessionId: 'update-test-' + Date.now(),
    messages: [
      { role: 'user', content: 'Hello', timestamp: new Date() }
    ],
    metadata: {},
    status: 'active'
  });

  await repository.save(conversation);
  console.log(`Initial conversation with ${conversation.messageCount} message`);

  // Add messages
  conversation.addMessage({
    role: 'assistant',
    content: 'Hi! How can I help you today?',
    timestamp: new Date()
  });

  conversation.addMessage({
    role: 'user',
    content: 'Looking for a reliable car',
    timestamp: new Date()
  });

  conversation.updateMetadata({
    lastQuery: 'Looking for a reliable car',
    language: 'en'
  });

  // Update
  await repository.save(conversation);
  console.log(`Updated conversation with ${conversation.messageCount} messages`);

  // Verify
  const retrieved = await repository.findById(conversation.id);
  if (!retrieved) {
    throw new Error('Failed to retrieve updated conversation');
  }

  console.log('\nConversation updated successfully!');
  console.log(`Messages stored: ${retrieved.messageCount}`);
  console.log(`Last message: "${retrieved.messages[retrieved.messages.length - 1]?.content}"`);
  console.log(`Metadata updated: ${JSON.stringify(retrieved.metadata)}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testFindBySessionId(repository: ConversationRepository) {
  console.log('TEST 4: Find Conversation by Session ID');
  console.log('-'.repeat(70));

  const sessionId = 'session-' + Date.now();
  const conversation = Conversation.create({
    sessionId,
    messages: [],
    metadata: { test: 'session-lookup' },
    status: 'active'
  });

  await repository.save(conversation);
  console.log(`Created conversation with session ID: ${sessionId}`);

  const found = await repository.findBySessionId(sessionId);

  if (!found) {
    throw new Error('Failed to find conversation by session ID');
  }

  console.log('\nConversation found by session ID!');
  console.log(`ID: ${found.id}`);
  console.log(`Session ID: ${found.sessionId}`);
  console.log(`Metadata: ${JSON.stringify(found.metadata)}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testFindByCustomerId(repository: ConversationRepository) {
  console.log('TEST 5: Find Conversations by Customer ID');
  console.log('-'.repeat(70));

  const customerId = crypto.randomUUID();

  // Create multiple conversations for same customer
  const conv1 = Conversation.create({
    customerId,
    sessionId: 'session-1-' + Date.now(),
    messages: [],
    metadata: { conversationNumber: 1 },
    status: 'completed'
  });
  conv1.complete();

  const conv2 = Conversation.create({
    customerId,
    sessionId: 'session-2-' + Date.now(),
    messages: [],
    metadata: { conversationNumber: 2 },
    status: 'active'
  });

  await repository.save(conv1);
  await repository.save(conv2);

  console.log(`Created 2 conversations for customer: ${customerId.substring(0, 8)}...`);

  const conversations = await repository.findByCustomerId(customerId);

  console.log(`\nFound ${conversations.length} conversations for customer`);
  conversations.forEach((conv, i) => {
    console.log(`  ${i + 1}. Status: ${conv.status}, Session: ${conv.sessionId}`);
  });

  // Test finding active conversation
  const active = await repository.findActiveByCustomerId(customerId);
  console.log(`\nActive conversation: ${active ? active.sessionId : 'none'}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testConversationLifecycle(repository: ConversationRepository) {
  console.log('TEST 6: Conversation Lifecycle Management');
  console.log('-'.repeat(70));

  const conversation = Conversation.create({
    sessionId: 'lifecycle-test-' + Date.now(),
    messages: [],
    metadata: {},
    status: 'active'
  });

  await repository.save(conversation);
  console.log(`Created active conversation: ${conversation.id}`);

  // Complete the conversation
  conversation.complete();
  await repository.save(conversation);

  let retrieved = await repository.findById(conversation.id);
  console.log(`Conversation completed: ${retrieved?.status === 'completed'}`);
  console.log(`Completed at: ${retrieved?.completedAt?.toISOString()}`);

  // Reactivate
  conversation.reactivate();
  await repository.save(conversation);

  retrieved = await repository.findById(conversation.id);
  console.log(`Conversation reactivated: ${retrieved?.status === 'active'}`);

  // Abandon
  await repository.markAsAbandoned(conversation.id);

  retrieved = await repository.findById(conversation.id);
  console.log(`Conversation abandoned: ${retrieved?.status === 'abandoned'}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testStaleConversations(repository: ConversationRepository) {
  console.log('TEST 7: Find Stale Conversations');
  console.log('-'.repeat(70));

  // This test would need conversations older than the threshold
  // For now, just verify the query works
  const staleConversations = await repository.findStaleConversations(30);

  console.log(`Found ${staleConversations.length} stale conversations (>30 minutes old)`);

  if (staleConversations.length > 0) {
    console.log('\nStale conversations:');
    staleConversations.slice(0, 3).forEach(conv => {
      const minutesOld = Math.floor((Date.now() - conv.lastActivityAt.getTime()) / (1000 * 60));
      console.log(`  - ${conv.id.substring(0, 8)}... (${minutesOld} minutes old)`);
    });
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
testConversationMemory()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
