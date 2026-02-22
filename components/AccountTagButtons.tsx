import React from 'react';
import AsyncButton from './AsyncButton';
import { useTags } from '@/hooks/useTags';

interface AccountTagButtonsProps {
  accountId: string;
  accountUsername: string;
  serverSlug: string;
  activeReasons: { reason: string; filter: number }[];
  tagCountsByAccount: Record<string, Record<string, number>>;
  updateAccountTags: (accountId: string, tags: any[]) => void
}

const AccountTagButtons: React.FC<AccountTagButtonsProps> = ({
  accountId,
  accountUsername,
  serverSlug,
  activeReasons,
  tagCountsByAccount,
  updateAccountTags
}) => {
  const { handleTag, handleClearTag } = useTags();

  return (
    <div className="flex flex-row gap-1 sm:gap-2 max-h-32 sm:max-h-64 overflow-y-auto relative">
      {activeReasons.map(({ reason: tag, filter }) => {
        const hasTag = tagCountsByAccount[accountId]?.[tag] > 0;
        const count = tagCountsByAccount[accountId]?.[tag] || 0;
        const color = filter === 1 ? 'red' : 'green';

        return (
          <div key={tag} className="flex flex-row gap-1">
            <AsyncButton
              callback={async () => {
                const tags = await handleTag(tag, accountId, accountUsername, serverSlug);
                if (tags) {
                  updateAccountTags(accountId, tags);
                }
              }}
              defaultText={hasTag ? `${tag}(${count})` : tag}
              color={color}
              extraClasses="text-xs sm:text-sm"
            />
            {hasTag && (
              <AsyncButton
                callback={async () => {
                  const tags = await handleClearTag(accountId, accountUsername, tag, serverSlug);
                  if (tags) {
                    updateAccountTags(accountId, tags);
                  }
                }}
                loadingText={`Clearing ${tag}...`}
                defaultText="×"
                color={color}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AccountTagButtons;