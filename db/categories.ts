import { Bucket } from './bucket';

export const CATEGORY_MAP = [
  { slug: 'regular', bucket: Bucket.regular, label: 'Regular' },
  // { slug: 'subscribed', bucket: Bucket.subscribed, label: 'Subscribed' },
  { slug: 'questions', bucket: Bucket.questions, label: 'Questions' },
  { slug: 'with-images', bucket: Bucket.withImages, label: 'Images' },
  { slug: 'hashtags', bucket: Bucket.hashtags, label: 'Hashtags' },
  { slug: 'with-links', bucket: Bucket.withLinks, label: 'Links' },
  { slug: 'videos', bucket: Bucket.videos, label: 'Videos' },
  // { slug: 'replies', bucket: Bucket.asReplies, label: 'Replies' },
  { slug: 'direct-mentions', bucket: Bucket.directMentions, label: 'Mentions' },
  { slug: 'from-bots', bucket: Bucket.fromBots, label: 'Bots' },
  { slug: 'non-english', bucket: Bucket.nonEnglish, label: 'Non-English' },
  { slug: 'reblogs', bucket: Bucket.reblogs, label: 'Reblogs' },
  { slug: 'saved', bucket: Bucket.saved, label: 'Saved' },
] as const;

export type Category = typeof CATEGORY_MAP[number];

export function getCategoryBySlug(categorySlug: string): { bucket: Bucket; label: string } {
  const category = CATEGORY_MAP.find(c => c.slug === categorySlug);
  if (!category) {
    throw new Error(`Invalid category slug: ${categorySlug}`);
  }
  return { bucket: category.bucket, label: category.label };
}