import { BackToHomeLink } from "@/components/BackToHomeLink";
import { redirect } from "next/navigation";
import { SelfPurchaseForm } from "@/components/SelfPurchaseForm";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createClient } from "@/lib/supabase/server";
import { runtimeConfig } from "@/lib/runtime-config";

export default async function Product2026Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase?.auth.getUser() ?? { data: { user: null } });

  if (!user && runtimeConfig.supabaseReady) {
    redirect("/login?next=/products/2026");
  }

  return (
    <div className="w-full space-y-8">
      <div className="text-center sm:text-left">
        <BackToHomeLink className="mb-4 block" href="/"></BackToHomeLink>
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">
          2026년 운세 보기
        </h1>
        <p className="text-zinc-600">흐름과 기회, 그리고 한 통의 편지</p>
      </div>
      <ConfigNotice
        missingSupabase={!runtimeConfig.supabaseReady}
        missingPortone={!runtimeConfig.portoneReady}
      />
      <SelfPurchaseForm />
    </div>
  );
}
