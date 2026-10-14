"use client";

import { PROFILE_DRAFT_KEY } from "@/lib/profile-draft";

export const AUTH_CHANGE_KEY = "dabom-auth-change";
export const AUTH_CHANGE_EVENT = "dabom:auth-change";

/** Signals carry no identity or credentials, and can only revoke cached UI. */
export function announceAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  try {
    const channel = new BroadcastChannel(AUTH_CHANGE_KEY);
    channel.postMessage("signed-out");
    channel.close();
  } catch { /* The storage event is the fallback for older browsers. */ }
  try { localStorage.setItem(AUTH_CHANGE_KEY, `${Date.now()}-${Math.random()}`); } catch { /* Focus checks also verify the server session. */ }
}

export function clearProfileDraft() {
  try { sessionStorage.removeItem(PROFILE_DRAFT_KEY); } catch { /* Storage is optional. */ }
}
