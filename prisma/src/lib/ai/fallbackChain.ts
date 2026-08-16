import OpenAI from 'openai';

interface ChatPayload {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  temperature?: number;
}

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function executeAiFallbackChain(payload: ChatPayload): Promise<ReadableStream> {
  const models = [
    { client: groq, model: 'llama-3.3-70b-versatile' },
    { client: deepseek, model: 'deepseek-chat' },
    { client: openai, model: 'gpt-4o-mini' },
  ];

  for (const provider of models) {
    try {
      const response = await provider.client.chat.completions.create({
        model: provider.model,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.8,
        stream: true,
      });

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return stream;
    } catch (error) {
      console.warn(`Provider ${provider.model} failed, engaging fallback...`, error);
    }
  }

  throw new Error('All AI providers in the fallback chain failed.');
}
