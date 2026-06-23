"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

interface FieldShell {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

function Shell({ label, hint, error, required, id, children }: FieldShell & { id: string; children: (ariaProps: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode }) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}{required && <span aria-hidden="true"> *</span>}</span>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <span id={`${id}-err`} className="field-error" role="alert">{error}</span>
      ) : hint ? (
        <span id={`${id}-hint`} className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export interface InputFieldProps extends FieldShell, Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {}

/** Labelled text input with accessible error/hint wiring. */
export function InputField({ label, hint, error, required, className, ...rest }: InputFieldProps) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} required={required} className={className} id={id}>
      {(aria) => <input {...aria} required={required} {...rest} />}
    </Shell>
  );
}

export interface SelectFieldProps extends FieldShell, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  children: ReactNode;
}

/** Labelled select with accessible error/hint wiring. */
export function SelectField({ label, hint, error, required, className, children, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} required={required} className={className} id={id}>
      {(aria) => <select {...aria} required={required} {...rest}>{children}</select>}
    </Shell>
  );
}

export { cx };
