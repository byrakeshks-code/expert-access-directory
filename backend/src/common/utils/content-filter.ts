/**
 * Basic keyword-based content filter for request messages.
 * Returns a list of flagged terms found in the text, or empty array if clean.
 * This is a simple blocklist approach — in production, consider a proper
 * moderation API (e.g., OpenAI Moderation, Perspective API).
 */

const BLOCKED_PATTERNS: RegExp[] = [
  // Explicit spam/scam patterns
  /\b(send\s+money|wire\s+transfer|western\s+union|bitcoin\s+wallet)\b/i,
  /\b(click\s+here|act\s+now|limited\s+time\s+offer)\b/i,
  /\b(nigerian?\s+prince|lottery\s+winner|you\s+have\s+won)\b/i,
  // Threats and harassment
  /\b(i\s+will\s+kill|death\s+threat|bomb\s+threat)\b/i,
  /\b(i['']?ll\s+find\s+you|know\s+where\s+you\s+live)\b/i,
];

export interface ContentFilterResult {
  passed: boolean;
  flaggedPatterns: string[];
}

export function filterContent(text: string): ContentFilterResult {
  if (!text || typeof text !== 'string') {
    return { passed: true, flaggedPatterns: [] };
  }

  const flagged: string[] = [];
  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flagged.push(match[0]);
    }
  }

  return {
    passed: flagged.length === 0,
    flaggedPatterns: flagged,
  };
}
