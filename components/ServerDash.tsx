// ServerDash.tsx
import Link from "next/link";
import React from "react";
import toast from "react-hot-toast";
import { Server } from '@/db/database';
import { Bucket } from "@/db/bucket";
import { useServerStats } from "@/hooks/useServerStats";
// import { ServerStatsPayload } from '@/db/database';
import { useModifyServers } from '@/hooks/useModifyServers';
import { useSyncPosts } from "@/hooks/useSyncPosts";
import AsyncButton from "./AsyncButton";
import ServerStats from "./ServerStats";

interface ServerDashProps {
  server: Server;
}

const ServerDash: React.FC<ServerDashProps> = ({ server }) => {
  const { data: stats, isPending: isStatsLoading, error: statsError, invalidateServerStats } = useServerStats(server.slug);
  const { updateServer } = useModifyServers();

  const { mutateAsync: syncPosts } = useSyncPosts({
    server: server.slug,
    invalidateTimeline: () => { },
    invalidateServerStats,
  });
  const handleSyncNewer = async () => {
    await syncPosts({ older: false, batch: 1 });
  };
  const handleSyncNewer10x = async () => {
    await syncPosts({ older: false, batch: 10 });
  };
  const disableServer = async (server: Server) => {
      await updateServer({
        id: server.id,
        server: { ...server, enabled: false }, // Only update the `enabled` field
      });
    };

  if (isStatsLoading) {
    return <p>Loading stats for {server.name}...</p>;
  }

  if (statsError) {
    toast.error(
      `Failed to load stats for ${server.name}: ${statsError.message}`
    );
    return <p>Error loading stats for {server.name}.</p>;
  }

  return (
    <div className="server-stats">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{server.name} /{" "}
        <Link href={`/${server.slug}/regular`} className="text-blue-500 hover:text-blue-600 underline">
          Regular ({stats?.categoryCounts[Bucket.regular]?.unseen || 0})
        </Link>
      <AsyncButton
        callback={handleSyncNewer}
        loadingText="Syncing Newer..."
        defaultText="Collect Newer"
        color="blue"
        extraClasses="ml-2"
      />
      <AsyncButton
        callback={handleSyncNewer10x}
        loadingText="Syncing Newer..."
        defaultText="Collect 10x"
        color="blue"
        extraClasses="ml-2"
      />
      <AsyncButton
        callback={() => disableServer(server)}
        defaultText="Disable"
        color="red"
        extraClasses="ml-2"
      />
      </h2>
      <div className="mt-4 p-4 border rounded shadow-sm bg-gray-50">
        {stats && (<ServerStats stats={stats} />)}
      </div>

      {/* <ServerDashChart serverSlug={server.slug} stats={stats} displaySeen={false} /> */}
    </div>
  );
};

export default ServerDash;
