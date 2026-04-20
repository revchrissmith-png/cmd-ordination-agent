// lib/config.ts
// Centralised configuration — domain URLs, email settings, and book options.
// Move these to environment variables or DB if they need to change between deployments.

// ── Domain & Email ──────────────────────────────────────────────────────────
export const SITE_DOMAIN     = 'ordination.canadianmidwest.ca'
export const SITE_URL        = `https://${SITE_DOMAIN}`
export const EMAIL_FROM      = 'CMD Ordination Portal <noreply@send.canadianmidwest.ca>'
export const ADMIN_EMAIL     = 'system.admin@canadianmidwest.ca'
export const ORG_NAME        = 'Canadian Midwest District'
export const ORG_PARENT      = 'The Alliance Canada'

// ── Book Report Options ─────────────────────────────────────────────────────
// Keyed by requirement_templates.book_category. Empty array = free text entry.
export const BOOK_OPTIONS: Record<string, string[]> = {
  history: [
    'All For Jesus — Robert L. Niklaus',
    'A.B. Simpson and the Making of Modern Evangelicalism — Daryn Henry',
  ],
  theology: [
    'Abide and Go: Missional Theosis in the Gospel of John — Michael J. Gorman',
    'Rethinking Holiness: A Theological Introduction — Bernie Van De Walle',
    'Surprised by Hope: Rethinking Heaven, the Resurrection, and the Mission of the Church — N.T. Wright',
  ],
  deeper_life: [
    'Strengthening the Soul of Your Leadership — Ruth Haley Barton',
    'Hearing God: Developing a Conversational Relationship With God — Dallas Willard',
  ],
  missions: [
    'Completion of the Kairos Course',
    'Short-term mission trip with the Alliance Canada + On Mission: Why We Go — Ronald Brown',
    "The Mission of God's People: A Biblical Theology of the Church's Mission — Christopher J.H. Wright",
  ],
  holy_scripture: [
    'God Has Spoken — J.I. Packer',
    'The Blue Parakeet: Rethinking How You Read The Bible — Scot McKnight',
  ],
  anthropology: [
    'Strange New World: How Thinkers and Activists Redefined Identity and Sparked the Sexual Revolution — Carl R. Trueman',
    'The Genesis of Gender — Abigail Favale',
    'Love Thy Body — Nancy Pearcy',
  ],
  disciple_making: [
    "The Great Omission: Reclaiming Jesus' Essential Teachings on Discipleship — Dallas Willard",
  ],
  specific_ministry_focus: [], // free text — ordinand enters their own book
}
