/**
 * A small counter that says "not so fast".
 *
 * In memory, per process. A portal running behind several instances counts
 * separately in each, so this is a brake on a runaway script, not a defence
 * against a determined attacker — that belongs in front of the app, in a
 * proxy or a gateway. It is here because an endpoint that writes rows should
 * never be unbounded.
 */

export interface Limit {
  /** How many requests are allowed in a window. */
  allowed: number
  /** How long a window lasts, in milliseconds. */
  windowMs: number
}

export interface Verdict {
  ok: boolean
  /** How long to wait before trying again, in seconds. */
  retryAfterSeconds: number
}

interface Window {
  count: number
  resetAt: number
}

/**
 * A limiter for one kind of request.
 *
 * Keys are whatever the caller counts by — a session, an app, an address.
 * Expired windows are dropped as they are met again, so the map does not
 * grow without end.
 */
export function createLimiter(limit: Limit, now: () => number = Date.now) {
  const windows = new Map<string, Window>()

  return {
    check(key: string): Verdict {
      const time = now()
      const existing = windows.get(key)

      if (!existing || existing.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + limit.windowMs })
        sweep(windows, time)
        return { ok: true, retryAfterSeconds: 0 }
      }

      if (existing.count >= limit.allowed) {
        return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - time) / 1000) }
      }

      existing.count += 1
      return { ok: true, retryAfterSeconds: 0 }
    },
  }
}

/** Forgets windows that have passed, so old keys do not pile up. */
function sweep(windows: Map<string, Window>, time: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= time) windows.delete(key)
  }
}
