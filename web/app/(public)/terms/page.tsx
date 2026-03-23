import { getPolicyContent } from '@/lib/policy-content';
import { PolicyPageShell } from '@/components/policy/policy-page-shell';

export default function TermsPage() {
  const content = getPolicyContent('terms_and_conditions.txt');
  return (
    <PolicyPageShell title="Terms and Conditions" icon="file">
      {content}
    </PolicyPageShell>
  );
}
