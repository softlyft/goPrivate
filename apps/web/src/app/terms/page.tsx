import type { Metadata } from 'next';
import { APP_NAME } from '@goprivate/config';
import { TermsPage } from '@/components/TermsPage';

export const metadata: Metadata = {
  title: `Terms of Service — ${APP_NAME}`,
  description: `Terms of Service for ${APP_NAME}: acceptable use, privacy, disclaimers, and your rights when using the service.`,
};

export default function TermsRoute() {
  return <TermsPage />;
}
