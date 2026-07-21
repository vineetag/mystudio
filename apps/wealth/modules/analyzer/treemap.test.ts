import { describe, expect, it } from "vitest"
import { squarify, type TreemapInput } from "./treemap"

const WIDTH = 400
const HEIGHT = 300

function items(...values: number[]): TreemapInput[] {
  return values.map((value, index) => ({ key: `k${index}`, value }))
}

describe("squarify", () => {
  it("fills the box exactly — tile areas sum to the box area", () => {
    const tiles = squarify(items(50, 30, 12, 5, 3), WIDTH, HEIGHT)
    const area = tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0)

    expect(area).toBeCloseTo(WIDTH * HEIGHT, 5)
  })

  it("gives each tile an area proportional to its value", () => {
    const tiles = squarify(items(75, 25), WIDTH, HEIGHT)
    const byKey = new Map(tiles.map((tile) => [tile.item.key, tile]))

    const big = byKey.get("k0")!
    const small = byKey.get("k1")!
    expect((big.width * big.height) / (small.width * small.height)).toBeCloseTo(3, 5)
  })

  it("keeps every tile inside the box", () => {
    const tiles = squarify(items(40, 25, 15, 10, 6, 4), WIDTH, HEIGHT)

    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(-1e-9)
      expect(tile.y).toBeGreaterThanOrEqual(-1e-9)
      expect(tile.x + tile.width).toBeLessThanOrEqual(WIDTH + 1e-9)
      expect(tile.y + tile.height).toBeLessThanOrEqual(HEIGHT + 1e-9)
    }
  })

  it("produces no overlapping tiles", () => {
    const tiles = squarify(items(30, 25, 20, 15, 10), WIDTH, HEIGHT)

    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i]
        const b = tiles[j]
        const overlaps =
          a.x < b.x + b.width - 1e-9 &&
          b.x < a.x + a.width - 1e-9 &&
          a.y < b.y + b.height - 1e-9 &&
          b.y < a.y + a.height - 1e-9
        expect(overlaps, `${a.item.key} overlaps ${b.item.key}`).toBe(false)
      }
    }
  })

  it("gives a single item the whole box", () => {
    const [tile] = squarify(items(42), WIDTH, HEIGHT)

    expect(tile.x).toBe(0)
    expect(tile.y).toBe(0)
    expect(tile.width).toBeCloseTo(WIDTH, 6)
    expect(tile.height).toBeCloseTo(HEIGHT, 6)
  })

  it("drops non-positive values rather than emitting inverted tiles", () => {
    const tiles = squarify(
      [
        { key: "a", value: 10 },
        { key: "b", value: 0 },
        { key: "c", value: -5 },
      ],
      WIDTH,
      HEIGHT,
    )

    expect(tiles.map((tile) => tile.item.key)).toEqual(["a"])
  })

  it("returns nothing for an empty list or a zero-sized box", () => {
    expect(squarify([], WIDTH, HEIGHT)).toEqual([])
    expect(squarify(items(10, 5), 0, HEIGHT)).toEqual([])
  })
})
