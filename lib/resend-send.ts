// lib/resend-send.ts
// Rate-limit-aware Resend sender.
//
// Resend's standard accounts cap outbound at 5 emails/sec. Tight loops hit
// 429s once the burst exceeds that ceiling — which the launch-comms preview
// route discovered (6th of 6 messages failed under tight serial sends).
//
// This module wraps the single-email POST in two layers:
//   1. A throttle (default 250 ms between calls ≈ 4/sec) to stay under cap.
//   2. Automatic retry on 429, respecting the Retry-After header.
//
// Callers get a clean Promise<SendResult> per email and can continue
// reporting per-recipient success/failure. Use sendMany() for fan-out
// across a list of recipients.
import { fetchWithTimeout } from '../utils/fetchWithTimeout'

const RESEND_URL          = 'https://api.resend.com/emails'
const DEFAULT_THROTTLE_MS = 250        // ~4/sec, safely under the 5/sec cap
const DEFAULT_TIMEOUT_MS  = 15_000
const MAX_429_RETRIES     = 3

export type EmailPayload = {
  from:      string
  to:        string[]
  subject:   string
  html:      string
  reply_to?: string
}

export type SendResult =
  | { ok: true;  id?: string }
  | { ok: false; status: number | null; detail: string }

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Send a single Resend email with built-in 429 retry. No throttle here —
 * the caller is responsible for spacing successive calls (use sendMany()
 * if you want that handled for you).
 */
export async function sendOne(payload: EmailPayload, resendKey: string): Promise<SendResult> {
  let attempt = 0
  while (true) {
    try {
      const res = await fetchWithTimeout(RESEND_URL, {
        method:     'POST',
        timeoutMs:  DEFAULT_TIMEOUT_MS,
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: true, id: data?.id }
      }

      // Honour Resend's Retry-After on 429. Cap retries.
      if (res.status === 429 && attempt < MAX_429_RETRIES) {
        const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1')
        const waitMs     = Math.max(1000, Math.ceil(retryAfter * 1000))
        await sleep(waitMs)
        attempt += 1
        continue
      }

      const detail = await res.text().catch(() => res.statusText)
      return { ok: false, status: res.status, detail }
    } catch (err: any) {
      return { ok: false, status: null, detail: err?.message ?? 'Network error' }
    }
  }
}

/**
 * Send an array of emails, spacing requests `throttleMs` apart so the
 * outbound rate stays under Resend's cap. Returns the same array shape
 * with one SendResult per input email, in order.
 */
export async function sendMany(
  payloads:   EmailPayload[],
  resendKey:  string,
  throttleMs: number = DEFAULT_THROTTLE_MS,
): Promise<SendResult[]> {
  const results: SendResult[] = []
  for (let i = 0; i < payloads.length; i++) {
    if (i > 0) await sleep(throttleMs)
    results.push(await sendOne(payloads[i], resendKey))
  }
  return results
}
