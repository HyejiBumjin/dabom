import { accountScope } from "@/lib/account-scope";
import { TopNav } from "@/components/TopNav";
import { getSajuAccount } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";
import { LandingScreen } from "@/components/LandingScreen";

export default async function LandingPage() {
  const account = await getSajuAccount();
  return <LandingScreen loggedIn={Boolean(account)} accountNav={account
    ? <AccountPrivacyBoundary
        key={accountScope(account)}
        accountId={accountScope(account)}
        returnPath="/"
        compact
        publicFallback={<TopNav loggedIn showLibraryLink={false} />}
      >
        <TopNav userEmail={account.email ?? null} loggedIn showLibraryLink={false} />
      </AccountPrivacyBoundary>
    : <TopNav />} />;
}
