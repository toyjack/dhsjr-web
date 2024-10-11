"use client";

import { useChangeLocale, useCurrentLocale } from "@/locales/client";
import { IoLanguageOutline } from "react-icons/io5";

export default function LangSwitch() {
  const SwitchIcon = () => <IoLanguageOutline className="text-2xl" />;

  const changeLocale = useChangeLocale({ preserveSearchParams: true });
  const locale = useCurrentLocale();

  return (
    <div className="dropdown dropdown-end">
      {/* biome-ignore lint/a11y/useSemanticElements: <explanation> */}
      <div tabIndex={0} role="button" className="m-1">
        <SwitchIcon />
      </div>
      <ul
        // biome-ignore lint/a11y/noNoninteractiveTabindex: <explanation>
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52"
      >
        <li>
          <button type="button" onClick={() => changeLocale("ja")}>
            日本語
          </button>
        </li>
        <li>
          <button type="button" onClick={() => changeLocale("en")}>
            English
          </button>
        </li>
        <li>
          <button type="button" onClick={() => changeLocale("zh")}>
            中文
          </button>
        </li>
      </ul>
    </div>
  );
}
