import { cn } from "@/lib/utils";
import Link from "next/link";

export default function RubyCell({
  baseText,
  rubyTop,
  rubyBottom,
  fanqie,
  ruion,
  href,
}: {
  baseText?: string | null;
  rubyTop?: string | null;
  rubyBottom?: string | null;
  fanqie?: string | null;
  ruion?: string | null;
  href?: string | null;
}) {
  const subText = [fanqie, ruion].filter((s) => s).join("、");

  const BaseText = ({ baseText }: { baseText: string }) => {
    if (href) {
      return (
        <Link className="link link-hover" href={href}>
          {baseText}
        </Link>
      );
    }
    return <>{baseText}</>;
  };

  return (
    <>
      <ruby>
        <ruby style={{ rubyPosition: "under" }}>
          <BaseText baseText={baseText || ""} />
          <rp>(</rp>
          <rt
            className={cn({
              "text-red-500": rubyBottom?.includes("朱"),
            })}
          >
            {rubyBottom}
          </rt>
          <rp>)</rp>
        </ruby>
        <rp>(</rp>
        <rt
          className={cn({
            "text-red-500": rubyTop?.includes("朱"),
          })}
        >
          {rubyTop}
        </rt>
        <rp>)</rp>
      </ruby>
      <span className="text-xs">{subText && `${subText}`}</span>
    </>
  );
}
