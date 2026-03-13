import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const DEFAULT_LOCALE = "ja";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Build locale-aware path. Default locale (ja) gets no prefix per rewriteDefault strategy. */
export function localePath(path: string, locale: string) {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path}`;
}
