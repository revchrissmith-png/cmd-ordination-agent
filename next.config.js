const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its runtime scripts and Tailwind for inline styles
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Local images, data URIs, and the CMD logo used in the email preview modal.
  // i.ytimg.com is allowed so YouTube thumbnails inside the /training embeds resolve.
  "img-src 'self' data: https://i.imgur.com https://i.ytimg.com",
  "font-src 'self'",
  // Supabase API + realtime websocket
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Anthropic API is called server-side only — no client connect-src needed.
  // YouTube nocookie embeds are allowed for the /training video library.
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

module.exports = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — belt-and-suspenders with frame-ancestors in CSP
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't send the full URL as referrer to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser features this app doesn't use
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
        ],
      },
    ]
  },
}
