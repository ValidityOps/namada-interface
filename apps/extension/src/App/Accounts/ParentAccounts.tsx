import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import {
  ActionButton,
  GapPatterns,
  KeyListItem,
  Stack,
} from "@namada/components";
import { DerivedAccount } from "@namada/types";
import { ParentAccountsFooter } from "App/Accounts/ParentAccountsFooter";
import { PageHeader } from "App/Common";
import routes from "App/routes";
import { ParentAccount } from "background/keyring";
import { AccountContext } from "context";
import { openSetupTab } from "utils";

/**
 * Represents the extension's settings page.
 */
export const ParentAccounts = (): JSX.Element => {
  const navigate = useNavigate();
  const { activeAccountId, parentAccounts, changeActiveAccountId } =
    useContext(AccountContext);

  const goToSetupPage = async (): Promise<void> => {
    await openSetupTab();
  };

  const goToViewAccount = (account: DerivedAccount): void => {
    navigate(routes.viewAccount(account.id));
  };

  const goToDeletePage = (account: DerivedAccount): void => {
    navigate(routes.deleteAccount(account.id), { state: { account } });
  };

  const goToViewRecoveryPhrase = (account: DerivedAccount): void => {
    navigate(routes.viewAccountMnemonic(account.id));
  };

  const goToRenameAccount = (account: DerivedAccount): void => {
    navigate(routes.renameAccount(account.id), { state: { account } });
  };

  return (
    <Stack
      gap={GapPatterns.TitleContent}
      full
      className="max-h-[calc(100vh-40px)]"
    >
      <PageHeader title="Select Account" />
      <Stack gap={4} className="flex-1 overflow-auto">
        <nav className="grid items-end grid-cols-[auto_min-content]">
          <p className="text-white font-medium text-xs">Set default keys</p>
          <div className="w-26">
            <ActionButton size="xs" onClick={goToSetupPage}>
              Add Keys
            </ActionButton>
          </div>
        </nav>
        <Stack as="ul" gap={3} className="flex-1 overflow-auto">
          {[...parentAccounts].reverse().map((account, idx) => (
            <KeyListItem
              key={`key-listitem-${account.id}`}
              as="li"
              alias={account.alias}
              type={account.type}
              dropdownPosition={
                idx > 2 && idx > parentAccounts.length - 4 ? "bottom" : "top"
              }
              isMainKey={activeAccountId === account.id}
              onRename={() => goToRenameAccount(account)}
              onDelete={() => goToDeletePage(account)}
              onViewAccount={() => goToViewAccount(account)}
              onViewRecoveryPhrase={() => goToViewRecoveryPhrase(account)}
              onSelectAccount={() => {
                changeActiveAccountId(
                  account.id,
                  account.type as ParentAccount
                );
              }}
            />
          ))}
        </Stack>
        <ParentAccountsFooter />
      </Stack>
    </Stack>
  );
};
