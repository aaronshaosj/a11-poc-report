import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function formatPercent(n: number, decimals = 1): string {
  return n.toFixed(decimals) + '%';
}

/** Seeded pseudo-random for reproducible mock data */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Gaussian random using Box-Muller */
export function gaussianRandom(rand: () => number, mean: number, std: number): number {
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/** Compute boxplot stats from array */
export function boxplotStats(data: number[]): [number, number, number, number, number] {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q2 = sorted[Math.floor(n * 0.5)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return [min, q1, q2, q3, max];
}
