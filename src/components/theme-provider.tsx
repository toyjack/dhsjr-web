"use client";

import { themeAtom } from "@/lib/atoms";
import { useAtomValue } from "jotai";

export default function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = useAtomValue(themeAtom);
  return <div data-theme={theme}>{children}</div>;
}
