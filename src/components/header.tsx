import React from "react";
import ThemeToggle from "./theme-toggle";
import LangSwitch from "./lang-switch";
import Link from "next/link";
import { getI18n } from "@/locales/server";
import { IoBookOutline } from "react-icons/io5";

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
        <div>
          <Link href={"/books"} className="btn btn-ghost">
            <IoBookOutline className="text-2xl" /> {t("all_books_list")}
          </Link>
        </div>
        <ThemeToggle />
        <LangSwitch />
      </div>
    </div>
  );
}
