"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "@/components/Icons";

/* A password field with a show/hide eye toggle. Forwards every native input
   prop (value, onChange, autoComplete, minLength, required, autoFocus, …) so it
   drops in wherever a raw <input type="password" /> was used. */
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwinput">
      <input ref={ref} type={show ? "text" : "password"} {...props} />
      <button
        type="button"
        className="pwtoggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
});
