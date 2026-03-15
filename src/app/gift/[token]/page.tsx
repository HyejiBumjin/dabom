import { notFound } from "next/navigation";
import { GiftReceiverForm } from "@/components/GiftReceiverForm";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function GiftTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createServiceRoleClient();
  if (!supabase) notFound();

  const { data: gift } = await supabase
    .from("gifts")
    .select("id, gift_status")
    .eq("token", token)
    .single();

  if (!gift || gift.gift_status !== "active") {
    notFound();
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세 선물</h1>
        <p className="text-zinc-600">
          소중한 분께서 보내주신 운세 선물입니다.
        </p>
      </div>
      <GiftReceiverForm token={token} />
    </div>
  );
}
