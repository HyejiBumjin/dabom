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
    .select("id, status")
    .eq("token", token)
    .single();

  if (!gift || gift.status !== "active") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md">
      <GiftReceiverForm token={token} />
    </div>
  );
}
