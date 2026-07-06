/* Non-routable portal metadata shared by the shell and route pages. */

/* department iconography now lives in the shared component so admin reuses it */
export { DEPT_ICON, DEPT_COLOR } from "@/components/DeptIcon";

/* Saved ship-to addresses now live per-account in useAddresses (src/lib/addresses.ts). */

/* "3m ago" / "2h ago" / "5d ago" */
export const ago = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};
