/** UI caches and drafts belong to one registration, not just one Kakao identity. */
export function accountScope(account: { id: string; dataEpoch?: string }) {
  return account.dataEpoch ? `${account.id}:${account.dataEpoch}` : account.id;
}
