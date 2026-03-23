import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';

export function createMetadata(
  title: string,
  description?: string
): Metadata {
  const fullTitle = `${SITE_NAME} \u2014 ${title}`;
  const desc = description || SITE_DESCRIPTION;

  return {
    title: fullTitle,
    description: desc,
    openGraph: {
      title: fullTitle,
      description: desc,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
    },
  };
}
