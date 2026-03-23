import { getPolicyContent } from '@/lib/policy-content';
import { PolicyPageShell } from '@/components/policy/policy-page-shell';

export default function RefundPolicyPage() {
  const content = getPolicyContent('refund_and_cancellation.txt');
  return (
    <PolicyPageShell title="Refund and Cancellation Policy" icon="refund">
      {content}
    </PolicyPageShell>
  );
}
