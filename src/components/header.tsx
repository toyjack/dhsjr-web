import React from "react";
import ThemeToggle from "./theme-toggle";
import LangSwitch from "./lang-switch";
import Link from "next/link";
import { getI18n } from "@/locales/server";

export default async function Header() {
  const t = await getI18n();

  return (
    <div className="navbar w-full bg-base-100">
      <div className="flex-1">
        <Link href={"/"} className="btn btn-ghost text-xl">
          {t("navBarTitle")}
        </Link>
      </div>
      <div className="flex-none gap-2">
        <ThemeToggle />
        <LangSwitch />
      </div>
    </div>
  );
}
