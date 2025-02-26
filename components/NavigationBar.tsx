import React, { useState } from 'react';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import { useServers } from '@/context/ServersContext';
import { CATEGORY_MAP, getCategoryBySlug } from '../db/categories';
import AsyncButton from './AsyncButton';
import BucketIcon from './BucketIcon';
import { ServerStatsPayload } from '@/db/database';
import ServerStats from './ServerStats';

interface NavigationBarProps {
  server: string;
  serverStats?: ServerStatsPayload | null;
  onServerChange: (newServer: string) => void;

  category: string;

  counts: Record<string, number> | null;

  filterSettings: {
    chronological: boolean; // order
    showNonStopWords: boolean;
    highlightThreshold: number | null;
    enableForeignBots: boolean;
    enableMedia: boolean;
  };
  updateFilterSettings: (newSettings: Partial<NavigationBarProps['filterSettings']>) => void;
  onMarkSeen: () => Promise<void>;
  onSyncNewer: () => Promise<void>;
  onSyncNewer5x: () => Promise<void>;
  onSyncOlder: () => Promise<void>;
  onDelete: () => Promise<void>;
  onDestroy: () => Promise<void>;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  server,
  serverStats,
  onServerChange,
  category,
  counts,
  filterSettings,
  updateFilterSettings,
  onMarkSeen,
  onSyncNewer,
  onSyncNewer5x,
  onSyncOlder,
  onDelete,
  onDestroy,
}) => {
  const { servers } = useServers();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <nav className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-1 sm:px-4">
        <div className="flex items-center justify-between py-2">
          {/* Server Selector */}
          <select
            value={server}
            onChange={(e) => onServerChange(e.target.value)}
            className="w-64 sm:w-40 px-2 sm:px-3 py-2 text-sm border rounded"
          >
            {servers.filter((srv) => srv.enabled).map((srv) => (
              <option key={srv.slug} value={srv.slug}>
                {srv.name}
              </option>
            ))}
          </select>

          <div className="hidden sm:flex items-center space-x-2">
            <AsyncButton
              callback={onMarkSeen}
              loadingText="Marking Seen..."
              defaultText="Seen"
              color="yellow"
            />
            <AsyncButton
              callback={onSyncNewer}
              loadingText="Syncing Newer..."
              defaultText="Newer"
              color="blue"
            />
            <AsyncButton
              callback={onSyncNewer5x}
              loadingText="Syncing Newer 5x..."
              defaultText="Newer×5"
              color="purple"
            />
          </div>

          {/* Toggle Menu Button */}
          <button
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
            onClick={toggleMenu}
          >
            {menuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
            <span className="text-xs sm:text-lg">Menu</span>
            <span className="text-xs sm:text-lg"> / {getCategoryBySlug(category).label}</span>
          </button>
        </div>

        {/* Dropdown Menu */}
        <div className={`${menuOpen ? 'block' : 'hidden'} w-full sm:mt-2`}>
          <div className="grid grid-cols-5 gap-1 sm:gap-3 sm:px-4 py-3">
            {/* Left Column: Database Functions */}
            <div className="col-span-2 flex flex-col space-y-2">
              <AsyncButton
                callback={onMarkSeen}
                loadingText="Marking Seen..."
                defaultText="Mark Seen"
                color="yellow"
              />
              <AsyncButton
                callback={onSyncNewer}
                loadingText="Syncing Newer..."
                defaultText="Sync Newer"
                color="blue"
              />
              <AsyncButton
                callback={onSyncNewer5x}
                loadingText="Syncing Newer 5x..."
                defaultText="Sync Newer 5x"
                color="purple"
              />
              <AsyncButton
                callback={onSyncOlder}
                loadingText="Syncing Older..."
                defaultText="Sync Older"
                color="green"
              />
              <AsyncButton
                callback={onDelete}
                loadingText="Deleting..."
                defaultText="Delete All Posts"
                color="red"
              />
              <AsyncButton
                callback={onDestroy}
                loadingText="Destroying..."
                defaultText="Destroy Database"
                color="red"
              />
              <Link
                href="/muted-words"
                className="w-full mt-2 px-4 py-2 text-sm text-blue-500 hover:text-blue-600 rounded transition-all duration-200 text-center block"
              >
                Muted Words
              </Link>
              <Link
                href="/reasons"
                className="w-full mt-2 px-4 py-2 text-sm text-blue-500 hover:text-blue-600 rounded transition-all duration-200 text-center block"
              >
                Reasons
              </Link>
              <Link
                href="/credentials"
                className="w-full mt-2 px-4 py-2 text-sm text-blue-500 hover:text-blue-600 rounded transition-all duration-200 text-center block"
              >
                Mastodon API Credentials
              </Link>
              <Link
                href="/servers"
                className="w-full mt-2 px-4 py-2 text-sm text-blue-500 hover:text-blue-600 rounded transition-all duration-200 text-center block"
              >
                Configure Servers
              </Link>

              {/* Server Stats */}
              {serverStats && (<ServerStats stats={serverStats} />)}
            </div>

            {/* Right Column: Categories and Filters */}
            <div className="col-span-3">
              {CATEGORY_MAP.filter(({ slug }) => {
                if (!filterSettings.enableMedia && (slug === 'videos' || slug === 'with-images')) {
                  return false;
                }
                if (!filterSettings.enableForeignBots && (slug === 'from-bots' || slug === 'direct-mentions' || slug === 'non-english')) {
                  return false;
                }
                if (slug === 'reblogs' && server !== '$HOME') {
                  return false;
                }
                return true;
              }).map(({ slug, bucket, label }) => (
                <Link
                  key={slug}
                  href={`/${server}/${slug}`}
                  onClick={toggleMenu}
                  className={`block px-4 py-3 text-base font-medium transition-colors ${
                    category === slug
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BucketIcon bucket={bucket} className="w-6 h-6 pb-1 mr-1 inline-block" />
                  {label}
                  <span className="ml-2 text-sm text-gray-500">
                    ({counts?.[bucket] ?? 0})
                  </span>
                </Link>
              ))}
              <div className="px-4 py-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.chronological}
                    onChange={() => updateFilterSettings({ chronological: !filterSettings.chronological })}
                    className="form-checkbox"
                  />
                  <span>Chronological order</span>
                </label>
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.showNonStopWords}
                    onChange={() => updateFilterSettings({ showNonStopWords: !filterSettings.showNonStopWords })}
                    className="form-checkbox"
                  />
                  <span>Show Mute Word Buttons</span>
                </label>
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.highlightThreshold === 5}
                    onChange={() => updateFilterSettings({ highlightThreshold: 5 })}
                    className="form-checkbox"
                  />
                  <span>Highlight 5+ retoot/favs</span>
                </label>
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.highlightThreshold === 10}
                    onChange={() => updateFilterSettings({ highlightThreshold: 10 })}
                    className="form-checkbox"
                  />
                  <span>Highlight 10+ retoot/favs</span>
                </label>
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.enableMedia}
                    onChange={() => updateFilterSettings({ enableMedia: !filterSettings.enableMedia })}
                    className="form-checkbox"
                  />
                  <span>Enable Media</span>
                </label>
                <label className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    checked={filterSettings.enableForeignBots}
                    onChange={() =>
                      updateFilterSettings({
                        enableForeignBots: !filterSettings.enableForeignBots,
                      })
                    }
                    className="form-checkbox"
                  />
                  <span>Enable Ats, Foreign, & Bots</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
