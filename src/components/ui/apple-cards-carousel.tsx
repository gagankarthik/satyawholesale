"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/* Aceternity "Apple Cards Carousel", adapted: brand cn(), inline icons,
   next/image, and a self-contained useOutsideClick hook. */

interface CardType {
  src: string;
  title: string;
  category: string;
  content: React.ReactNode;
}

const CarouselContext = createContext<{ onCardClose: (index: number) => void; currentIndex: number }>({
  onCardClose: () => {},
  currentIndex: 0,
});

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      onOutside();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, onOutside]);
}

const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
);
const ArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

export function Carousel({ items, initialScroll = 0 }: { items: React.ReactNode[]; initialScroll?: number }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scrollLeft = () => carouselRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  const scrollRight = () => carouselRef.current?.scrollBy({ left: 300, behavior: "smooth" });

  const handleCardClose = (index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = window.innerWidth < 768 ? 230 : 384;
    const gap = window.innerWidth < 768 ? 4 : 8;
    carouselRef.current.scrollTo({ left: (cardWidth + gap) * (index + 1), behavior: "smooth" });
    setCurrentIndex(index);
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div className="flex flex-row justify-start gap-4 pl-4">
            {items.map((item, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 * index, ease: "easeOut" } }}
                key={"card" + index}
                className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mr-4 flex justify-end gap-2">
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-2)] text-[var(--ink)] disabled:opacity-40"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ArrowLeft />
          </button>
          <button
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paper-2)] text-[var(--ink)] disabled:opacity-40"
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

export function Card({ card, index, layout = false }: { card: CardType; index: number; layout?: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.body.style.overflow = open ? "hidden" : "auto";
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useOutsideClick(containerRef, () => handleClose());

  const handleClose = () => { setOpen(false); onCardClose(index); };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 h-full w-full bg-black/70 backdrop-blur-lg" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl bg-[var(--card)] p-4 font-sans md:p-10"
            >
              <button className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-white" onClick={handleClose} aria-label="Close">
                <CloseIcon />
              </button>
              <motion.p layoutId={layout ? `category-${card.title}` : undefined} className="text-base font-medium text-[var(--signal-text)]">
                {card.category}
              </motion.p>
              <motion.p layoutId={layout ? `title-${card.title}` : undefined} className="mt-2 text-2xl font-semibold text-[var(--ink)] md:text-5xl">
                {card.title}
              </motion.p>
              <div className="py-10">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={() => setOpen(true)}
        className="relative z-10 flex h-80 w-56 flex-col items-start justify-start overflow-hidden rounded-3xl bg-[var(--ink)] md:h-[40rem] md:w-96"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        <div className="relative z-40 p-8 text-left">
          <motion.p layoutId={layout ? `category-${card.category}` : undefined} className="font-sans text-sm font-medium text-white/90 md:text-base">
            {card.category}
          </motion.p>
          <motion.p layoutId={layout ? `title-${card.title}` : undefined} className="mt-2 max-w-xs font-sans text-xl font-semibold [text-wrap:balance] text-white md:text-3xl">
            {card.title}
          </motion.p>
        </div>
        {/* blurred fill so the full poster shows uncropped without empty bars */}
        <Image src={card.src} alt="" fill sizes="(max-width: 768px) 224px, 384px" aria-hidden className="absolute inset-0 z-0 scale-110 object-cover blur-2xl brightness-[0.45]" />
        <BlurImage src={card.src} alt={card.title} fill className="absolute inset-0 z-10 object-contain" />
      </motion.button>
    </>
  );
}

function BlurImage({ className, alt, ...rest }: ImageProps) {
  const [loading, setLoading] = useState(true);
  return (
    <Image
      className={cn("transition duration-300", loading ? "blur-sm" : "blur-0", className)}
      onLoad={() => setLoading(false)}
      sizes="(max-width: 768px) 224px, 384px"
      alt={alt}
      {...rest}
    />
  );
}
