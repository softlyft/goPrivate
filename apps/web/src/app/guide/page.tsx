import type { Metadata } from 'next';
import { APP_NAME } from '@goprivate/config';
import { GuidePage } from '@/components/GuidePage';

export const metadata: Metadata = {
  title: `How ${APP_NAME} works`,
  description: `Learn how to use ${APP_NAME} — private chat that disappears when you’re done.`,
};

export default function GuideRoute() {
  return <GuidePage />;
}
