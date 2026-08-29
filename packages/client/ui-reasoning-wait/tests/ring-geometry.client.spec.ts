import { describe, expect, it } from 'vitest'
import {
  RING_CIRCUMFERENCE,
  RING_FILL_TRANSFORM,
  ringArcLength,
  ringStrokeDasharray,
} from '../src/client/ring-geometry.ts'

describe('ring geometry', () => {
  it('starts at the bottom and fills clockwise via positive dash length', () => {
    expect(RING_FILL_TRANSFORM).toBe('rotate(90 7 7)')
    const dash = ringStrokeDasharray(0.5)
    const arc = Number.parseFloat(dash.split(/\s+/)[0] ?? '0')
    expect(arc).toBeGreaterThan(0)
    expect(arc).toBe(ringArcLength(0.5))
    expect(dash).toBe(`${ringArcLength(0.5)} ${RING_CIRCUMFERENCE}`)
  })
})
