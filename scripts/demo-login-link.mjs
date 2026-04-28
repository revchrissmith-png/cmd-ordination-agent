#!/usr/bin/env node
// scripts/demo-login-link.mjs
//
// Mints a single-use magic-link URL for a *@cmd-demo.local demo account.
// Used because real OTP emails to .local addresses bounce — this is the
// supported alternative for sign-in.
//
// Usage:
//   node scripts/demo-login-link.mjs                        # jordan, prod portal
//   node scripts/demo-login-link.mjs alex.bennett@cmd-demo.local
//   node scripts/demo-login-link.mjs jordan.smith@cmd-demo.local local   # local dev server
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
// .env.local (already present for the rest of the app).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

let url, serviceKey
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (!m) continue
    const [, k, v] = m
    const val = v.replace(/^['"]|['"]$/g, '')
    if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = val
    if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = val
  }
} catch (err) {
  console.error(`Could not read ${envPath}: ${err.message}`)
  process.exit(1)
}

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const email = process.argv[2] ?? 'jordan.smith@cmd-demo.local'
const target = process.argv[3] ?? 'prod'

if (!email.endsWith('@cmd-demo.local')) {
  console.error(`Refusing — this script only mints links for @cmd-demo.local accounts. Got: ${email}`)
  process.exit(1)
}

const redirectTo = target === 'local'
  ? 'http://localhost:3000/dashboard/ordinand'
  : 'https://ordination.canadianmidwest.ca/dashboard/ordinand'

const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'magiclink', email, redirect_to: redirectTo }),
})

if (!res.ok) {
  console.error(`generate_link failed: HTTP ${res.status}`)
  console.error(await res.text())
  process.exit(1)
}

const data = await res.json()
const link = data.action_link ?? data.properties?.action_link
if (!link) {
  console.error('No action_link in response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

const linkRedirect = new URL(link).searchParams.get('redirect_to')
const redirectMismatch = linkRedirect && !linkRedirect.startsWith(redirectTo.split('/dashboard')[0])

console.log(`\nSign-in link for ${email}:\n\n${link}\n\nThis link is single-use. Open it in the browser where you want to be signed in as the demo account.\n`)

if (redirectMismatch) {
  console.error(`⚠  Redirect target was overridden by Supabase to: ${linkRedirect}`)
  console.error(`   Expected: ${redirectTo}`)
  console.error(`   This means ${redirectTo.split('/dashboard')[0]} is not on the project's Auth → URL Configuration → Redirect URLs allowlist.`)
  console.error(`   Add it (e.g. "${redirectTo.split('/dashboard')[0]}/**") in the Supabase dashboard, then re-run.`)
  console.error(`   Real ordinand sign-in uses 6-digit OTP codes, not magic links, so this only affects demo accounts.\n`)
}
