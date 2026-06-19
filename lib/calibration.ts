import type { Calibration, Paper } from '../types';

export function computeCalibration(papers: Paper[]): Calibration | null {
  const valid = papers.filter(p => p.temperatura_min !== null);
  if (valid.length < 2) return null;

  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const T = valid.flatMap(p => [p.temperatura_min!, p.temperatura_max!].filter((x): x is number => x !== null));
  const pH = valid.flatMap(p => [p.pH_min!, p.pH_max!].filter((x): x is number => x !== null));
  const Ti = valid.flatMap(p => [p.tiempo_min_h!, p.tiempo_max_h!].filter((x): x is number => x !== null));
  const C = valid.flatMap(p => [p.concentracion_min!, p.concentracion_max!].filter((x): x is number => x !== null));

  return {
    count: valid.length,
    temp: { min: Math.min(...T), max: Math.max(...T), mean: avg(T) },
    pH: { min: Math.min(...pH), max: Math.max(...pH), mean: avg(pH) },
    tiempo: { min: Math.min(...Ti), max: Math.max(...Ti), mean: avg(Ti) },
    conc: { min: Math.min(...C), max: Math.max(...C), mean: avg(C) },
  };
}
