import type { Inputs } from "@/types";
import React from "react";
import type { Path, UseFormRegister } from "react-hook-form";

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
  className?: string;
}) {
  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">{fieldLable}</span>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="input input-bordered input-info w-full"
        {...register(label)}
      />
    </label>
  );
}
