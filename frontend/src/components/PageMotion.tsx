import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMotion } from '../hooks/useMotion';

type PageMotionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps page content with a fade + slide-up entrance animation.
 * Respects `prefers-reduced-motion` via `useMotion`.
 *
 * Used inside `ProtectedLayout` so every route transition is animated
 * through `AnimatePresence mode="wait"`.
 */
export default function PageMotion({ children, className }: PageMotionProps) {
  const { pageVariants } = useMotion();

  return (
    <motion.div
      animate="animate"
      className={className}
      exit="exit"
      initial="initial"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}
