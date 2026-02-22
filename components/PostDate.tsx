import { formatDateTime } from "@/utils/format";
import ExternalLink from "./ExternalLink";

interface PostDateProps {
  url?: string;
  dateString: string;
}

export default function PostDate({ url, dateString }: PostDateProps) {
  return (
    <ExternalLink href={url || "#"} className="text-sm text-gray-500">
      {formatDateTime(dateString)}
    </ExternalLink>
  );
}