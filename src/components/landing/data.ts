import {
  DeptLeaf, DeptDrop, DeptFlame, DeptPlus, DeptCart, DeptCar, DeptPhone,
} from "@/components/Icons";
import { Check, Phone, Store, Truck, ReceiptText, ShieldCheck } from "lucide-react";

/* Unsplash helper + landing content. Shared by the landing section components. */
export const ush = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEPARTMENTS = [
  { Icon: DeptLeaf, name: "Tobacco", img: "1622708037376-5cba1a57f735", desc: "Cigarettes, cigars, cigarillos, chew, hookah and pipe tobacco. Your highest-volume category, kept deep and restocked every week." },
  { Icon: DeptDrop, name: "Vape", img: "1594177914682-d408d96e458b", desc: "Disposables, pods and e-liquids across the brands your regulars ask for, with new releases added as they come in." },
  { Icon: DeptFlame, name: "Smoking Accessories", img: "1576969500732-12cc9992a5f4", desc: "Lighters, glass, rolling papers, butane and charcoal, plus the impulse buys that sell right beside them." },
  { Icon: DeptPlus, name: "Health & Beauty", img: "1611072965169-e1534f6f300c", desc: "OTC medicine, energy shots, supplements and personal care for a fast-moving, high-margin aisle." },
  { Icon: DeptCart, name: "Grocery & Candy", img: "1629430864843-6df13c168b35", desc: "Candy, snacks, beverages and household staples to fill out your center store in a single stop." },
  { Icon: DeptCar, name: "Automotive", img: "1542238060-646c7ed65622", desc: "Air fresheners, motor oil, windshield fluid and the road essentials drivers grab at the register." },
  { Icon: DeptPhone, name: "Phone & Accessories", img: "1573739022854-abceaeb585dc", desc: "Charging cables, earbuds, phone accessories and general merchandise to round out the front counter." },
];

export const HERO_IMAGES = [
  { id: "1553413077-190dd305871c", alt: "Pallet racking inside a wholesale distribution warehouse" },
  { id: "1586528116311-ad8dd3c8310d", alt: "Cases of stocked goods on warehouse shelving" },
  { id: "1565891741441-64926e441838", alt: "Loaded distribution yard ready for dispatch" },
];

export const SERVICE = [
  { Icon: Store, n: "At the warehouse", h: "Cash & carry", img: "1494412519320-aa613dfb7738", p: "Walk our Reading Road floor, load your own cases and check out the same day. No appointment and no order minimum." },
  { Icon: Truck, n: "Across the region", h: "Regional delivery", img: "1601584115197-04ecc0da31d7", p: "Order from the customer portal and we deliver across Greater Cincinnati, usually the next business day." },
  { Icon: ReceiptText, n: "One invoice", h: "A single account", img: "1605902711622-cfb43c4437b5", p: "Put tobacco, grocery, health and beauty, and automotive on one bill and one delivery instead of managing five separate suppliers." },
];

export const STRENGTHS = [
  { h: "Licensed & compliant", p: "A fully licensed wholesale and tobacco distributor. Every account is verified and limited to buyers 21 and older." },
  { h: "Consistent, deep stock", p: "We carry a deep range in every department and restock weekly, so a full order rarely comes back short." },
  { h: "One invoice, one delivery", p: "Consolidate your order onto one account, one bill and one weekly drop-off at your store." },
  { h: "Local Cincinnati partner", p: "We operate from Reading Road and serve Greater Cincinnati ourselves. You deal with the warehouse, not a call center." },
];

export const REQS = [
  { Icon: ReceiptText, h: "Business license", p: "Proof your store is a registered business." },
  { Icon: ShieldCheck, h: "Tobacco license", p: "Required for the regulated tobacco categories." },
  { Icon: Phone, h: "Store contact details", p: "Address, phone and delivery instructions." },
  { Icon: Check, h: "Age verification (21+)", p: "Confirming every buyer is 21 or older." },
];
