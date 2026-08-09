import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Myeongsik, PillarName } from "@/lib/saju/myeongsik";
import { deriveInterpretationFacts } from "@/lib/saju/interpretation-facts";
import { deriveSajuInterpretationBlueprint } from "@/lib/saju/interpretation-blueprint";

const pillarLabels: Record<PillarName, string> = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const pillarOrder: PillarName[] = ["year", "month", "day", "hour"];

export default async function SajuProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await prisma.sajuProfile.findUnique({ where: { id: profileId } });
  if (!profile) notFound();

  const myeongsik = profile.myeongsik as unknown as Myeongsik;
  const birthDate = profile.birthDate.toISOString().slice(0, 10);
  const reportYear = myeongsik.fortune.targetYear ?? 2026;
  const yearlyFortune = myeongsik.fortune.yearly.find((item) => item.year === reportYear);
  const interpretationFacts = deriveInterpretationFacts(myeongsik);
  const blueprint = deriveSajuInterpretationBlueprint(myeongsik);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12 sm:py-20">
      <Link href="/saju" className="text-sm text-zinc-500 hover:text-zinc-900">← 입력 다시 하기</Link>

      <header className="mt-8">
        <p className="text-sm text-zinc-500">AI 해석 전 · 계산된 명식 데이터</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{profile.name}님의 사주 데이터</h1>
        <p className="mt-3 leading-7 text-zinc-600">아래 값은 입력 정보와 만세력 계산 결과를 그대로 보여줍니다. 아직 AI 리포트는 생성하지 않습니다.</p>
      </header>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">입력 정보</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <DataRow label="생년월일" value={birthDate} />
          <DataRow label="태어난 시각" value={profile.birthTime || "모름"} />
          <DataRow label="성별" value={profile.gender === "FEMALE" ? "여성" : "남성"} />
          <DataRow label="달력" value={`${profile.isLunar ? "음력" : "양력"}${profile.isLeapMonth ? " · 윤달" : ""}`} />
          <DataRow label="음력 환산일" value={myeongsik.lunarDate} />
          <DataRow label="일간" value={myeongsik.dayMaster} />
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-900">사주 팔자</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pillarOrder.map((name) => {
            const pillar = myeongsik.pillars[name];
            return (
              <article key={name} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-zinc-500">{pillarLabels[name]}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[0.18em] text-zinc-900">{pillar.ganZhi}</p>
                <dl className="mt-5 space-y-2 text-xs leading-5 text-zinc-600">
                  <DataRow label="천간" value={pillar.heavenlyStem} compact />
                  <DataRow label="지지" value={pillar.earthlyBranch} compact />
                  <DataRow label="십신" value={pillar.stemTenGod} compact />
                  <DataRow label="오행" value={pillar.elementPair} compact />
                  <DataRow label="지장간" value={pillar.hiddenStems.join(" · ")} compact />
                  <DataRow label="지장간 십신" value={pillar.hiddenTenGods.join(" · ")} compact />
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">운의 데이터</h2>
        <p className="mt-1 text-sm text-zinc-500">방향: {myeongsik.fortune.direction === "forward" ? "순행" : "역행"} · 대운 시작: {myeongsik.fortune.startsAt}</p>
        {yearlyFortune && <p className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{reportYear}년 세운: <span className="ml-2 text-lg font-semibold text-zinc-900">{yearlyFortune.ganZhi}</span></p>}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {myeongsik.fortune.daYun.map((period) => <div key={`${period.startYear}-${period.ganZhi}`} className="rounded-lg bg-zinc-50 p-3 text-center"><p className="text-lg font-semibold text-zinc-900">{period.ganZhi}</p><p className="mt-1 text-xs text-zinc-500">{period.startYear}–{period.endYear}</p></div>)}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
        <p className="text-sm font-medium text-violet-700">AI 해석 전 · 코드로 확인한 사실</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900">확정된 해석 근거</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">아래는 정해진 만세력·오행·지지 관계 규칙으로 계산한 값입니다. 아직 좋고 나쁨을 판단하거나 문장으로 풀이하지 않습니다.</p>
        <div className="mt-5 space-y-3">
          {interpretationFacts.facts.map((fact) => (
            <article key={fact.id} className="rounded-xl border border-violet-100 bg-white p-4">
              <h3 className="font-medium text-zinc-900">{fact.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{fact.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {fact.evidence.map((item) => <span key={item} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-800">근거 · {item}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
        <p className="text-sm font-medium text-amber-800">AI 작문 전 · 서비스 해석 설계서</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-900">이 명식을 읽는 순서</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">아래 내용은 GPT가 새로 판단하는 것이 아니라, 서비스가 정한 사주 해석의 출발점과 허용 범위입니다. 리포트는 이 설계서의 내용을 20대 친구 말투로 풀기만 합니다.</p>
        <div className="mt-5 space-y-3">
          {blueprint.cards.map((card) => (
            <article key={card.id} className="rounded-xl border border-amber-100 bg-white p-4">
              <h3 className="font-medium text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{card.interpretation}</p>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"><span className="font-medium">리포트에서 이렇게 풀어:</span> {card.writingDirection}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {card.evidence.map((item) => <span key={item} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900">근거 · {item}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">계산 결과 JSON 전체 보기</summary>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">{JSON.stringify(myeongsik, null, 2)}</pre>
      </details>
    </main>
  );
}

function DataRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className={compact ? "flex justify-between gap-2" : "space-y-1"}><dt className="text-zinc-500">{label}</dt><dd className={compact ? "text-right font-medium text-zinc-800" : "font-medium text-zinc-800"}>{value}</dd></div>;
}
