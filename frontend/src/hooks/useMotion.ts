import { useMemo } from 'react';
import { useReducedMotion, type Variants } from 'framer-motion';

// ── Timing constants (mirrors CSS vars in design-system-core.css) ──

const DURATION_FAST = 0.16; // --iedc-motion-fast
const DURATION = 0.22; // --iedc-motion
const DURATION_SLOW = 0.3; // --iedc-motion-slow
const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1]; // --iedc-ease
const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1]; // --iedc-ease-out
const SLIDE_Y = 12; // --iedc-slide-y
const SLIDE_X = 260; // --iedc-slide-x
const STAGGER_DELAY = 0.06;

// ── Reduced-motion fallbacks (instant, no spatial movement) ──

const REDUCED: Record<string, Variants> = {
  page: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
  container: {
    animate: {},
  },
  item: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
  },
  modal: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
  slide: {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
  },
};

// ── Full variants ──

const FULL: Record<string, Variants> = {
  page: {
    initial: { opacity: 0, y: SLIDE_Y },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION_SLOW, ease: EASE },
    },
    exit: {
      opacity: 0,
      y: -SLIDE_Y / 2,
      transition: { duration: DURATION, ease: EASE_OUT },
    },
  },
  container: {
    animate: {
      transition: { staggerChildren: STAGGER_DELAY },
    },
  },
  item: {
    initial: { opacity: 0, y: SLIDE_Y * 0.66 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION, ease: EASE },
    },
  },
  modal: {
    initial: { opacity: 0, scale: 0.96 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: DURATION, ease: EASE },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: { duration: DURATION_FAST, ease: EASE_OUT },
    },
  },
  slide: {
    initial: { opacity: 0, x: SLIDE_X },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: DURATION_SLOW, ease: EASE },
    },
    exit: {
      opacity: 0,
      x: SLIDE_X,
      transition: { duration: DURATION, ease: EASE_OUT },
    },
  },
};

/**
 * Central motion variants for the IEDC design system.
 *
 * Every variant set respects `prefers-reduced-motion` — when active,
 * all spatial transforms and fades are suppressed so content appears
 * instantly without any movement.
 *
 * Usage:
 * ```tsx
 * const { pageVariants } = useMotion();
 * <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
 * ```
 */
export function useMotion() {
  const shouldReduce = useReducedMotion();

  return useMemo(() => {
    const v = shouldReduce ? REDUCED : FULL;
    return {
      pageVariants: v.page,
      containerVariants: v.container,
      itemVariants: v.item,
      modalVariants: v.modal,
      slideVariants: v.slide,
      shouldReduce: !!shouldReduce,
    };
  }, [shouldReduce]);
}
