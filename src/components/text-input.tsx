import { cn } from "@/lib/utils";
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
  className?: string;
}) {
  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">{fieldLable}</span>
        {/* <span className="label-text-alt">Top Right label</span> */}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="input input-bordered input-info w-full"
        {...register(label)}
      />
      {/* <div className="label"> */}
        {/* <span className="label-text-alt">Bottom Left label</span> */}
        {/* <span className="label-text-alt">Bottom Right label</span> */}
      {/* </div> */}
    </label>
  );
}
