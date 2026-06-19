import { NextRequest, NextResponse } from 'next/server';

// Auto-selects provider based on which env var is present.
// Priority: Gemini → Groq
// All return the same shape: { content: [{ text: string }] }

type Message = { role: string; content: string | unknown[] };

async function callGemini(system: string, messages: Message[], maxTokens: number) {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(m.content)
        ? m.content
        : [{ text: m.content as string }],
    })),
    generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
    );
    const data = await res.json();

    if (res.status === 429) {
      // Parse "retry in Xs" from the error message, cap at 65s
      const match = (data.error?.message as string ?? '').match(/retry in ([\d.]+)s/i);
      const wait = Math.min(Math.ceil(parseFloat(match?.[1] ?? '60')), 65) * 1000;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) throw new Error(data.error?.message ?? `Gemini ${res.status}`);
    // gemini-2.5-flash returns thinking parts (thought: true) before the real answer — skip them
    const parts: Array<{ thought?: boolean; text?: string }> = data.candidates?.[0]?.content?.parts ?? [];
    const answer = parts.find(p => !p.thought && p.text);
    return answer?.text ?? '';
  }
  throw new Error('Gemini: demasiadas peticiones, intenta de nuevo en un momento');
}

async function callGroq(system: string, messages: Message[], maxTokens: number) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Groq ${res.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  const { system, messages, maxTokens = 1000 } = await req.json() as {
    system: string;
    messages: Message[];
    maxTokens?: number;
  };

  // Build list of configured providers — priority: Gemini → Groq
  const candidates: Array<{ name: string; fn: () => Promise<string> }> = [];

  if (process.env.GEMINI_API_KEY)
    candidates.push({ name: 'gemini', fn: () => callGemini(system, messages, maxTokens) });
  if (process.env.GROQ_API_KEY)
    candidates.push({ name: 'groq',   fn: () => callGroq(system, messages, maxTokens) });

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'No hay API key configurada. Añade GEMINI_API_KEY o GROQ_API_KEY en .env.local' },
      { status: 500 },
    );
  }

  try {
    // Race all configured providers — first successful response wins
    const { text, provider } = await Promise.any(
      candidates.map(c =>
        c.fn().then(text => ({ text, provider: c.name }))
      )
    );
    return NextResponse.json({ content: [{ text }], provider });
  } catch (e) {
    const msg = e instanceof AggregateError
      ? e.errors.map((err: Error) => err.message).join(' | ')
      : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
