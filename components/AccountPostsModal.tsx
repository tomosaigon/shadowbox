import axios from 'axios';
import { useEffect, useState } from 'react';
import { User } from '@heroui/react';
import { BookmarkIcon, FolderMinusIcon, StarIcon } from '@heroicons/react/24/solid';
import { Post } from '../db/database';
import { useMarkPosts } from '@/hooks/useMarkPosts';
import useMastodonAccount from '@/hooks/useMastodonAccount';
import AccountTagButtons from './AccountTagButtons';
import AsyncButton from './AsyncButton';
import MediaAttachment from './MediaAttachment';
import ExternalLink from './ExternalLink';
import PostCard from './PostCard';
import PostDate from './PostDate';
import PostPoll from './PostPoll';
import { UserPlusIcon } from '@heroicons/react/24/solid';

interface AccountPostsModalProps {
  accountId: string;
  accountAcct: string;
  accountUsername: string;
  serverSlug: string;
  activeReasons: { reason: string; filter: number }[];
  tagCountsByAccount: Record<string, Record<string, number>>;
  updateAccountTags: (accountId: string, tags: any[]) => void;
  invalidateTimeline: () => void;
  onClose: () => void;
}

export default function AccountPostsModal({
  accountId,
  accountAcct,
  accountUsername,
  serverSlug,
  activeReasons,
  tagCountsByAccount,
  updateAccountTags,
  invalidateTimeline,
  onClose
}: AccountPostsModalProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { markAccountSeen, markSaved } = useMarkPosts(serverSlug);
  const { handleFollow, handleFavorite, handleResolveUser, hasApiCredentials, serverUrl } = useMastodonAccount();
  // const { getServerBySlug } = useServers();
  // const { handleFollow, handleFavorite, hasApiCredentials } = useMastodonAccount({ baseUrl: getServerBySlug(server)?.uri ?? '' }); // XXX

  const [resolvedUser, setResolvedUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await handleResolveUser(accountUsername);
        console.log('Resolved user:', user);
        setResolvedUser(user);
      } catch (error) {
        console.error('Error fetching account:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`/api/account-posts?accountId=${accountId}`);
        setPosts(response.data.posts);
      } catch (error) {
        console.error('Error fetching account posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [accountId]);

  const setActiveImage = () => { };
  const setActivePost = () => { };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4"> */}
      <div className="relative bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full overflow-y-auto max-h-[80vh]">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        {loading || !posts ? (
          <p>Loading...</p>
        ) : (<User
          avatarProps={{
            src: posts[0].account_avatar
          }}
          name={posts[0].account_display_name}
          description={
            <ExternalLink href={posts[0].account_url || '#'}>@{posts[0].account_username}</ExternalLink>
          }
        />
        )}

        {resolvedUser && (
          <div className="inline-flex text-xs text-gray-500">
            <ExternalLink href={serverUrl + '/' + encodeURIComponent('@' + resolvedUser.acct)}>Profile on {serverUrl}</ExternalLink>
          </div>
        )}

<div className="inline-flex text-xs text-gray-500">
        {hasApiCredentials ? (
          <AsyncButton
            callback={() => handleFollow(resolvedUser.acct)}
            defaultText={
              <UserPlusIcon
                className="w-4 sm:w-6 h-4 sm:h-8 cursor-pointer text-gray-500  hover:text-green-500 transition-colors"
                title='Follow'
              />
            }
          />
        ) : (
          <div className="inline-block">
            <UserPlusIcon
              className="w-4 sm:w-6 h-4 sm:h-8 cursor-pointer text-gray-400"
              title='You need to configure API credentials to follow'
            />
          </div>
        )}
        <AsyncButton
          callback={() => markAccountSeen({ acct: accountAcct, invalidateTimeline })}
          defaultText={
            <FolderMinusIcon
              className="mr-2 w-4 sm:w-6 h-4 sm:h-8 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
              title='Mark all from account seen'
            />
          }
          />
          </div>

        <div className="my-2">
          <AccountTagButtons
            accountId={accountId}
            accountUsername={accountUsername}
            serverSlug={serverSlug}
            activeReasons={activeReasons}
            tagCountsByAccount={tagCountsByAccount}
            updateAccountTags={updateAccountTags}
          />
        </div>

        <h2 className="text-xl font-semibold my-2">Collected Posts</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden max-w-full">
                <article className="flex-grow min-w-0">
                  {post.seen ? (
                    <div className="bg-gray-100 p-2 text-xs text-gray-500">Seen</div>
                  ) : null}
                  <div className="p-4 flex items-start w-full justify-between">
                    <User
                      avatarProps={{
                        src: post.account_avatar
                      }}
                      name={post.account_display_name}
                      description={
                        <ExternalLink href={post.account_url || '#'}>@{post.account_username}</ExternalLink>
                      }
                    />
                    <div className="text-right text-xs sm:text-sm text-gray-500">
                      {hasApiCredentials ? (
                        <AsyncButton
                          callback={() => markSaved(post.id)}
                          defaultText={<StarIcon
                            onClick={() => handleFavorite(post.url)}
                            className="w-4 h-4 cursor-pointer hover:text-yellow-500 transition-colors"
                            title='Favorite'
                          />
                          }
                          color={'yellow'}
                          extraClasses="mr-1"
                        />
                      ) : (<StarIcon
                        className="w-4 h-4 text-gray-400"
                        title='You need to configure API credentials to favorite'
                      />)}
                      <AsyncButton
                        callback={() => markSaved(post.id)}
                        defaultText={
                          <BookmarkIcon
                            className="w-4 h-4 cursor-pointer hover:text-yellow-500 transition-colors"
                            title='Bookmark as saved'
                          />
                        }
                        color={'yellow'}
                      />{' '}
                      <PostDate url={post.url || post.uri} dateString={post.created_at} />
                      <div>
                        {post.account_acct.split('@').length > 1 ? '*@' + post.account_acct.split('@')[1] : ''}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 sm:px-4 pb-3 text-base sm:text-sm">
                    <div className="prose max-w-none break-words" dangerouslySetInnerHTML={{ __html: post.content }} />
                    {post.card && <PostCard card={post.card} />}
                    {post.poll && <PostPoll poll={post.poll} />}
                    {post.media_attachments.length > 0 && (
                      <MediaAttachment
                        post={post}
                        mediaAttachments={post.media_attachments}
                        setActiveImage={setActiveImage}
                        setActivePost={setActivePost}
                      />
                    )}
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
