// lib/email-templates.ts
// Shared email HTML wrapper for the CMD Ordination Portal.
// Provides consistent branding across all outbound emails.

const DEEP_SEA = '#00426A'
const ALLIANCE_BLUE = '#0077C8'

/**
 * Wraps body HTML in the standard CMD email template.
 * Includes branded header, body container, and footer.
 */
export function wrapEmail(bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:${DEEP_SEA};padding:24px 32px;border-bottom:4px solid ${ALLIANCE_BLUE};">
    <span style="color:#fff;font-weight:bold;font-size:16px;letter-spacing:0.05em;">CMD ORDINATION PORTAL</span>
  </div>
  <div style="padding:32px;">
    ${bodyHtml}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">Canadian Midwest District &middot; The Alliance Canada</p>
  </div>
</div>`
}

/** CTA button styled consistently across emails. */
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${DEEP_SEA};color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:6px;margin:8px 0 24px;">
  ${label}
</a>`
}

/** Highlighted info block with left accent border. */
export function emailInfoBlock(text: string): string {
  return `<div style="background:#f0f7ff;border-left:4px solid ${ALLIANCE_BLUE};border-radius:4px;padding:16px 20px;margin:20px 0;">
  <p style="color:${DEEP_SEA};font-weight:bold;font-size:15px;margin:0;">${text}</p>
</div>`
}
