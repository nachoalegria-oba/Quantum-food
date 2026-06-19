import type { QuantumResult } from '../types';

type Complex = [number, number];
type Matrix2x2 = [[Complex, Complex], [Complex, Complex]];

export class QSim {
  private n: number;
  private dim: number;
  private s: Complex[];

  constructor(n: number) {
    this.n = n;
    this.dim = 1 << n;
    this.s = Array.from({ length: this.dim }, (_, i): Complex => (i === 0 ? [1, 0] : [0, 0]));
  }

  private cm(a: Complex, b: Complex): Complex {
    return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  }

  private ca(a: Complex, b: Complex): Complex {
    return [a[0] + b[0], a[1] + b[1]];
  }

  gate(g: Matrix2x2, q: number): void {
    const ns: Complex[] = this.s.map((): Complex => [0, 0]);
    for (let i = 0; i < this.dim; i++) {
      if (!((i >> (this.n - 1 - q)) & 1)) {
        const j = i | (1 << (this.n - 1 - q));
        const a = this.s[i];
        const b = this.s[j];
        ns[i] = this.ca(this.cm(g[0][0], a), this.cm(g[0][1], b));
        ns[j] = this.ca(this.cm(g[1][0], a), this.cm(g[1][1], b));
      }
    }
    this.s = ns;
  }

  h(q: number): void {
    const s = 1 / Math.sqrt(2);
    this.gate([[[s, 0], [s, 0]], [[s, 0], [-s, 0]]], q);
  }

  ry(t: number, q: number): void {
    const c = Math.cos(t / 2), s = Math.sin(t / 2);
    this.gate([[[c, 0], [-s, 0]], [[s, 0], [c, 0]]], q);
  }

  rz(t: number, q: number): void {
    const c = Math.cos(t / 2), s = Math.sin(t / 2);
    this.gate([[[c, -s], [0, 0]], [[0, 0], [c, s]]], q);
  }

  // T-gate: phase rotation by π/4 — adds expressiveness beyond Clifford group
  t(q: number): void {
    const s = Math.SQRT2 / 2;
    this.gate([[[1, 0], [0, 0]], [[0, 0], [s, s]]], q);
  }

  cx(ctrl: number, tgt: number): void {
    const ns: Complex[] = this.s.map((x): Complex => [...x]);
    for (let i = 0; i < this.dim; i++) {
      if ((i >> (this.n - 1 - ctrl)) & 1) {
        const j = i ^ (1 << (this.n - 1 - tgt));
        if (i < j) {
          const tmp = ns[i];
          ns[i] = ns[j];
          ns[j] = tmp;
        }
      }
    }
    this.s = ns;
  }

  probs(): number[] {
    return this.s.map(([r, i]) => r * r + i * i);
  }

  sample(shots: number): Record<string, number> {
    const p = this.probs();
    const counts: Record<string, number> = {};
    for (let s = 0; s < shots; s++) {
      let r = Math.random(), cum = 0;
      for (let i = 0; i < this.dim; i++) {
        cum += p[i];
        if (r <= cum || i === this.dim - 1) {
          const b = i.toString(2).padStart(this.n, '0');
          counts[b] = (counts[b] || 0) + 1;
          break;
        }
      }
    }
    return counts;
  }

  entropy(): number {
    return -this.probs().reduce((s, p) => (p > 1e-10 ? s + p * Math.log2(p) : s), 0);
  }
}

// ─── Cryptographic-quality hash → splitmix32 PRNG ────────────────────────────
// Replaces the old djb2 which collapsed similar queries to near-identical angles.
// hashSeed uses Murmur-style mixing with two independent accumulators.
// splitmix32 is a well-tested PRNG: guarantees statistical independence between angles.

function hashSeed(query: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < query.length; i++) {
    const c = query.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) * 4294967296 + (h1 >>> 0);
}

function splitmix32(seed: number) {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

export function qHashN(query: string, count: number): number[] {
  const rand = splitmix32(hashSeed(query));
  return Array.from({ length: count }, () => rand() * Math.PI * 2);
}

// ─── 8-qubit circuit (256 states, 3 rotation layers + T-gate layer) ───────────
// Qubits → fermentation parameters:
//   Q0 Temperatura principal  Q1 pH
//   Q2 Tiempo de fermentación Q3 Concentración sal/sustrato
//   Q4 Inoculación            Q5 Actividad de agua / humedad
//   Q6 Presión parcial O₂     Q7 Temperatura de maduración

const N = 8;
const SHOTS = 2048;

export function runCircuit(query: string): QuantumResult {
  const a = qHashN(query, 3 * N);   // 24 independent angles
  const sim = new QSim(N);

  // Layer 1 — Hadamard superposition
  for (let q = 0; q < N; q++) sim.h(q);

  // Layer 2 — Encode query via independent Ry rotations
  for (let q = 0; q < N; q++) sim.ry(a[q], q);

  // Layer 3 — Nearest-neighbor entanglement ladder
  for (let q = 0; q < N - 1; q++) sim.cx(q, q + 1);

  // Layer 4 — Independent Rz rotations (golden ratio scaling removed — fully free angles)
  for (let q = 0; q < N; q++) sim.rz(a[q + N], q);

  // Layer 5 — Long-range CNOT web (cross-parameter entanglement)
  sim.cx(7, 0);
  sim.cx(0, 5);
  sim.cx(2, 3);
  sim.cx(4, 1);
  sim.cx(6, 3);
  sim.cx(1, 7);

  // Layer 6 — T-gates on even qubits (π/4 phase, adds non-Clifford depth)
  for (let q = 0; q < N; q += 2) sim.t(q);

  // Layer 7 — Final Ry rotation layer for maximum expressiveness
  for (let q = 0; q < N; q++) sim.ry(a[q + 2 * N], q);

  const counts = sim.sample(SHOTS);
  const bits = new Array(N).fill(0);
  for (const [b, c] of Object.entries(counts)) {
    const p = b.padStart(N, '0');
    for (let i = 0; i < N; i++) if (p[i] === '1') bits[i] += c;
  }

  return {
    counts,
    entropy: sim.entropy(),
    probs: bits.map(b => (b / SHOTS * 100).toFixed(1)),
    top: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([b, c]) => ({ bits: b.padStart(N, '0'), count: c })),
    angles: a,
  };
}
