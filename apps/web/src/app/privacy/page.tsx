import type { Metadata } from 'next';
import { APP_NAME } from '@goprivate/config';
import { PrivacyPage } from '@/components/PrivacyPage';

export const metadata: Metadata = {
  title: `Privacy Policy — ${APP_NAME}`,
  description: `Privacy policy for ${APP_NAME}: how we handle your data, what we collect (and don't), and your rights.`,
};

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
