"use client";

import { type ReactNode } from "react";
import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label rendered beside the control (part of the hit target). */
  label?: ReactNode;
  /** Required when no visible label is given. */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * On/off switch for a setting that takes effect immediately (visibility,
 * active/inactive). For choices that need a Save button, use a checkbox or
 * select instead — a switch promises instant effect.
 *
 * @example <Switch checked={promo.active} onChange={togglePublish} label="Live on portal" />
 */
export function Switch({ checked, onChange, label, ariaLabel, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      className={cx("switchrow", checked && "on", className)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch" aria-hidden="true"><span className="switch-knob" /></span>
      {label && <span className="switch-label">{label}</span>}
    </button>
  );
}
