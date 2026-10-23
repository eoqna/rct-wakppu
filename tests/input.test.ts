import { describe, expect, it } from 'vitest'
import { stickAxis, ViewGesture } from '../src/game/input.ts'

const expectAxis = (got: [number, number], want: [number, number]) => {
  expect(got[0]).toBeCloseTo(want[0], 6)
  expect(got[1]).toBeCloseTo(want[1], 6)
}

describe('on-screen stick', () => {
  it('a light touch near the centre does not move', () => {
    expect(stickAxis(5, 3, 100)).toEqual([0, 0])
  })

  it('pushing up walks forward and pushing right walks right, at full speed', () => {
    expectAxis(stickAxis(0, -100, 100), [0, 1])
    expectAxis(stickAxis(100, 0, 100), [1, 0])
    expectAxis(stickAxis(0, 100, 100), [0, -1])
  })

  it('a thumb dragged past the rim stays at full speed in its direction', () => {
    expectAxis(stickAxis(-300, -400, 100), [-0.6, 0.8])
  })

  it('a stick pushed part way walks slower in the same direction', () => {
    const [ix, iz] = stickAxis(0, -45, 100)
    expect(ix).toBeCloseTo(0, 6)
    expect(iz).toBeGreaterThan(0.1)
    expect(iz).toBeLessThan(0.9)
  })
})

describe('dragging and pinching the view', () => {
  const record = () => {
    const drags: [number, number][] = [], pinches: number[] = []
    const g = new ViewGesture((dx, dy) => drags.push([dx, dy]), (s) => pinches.push(s))
    return { g, drags, pinches }
  }

  it('one finger turns the view by how far it moved', () => {
    const { g, drags, pinches } = record()
    g.down(1, 100, 100)
    g.move(1, 130, 90)
    g.move(1, 140, 90)
    expect(drags).toEqual([[30, -10], [10, 0]])
    expect(pinches).toEqual([])
  })

  it('two fingers spreading apart zoom by how much the gap grew, without turning the view', () => {
    const { g, drags, pinches } = record()
    g.down(1, 100, 100)
    g.down(2, 200, 100)
    g.move(2, 300, 100)
    expect(pinches).toEqual([2])
    expect(drags).toEqual([])
  })

  it('lifting one finger of a pinch goes back to turning from where the other finger is', () => {
    const { g, drags } = record()
    g.down(1, 100, 100)
    g.down(2, 200, 100)
    g.move(1, 80, 100)
    g.up(2)
    g.move(1, 90, 100)
    expect(drags).toEqual([[10, 0]])
  })

  it('a pointer that is not down on the view moves nothing', () => {
    const { g, drags, pinches } = record()
    g.move(7, 50, 50)
    g.down(1, 0, 0)
    g.up(1)
    g.move(1, 20, 0)
    expect(drags).toEqual([])
    expect(pinches).toEqual([])
  })
})
