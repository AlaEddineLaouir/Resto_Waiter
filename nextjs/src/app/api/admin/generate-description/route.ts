import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { context, contextType } = await req.json();

    if (!context) {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'AI API not configured' }, { status: 500 });
    }

    const prompts: Record<string, string> = {
      item: `Write a single appetizing sentence (max 20 words) describing a dish called "${context}". Be creative and make it sound delicious. Output ONLY the sentence, nothing else.`,
      section: `Write a single welcoming sentence (max 15 words) for a menu section called "${context}". Output ONLY the sentence, nothing else.`,
      menu: `Write a single welcoming sentence (max 15 words) for a menu called "${context}". Output ONLY the sentence, nothing else.`,
      ingredient: `Write a single sentence (max 12 words) describing the ingredient "${context}". Focus on freshness and quality. Output ONLY the sentence, nothing else.`,
    };

    const prompt = prompts[contextType] || prompts.item;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant menu writer. Output ONLY a single plain text sentence. No markdown, no bold, no asterisks, no quotes, no character counts, no citations, no brackets, no numbers in brackets. Just one clean sentence.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error('AI API error');
    }

    const data = await response.json();
    let description = data.choices?.[0]?.message?.content?.trim() || '';

    // Clean up the response - remove any unwanted formatting
    description = description
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '') // Remove italic markdown
      .replace(/\[[\d,\s]+\]/g, '') // Remove citations like [1][2][3] or [1, 2]
      .replace(/\(\d+\s*chars?\)/gi, '') // Remove character counts like (98 chars)
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Generate description error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
