import {
  ChatBubbleOvalLeftEllipsisIcon,
  ArrowsRightLeftIcon,
  StarIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ArrowUturnLeftIcon,
  FolderOpenIcon,
  FolderMinusIcon,
  BookmarkIcon,
} from '@heroicons/react/24/solid';
import { User } from "@heroui/react";
import React, { useState, useEffect, act } from 'react';
import { Post, IMediaAttachment, AccountTag } from '../db/database';
import { getNonStopWords, postContainsMutedWord, getMutedWordsFoundInPost } from '@/utils/nonStopWords';
import { formatDateTime, trimString } from '@/utils/format';
import { useServers } from '../context/ServersContext';
import { useMarkPosts } from '@/hooks/useMarkPosts';
import { useMutedWords } from '../hooks/useMutedWords';
import { useMastodonAccount } from '../hooks/useMastodonAccount';
import { useReasons } from '../hooks/useReasons';
import { useTags } from '../hooks/useTags';
import { ImageModal } from './ImageModal';
import ExternalLink from "./ExternalLink";
import MediaAttachment from './MediaAttachment';
import PostCard from './PostCard';
import PostPoll from "./PostPoll";
import RepliesModal from './RepliesModal';
import AsyncButton from './AsyncButton';
import AccountPostsModal from './AccountPostsModal';
import Avatar from './Avatar';
import PostDate from './PostDate';
import AccountTagButtons from './AccountTagButtons';

interface PostListProps {
  posts: Post[];
  server: string;
  filterSettings: {
    chronological: boolean;
    showNonStopWords: boolean;
    highlightThreshold: number | null;
  };
  invalidateTimeline: () => void;
}

const PostList: React.FC<PostListProps> = ({ posts: initialPosts, server, filterSettings, invalidateTimeline }) => {
  const { reasons } = useReasons();
  const activeReasons = reasons.filter(reason => reason.active === 1);
  const { mutedWords, createMutedWord, deleteMutedWord } = useMutedWords();
  const { handleClearTag } = useTags();
  const [posts, setPosts] = useState(initialPosts);
  const [activeImage, setActiveImage] = useState<IMediaAttachment | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [activeRepliesPost, setActiveRepliesPost] = useState<Post | null>(null);
  const { getServerBySlug } = useServers();
  const { handleFollow, handleFavorite, hasApiCredentials } = useMastodonAccount({ baseUrl: getServerBySlug(server)?.uri ?? '' }); // XXX
  const { markAccountSeen, markSaved } = useMarkPosts(server);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const updateAccountTags = (
    userId: string,
    tags: AccountTag[]
  ) => {
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.account_id === userId
          ? { ...post, account_tags: tags }
          : post
      )
    );
  }

  const preprocessTagCounts = (posts: Post[]) => {
    const tagCountsByAccount: Record<string, Record<string, number>> = {};

    posts.forEach(({ account_id, account_tags }) => {
      if (!account_tags) return;
      if (tagCountsByAccount[account_id]) return;

      tagCountsByAccount[account_id] = {};
      account_tags.forEach(({ tag, count }) => {
        tagCountsByAccount[account_id][tag] = count;
      });
    });

    return tagCountsByAccount;
  };
  const tagCountsByAccount = preprocessTagCounts(posts);

  // "Do not show new boosts for posts that have been recently boosted (only affects newly-received boosts)""
  // TODO Group boosts in timelines
  const postIDsReblogged = posts.reduce((acc, post) => {
    if (post.reblog) {
      if (!acc.has(post.reblog.id)) {
        acc.set(post.reblog.id, []);
      }
      acc.get(post.reblog.id)!.push(post.id);
    }
    return acc;
  }, new Map<string, string[]>());

  const postIDs = new Set(posts.map(p => p.id));

  return (
    <div className="w-full sm:max-w-4xl mx-0 sm:mx-auto p-0">
      <div className="space-y-1 sm:space-y-2">
        {posts.map((post, _idx) => {
          if (post.reblog &&
            ((filterSettings.chronological && postIDs.has(post.reblog.id)) ||
              (!filterSettings.chronological && postIDsReblogged.has(post.reblog.id) && postIDsReblogged.get(post.reblog.id)![0] !== post.id))) {
            return (
              <div key={post.id} className="flex items-center space-x-2 text-sm sm:text-base text-gray-500 italic p-4">
                <ArrowPathIcon className="w-5 h-5 text-gray-400" />
                <span>
                  <ExternalLink href={post.account_url} className="font-semibold">
                    {post.account_avatar && <Avatar src={post.account_avatar} />}
                    {post.account_display_name}
                  </ExternalLink>{" "}
                  <a href={`#${post.reblog.id}`} >boosted</a> {post.reblog.account_display_name} on{" "}
                  <ExternalLink href={post.uri}>{formatDateTime(post.created_at)}</ExternalLink>
                </span>
              </div>
            );
            // return <span key={post.id} className="hidden">duplicate {post.id}</span>;
          }
          if (postIDsReblogged.has(post.id) && !filterSettings.chronological) {
            return (<div key={post.id} className="hidden">origin {post.id}</div>);
          }

          const matchingReason = activeReasons.find(
            (reason) =>
              reason.filter === 1 &&
              post.account_tags.some((tag) => tag.tag === reason.reason)
          );

          let reblogger = null;
          if (post.reblog) {
            reblogger = { ...post };
            post = post.reblog;
            // } else if (filterSettings.chronological && postIDsReblogged.has(post.id)) {
            //   // XXX
            //   reblogger = posts.find(p => p.id === postIDsReblogged.get(post.id)![0]);
          }

          const postText = [
            // post.content.replace(/<[^>]*>/g, ''),
            post.content,
            post.media_attachments.map((m) => m.description).join(' '),
            post.card?.title, post.card?.description,
            post.poll?.options.map((o) => o.title).join(' ')
          ].join('\n');
          const nonStopWords = getNonStopWords(postText);
          // const isMuted = containsMutedWord(nonStopWords, mutedWords);
          const isMuted = postContainsMutedWord(postText, mutedWords);
          const mutedWordsFound = getMutedWordsFoundInPost(postText, mutedWords);

          // TODO - Add way to reveal the muted post

          return (
            <div id={post.id} key={reblogger ? reblogger.id : post.id} className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden max-w-full">

              <article className={`flex-grow min-w-0 ${
                // containsMutedWord(nonStopWords, mutedWords) ? 'bg-blue-50 opacity-10 hover:opacity-75'
                false ? 'XXX'
                  : filterSettings.highlightThreshold && post.reblogs_count + post.favourites_count > filterSettings.highlightThreshold
                    ? 'bg-pink-100 border-l-4 border-pink-400 hover:bg-green-100'
                    : post.account_tags?.some(t => t.tag === 'cookie')
                      ? 'bg-green-50 border-l-4 border-green-400 hover:bg-green-100'
                      : post.account_tags?.some(t => t.tag === 'phlog') // TODO color programmatically
                        ? 'bg-yellow-100 opacity-20 hover:opacity-75'
                        : post.account_tags?.some(t => t.tag === 'spam')
                          ? 'bg-red-50/5 opacity-10 hover:opacity-25 transition-all text-xs sm:text-[0.625rem]'
                          // : post.account_tags?.some(t => t.tag === 'bitter')
                          //   ? 'bg-yellow-50 opacity-20 hover:opacity-75 transition-all text-xs sm:text-[0.625rem]'
                          : 'bg-white'
                }`}>
                {/* Reblog Header */}
                {reblogger && (
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 italic px-4 pt-2">
                    <ArrowPathIcon className="w-5 h-5 text-gray-400" />
                    <span>
                      <ExternalLink href={reblogger.account_url}>{reblogger.account_acct}</ExternalLink>
                      {" "}boosted on{" "}
                      <ExternalLink href={reblogger.uri}>{formatDateTime(reblogger.created_at)}</ExternalLink>
                    </span>
                  </div>
                )}

                {/* {post.was_reblogged ? 'was_reblogged' : ''} */}

                {/* Post Header */}
                <div className={`p-2 sm:p-3 flex items-start space-x-2`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <div className="flex">
                        <User
                          avatarProps={{
                            src: post.account_avatar
                          }}
                          name={matchingReason || isMuted ? trimString(post.account_display_name) : post.account_display_name}
                          description={
                            <ExternalLink href={post.account_url || '#'}>@{post.account_username}</ExternalLink>
                          }
                        />

                        <button
                          onClick={() => {
                            setActiveAccount(post.account_id);
                            setActivePost(post);
                          }}
                          // className="flex items-center space-x-2 text-blue-500 hover:underline focus:outline-none"
                          className="ml-2 inline-block"
                          title="Show all posts from account"
                        >
                          <FolderOpenIcon className="w-4 sm:w-6 h-4 sm:h-8 text-blue-300" />
                        </button>

                        <AsyncButton
                          callback={() => markAccountSeen({ acct: post.account_acct, invalidateTimeline })}
                          defaultText={
                            <FolderMinusIcon
                              className="mr-2 w-4 sm:w-6 h-4 sm:h-8 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                              title='Mark all from account seen'
                            />
                          }
                        />

                        {matchingReason ? '' : isMuted ? '' : hasApiCredentials ? (
                          <AsyncButton
                            callback={() => handleFollow(post.account_acct)}
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

                      </div>

                      {/* <span>more posts</span> */}
                      {matchingReason ? (
                        <div className="text-sm sm:text-base text-red-600">
                          reason:{" "}
                          <span className="font-semibold">{matchingReason.reason}</span>
                          <AsyncButton
                            callback={async () => {
                              const tags = await handleClearTag(post.account_id, post.account_username, matchingReason.reason, post.server_slug);
                              if (tags) {
                                updateAccountTags(post.account_id, tags);
                              }
                            }}
                            loadingText={`Clearing ${matchingReason.reason}...`}
                            defaultText="×"
                            color={'red'}
                          />
                        </div>
                      ) : isMuted ? (
                        <div key={post.id} className="p-0 text-sm text-red-500">
                          Contains muted words: {
                            mutedWordsFound.map(word => {
                              return (
                                <button
                                  key={word}
                                  onClick={() => deleteMutedWord(word)} // Call the function when clicked
                                  className={`mr-1 mb-1 px-1 sm:px-2 py-0 rounded text-xs sm:text-sm ${word.startsWith('#')
                                    ? 'bg-red-500 text-white hover:bg-red-600' // Styling for hashtags
                                    : 'bg-orange-500 text-white hover:bg-red-600'  // Styling for regular words
                                    }`}
                                  title={`Unmute "${word}"`}
                                >
                                  {word}
                                </button>
                              )
                            })
                          }
                        </div>
                      ) : ''}
                      <div className="text-right text-xs sm:text-sm text-gray-500">
                        <PostDate url={post.url || post.uri} dateString={post.created_at} />

                        <div>
                          {post.account_acct.split('@').length > 1 ? '*@' + post.account_acct.split('@')[1] : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reply Link */}
                {!matchingReason && !isMuted && post.in_reply_to_id && (
                  <div className="flex items-center text-sm sm:text-base text-gray-500 px-4 pt-0">
                    <button
                      onClick={() => setActiveRepliesPost(post)}
                      className="flex items-center space-x-2 text-blue-500 hover:underline focus:outline-none"
                    >
                      <ArrowUturnLeftIcon className="w-5 h-5 text-gray-400" />
                      <span>View thread</span>
                    </button>
                  </div>
                )}

                {matchingReason ? '' : isMuted ? '' : (
                  <div className={`px-3 sm:px-4 pb-3 ${
                    // {/* Post Content */}
                    // post.account_tags?.some(t => t.tag === 'spam' || t.tag === 'bitter')
                    //   ? 'text-xs sm:text-[0.625rem]'
                    //   : 'text-base sm:text-sm'
                    'text-base sm:text-sm'
                    }`}>
                    <div
                      className="prose max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />

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
                )}

                {/* Post Footer */}
                {matchingReason || isMuted ? null : (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center space-x-6 text-gray-500">
                    <AsyncButton
                      callback={() => markSaved(post.id)}
                      defaultText={
                        <>
                          <BookmarkIcon
                            className="w-4 h-4 cursor-pointer hover:text-yellow-500 transition-colors"
                            title='Bookmark as saved'
                          />
                          {/* <span>fav</span> */}
                        </>
                      }
                      color={'yellow'}
                    />
                    <div
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => setActiveRepliesPost(post)}
                      title='View replies'
                    >
                      <ChatBubbleOvalLeftEllipsisIcon
                        className="w-5 h-5 cursor-pointer hover:text-yellow-500 transition-colors"
                      />
                      <span className="text-sm">{post.replies_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ArrowsRightLeftIcon className="w-5 h-5" />
                      <span className="text-sm">{post.reblogs_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasApiCredentials ? (
                        <AsyncButton
                          callback={() => markSaved(post.id)}
                          defaultText={<StarIcon
                            onClick={() => handleFavorite(post.url)}
                            className="w-5 h-5 cursor-pointer hover:text-yellow-500 transition-colors"
                            title='Favorite'
                          />
                          }
                          color={'yellow'}
                        />
                      ) : (<StarIcon
                        className="w-5 h-5 text-gray-400"
                        title='You need to configure API credentials to favorite'
                      />)}
                      <span className="text-sm">{post.favourites_count || 0}</span>
                    </div>
                  </div>
                )}

                {/* Non-Stop Words Section */}
                {filterSettings.showNonStopWords && (
                  <div className="px-3 sm:px-4 pt-1">
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-gray-600 text-xs sm:text-sm font-extrabold py-1">Mute:</span>
                      {nonStopWords.map((word) => (
                        <button
                          key={word}
                          onClick={() => mutedWordsFound.includes(word) ? deleteMutedWord(word) : createMutedWord(word)}
                          className={`px-2 py-1 rounded text-xs sm:text-sm ${mutedWordsFound.includes(word) ? 'bg-gray-300 text-gray-500' :
                            word.startsWith('#')
                              ? 'bg-red-500 text-white hover:bg-red-600' // Styling for hashtags
                              : 'bg-orange-500 text-white hover:bg-red-600'  // Styling for regular words
                            }`}
                          title='Click to mute/unmute'
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* Admin section - full width on mobile, side panel on desktop */}
              {matchingReason ? '' : isMuted ? '' : (
                <div className="w-full flex items-start space-x-4 border-t sm:border-t-0 sm:border-l p-2 bg-gray-50">
                  <AccountTagButtons
                    accountId={post.account_id}
                    accountUsername={post.account_username}
                    serverSlug={post.server_slug}
                    activeReasons={activeReasons}
                    tagCountsByAccount={tagCountsByAccount}
                    updateAccountTags={updateAccountTags}
                  />
                </div>
              )}

            </div>
          );
        })}
      </div>

      {activeImage && activePost && (
        <ImageModal
          media={activeImage}
          post={activePost}
          onClose={() => {
            setActiveImage(null);
            setActivePost(null);
          }}
        />
      )}

      {activeRepliesPost && (
        <RepliesModal
          post={activeRepliesPost}
          onClose={() => {
            setActiveRepliesPost(null);
          }}
        />
      )}

      {activeAccount && activePost && (
        <AccountPostsModal
          accountId={activeAccount}
          accountAcct={activePost.account_acct}
          accountUsername={activePost.account_username}
          serverSlug={server}
          activeReasons={activeReasons}
          tagCountsByAccount={tagCountsByAccount}
          updateAccountTags={updateAccountTags}
          invalidateTimeline={invalidateTimeline}
          onClose={() => {
            setActiveAccount(null);
            setActivePost(null);
          }}
        />
      )}
    </div>
  );
};

export default PostList;
