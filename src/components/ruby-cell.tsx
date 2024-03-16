import { cn } from "@/lib/utils";

export default function RubyCell({
  baseText,
  rubyTop,
  rubyBottom,
  fanqie,
  ruion,
}: {
  baseText?: string | null;
  rubyTop?: string | null;
  rubyBottom?: string | null;
  fanqie?: string | null;
  ruion?: string | null;
}) {
  const subText = [fanqie, ruion].filter((s) => s).join("、");

  return (
    <>
      <ruby>
        <ruby style={{ rubyPosition: "under" }}>
          {baseText}
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
      {subText && `(${subText})`}
    </>
  );
}
