import type { DeptKey } from "@/lib/store";

/* Non-routable portal metadata shared by the shell and route pages. */

/* department iconography now lives in the shared component so admin reuses it */
export { DEPT_ICON, DEPT_COLOR } from "@/components/DeptIcon";

/* saved ship-to addresses for the signed-in trade account */
export const ADDRESSES = [
  { id: "store", label: "Storefront", addr: "412 Vine St, Cincinnati, OH 45202" },
  { id: "dock", label: "Back dock", addr: "88 Spring Grove Ave, Cincinnati, OH 45232" },
];

/* sub-categories per department; `q` filters products by name keyword */
export const DEPT_SUBCATS: Record<DeptKey, { label: string; q: string }[]> = {
  tobacco: [
    { label: "Cigarettes", q: "carton" },
    { label: "Cigarillos", q: "cigarillo" },
    { label: "Chewing", q: "beech" },
    { label: "Hookah", q: "hookah" },
  ],
  vape: [
    { label: "Disposables", q: "breeze" },
    { label: "Pods", q: "juul" },
    { label: "E-liquids", q: "liquid" },
    { label: "Pouches", q: "zyn" },
  ],
  smoke: [
    { label: "Charcoal", q: "charcoal" },
    { label: "Lighters", q: "lighter" },
    { label: "Pipes & glass", q: "pipe" },
    { label: "Tubes", q: "tube" },
  ],
  hba: [
    { label: "Energy", q: "energy" },
    { label: "Pain relief", q: "pain" },
    { label: "Supplements", q: "357" },
  ],
  grocery: [
    { label: "Candy", q: "candy" },
    { label: "Chocolate", q: "twix" },
    { label: "Drinks", q: "water" },
    { label: "Household", q: "household" },
  ],
  auto: [
    { label: "Fresheners", q: "fresh" },
    { label: "Windshield", q: "rain" },
    { label: "Cables", q: "cable" },
  ],
  acc: [
    { label: "Phone", q: "phone" },
    { label: "Fashion", q: "sunglasses" },
    { label: "Utility", q: "jar" },
  ],
};

/* "3m ago" / "2h ago" / "5d ago" */
export const ago = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};
