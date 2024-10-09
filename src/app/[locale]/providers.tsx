"use client";

import type { ReactNode } from "react";
import { Provider as JotaiProvider } from "jotai";
import ThemeProvider from "@/components/theme-provider";
import { I18nProviderClient } from "@/locales/client";

export default function Providers({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  return (
    <JotaiProvider>
      <I18nProviderClient locale={locale}>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nProviderClient>
    </JotaiProvider>
  );
}
