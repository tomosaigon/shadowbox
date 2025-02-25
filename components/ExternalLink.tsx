import React from "react";

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children, className = "", ...props }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-500 hover:underline ${className}`}
      {...props}
    >
      {children}
    </a>
  );
};

export default ExternalLink;