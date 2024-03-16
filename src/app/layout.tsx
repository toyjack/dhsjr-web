import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import SearchPanel from "@/components/search-panel";
const notoSans = Noto_Sans({ display: "swap", preload: false });

export const metadata: Metadata = {
  title: "資料横断的な漢字音・漢語音データベース",
  description:
    "本データベース（略称：DHSJR）は、平安・鎌倉期～現代までの文献資料に現われる漢字音・漢語音を、字音注記（仮名注、声点、反切、類音注、節博士等）に即して検索可能とするものです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={"bg-base-200 text-base "+notoSans.className}>
        <Header />
        <main className="container mx-auto min-h-screen">
          <SearchPanel />
          {children}
        </main>
        <Footer />
        <Script src="https://cdn.jsdelivr.net/npm/theme-change@2.0.2/index.js"></Script>
      </body>
    </html>
  );
}
