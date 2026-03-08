import type { SimulationResult } from '../types';

export interface ChartDataValidity {
  hasData: boolean;
  hasMultiStrategies: boolean;
  hasMultiBatches: boolean;
  isValid: boolean;
  strategyCount: number;
  batchCount: number;
}

export function useChartDataValidity(
  results: SimulationResult[],
  strategyIds: string[],
  batchIds: string[]
): ChartDataValidity {
  const hasData = results.length > 0;
  const hasMultiStrategies = strategyIds.length > 1;
  const hasMultiBatches = batchIds.length > 1;
  const isValid = hasData;

  return {
    hasData,
    hasMultiStrategies,
    hasMultiBatches,
    isValid,
    strategyCount: strategyIds.length,
    batchCount: batchIds.length,
  };
}

/**
 * Check if all constraint violations are zero across all strategies
 */
export function hasZeroViolations(results: SimulationResult[]): boolean {
  return results.every(r =>
    r.constraintViolations.every(cv => cv.violatedCount === 0)
  );
}
