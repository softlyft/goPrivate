import type { Metadata } from 'next';
import { GuidePage } from '@/components/GuidePage';

export const metadata: Metadata = {
  title: 'How goPrivate works',
  description: 'Learn how to use goPrivate — private chat that disappears when you’re done.',
};

export default function GuideRoute() {
  return <GuidePage />;
}
