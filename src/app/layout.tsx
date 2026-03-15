import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다봄 - 2026년 운세",
  description: "2026년, 나를 위한 운세",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preload"
          href="/font/EastSeaDokdo-Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
