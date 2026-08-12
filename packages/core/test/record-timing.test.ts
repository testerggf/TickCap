import { describe, expect, it } from 'vitest'
import { computeRecordTimingMetrics } from '../src'

describe('3 秒原则采样', () => {
  it('计算总体和快速标签达成率', () => {
    expect(
      computeRecordTimingMetrics([
        { entry: 'quick_tag', elapsedMs: 120 },
        { entry: 'quick_tag', elapsedMs: 3_100 },
        { entry: 'text', elapsedMs: 2_000 },
      ]),
    ).toEqual({
      sampleCount: 3,
      medianMs: 2_000,
      withinThreeSecondsRate: 2 / 3,
      quickTagSampleCount: 2,
      quickTagWithinThreeSecondsRate: 0.5,
    })
  })

  it('空样本不伪造通过率', () => {
    expect(computeRecordTimingMetrics([])).toEqual({
      sampleCount: 0,
      medianMs: null,
      withinThreeSecondsRate: null,
      quickTagSampleCount: 0,
      quickTagWithinThreeSecondsRate: null,
    })
  })
})
