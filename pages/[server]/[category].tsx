import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { useServers } from '@/context/ServersContext';
import { useServerStats } from '@/hooks/useServerStats';
import { useDestroyPosts } from '@/hooks/useDestroyPosts';
import { useTimeline } from '@/hooks/useTimeline';
import { useSyncPosts } from '@/hooks/useSyncPosts';
import { useMarkPosts } from '@/hooks/useMarkPosts';
import PostList from '../../components/PostList';
import AsyncButton from '../../components/AsyncButton';
import NavigationBar from '../../components/NavigationBar';
import { getCategoryBySlug } from '../../db/categories';
import { Bucket } from '@/db/bucket';
import Head from 'next/head';
import CategoryNavigation from '@/components/ CategoryNavigation';

const POSTS_PER_PAGE = 25;
const FILTER_SETTINGS_KEY = 'filterSettings';

export default function CategoryPage() {
  const router = useRouter();
  const rawServer = router.query.server;
  const rawCategory = router.query.category;

  // Normalize server and category
  const server = typeof rawServer === 'string' ? rawServer : rawServer?.[0] ?? undefined;
  const category = typeof rawCategory === 'string' ? rawCategory : rawCategory?.[0] ?? 'regular';

  const [chronological, setChronological] = useState<boolean | undefined>(undefined); 

  const { getServerBySlug } = useServers();
  const { data: serverStats, invalidateServerStats } = useServerStats(server || '');

  const {
    countsQuery: { data: countsData },
    postsQuery: { data: postsData, fetchNextPage, hasNextPage },
    invalidateTimeline,
  } = useTimeline({
    server: server || '',
    category,
    chronological,
    postsPerPage: POSTS_PER_PAGE,
  });
  const { deletePosts, destroyDatabase } = useDestroyPosts(invalidateTimeline, invalidateServerStats);

  const { bucket, label: bucketLabel } = getCategoryBySlug(category);
  const { markSeen } = useMarkPosts(server || '', bucket);
  const posts =
    postsData?.pages.flatMap((page) => page.buckets[category] || []) || [];

  const totalCount = countsData
    ? (countsData?.counts as Record<Bucket, number>)[bucket]
    : -1;

  const handleLoadMore = async () => {
    await fetchNextPage();
  };

  // const latestFetchId = useRef(0);

  const [filterSettings, setFilterSettings] = useState({
    chronological: true,
    showNonStopWords: true,
    highlightThreshold: null as number | null,
    enableForeignBots: false,
    enableMedia: true,
  });

  // Update filter settings in localStorage and state
  const updateFilterSettings = (newSettings: Partial<typeof filterSettings>) => {
    const updatedSettings = { ...filterSettings, ...newSettings };
    if (newSettings.chronological !== undefined) {
      setChronological(newSettings.chronological);
    }
    setFilterSettings(updatedSettings);
    localStorage.setItem(FILTER_SETTINGS_KEY, JSON.stringify(updatedSettings));
  };

  // Load filter settings from localStorage on initial render
  useEffect(() => {
    if (!router.isReady) return;
    if (chronological !== (router.query.chronological === 'true')) {
      setChronological(router.query.chronological === 'true');
    }
  }, [router.query]);
  useEffect(() => {
    if (!router.isReady) return;
    if (chronological === undefined) return;
    const savedSettings = localStorage.getItem(FILTER_SETTINGS_KEY);
    if (savedSettings) {
      const newSettings = JSON.parse(savedSettings);
      if (newSettings.chronological === undefined) {
        newSettings.chronological = chronological;
      }
      if (router.isReady && chronological !== undefined && newSettings.chronological !== chronological.toString()) {
        setChronological(newSettings.chronological);
      }
      setFilterSettings(newSettings);
    }
  }, [router.query, chronological]);

  const handleServerChange = (newServer: string) => {
    router.push(`/${newServer}/${category}`);
  };

  const { mutateAsync: syncPosts } = useSyncPosts({
    server: server as string,
    invalidateTimeline,
    invalidateServerStats,
  });
  
  const handleSyncNewer = async () => {
    await syncPosts({ older: false, batch: 1 });
  };
  
  const handleSyncOlder = async () => {
    await syncPosts({ older: true, batch: 1 });
  };
  
  const handleSyncNewer5x = async () => {
    await syncPosts({ older: false, batch: 5 });
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleMarkSeen = async () => {
    // Still needed?
    // const fetchId = ++latestFetchId.current;
    await markSeen({ posts, chronological: !!chronological, invalidateTimeline });
    //   if (fetchId !== latestFetchId.current) return;
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!server) {
    return <p className="text-gray-600">Invalid server selection.</p>;
  }
  // <Head>
  //   <title>{`${bucketLabel} - ${server}`}</title>
  //   <meta name="description" content={`Posts from ${server} in category ${bucketLabel}`} />
  // </Head>
  return (
    <div className="flex flex-col min-h-screen" style={{ "overflowY": "scroll",  height: '100vh' }} ref={scrollContainerRef}>
      <Head>
        <title>{server ? getServerBySlug(server)?.name : 'Unknown server'} / {getCategoryBySlug(category).label}</title>
      </Head>
      <main className="flex-1 w-full">
        <NavigationBar
          server={server}
          serverStats={serverStats}
          onServerChange={handleServerChange}
          category={category}
          counts={countsData?.counts}
          filterSettings={filterSettings}
          updateFilterSettings={updateFilterSettings}
          onMarkSeen={handleMarkSeen}
          onSyncNewer={handleSyncNewer}
          onSyncNewer5x={handleSyncNewer5x}
          onSyncOlder={handleSyncOlder}
          onDelete={() => deletePosts(server)}
          onDestroy={destroyDatabase}
        />
        <div className="p-0 sm:p-8">
          <CategoryNavigation
            currentSlug={category as string}
            counts={countsData?.counts as Record<string, number>}
            server={server as string}
            serverName={server ? getServerBySlug(server)?.name : undefined}
            bucketLabel={bucketLabel}
            totalCount={totalCount}
            filterSettings={filterSettings}
          />
          {!postsData ? (
            <div className="p-4">Loading...</div>
          ) : (
            <>
              <PostList
                posts={posts}
                server={server as string}
                filterSettings={filterSettings}
                invalidateTimeline={invalidateTimeline}
              />
              <div className="flex justify-center items-center space-x-4 py-4">
                <button
                  onClick={handleMarkSeen}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Mark Seen
                </button>
                {hasNextPage && (
                  <AsyncButton
                    callback={handleLoadMore}
                    loadingText="Loading..."
                    defaultText={`Load More (${totalCount - posts.length} remaining)`}
                    color="blue"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

