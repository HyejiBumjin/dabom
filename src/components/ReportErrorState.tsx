import { ExpressiveCat } from "@/components/ExpressiveCat";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";

export function ReportErrorState({ kind, onRetry }: { kind: "login" | "access" | "failed" | "payment"; onRetry?: () => void }) {
  return <section className={`retro-status${kind === "failed" ? " retro-status--error" : ""}`} role={kind === "login" ? "status" : "alert"}>
    <ExpressiveCat mood="flustered" className="retro-cat-large" />
    <h2 className="retro-heading">{kind === "login" ? "로그인 화면으로 이동할게." : kind === "access" ? "리포트를 열 수 없어." : kind === "payment" ? "결제 상태를 확인하고 있어." : "리포트를 준비하지 못했어요."}</h2>
    <p className="retro-status-copy">{kind === "login" ? <>카카오로 로그인하면<br />보던 운세로 돌아올 수 있어.</> : kind === "access" ? "내 운세함에서 구매한 운세를 확인해줘." : kind === "payment" ? <>30초 뒤 다시 열어줘.<br />다시 결제할 필요는 없어.</> : PUBLIC_REPORT_FAILURE_MESSAGE}</p>
    {(kind === "failed" || kind === "payment") && <button type="button" onClick={onRetry} className="retro-button">다시 시도하기</button>}
  </section>;
}
