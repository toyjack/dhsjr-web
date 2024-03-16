import { cn } from "@/lib/utils";
import { Inputs } from "@/types";
import React from "react";
import { Path, UseFormRegister } from "react-hook-form";

export default function TextInput({
  label,
  register,
  fieldLable,
  placeholder,
  className,
}: {
  label: Path<Inputs>;
  register: UseFormRegister<Inputs>;
  fieldLable: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("input input-bordered input-primary flex items-center gap-2 w-full", className)}>
      {fieldLable}
      <input
        type="text"
        className="grow"
        placeholder={placeholder}
        {...register(label)}
      />
    </label>
  );
}
