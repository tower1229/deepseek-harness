/** Ring geometry shared with the composer ContextMeter: 14px viewBox, 2px stroke. */
export const RING_RADIUS = 5.5
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** SVG transform: arc starts at bottom (6 o'clock). */
export const RING_FILL_TRANSFORM = 'rotate(90 7 7)'

/**
 * Arc length for a normalized fill height in [0, 1].
 * @param height - clamped fill fraction.
 * @returns dash length in SVG user units.
 */
export function ringArcLength(height: number): number {
  return RING_CIRCUMFERENCE * height
}

/**
 * stroke-dasharray pair for a clockwise ring fill from the bottom.
 * {@link RING_FILL_TRANSFORM} places the stroke origin at 6 o'clock.
 * @param height - clamped fill fraction.
 * @returns dash and gap lengths for SVG strokeDasharray.
 */
export function ringStrokeDasharray(height: number): string {
  const arc = ringArcLength(height)
  return `${arc} ${RING_CIRCUMFERENCE}`
}
