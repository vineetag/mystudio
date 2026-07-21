// Squarified treemap layout (Bruls, Huizing & van Wijk, 2000). Pure geometry:
// values in, rectangles out — the renderer only draws them.
//
// Written by hand rather than pulled from d3-hierarchy: this is ~70 lines and
// the app deliberately ships no chart library (see components/portfolio-chart).

export interface TreemapInput {
  /** Stable identity for the React key and the tooltip. */
  key: string
  /** Must be > 0; zero/negative areas can't be laid out and are filtered out. */
  value: number
}

export interface TreemapTile<T extends TreemapInput> {
  item: T
  x: number
  y: number
  width: number
  height: number
}

interface Region {
  x: number
  y: number
  width: number
  height: number
}

/** Worst (largest) aspect ratio in a row of areas laid along `side`. */
function worstRatio(areas: number[], side: number): number {
  if (areas.length === 0 || side <= 0) return Infinity
  const sum = areas.reduce((total, area) => total + area, 0)
  const min = Math.min(...areas)
  const max = Math.max(...areas)
  const sideSq = side * side
  const sumSq = sum * sum
  return Math.max((sideSq * max) / sumSq, sumSq / (sideSq * min))
}

/**
 * Lay `items` out in a `width` × `height` box, each tile's area proportional to
 * its value, aspect ratios kept as close to square as the algorithm allows.
 * Items are laid out in the order given — sort by value descending first for
 * the classic large-to-small reading order.
 */
export function squarify<T extends TreemapInput>(
  items: T[],
  width: number,
  height: number,
): TreemapTile<T>[] {
  const usable = items.filter((item) => item.value > 0)
  if (usable.length === 0 || width <= 0 || height <= 0) return []

  const totalValue = usable.reduce((sum, item) => sum + item.value, 0)
  // Work in pixel-area units so the row heuristic compares like with like.
  const scale = (width * height) / totalValue
  const queue = usable.map((item) => ({ item, area: item.value * scale }))

  const tiles: TreemapTile<T>[] = []
  let region: Region = { x: 0, y: 0, width, height }
  let row: typeof queue = []

  function layoutRow(currentRow: typeof queue, currentRegion: Region): Region {
    const rowArea = currentRow.reduce((sum, entry) => sum + entry.area, 0)
    const vertical = currentRegion.width >= currentRegion.height
    // Thickness of the band we're about to fill, across the shorter axis.
    const thickness = rowArea / (vertical ? currentRegion.height : currentRegion.width)

    let offset = 0
    for (const entry of currentRow) {
      const length = entry.area / thickness
      tiles.push(
        vertical
          ? {
              item: entry.item,
              x: currentRegion.x,
              y: currentRegion.y + offset,
              width: thickness,
              height: length,
            }
          : {
              item: entry.item,
              x: currentRegion.x + offset,
              y: currentRegion.y,
              width: length,
              height: thickness,
            },
      )
      offset += length
    }

    return vertical
      ? {
          x: currentRegion.x + thickness,
          y: currentRegion.y,
          width: currentRegion.width - thickness,
          height: currentRegion.height,
        }
      : {
          x: currentRegion.x,
          y: currentRegion.y + thickness,
          width: currentRegion.width,
          height: currentRegion.height - thickness,
        }
  }

  for (const entry of queue) {
    const side = Math.min(region.width, region.height)
    const areas = row.map((rowEntry) => rowEntry.area)

    // Adding this tile helps while it doesn't worsen the row's worst ratio.
    if (row.length > 0 && worstRatio([...areas, entry.area], side) > worstRatio(areas, side)) {
      region = layoutRow(row, region)
      row = []
    }
    row.push(entry)
  }

  if (row.length > 0) layoutRow(row, region)

  return tiles
}
