import { getPolicyContent } from '@/lib/policy-content';
import { PolicyPageShell } from '@/components/policy/policy-page-shell';

export default function PrivacyPage() {
  const content = getPolicyContent('privacy_policy.txt');
  return (
    <PolicyPageShell title="Privacy Policy" icon="shield">
      {content}
    </PolicyPageShell>
  );
}
