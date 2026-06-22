/* Line-icon set — replaces emoji on the public landing for an enterprise feel.
   All icons inherit currentColor and a 1.8 stroke. */

type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Arrow = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Check = ({ className }: P) => (
  <svg {...base} className={className} strokeWidth={2.2}><path d="M20 6 9 17l-5-5" /></svg>
);
export const Phone = ({ className }: P) => (
  <svg {...base} className={className}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
);
export const Mail = ({ className }: P) => (
  <svg {...base} className={className}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 7 9 6 9-6" /></svg>
);
export const Pin = ({ className }: P) => (
  <svg {...base} className={className}><path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" /></svg>
);
export const Clock = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 1.8" /></svg>
);

/* service / value icons */
export const Store = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 9.5 5.2 5h13.6L20 9.5M4 9.5h16M4 9.5v9.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M9 20v-5h6v5" /></svg>
);
export const Truck = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18.5" r="1.7" /><circle cx="17.5" cy="18.5" r="1.7" /></svg>
);
export const Receipt = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 2h12v20l-3-1.6-3 1.6-3-1.6L6 22zM9.5 8h5M9.5 12h5" /></svg>
);
export const Refresh = ({ className }: P) => (
  <svg {...base} className={className}><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4" /></svg>
);
export const Shield = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const Boxes = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 9.5 7.5 7l4.5 2.5M3 9.5 7.5 12 12 9.5M3 9.5V15l4.5 2.5V12M12 9.5V15l-4.5 2.5M12 9.5l4.5-2.5L21 9.5M12 9.5l4.5 2.5L21 9.5M21 9.5V15l-4.5 2.5V12" /></svg>
);

/* department category icons (abstract, no product imagery) */
export const DeptLeaf = ({ className }: P) => (
  <svg {...base} className={className}><path d="M11 21C5 17 4 9 9 5c4-3 9-2 11 0-1 9-5 14-9 16ZM9 14c2-2 5-3 8-3" /></svg>
);
export const DeptDrop = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>
);
export const DeptFlame = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5-1-8Z" /></svg>
);
export const DeptPlus = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></svg>
);
export const DeptCart = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7H6" /><circle cx="9.5" cy="20" r="1.4" /><circle cx="17.5" cy="20" r="1.4" /></svg>
);
export const DeptCar = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 14l1.6-4.6A2 2 0 0 1 7.5 8h9a2 2 0 0 1 1.9 1.4L20 14M4 14h16v3.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V17H7.5v.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M7 14h.01M17 14h.01" /></svg>
);
export const DeptPhone = ({ className }: P) => (
  <svg {...base} className={className}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
);

/* admin nav icons */
export const Grid = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
);
export const Users = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M18 19.5a5.5 5.5 0 0 0-3-4.9" /></svg>
);
export const Gear = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.3 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const Bag = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7Z" /><path d="M9 7V5.5a3 3 0 0 1 6 0V7" /></svg>
);
export const Search = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
