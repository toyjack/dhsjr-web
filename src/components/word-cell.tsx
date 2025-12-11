import { cn } from "@/lib/utils";
import React from "react";

export default function WordCell({
  word = "",
  position,
}: {
  word?: string;
  position?: string;
}) {
  // Convert position to number if it's a string
  const positionNumber = position ? Number.parseInt(position, 10) : 0;

  return (
    <div>
      {word.split("").map((char, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          key={index}
          className={cn({ "text-red-500": index === positionNumber - 1 })}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
