import Link from "next/link";
import { redirect } from "next/navigation";
import { GiftPurchaseForm } from "@/components/GiftPurchaseForm";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createClient } from "@/lib/supabase/server";
import { runtimeConfig } from "@/lib/runtime-config";

export default async function Product2026GiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  if (!user && runtimeConfig.supabaseReady) {
    redirect("/login?next=/products/2026-gift");
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-zinc-600 hover:underline">
        ← 홈
      </Link>
      <ConfigNotice missingSupabase={!runtimeConfig.supabaseReady} missingToss={!runtimeConfig.tossReady} />
      <GiftPurchaseForm />
    </div>
  );
}
