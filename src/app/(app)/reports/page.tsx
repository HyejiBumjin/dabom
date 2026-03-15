import Link from "next/link";
import { redirect } from "next/navigation";
import { BackToHomeLink } from "@/components/BackToHomeLink";
import { createClient } from "@/lib/supabase/server";

type ReportListItem = {
  id: string;
  created_at: string;
  input?: {
    name?: string;
    relationship?: string;
  } | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?next=/reports");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/reports");
  }

  const { data: reportsData } = await supabase
    .from("fortune_reports")
    .select("id, created_at, input")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const reports = (reportsData as ReportListItem[] | null) ?? [];

  return (
    <div className="w-full space-y-8">
      <div className="text-center sm:text-left">
        <BackToHomeLink className="mb-4 block" href="/" />
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">내 운세 기록</h1>
        <p className="text-zinc-600">결제 후 생성된 운세 결과를 다시 볼 수 있습니다.</p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-600">
          아직 생성된 운세가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: ReportListItem, index: number) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}?from=list`}
              className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:bg-zinc-50"
            >
              <p className="text-sm text-zinc-500">#{reports.length - index}</p>
              <p className="mt-1 text-sm text-zinc-700">
                {report.input?.name || "이름 미입력"}
                {report.input?.relationship ? ` · ${report.input.relationship}` : ""}
              </p>
              <p className="mt-1 text-zinc-900 font-medium">
                {new Date(report.created_at).toLocaleString("ko-KR")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
