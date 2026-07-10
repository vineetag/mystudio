export type ActionResult = { ok: true } | { ok: false; error: string }

export type ActionResultWith<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
