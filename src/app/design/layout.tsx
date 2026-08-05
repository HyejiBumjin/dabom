/**
 * 디자인 미리보기 레이아웃
 *
 * /preview 레이아웃은 `sm:h-[calc(100vh-56px)]` + `items-center`라서 긴 콘텐츠의
 * 위쪽이 잘려 스크롤로 되돌아갈 수 없다. 에세이 리포트는 길기 때문에 별도 레이아웃을 쓴다.
 */
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="sticky top-0 z-10 border-b border-amber-200 bg-amber-50/95 px-4 py-2 text-center text-sm text-amber-800 backdrop-blur">
        디자인 미리보기 모드 — mock 데이터
      </div>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24">{children}</main>
    </div>
  );
}
