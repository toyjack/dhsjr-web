import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SearchPanel from "@/components/search-panel";
import Providers from "./providers";
import { cn } from "@/lib/utils";
import { GoogleAnalytics } from "@next/third-parties/google";
const notoSans = Noto_Sans({ display: "swap", preload: false });

export const metadata: Metadata = {
  title: "資料横断的な漢字音・漢語音データベース",
  description:
    "本データベース（略称：DHSJR）は、平安・鎌倉期～現代までの文献資料に現われる漢字音・漢語音を、字音注記（仮名注、声点、反切、類音注、節博士等）に即して検索可能とするものです。",
};

export default function RootLayout({
  params,
  children,
}: {
  params: { locale: string };
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={cn("bg-base-200 text-base flex flex-col w-full items-center",notoSans.className)}>
        <Providers locale={params.locale}>
          <Header />
          <main className="container mx-auto min-h-screen">
            <SearchPanel />
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
      <GoogleAnalytics gaId="G-6LZ8NQH8RL" />
    </html>
  );
}
