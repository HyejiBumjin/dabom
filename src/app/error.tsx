"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="retro-page"><section className="retro-window p-8 text-center" role="alert">
    <h1 className="retro-heading">잠깐만 기다려줘.</h1>
    <p className="py-5">지금 화면을 불러오지 못했어. 조금 뒤에 다시 연결해줘.</p>
    <button className="retro-button" onClick={reset}>다시 연결하기</button>
  </section></main>;
}
