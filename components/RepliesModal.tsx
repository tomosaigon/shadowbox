import axios from 'axios';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Post } from '../db/database';
import { useServers } from '../context/ServersContext';
import { mastodonStatusToPost, MastodonStatus } from '../db/mastodonStatus';
import { formatDateTime } from '@/utils/format';
import Avatar from './Avatar';

interface RepliesModalProps {
  post: Post;
  onClose: () => void;
}

const RepliesModal: React.FC<RepliesModalProps> = ({ post, onClose }) => {
  const { getServerBySlug } = useServers();
  const [ancestors, setAncestors] = useState<Post[]>([]);
  const [descendants, setDescendants] = useState<Post[]>([]);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const serverUrl = getServerBySlug(post.server_slug)?.uri;
        if (!serverUrl) {
          throw new Error('Server URL not found');
        }

        const contextApiUrl = `${serverUrl}/api/v1/statuses/${post.id}/context`;
        const response = await axios.get(contextApiUrl);

        const { ancestors: ancestorData, descendants: descendantData } = response.data;

        setAncestors(
          ancestorData.map((ancestor: MastodonStatus) =>
            mastodonStatusToPost(ancestor, post.server_slug)
          )
        );

        setDescendants(
          descendantData.map((descendant: MastodonStatus) =>
            mastodonStatusToPost(descendant, post.server_slug)
          )
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            toast.error('Replies not found.');
          } else {
            // console.error will trigger "Unhandled Runtime Error" in Next.js.
            console.error('Failed to fetch replies:', error);
            toast.error('Failed to fetch replies.');
          }
        } else {
          console.error('Unexpected error:', error);
          toast.error('An unexpected error occurred.');
        }
      }
    };

    fetchContext();
  }, [post, getServerBySlug]);

  const renderReply = (reply: Post, isOriginalAuthor: boolean) => (
    <div
      key={reply.id}
      className={`flex items-start space-x-3 p-4 rounded ${
        isOriginalAuthor
          ? 'border border-blue-500 bg-blue-50'
          : 'border border-gray-200 bg-white'
      }`}
    >
      <Avatar src={reply.account_avatar} size={10} />
      <div className="flex-1 min-w-0">
        <div className="text-sm flex justify-between items-center">
          <div>
            <span className="font-medium text-gray-800">
              {reply.account_display_name || 'Anonymous'}
            </span>
            <span className="text-gray-500 ml-1">
              @{reply.account_acct || reply.account_username}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            <a
              href={reply.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {formatDateTime(reply.created_at)}
            </a>
          </span>
        </div>
        <div
          dangerouslySetInnerHTML={{ __html: reply.content }}
          className="prose max-w-none mt-2 text-gray-700"
        />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white w-full max-w-2xl mx-auto rounded-lg shadow-lg max-h-screen overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4 overflow-hidden truncate">
            <div
              className="text-gray-700 text-sm italic truncate"
              dangerouslySetInnerHTML={{
                __html: post.content.slice(0, 90) + (post.content.length > 90 ? '...' : ''),
              }}
            />
          </div>
          <button
            className="px-1 hover:bg-gray-300"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-100px)]">
          {/* Render Ancestors */}
          {ancestors.map((ancestor) =>
            renderReply(ancestor, ancestor.account_username === post.account_username)
          )}

          {/* Up Arrow */}
          {ancestors.length > 0 && (
            <div className="flex justify-center py-0">
              <ArrowUpIcon className="w-6 h-6 text-gray-500" />
            </div>
          )}

          {/* Original Post */}
          <div className="flex items-start space-x-3 p-4 rounded border border-blue-500 bg-blue-50">
            <img
              src={post.account_avatar || ''}
              alt={post.account_display_name || 'Avatar'}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-800">
                    {post.account_display_name || 'Anonymous'}
                  </span>
                  <span className="text-gray-500 ml-1">
                    @{post.account_acct || post.account_username}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {formatDateTime(post.created_at)}
                  </a>
                </span>
              </div>
              <div
                dangerouslySetInnerHTML={{ __html: post.content }}
                className="prose max-w-none mt-2 text-gray-700"
              />
            </div>
          </div>

          {/* Down Arrow */}
          {descendants.length > 0 && (
            <div className="flex justify-center py-0">
              <ArrowDownIcon className="w-6 h-6 text-gray-500" />
            </div>
          )}

          {/* Render Descendants */}
          {descendants.map((descendant) =>
            renderReply(descendant, descendant.account_username === post.account_username)
          )}

          {ancestors.length === 0 && descendants.length === 0 && (
            <div className="text-center text-gray-500 mt-4">No replies yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepliesModal;