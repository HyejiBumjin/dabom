import Link from "next/link";
import { redirect } from "next/navigation";
import { SelfPurchaseForm } from "@/components/SelfPurchaseForm";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createClient } from "@/lib/supabase/server";
import { runtimeConfig } from "@/lib/runtime-config";

export default async function Product2026Page() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  if (!user && runtimeConfig.supabaseReady) {
    redirect("/login?next=/products/2026");
  }

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-zinc-600 hover:underline">
        ← 홈
      </Link>
      <ConfigNotice missingSupabase={!runtimeConfig.supabaseReady} missingToss={!runtimeConfig.tossReady} />
      <SelfPurchaseForm />
    </div>
  );
}
