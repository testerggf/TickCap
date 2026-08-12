export interface RecordTimingSample {
  elapsedMs: number
  entry: string
}

export interface RecordTimingMetrics {
  sampleCount: number
  medianMs: number | null
  withinThreeSecondsRate: number | null
  quickTagSampleCount: number
  quickTagWithinThreeSecondsRate: number | null
}

function rate(values: readonly number[]): number | null {
  if (!values.length) return null
  return values.filter((value) => value <= 3_000).length / values.length
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function computeRecordTimingMetrics(
  samples: readonly RecordTimingSample[],
): RecordTimingMetrics {
  const elapsed = samples.map((sample) => Math.max(0, sample.elapsedMs))
  const quickTagElapsed = samples
    .filter((sample) => sample.entry === 'quick_tag')
    .map((sample) => Math.max(0, sample.elapsedMs))
  return {
    sampleCount: samples.length,
    medianMs: median(elapsed),
    withinThreeSecondsRate: rate(elapsed),
    quickTagSampleCount: quickTagElapsed.length,
    quickTagWithinThreeSecondsRate: rate(quickTagElapsed),
  }
}
