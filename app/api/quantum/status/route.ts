import { NextRequest, NextResponse } from 'next/server';
import { qHashN } from '../../../../lib/qsim';
import { parseIBMBitArray, parseIonQHistogram, countsToResult, SHOTS } from '../../../../lib/quantum-backends';
import { getIBMAccessToken } from '../../../../lib/ibm-auth';
import type { JobStatus } from '../../../../types';

const IBM_BASE = 'https://quantum.cloud.ibm.com/api/v1';
const IONQ_BASE = 'https://api.ionq.co/v0.3';

// GET /api/quantum/status?provider=ibm|ionq&jobId=…&query=…
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get('provider');
  const jobId = sp.get('jobId');
  const query = sp.get('query') ?? '';

  if (!provider || !jobId) {
    return NextResponse.json({ error: 'provider y jobId son requeridos' } satisfies { error: string }, { status: 400 });
  }

  // ── IBM ───────────────────────────────────────────────────────────────────────
  if (provider === 'ibm') {
    const crn = process.env.IBM_QUANTUM_CRN;
    if (!crn) return NextResponse.json({ error: 'IBM_QUANTUM_CRN no configurado' }, { status: 400 });

    let token: string;
    try { token = await getIBMAccessToken(); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 401 }); }

    const headers = { Authorization: `Bearer ${token}`, 'Service-CRN': crn };

    const statusRes = await fetch(`${IBM_BASE}/jobs/${jobId}`, { headers });
    const statusData = await statusRes.json() as Record<string, unknown>;

    const ibmStatus = String(statusData.status ?? '').toLowerCase();

    if (ibmStatus === 'completed' || ibmStatus === 'succeeded') {
      const rRes = await fetch(`${IBM_BASE}/jobs/${jobId}/results`, { headers });
      const rData = await rRes.json();
      const counts = parseIBMBitArray(rData);
      if (!counts) {
        return NextResponse.json({ status: 'failed', error: 'No se pudo parsear BitArray de IBM' } satisfies JobStatus);
      }
      const angles = qHashN(query, 24);
      return NextResponse.json({ status: 'completed', result: countsToResult(counts, SHOTS, angles) } satisfies JobStatus);
    }

    if (ibmStatus === 'failed' || ibmStatus === 'cancelled') {
      return NextResponse.json({ status: 'failed', error: String(statusData.error_message ?? statusData.error ?? 'IBM job falló') } satisfies JobStatus);
    }

    return NextResponse.json({
      status: ibmStatus === 'running' ? 'running' : 'queued',
      queuePosition: typeof statusData.position === 'number' ? statusData.position : undefined,
    } satisfies JobStatus);
  }

  // ── IonQ ──────────────────────────────────────────────────────────────────────
  if (provider === 'ionq') {
    const key = process.env.IONQ_API_KEY;
    if (!key) return NextResponse.json({ error: 'IONQ_API_KEY no configurado' }, { status: 400 });

    const headers = { Authorization: `apiKey ${key}` };

    const statusRes = await fetch(`${IONQ_BASE}/jobs/${jobId}`, { headers });
    const statusData = await statusRes.json() as Record<string, unknown>;

    if (statusData.status === 'completed') {
      const rRes = await fetch(`${IONQ_BASE}/jobs/${jobId}/results`, { headers });
      const rData = await rRes.json() as { histogram?: Record<string, number> };
      const shots = (statusData.shots as number | undefined) ?? SHOTS;
      if (!rData.histogram) {
        return NextResponse.json({ status: 'failed', error: 'IonQ no devolvió histograma' } satisfies JobStatus);
      }
      const counts = parseIonQHistogram(rData.histogram, shots);
      const angles = qHashN(query, 24);
      return NextResponse.json({ status: 'completed', result: countsToResult(counts, shots, angles) } satisfies JobStatus);
    }

    if (statusData.status === 'failed' || statusData.status === 'canceled') {
      const failure = statusData.failure as Record<string, unknown> | undefined;
      return NextResponse.json({ status: 'failed', error: String(failure?.error ?? 'IonQ job falló') } satisfies JobStatus);
    }

    const iqToPhase: Record<string, JobStatus['status']> = {
      ready: 'queued', submitted: 'queued', running: 'running',
    };
    return NextResponse.json({ status: iqToPhase[statusData.status as string] ?? 'queued' } satisfies JobStatus);
  }

  return NextResponse.json({ error: `Provider "${provider}" no reconocido` }, { status: 400 });
}
