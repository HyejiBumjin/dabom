import { BackToHomeLink } from "@/components/BackToHomeLink";
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
    <div className="w-full space-y-8">
      <div className="text-center sm:text-left">
        <BackToHomeLink className="mb-4 block">홈</BackToHomeLink>
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세 선물하기</h1>
        <p className="text-zinc-600">
          소중한 사람에게 올 한 해 운세를 선물해보세요
        </p>
      </div>
      <ConfigNotice missingSupabase={!runtimeConfig.supabaseReady} missingPortone={!runtimeConfig.portoneReady} />
      <GiftPurchaseForm />
    </div>
  );
}
