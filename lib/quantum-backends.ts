import type { BackendMeta, BackendId, QuantumResult } from '../types';

export const N_QUBITS = 8;
export const SHOTS = 2048;

// ─── Backend registry ─────────────────────────────────────────────────────────
export const BACKENDS: BackendMeta[] = [
  {
    id: 'local',
    provider: 'local',
    label: 'Local',
    sublabel: 'JS simulator',
    latency: 'instantáneo',
    color: '#2a7a50',
    envKeys: [],
    async: false,
  },
  {
    id: 'ibm-sim',
    provider: 'ibm',
    label: 'IBM Sim',
    sublabel: 'IBM Quantum Cloud',
    latency: '~5 s',
    color: '#0f62fe',
    envKeys: ['IBM_QUANTUM_TOKEN', 'IBM_QUANTUM_CRN'],
    async: true,
  },
  {
    id: 'ibm-real',
    provider: 'ibm',
    label: 'IBM QPU',
    sublabel: 'Hardware real',
    latency: '~5 min',
    color: '#0043ce',
    envKeys: ['IBM_QUANTUM_TOKEN', 'IBM_QUANTUM_CRN'],
    async: true,
  },
  {
    id: 'ionq-sim',
    provider: 'ionq',
    label: 'IonQ Sim',
    sublabel: 'IonQ Cloud',
    latency: '~3 s',
    color: '#7040b0',
    envKeys: ['IONQ_API_KEY'],
    async: true,
  },
  {
    id: 'ionq-real',
    provider: 'ionq',
    label: 'IonQ QPU',
    sublabel: 'Iones atrapados',
    latency: '~10 min',
    color: '#4a0068',
    envKeys: ['IONQ_API_KEY'],
    async: true,
  },
];

export function getBackend(id: BackendId): BackendMeta {
  return BACKENDS.find(b => b.id === id) ?? BACKENDS[0];
}

// ─── OpenQASM 3.0 generator (IBM Quantum) ────────────────────────────────────
// Uses stdgates.inc — H, rx, ry, rz, cx, t are all included.
export function toQASM3(angles: number[]): string {
  const lines: string[] = [
    'OPENQASM 3.0;',
    "include 'stdgates.inc';",
    `qubit[${N_QUBITS}] q;`,
    `bit[${N_QUBITS}] c;`,
  ];

  const push = (...l: string[]) => lines.push(...l);

  // Layer 1 — Hadamard superposition
  for (let i = 0; i < N_QUBITS; i++) push(`h q[${i}];`);
  // Layer 2 — Query encoding via independent Ry
  for (let i = 0; i < N_QUBITS; i++) push(`ry(${angles[i].toFixed(8)}) q[${i}];`);
  // Layer 3 — Nearest-neighbor entanglement
  for (let i = 0; i < N_QUBITS - 1; i++) push(`cx q[${i}], q[${i + 1}];`);
  // Layer 4 — Rz phase rotations
  for (let i = 0; i < N_QUBITS; i++) push(`rz(${angles[i + N_QUBITS].toFixed(8)}) q[${i}];`);
  // Layer 5 — Long-range CNOT web
  for (const [c, t] of [[7, 0], [0, 5], [2, 3], [4, 1], [6, 3], [1, 7]] as [number, number][]) {
    push(`cx q[${c}], q[${t}];`);
  }
  // Layer 6 — T-gates (non-Clifford, π/4 phase)
  for (let i = 0; i < N_QUBITS; i += 2) push(`t q[${i}];`);
  // Layer 7 — Final Ry
  for (let i = 0; i < N_QUBITS; i++) push(`ry(${angles[i + 2 * N_QUBITS].toFixed(8)}) q[${i}];`);
  // Measure
  push('c = measure q;');

  return lines.join('\n');
}

// ─── IonQ JSON circuit generator ──────────────────────────────────────────────
// IonQ v0.3 uses "ionq.circuit.v0" format with rotation in radians.
type IonQGate =
  | { gate: string; target: number; rotation?: number }
  | { gate: 'cnot'; control: number; target: number };

export function toIonQCircuit(angles: number[]): { qubits: number; circuit: IonQGate[] } {
  const gates: IonQGate[] = [
    // Layer 1: H
    ...Array.from({ length: N_QUBITS }, (_, i) => ({ gate: 'h', target: i })),
    // Layer 2: Ry
    ...Array.from({ length: N_QUBITS }, (_, i) => ({ gate: 'ry', rotation: angles[i], target: i })),
    // Layer 3: CNOT ladder
    ...Array.from({ length: N_QUBITS - 1 }, (_, i) => ({ gate: 'cnot', control: i, target: i + 1 } as IonQGate)),
    // Layer 4: Rz
    ...Array.from({ length: N_QUBITS }, (_, i) => ({ gate: 'rz', rotation: angles[i + N_QUBITS], target: i })),
    // Layer 5: Long-range
    ...([[7, 0], [0, 5], [2, 3], [4, 1], [6, 3], [1, 7]] as [number, number][]).map(
      ([c, t]) => ({ gate: 'cnot', control: c, target: t } as IonQGate),
    ),
    // Layer 6: T-gates (IonQ uses 't')
    ...Array.from({ length: N_QUBITS }, (_, i) => i % 2 === 0 ? { gate: 't', target: i } : null)
      .filter((x): x is IonQGate => x !== null),
    // Layer 7: Final Ry
    ...Array.from({ length: N_QUBITS }, (_, i) => ({ gate: 'ry', rotation: angles[i + 2 * N_QUBITS], target: i })),
  ];

  return { qubits: N_QUBITS, circuit: gates };
}

// ─── Result parsers ───────────────────────────────────────────────────────────

// IBM Sampler V2 returns BitArray: base64-encoded byte matrix [shots × bytes_per_shot].
// Each shot is one row; bits are MSB-first within each byte.
export function parseIBMBitArray(data: unknown): Record<string, number> | null {
  const results = (data as Record<string, unknown>)?.results as Array<Record<string, unknown>> | undefined;
  const regData = results?.[0]?.data as Record<string, unknown> | undefined;
  if (!regData) return null;

  const regName = Object.keys(regData)[0];
  if (!regName) return null;
  const arr = (regData[regName] as Record<string, unknown>)?.array as Record<string, unknown> | undefined;
  if (!arr?.values) return null;

  const bytes = Buffer.from(arr.values as string, 'base64');
  const shots = (arr.shape as number[])?.[0] ?? SHOTS;
  const bytesPerShot = Math.ceil(N_QUBITS / 8);
  const counts: Record<string, number> = {};

  for (let i = 0; i < shots; i++) {
    let bits = '';
    for (let b = 0; b < bytesPerShot; b++) {
      bits += bytes[i * bytesPerShot + b].toString(2).padStart(8, '0');
    }
    const key = bits.slice(0, N_QUBITS);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// IonQ returns a histogram: {integer_key: probability}
// Integer key is the bitstring read as binary (LSB = qubit 0).
export function parseIonQHistogram(
  histogram: Record<string, number>,
  shots: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [key, prob] of Object.entries(histogram)) {
    const bits = parseInt(key).toString(2).padStart(N_QUBITS, '0');
    const count = Math.round(prob * shots);
    if (count > 0) counts[bits] = count;
  }
  return counts;
}

// ─── Shared: counts → QuantumResult ──────────────────────────────────────────
export function countsToResult(
  counts: Record<string, number>,
  shots: number,
  angles: number[],
): QuantumResult {
  const bits = new Array(N_QUBITS).fill(0);
  for (const [b, c] of Object.entries(counts)) {
    const p = b.padStart(N_QUBITS, '0');
    for (let i = 0; i < N_QUBITS; i++) if (p[i] === '1') bits[i] += c;
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
  const entropy = -Object.values(counts).reduce((s, c) => {
    const p = c / total;
    return p > 1e-10 ? s + p * Math.log2(p) : s;
  }, 0);

  return {
    counts,
    entropy,
    probs: bits.map(b => (b / shots * 100).toFixed(1)),
    top: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([b, c]) => ({ bits: b.padStart(N_QUBITS, '0'), count: c })),
    angles,
  };
}
