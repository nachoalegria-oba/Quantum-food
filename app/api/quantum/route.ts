import { NextRequest, NextResponse } from 'next/server';
import type { BackendId } from '../../../types';
import { toQASM3, toIonQCircuit } from '../../../lib/quantum-backends';
import { getIBMAccessToken } from '../../../lib/ibm-auth';

const IBM_BASE = 'https://quantum.cloud.ibm.com/api/v1';
const IONQ_BASE = 'https://api.ionq.co/v0.3';

// ─── POST /api/quantum — Submit circuit to a remote backend ──────────────────
export async function POST(req: NextRequest) {
  const { backend, angles } = (await req.json()) as { backend: BackendId; angles: number[] };

  // ── IBM Quantum ──────────────────────────────────────────────────────────────
  if (backend === 'ibm-sim' || backend === 'ibm-real') {
    const crn = process.env.IBM_QUANTUM_CRN;
    if (!crn) {
      return NextResponse.json(
        { error: 'IBM_QUANTUM_CRN no configurado. Consíguelo en cloud.ibm.com → tu instancia IBM Quantum → Credenciales.' },
        { status: 400 },
      );
    }

    let token: string;
    try {
      token = await getIBMAccessToken();
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 401 });
    }

    const backendName =
      backend === 'ibm-sim'
        ? (process.env.IBM_SIM_BACKEND ?? 'ibmq_qasm_simulator')
        : (process.env.IBM_REAL_BACKEND ?? 'ibm_sherbrooke');

    const qasm = toQASM3(angles);

    const res = await fetch(`${IBM_BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Service-CRN': crn,
      },
      body: JSON.stringify({
        program_id: 'sampler',
        backend: backendName,
        params: {
          pubs: [[{ qasm_code: qasm }, {}, 2048]],
          version: 2,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? data.error ?? `IBM error ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ jobId: data.id, provider: 'ibm' });
  }

  // ── IonQ ─────────────────────────────────────────────────────────────────────
  if (backend === 'ionq-sim' || backend === 'ionq-real') {
    const key = process.env.IONQ_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'IONQ_API_KEY no configurado. Consíguelo en cloud.ionq.com/settings/api-keys.' },
        { status: 400 },
      );
    }

    const target =
      backend === 'ionq-sim'
        ? 'simulator'
        : (process.env.IONQ_REAL_TARGET ?? 'qpu.aria-1');

    const circuit = toIonQCircuit(angles);

    const res = await fetch(`${IONQ_BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `apiKey ${key}`,
      },
      body: JSON.stringify({
        target,
        shots: 2048,
        input: {
          format: 'ionq.circuit.v0',
          gateset: 'qis',
          qubits: circuit.qubits,
          circuit: circuit.circuit,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? `IonQ error ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ jobId: data.id, provider: 'ionq' });
  }

  return NextResponse.json({ error: `Backend "${backend}" no reconocido` }, { status: 400 });
}
