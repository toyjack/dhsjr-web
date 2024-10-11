"use client";

import { themeAtom } from "@/lib/atoms";
import { cn } from "@/lib/utils";
import { useAtom } from "jotai";
import type { ChangeEvent } from "react";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";

export default function ThemeToggle() {
  const SunIcon = ({ className }: { className?: string }) => (
    <IoSunnyOutline className={cn(["text-2xl",className])} />
  );

  const MoonIcon = ({ className }: { className?: string }) => (
    <IoMoonOutline className={cn(["text-2xl",className])} />
  );

  const [theme, setTheme] = useAtom(themeAtom);

  const toggleTheme = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.checked);
    if (e.target.checked) {
      setTheme("light");
    }
    if (!e.target.checked) {
      setTheme("dark");
    }
  };

  return (
    <label className="swap">
      <input
        type="checkbox"
        checked={theme === "light"}
        onChange={(e) => toggleTheme(e)}
      />
      <SunIcon className="swap-on" />
      <MoonIcon className="swap-off" />
    </label>
  );
}
