import { useMemo } from 'react'

const SCREEN_COUNT = 7

// Returns a stable random variant index (0–6) per component mount.
// useMemo means the variant stays fixed for the full duration of a single
// loading session — it only re-randomises on the next generate press
// (which unmounts and remounts the loader).
export function useLoadingScreen(): number {
  return useMemo(() => Math.floor(Math.random() * SCREEN_COUNT), [])
}
