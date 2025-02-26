import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { CATEGORY_MAP } from '@/db/categories';

function isCategoryAllowed(
  slug: string,
  bucket: string,
  server: string,
  counts: Record<string, number>,
  filterSettings: { enableMedia: boolean; enableForeignBots: boolean }
) {
  if (!filterSettings.enableMedia && ['videos', 'with-images'].includes(slug)) return false;
  if (!filterSettings.enableForeignBots && ['from-bots', 'direct-mentions', 'non-english'].includes(slug)) return false;
  if (slug === 'reblogs' && server !== '$HOME') return false;
  return counts[bucket] > 0;
}

function getAdjacentCategory(
  currentSlug: string,
  direction: 'prev' | 'next',
  counts: Record<string, number>,
  server: string,
  filterSettings: { enableMedia: boolean; enableForeignBots: boolean }
) {
  const filteredCategories = CATEGORY_MAP.filter(({ slug, bucket }) =>
    slug === currentSlug || isCategoryAllowed(slug, bucket, server, counts, filterSettings)
  );

  const currentIndex = filteredCategories.findIndex(({ slug }) => slug === currentSlug);

  // Wrap-around index logic
  const newIndex =
    direction === 'prev'
      ? (currentIndex - 1 + filteredCategories.length) % filteredCategories.length
      : (currentIndex + 1) % filteredCategories.length;

  return filteredCategories[newIndex] ?? null;
}

function CategoryNavigationLinks({ server, prevCategory, nextCategory, counts }: {
  server: string;
  prevCategory: { slug: string; label: string; bucket: string };
  nextCategory: { slug: string; label: string; bucket: string };
  counts: Record<string, number>;
}) {
  return (
    <div className="flex items-center justify-between text-blue-500 hover:underline">
      <Link href={`/${server}/${prevCategory.slug}`} className="flex items-center gap-1">
        <ArrowLeftIcon className="h-5 w-5" />
        {prevCategory.label} ({counts[prevCategory.bucket] || 0})
      </Link>

      <Link href={`/`} className="text-center">
        Home
      </Link>

      <Link href={`/${server}/${nextCategory.slug}`} className="flex items-center gap-1">
        {nextCategory.label} ({counts[nextCategory.bucket] || 0})
        <ArrowRightIcon className="h-5 w-5" />
      </Link>
    </div>
  );
}

function CategoryNavigation({
  currentSlug,
  counts,
  server,
  serverName,
  bucketLabel,
  totalCount,
  filterSettings,
}: {
  currentSlug: string;
  counts: Record<string, number>;
  server: string;
  serverName: string | undefined;
  bucketLabel: string;
  totalCount: number;
  filterSettings: {
    enableMedia: boolean; enableForeignBots: boolean
  };
}) {
  if (!counts) return null;

  const prevCategory = getAdjacentCategory(currentSlug, 'prev', counts, server, filterSettings);
  const nextCategory = getAdjacentCategory(currentSlug, 'next', counts, server, filterSettings);

  if (!prevCategory || !nextCategory) return null;

  return (
    <div className="p-3 sm:p-4">
      <CategoryNavigationLinks server={server} prevCategory={prevCategory} nextCategory={nextCategory} counts={counts} />

      {/* Current Category Heading */}
      <h1 className="text-2xl font-bold mt-2">
        {bucketLabel}
        <span className="text-gray-500 text-xl ml-2">({totalCount} total)</span>
      </h1>

      {/* Server Information */}
      <p className="text-gray-600 text-base">
        From {serverName || 'Unknown server'}
      </p>
    </div>
  );
}

export default CategoryNavigation;