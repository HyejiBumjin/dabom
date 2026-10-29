"use client";
import { overseasNoticeSummary } from "@/lib/privacy/overseas-notice";
import { useRef, useState, type FormEvent } from "react";
import { merchant } from "@/lib/commerce/policy";

export function SupportRequestForm() {
  const [kind, setKind] = useState<"REFUND" | "ACCOUNT_DELETE" | "PRIVACY_STOP">("REFUND");
  const [orderId, setOrderId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState("");
  const requestKey = useRef("");
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || requestId) return;
    submitting.current = true; setBusy(true); setError("");
    requestKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/support/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, requestKey: requestKey.current, ...(kind === "ACCOUNT_DELETE" ? { deletionAcknowledged: acknowledged } : kind === "REFUND" && orderId.trim() ? { orderId: orderId.trim() } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "접수하지 못했어. 다시 시도해줘.");
      setRequestId(result.requestId);
    } catch (e) { setError(e instanceof Error ? e.message : "잠시 뒤 다시 시도해줘."); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (requestId) return <div className="commerce-notice" role="status">
    <p>요청이 접수됐어. 담당자가 확인한 뒤 처리할게.</p>
    <p className="break-all">접수번호: {requestId}</p>
    <p>추가 설명이나 답변받을 연락처는 접수번호와 함께 <a href={`tel:${merchant.phone}`}>전화로 알려줘</a>. 원하면 <a href={`mailto:${merchant.email}?subject=${encodeURIComponent(`다봄 문의 ${requestId}`)}`}>이메일</a>을 이용해도 돼.</p>
    <p className="commerce-muted">{overseasNoticeSummary.email} <a href="/privacy#overseas-email">처리 안내</a></p>
    <p>접수만으로 결제 취소·계정 삭제·개인정보 처리정지가 자동 실행되지는 않아.</p>
  </div>;
  return <form onSubmit={submit} className="flex flex-col gap-5">
    <label className="flex flex-col gap-2">무엇을 도와줄까?
      <select className="rounded border p-3" value={kind} disabled={busy} onChange={e => { setKind(e.target.value as typeof kind); requestKey.current = ""; setAcknowledged(false); }}>
        <option value="REFUND">환불 요청</option><option value="ACCOUNT_DELETE">회원 탈퇴 · 계정과 운세 삭제</option>
        <option value="PRIVACY_STOP">개인정보 처리정지 · 국외 이전 중단 요청</option>
      </select>
    </label>
    {kind === "REFUND" ? <label className="flex flex-col gap-2">주문번호 (알고 있을 때만)
      <input className="rounded border p-3" maxLength={80} placeholder="saju_…" value={orderId} disabled={busy} onChange={e => { setOrderId(e.target.value); requestKey.current = ""; }} />
      <span className="commerce-muted">주문번호를 몰라도 접수할 수 있어. 결제일과 사유는 이메일이나 전화로 알려줘.</span>
    </label> : kind === "PRIVACY_STOP" ? <p className="commerce-notice">담당자가 요청 범위와 법정 보존 의무를 확인하고 결과를 안내할게. 필수 인증·호스팅·AI 처리를 중단하면 로그인·운세 생성·조회가 제한될 수 있어. 접수 버튼만으로 자동 중단되지는 않으며, 환불 권리는 유지돼.</p> : <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={acknowledged} disabled={busy} onChange={e => setAcknowledged(e.target.checked)} required />
      <span>이 계정과 저장한 모든 사람의 운세를 삭제해줘. 삭제 후 운세를 다시 볼 수 없고, 법적으로 필요한 거래 증빙은 별도 보관된다는 걸 확인했어. 환불은 따로 확인이 필요해.</span>
    </label>}
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy || kind === "ACCOUNT_DELETE" && !acknowledged} className="retro-button disabled:opacity-50">{busy ? "접수하는 중…" : "요청 접수하기"}</button>
  </form>;
}
