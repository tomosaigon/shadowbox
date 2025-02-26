// components/ImageModal.tsx
import { Post, IMediaAttachment } from '../db/database';
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import Avatar from './Avatar';

interface ImageModalProps {
  media: IMediaAttachment;
  post: Post;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ media, post, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div 
        className="relative max-w-7xl mx-auto p-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <XMarkIcon className="w-8 h-8" />
        </button>

        {/* Image */}
        <img
          src={media.url}
          alt=""
          className="max-h-[90vh] max-w-full object-contain"
        />

        {/* Metadata footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
            <Avatar src={post.account_avatar} className="w-8 h-8" />
              <div>
                <div className="font-medium">{post.account_display_name}</div>
                <div className="text-sm text-white/80">@{post.account_username}</div>
              </div>
            </div>
            <div className="flex space-x-4">
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white"
              >
                Download
              </a>
              <button className="text-white/80 hover:text-white">
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;