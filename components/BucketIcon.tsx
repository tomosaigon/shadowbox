import React from 'react';
import {
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon,
  MegaphoneIcon,
  CpuChipIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  HashtagIcon,
  LinkIcon,
  VideoCameraIcon,
  BookmarkIcon,
} from '@heroicons/react/24/solid';
import { Bucket } from '@/db/bucket';

interface BucketIconProps {
  bucket: Bucket;
  className?: string;
}

const BucketIcon: React.FC<BucketIconProps> = ({ bucket, className = 'h-4 w-4' }) => {
  switch (bucket) {
    case Bucket.regular:
      return <DocumentTextIcon className={className} />;
    case Bucket.saved:
      return <BookmarkIcon className={className} />;
    case Bucket.questions:
      return <QuestionMarkCircleIcon className={className} />;
    case Bucket.withImages:
      return <PhotoIcon className={className} />;
    case Bucket.asReplies:
      return <ChatBubbleBottomCenterTextIcon className={className} />;
    case Bucket.directMentions:
      return <MegaphoneIcon className={className} />;
    case Bucket.hashtags:
      return <HashtagIcon className={className} />;
    case Bucket.withLinks:
      return <LinkIcon className={className} />;
    case Bucket.fromBots:
      return <CpuChipIcon className={className} />;
    case Bucket.nonEnglish:
      return <GlobeAltIcon className={className} />;
    case Bucket.reblogs:
      return <ArrowPathIcon className={className} />;
    case Bucket.videos:
      return <VideoCameraIcon className={className} />;
    default:
      return null;
  }
};

export default BucketIcon;