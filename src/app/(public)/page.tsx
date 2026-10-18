import { TopNav } from "@/components/TopNav";
import { getSajuAccount } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";
import { LandingScreen } from "@/components/LandingScreen";

export default async function LandingPage() {
  const account = await getSajuAccount();
  return <LandingScreen loggedIn={Boolean(account)} accountNav={account
    ? <AccountPrivacyBoundary key={account.id} accountId={account.id} returnPath="/" compact><TopNav userEmail={account.email ?? null} loggedIn showLibraryLink={false} /></AccountPrivacyBoundary>
    : <TopNav />} />;
}
