import type { Inputs } from "@/types";
import { cn } from "@/lib/utils";
import type { Path, UseFormRegister } from "react-hook-form";

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
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">{fieldLable}</span>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className={cn("input input-bordered input-info w-full", className)}
        {...register(label)}
      />
    </label>
  );
}
