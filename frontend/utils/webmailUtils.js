/**
 * Pure Webmail Inbox URL Resolver
 * Resolves user email domain to popular webmail providers (Gmail, Yahoo, Outlook)
 * or falls back to mailto: / default Gmail.
 */

export function resolveWebmailInboxUrl(email) {
  const lower = String(email ?? '').toLowerCase().trim();
  if (lower.includes('@gmail.com')) {
    return 'https://mail.google.com/mail/u/0/#search/Kalceria';
  }
  if (lower.includes('@yahoo.com')) {
    return 'https://mail.yahoo.com';
  }
  if (lower.includes('@outlook.com') || lower.includes('@hotmail.com')) {
    return 'https://outlook.live.com/mail';
  }
  if (lower && lower.includes('@')) {
    return `mailto:${lower}`;
  }
  return 'https://mail.google.com';
}

