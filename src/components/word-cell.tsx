import { cn } from "@/lib/utils";
import React from "react";

export default function WordCell({
  word = "",
  position = 0,
}: {
  word?: string;
  position?: number;
}) {
  return (
    <div>
      {word.split("").map((char, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          key={index}
          className={cn({ "text-red-500": index === position - 1 })}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
