import { FortuneReport } from "@/components/FortuneReport";
import type { FortuneResult } from "@/lib/fortune/types";

const MOCK_RESULT: FortuneResult = {
  flowType: "상승",
  overall: "올해는 전반적으로 상승 기운이 강한 해입니다.",
  career: "커리어에 새로운 기회가 찾아올 가능성이 높습니다.",
  love: "인연의 흐름이 좋은 편입니다.",
  money: "수입 증가의 기회가 있을 수 있습니다.",
  cautionMonth: "3월, 9월",
  opportunityMonth: "5월, 11월",
  sections: [
    { title: "전체 분위기", content: "2026년은 당신에게 새로운 시작을 알리는 해가 될 것입니다. 작년까지의 노력이 드디어 결실을 맺기 시작할 시기입니다." },
    { title: "커리어", content: "업무 환경에서 인정을 받을 기회가 늘어납니다. 새로운 프로젝트나 역할을 맡게 될 가능성이 있습니다." },
    { title: "연애", content: "기존 관계는 더욱 깊어지고, 새로운 인연을 만나는 분들은 뜻밖의 만남을 경험할 수 있습니다." },
    { title: "금전", content: "꾸준한 저축과 신중한 투자가 도움이 됩니다. 불필요한 지출은 줄이는 것이 좋습니다." },
  ],
};

export default function ReportPreviewPage() {
  return (
    <div className="space-y-8 w-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">2026년 운세</h1>
        <p className="text-zinc-600">
          흐름과 기회, 그리고 한 통의 편지
        </p>
      </div>
      <FortuneReport result={MOCK_RESULT} reportId="preview" giftToken={undefined} />
    </div>
  );
}
