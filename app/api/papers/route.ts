import { NextRequest, NextResponse } from 'next/server';
import type { Paper } from '../../../types';

const BASE = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/rest/v1/papers` : null;
const KEY  = process.env.SUPABASE_SERVICE_KEY;

function headers(extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey:        KEY!,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function GET() {
  if (!BASE || !KEY) {
    return NextResponse.json({ papers: [], source: 'none' });
  }
  try {
    const res = await fetch(`${BASE}?select=data&order=saved_at.desc`, { headers: headers() });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json() as Array<{ data: Paper }>;
    return NextResponse.json({ papers: rows.map(r => r.data), source: 'supabase' });
  } catch (e) {
    return NextResponse.json({ papers: [], source: 'error', error: (e as Error).message });
  }
}

export async function POST(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ ok: false, source: 'none' });

  const paper = await req.json() as Paper;
  try {
    const res = await fetch(BASE, {
      method:  'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates' }),
      body:    JSON.stringify({ id: paper.id, data: paper, saved_at: paper.savedAt ?? Date.now() }),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!BASE || !KEY) return NextResponse.json({ ok: false, source: 'none' });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  try {
    const res = await fetch(`${BASE}?id=eq.${encodeURIComponent(id)}`, {
      method:  'DELETE',
      headers: headers(),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
