import React from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: number; // Default size in Tailwind units
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt = '', size = 6, className = '' }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`inline rounded-full hover:opacity-90 transition-opacity w-${size} h-${size} ${className}`}
    />
  );
};

export default Avatar;