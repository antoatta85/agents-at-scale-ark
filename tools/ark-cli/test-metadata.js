import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8000/openai/v1',
  apiKey: 'not-needed',
});

async function test() {
  console.log('Sending first request without context ID...');

  const response1 = await client.chat.completions.create({
    model: 'agent/message-counter-agent',
    messages: [{ role: 'user', content: 'first message' }],
    stream: true
  });

  console.log('\n=== First Response ===');
  for await (const chunk of response1) {
    console.log('Chunk:', JSON.stringify(chunk, null, 2));
  }
}

test().catch(console.error);
