import { NextResponse } from 'next/server';
import type { BackendId } from '../../../types';
import { BACKENDS } from '../../../lib/quantum-backends';

// Returns which backends are configured based on env vars.
// Called once on page load so the client can enable/disable backend pills.
export async function GET() {
  const configured: BackendId[] = ['local'];

  for (const b of BACKENDS) {
    if (b.id === 'local') continue;
    const allPresent = b.envKeys.every(k => !!process.env[k]);
    if (allPresent) configured.push(b.id);
  }

  return NextResponse.json({ configured });
}
