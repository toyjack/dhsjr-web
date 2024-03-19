"use client";

import { ReactNode } from "react";
import { Provider as JotaiProvider, useAtom } from "jotai";
import ThemeProvider from "@/components/theme-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </JotaiProvider>
  );
}
