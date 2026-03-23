import fs from 'node:fs';
import path from 'node:path';

export type PolicyFileName =
  | 'privacy_policy.txt'
  | 'terms_and_conditions.txt'
  | 'refund_and_cancellation.txt';

export function getPolicyContent(filename: PolicyFileName): string {
  const filePath = path.join(process.cwd(), 'content', 'policy', filename);
  return fs.readFileSync(filePath, 'utf8');
}
