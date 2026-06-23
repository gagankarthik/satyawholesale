import type { ReactElement } from "react";
import {
  DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
} from "@/components/Icons";
import { DEPT_BG, type DeptKey } from "@/lib/store";

/* Single source of truth for department iconography, shared by the portal
   catalog and the admin product tables (replaces ad-hoc emoji thumbnails). */

export const DEPT_ICON: Record<DeptKey, (p: { className?: string }) => ReactElement> = {
  tobacco: DeptLeaf, vape: DeptDrop, smoke: DeptFlame, hba: DeptPlus,
  grocery: DeptCart, auto: DeptCar, acc: DeptPhone,
};

export const DEPT_COLOR: Record<DeptKey, string> = {
  tobacco: "#a85a2c", vape: "#2f6fd8", smoke: "#d6560f", hba: "#6b4ed8",
  grocery: "#b07d00", auto: "#2f6fd8", acc: "#2f9e44",
};

/** Square department thumbnail used across product cells (portal + admin). */
export function DeptThumb({ dep, className }: { dep: DeptKey; className?: string }) {
  const Icon = DEPT_ICON[dep];
  return (
    <span className={className} style={{ background: DEPT_BG[dep], color: DEPT_COLOR[dep] }}>
      <Icon />
    </span>
  );
}
