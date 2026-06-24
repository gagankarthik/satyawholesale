/* Non-routable portal metadata shared by the shell and route pages. */

/* department iconography now lives in the shared component so admin reuses it */
export { DEPT_ICON, DEPT_COLOR } from "@/components/DeptIcon";

/* saved ship-to addresses for the signed-in trade account */
export const ADDRESSES = [
  { id: "store", label: "Storefront", addr: "412 Vine St, Cincinnati, OH 45202" },
  { id: "dock", label: "Back dock", addr: "88 Spring Grove Ave, Cincinnati, OH 45232" },
];

/* "3m ago" / "2h ago" / "5d ago" */
export const ago = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};
