import { describe, expect, it } from 'vitest'
import {
  boardPathIsTiny,
  clampGroupDelta,
  mergeWhiteboardStrokes,
  normalizeBoardRect,
  pointInPolygon,
  rectContainsPoint,
  rectsOverlap,
  strokeAtPoint,
  strokeBounds,
  strokesIntersectingLasso,
  strokesIntersectingRect,
  translateStroke,
  type WhiteboardStroke,
} from './whiteboard'

function stroke(
  partial: Partial<WhiteboardStroke> & Pick<WhiteboardStroke, 'id' | 'points'>,
): WhiteboardStroke {
  return {
    tool: 'pen',
    color: '#111827',
    width: 6,
    createdAt: 1,
    ...partial,
  }
}

describe('whiteboard selection', () => {
  it('normalizes a dragged rect', () => {
    const rect = normalizeBoardRect({ x: 0.4, y: 0.5 }, { x: 0.1, y: 0.2 })
    expect(rect).toEqual({ minX: 0.1, minY: 0.2, maxX: 0.4, maxY: 0.5 })
  })

  it('picks strokes whose bounds overlap the marquee', () => {
    const ink = stroke({
      id: 'a',
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    })
    const miss = stroke({
      id: 'b',
      points: [
        { x: 0.8, y: 0.8 },
        { x: 0.9, y: 0.9 },
      ],
    })
    const fill = stroke({
      id: 'c',
      tool: 'fill',
      points: [{ x: 0.15, y: 0.15 }],
    })
    const hit = strokesIntersectingRect(
      [ink, miss, fill],
      { minX: 0.05, minY: 0.05, maxX: 0.3, maxY: 0.3 },
      1000,
      800,
    )
    expect(hit.map((s) => s.id)).toEqual(['a'])
  })

  it('hits the topmost stroke at a point', () => {
    const under = stroke({
      id: 'under',
      points: [{ x: 0.5, y: 0.5 }],
    })
    const over = stroke({
      id: 'over',
      points: [{ x: 0.5, y: 0.5 }],
    })
    expect(strokeAtPoint([under, over], { x: 0.5, y: 0.5 }, 1000, 800)?.id).toBe(
      'over',
    )
  })

  it('clamps a group move so the selection stays on the board', () => {
    const bounds = { minX: 0.8, minY: 0.8, maxX: 0.95, maxY: 0.9 }
    const delta = clampGroupDelta(bounds, 0.4, 0.4)
    expect(bounds.maxX + delta.x).toBeCloseTo(1)
    expect(bounds.maxY + delta.y).toBeCloseTo(1)
    expect(delta.x).toBeCloseTo(0.05)
    expect(delta.y).toBeCloseTo(0.1)
  })

  it('translates every point on a stroke', () => {
    const next = translateStroke(
      stroke({
        id: 'm',
        points: [
          { x: 0.2, y: 0.3 },
          { x: 0.4, y: 0.5 },
        ],
      }),
      0.1,
      -0.1,
    )
    expect(next.points[0]!.x).toBeCloseTo(0.3)
    expect(next.points[0]!.y).toBeCloseTo(0.2)
    expect(next.points[1]!.x).toBeCloseTo(0.5)
    expect(next.points[1]!.y).toBeCloseTo(0.4)
  })

  it('reports bounds for a two-point rect', () => {
    const box = strokeBounds(
      stroke({
        id: 'r',
        tool: 'rect',
        points: [
          { x: 0.2, y: 0.4 },
          { x: 0.6, y: 0.1 },
        ],
      }),
      1000,
      1000,
    )!
    expect(rectContainsPoint(box, { x: 0.4, y: 0.25 })).toBe(true)
    expect(rectsOverlap(box, { minX: 0.5, minY: 0.0, maxX: 0.7, maxY: 0.2 })).toBe(
      true,
    )
  })

  it('keeps pending local points over a stale remote snapshot', () => {
    const remote = stroke({
      id: 'a',
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
      ],
    })
    const local = translateStroke(remote, 0.2, 0)
    const merged = mergeWhiteboardStrokes([remote], [local], new Set(['a']))
    expect(merged[0]!.points[0]!.x).toBeCloseTo(0.3)
  })

  it('selects strokes whose center sits inside a lasso', () => {
    const inside = stroke({
      id: 'in',
      points: [
        { x: 0.4, y: 0.4 },
        { x: 0.5, y: 0.5 },
      ],
    })
    const outside = stroke({
      id: 'out',
      points: [
        { x: 0.85, y: 0.85 },
        { x: 0.9, y: 0.9 },
      ],
    })
    const polygon = [
      { x: 0.2, y: 0.2 },
      { x: 0.7, y: 0.2 },
      { x: 0.7, y: 0.7 },
      { x: 0.2, y: 0.7 },
    ]
    expect(pointInPolygon({ x: 0.45, y: 0.45 }, polygon)).toBe(true)
    expect(boardPathIsTiny(polygon)).toBe(false)
    expect(
      strokesIntersectingLasso([inside, outside], polygon, 1000, 800).map(
        (s) => s.id,
      ),
    ).toEqual(['in'])
  })
})
