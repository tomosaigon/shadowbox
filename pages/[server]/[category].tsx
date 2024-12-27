import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PostList from '../../components/PostList';
import { getServerBySlug, servers } from '../../config/servers';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import { Toaster, toast } from 'react-hot-toast';

interface TimelineResponse {
  buckets: Record<string, any[]>;
  counts: Record<string, number>;
}

const POSTS_PER_PAGE = 25;

export default function CategoryPage() {
  const router = useRouter();
  const { server, category } = router.query;
  // Let useState infer types from initial values
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);

  const serverConfig = server ? getServerBySlug(server as string) : servers[0];
  const offset = posts.length;

  useEffect(() => {
    if (!server || !category) return;
    
    setLoading(true);
    setPosts([]); // Reset posts when category changes
    
    fetch(`/api/timeline?server=${server}&offset=0&limit=${POSTS_PER_PAGE}`)
      .then(res => res.json())
      .then((data: TimelineResponse) => {
        const categoryPosts = data.buckets[getCategoryKey(category as string)] || [];
        setPosts(categoryPosts);
        setTotalCount(data.counts[getCategoryKey(category as string)] || 0);
        setHasMore(categoryPosts.length >= POSTS_PER_PAGE && 
          categoryPosts.length < data.counts[getCategoryKey(category as string)]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [server, category]);

  // Fetch counts
  useEffect(() => {
    if (!server) return;
    
    fetch(`/api/timeline?server=${server}&onlyCounts=true`)
      .then(res => res.json())
      .then(data => setCounts(data.counts));
  }, [server]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/timeline?server=${server}&offset=${offset}&limit=${POSTS_PER_PAGE}`
      );
      const data: TimelineResponse = await res.json();
      const newPosts = data.buckets[getCategoryKey(category as string)] || [];
      
      // Get updated counts
      const countsRes = await fetch(`/api/timeline?server=${server}&onlyCounts=true`);
      const countsData = await countsRes.json();
      
      setPosts(prev => [...prev, ...newPosts]);
      setHasMore(newPosts.length >= POSTS_PER_PAGE && posts.length + newPosts.length < totalCount);
      setCounts(countsData.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Server change handler
  const handleServerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newServer = event.target.value;
    router.push(`/${newServer}/${category}`);
  };

  // Load newer/older handlers
  const handleLoadNewer = async () => {
    setLoadingNewer(true);
    try {
      const syncRes = await fetch(`/api/timeline-sync?server=${server}`, { method: 'POST' });
      const syncData = await syncRes.json();
      
      if (syncData.newPosts > 0) {
        toast.success(`Loaded ${syncData.newPosts} newer posts`);
        refreshPosts(); // Reload posts if new content
      } else {
        toast('No new posts found');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load newer posts');
    } finally {
      setLoadingNewer(false);
    }
  };

  const handleLoadOlder = async () => {
    setLoadingOlder(true);
    try {
      const syncRes = await fetch(`/api/timeline-sync?server=${server}&older=true`, { method: 'POST' });
      const syncData = await syncRes.json();
      
      if (syncData.newPosts > 0) {
        toast.success(`Loaded ${syncData.newPosts} older posts`);
        refreshPosts(); // Reload posts if new content
      } else {
        toast('No older posts found');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load older posts');
    } finally {
      setLoadingOlder(false);
    }
  };

  const refreshPosts = async () => {
    setLoading(true);
    setPosts([]); // Reset posts
    
    try {
      // Get posts
      const postsRes = await fetch(`/api/timeline?server=${server}&offset=0&limit=${POSTS_PER_PAGE}`);
      const postsData: TimelineResponse = await postsRes.json();
      const categoryPosts = postsData.buckets[getCategoryKey(category as string)] || [];
      
      // Get updated counts
      const countsRes = await fetch(`/api/timeline?server=${server}&onlyCounts=true`);
      const countsData = await countsRes.json();
      
      setPosts(categoryPosts);
      setTotalCount(postsData.counts[getCategoryKey(category as string)] || 0);
      setHasMore(categoryPosts.length >= POSTS_PER_PAGE && 
        categoryPosts.length < postsData.counts[getCategoryKey(category as string)]);
      setCounts(countsData.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!serverConfig) {
    return <div className="p-4">Server not found</div>;
  }

  return (
    <div className="flex">
      <Sidebar
        serverSlug={typeof server === 'string' ? server : ''}
        servers={servers}
        counts={counts}
        loadingNewer={loadingNewer}
        loadingOlder={loadingOlder}
        onServerChange={handleServerChange}
        onLoadNewer={handleLoadNewer}
        onLoadOlder={handleLoadOlder}
      />
      <main className="ml-64 flex-1 p-8">
        <div className="p-4 flex items-center justify-between">
          <div>
            <Link 
              href={`/?server=${server}`}
              className="text-blue-500 hover:underline"
            >
              ← Back to Categories
            </Link>
            <h1 className="text-2xl font-bold mt-2">
              {getCategoryTitle(category as string)} 
              <span className="text-gray-500 text-lg ml-2">
                ({totalCount} total)
              </span>
            </h1>
            <p className="text-gray-600">
              From {serverConfig.name}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-4">Loading...</div>
        ) : (
          <>
            <PostList posts={posts} />
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : `Load More (${totalCount - posts.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function getCategoryKey(category: string): string {
  switch (category) {
    case 'non-english': return 'nonEnglish';
    case 'with-images': return 'withImages';
    case 'replies': return 'asReplies';
    case 'network-mentions': return 'networkMentions';
    case 'with-links': return 'withLinks';
    case 'regular': return 'remaining';
    default: return 'remaining';
  }
}

function getCategoryTitle(category: string): string {
  switch (category) {
    case 'non-english': return 'Non-English Posts';
    case 'with-images': return 'Posts with Images';
    case 'replies': return 'Reply Posts';
    case 'network-mentions': return 'Network Mentions';
    case 'with-links': return 'Posts with Links';
    case 'regular': return 'Regular Posts';
    default: return 'Posts';
  }
}