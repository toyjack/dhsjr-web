import { Inputs } from "@/types";
import React from "react";
import { Path, UseFormRegister } from "react-hook-form";

export default function TextInput({
  label,
  register,
  fieldLable,
  placeholder,
}: {
  label: Path<Inputs>;
  register: UseFormRegister<Inputs>;
  fieldLable: string;
  placeholder: string;
}) {
  return (
    <label className="input input-bordered input-primary flex items-center gap-2">
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
