"use client";

/* =======================================================================
   Landing motion kit — one shared motion language for the marketing page.
   Built on motion/react. Everything here degrades to a plain, instant
   render under prefers-reduced-motion (Motion's useReducedMotion).

   Primitives:
     <Reveal>        blur + rise + fade a block into view (once)
     <Stagger>/<Item> stagger a group of children into view
     <MaskText>      line-mask reveal for headings (clip + rise per line)
     <Counter>       odometer count-up to a number on view
     <DrawLine>      a hairline rule that draws in (scaleX 0 -> 1) on view
     <Parallax>      translateY tied to scroll position
   ======================================================================= */

import {
  motion,
  useReducedMotion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  animate,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

const EASE = [0.22, 1, 0.36, 1] as const; // expo-out: fast start, soft settle
const VIEWPORT = { once: true, margin: "-12% 0px -12% 0px" } as const;

/* ---- Reveal: the workhorse block entrance ---- */
export function Reveal({
  children,
  as = "div",
  delay = 0,
  y = 22,
  blur = 8,
  className,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  y?: number;
  blur?: number;
  className?: string;
  [key: string]: unknown;
}) {
  const reduce = useReducedMotion();
  const M = motion[as as keyof typeof motion] as typeof motion.div;
  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </M>
  );
}

/* ---- Stagger group + Item ---- */
const groupV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.66, ease: EASE } },
};

export function Stagger({
  children,
  as = "div",
  className,
  amount = 0.18,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  amount?: number;
  [key: string]: unknown;
}) {
  const reduce = useReducedMotion();
  const M = motion[as as keyof typeof motion] as typeof motion.div;
  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }
  return (
    <M
      className={className}
      variants={groupV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </M>
  );
}

export function Item({
  children,
  as = "div",
  className,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  [key: string]: unknown;
}) {
  const reduce = useReducedMotion();
  const M = motion[as as keyof typeof motion] as typeof motion.div;
  if (reduce) {
    const Plain = as as ElementType;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }
  return (
    <M className={className} variants={itemV} {...rest}>
      {children}
    </M>
  );
}

/* ---- MaskText: per-line clip + rise, the editorial heading reveal ---- */
export function MaskText({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
}: {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, VIEWPORT);
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden" }}>
          <motion.span
            style={{ display: "block", willChange: "transform" }}
            initial={reduce ? false : { y: "108%" }}
            animate={reduce ? {} : inView ? { y: "0%" } : { y: "108%" }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.09 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ---- Counter: count-up on view ---- */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);
  const display = Number.isInteger(to) ? Math.round(val) : val.toFixed(1);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ---- DrawLine: hairline rule that draws in ---- */
export function DrawLine({
  className,
  vertical = false,
  delay = 0,
}: {
  className?: string;
  vertical?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  return (
    <motion.span
      ref={ref}
      className={className}
      style={{
        display: "block",
        transformOrigin: vertical ? "top" : "left",
        willChange: "transform",
      }}
      initial={reduce ? false : { scaleX: vertical ? 1 : 0, scaleY: vertical ? 0 : 1 }}
      animate={
        reduce
          ? {}
          : inView
            ? { scaleX: 1, scaleY: 1 }
            : { scaleX: vertical ? 1 : 0, scaleY: vertical ? 0 : 1 }
      }
      transition={{ duration: 0.9, ease: EASE, delay }}
    />
  );
}

/* ---- Parallax: translateY driven by scroll while the element is on screen ---- */
export function Parallax({
  children,
  amount = 60,
  className,
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  );
}

/* small helper so components can gate their own effects */
export function useReduce() {
  return useReducedMotion();
}

/* re-export for occasional bespoke use in section components */
export { motion, useMotionValue, useTransform, useScroll };
