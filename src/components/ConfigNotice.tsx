"use client";

import { Alert } from "@/components/ui/alert";

interface ConfigNoticeProps {
  missingSupabase?: boolean;
  missingToss?: boolean;
}

export function ConfigNotice({ missingSupabase, missingToss }: ConfigNoticeProps) {
  if (!missingSupabase && !missingToss) return null;

  const messages: string[] = [];
  if (missingSupabase) messages.push("Supabase 환경 변수가 설정되지 않았습니다.");
  if (missingToss) messages.push("Toss Payments 환경 변수가 설정되지 않았습니다.");
  messages.push("설정 전에는 미리보기 모드로 동작합니다.");

  return (
    <Alert variant="warning" className="mb-4">
      {messages.join(" ")}
    </Alert>
  );
}
