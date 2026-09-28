import type { Metadata } from 'next';
import { APP_NAME, DESCRIPTION } from '@goprivate/config';
import { MarketingPage } from '@/components/MarketingPage';

export const metadata: Metadata = {
  title: `${APP_NAME} — private chat that disappears`,
  description: DESCRIPTION,
};

export default function AboutRoute() {
  return <MarketingPage />;
}
