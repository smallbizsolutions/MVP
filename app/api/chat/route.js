import { NextResponse } from 'next/server';

export async function POST(request) {
  const { messages, documents } = await request.json();

  const context = documents.map(doc => 
    `Document: ${doc.name}\n${doc.content}`
  ).join('\n\n---\n\n');

  const systemPrompt = `You are an employee assistant for a retail/food service business. Your ONLY job is to answer questions based on the company documents provided below.

CRITICAL RULES:
1. ONLY answer based on the documents provided
2. If the answer is not in the documents, respond with: "I don't have that information in the company docs. Please ask your manager."
3. Be direct and concise - employees need quick answers
4. Reference which document your answer comes from
5. Never make up policies or procedures
6. If you're unsure, say you don't know

Company Documents:
${context || 'No documents uploaded yet.'}`;

  // Convert messages to Anthropic format
  const anthropicMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: systemPrompt,
        messages: anthropicMessages
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Convert back to OpenAI-style format for frontend compatibility
    return NextResponse.json({
      choices: [{
        message: {
          content: data.content[0].text
        }
      }]
    });

  } catch (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 }
    );
  }
}
