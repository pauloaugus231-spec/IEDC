import type { HTMLAttributes, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMotion } from '../hooks/useMotion';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, className, children, ...props }: PageHeaderProps) {
  return (
    <section className={cx('ds-page-head', className)} {...props}>
      <div>
        {eyebrow ? <p className="institutional-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="ds-page-actions">{actions}</div> : null}
    </section>
  );
}

type MetricGridProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function MetricGrid({ children, className, ...props }: MetricGridProps) {
  const { containerVariants } = useMotion();

  return (
    <motion.section
      animate="animate"
      className={cx('ds-metric-grid', className)}
      initial="initial"
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.section>
  );
}

type MetricCardProps = HTMLAttributes<HTMLElement> & {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
};

export function MetricCard({ label, value, detail, tone = 'default', className, ...props }: MetricCardProps) {
  const { itemVariants } = useMotion();

  return (
    <motion.article
      className={cx('ds-metric-card', tone !== 'default' && tone, className)}
      variants={itemVariants}
      {...props}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </motion.article>
  );
}

type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, subtitle, actions, children, className, ...props }: PanelProps) {
  return (
    <article className={cx('ds-panel', className)} {...props}>
      {title || subtitle || actions ? (
        <div className="ds-panel-head">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </article>
  );
}

type TableShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function TableShell({ children, className, ...props }: TableShellProps) {
  return (
    <div className={cx('ds-table-shell', className)} {...props}>
      {children}
    </div>
  );
}

type ModalFrameProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function ModalFrame({ title, subtitle, children, footer, className, ...props }: ModalFrameProps) {
  const { modalVariants } = useMotion();

  return (
    <motion.div
      animate="animate"
      className={cx('ds-modal', className)}
      exit="exit"
      initial="initial"
      role="dialog"
      aria-modal="true"
      variants={modalVariants}
      {...props}
    >
      <div className="ds-panel-head">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </div>
      {children}
      {footer ? <div className="ds-modal-actions">{footer}</div> : null}
    </motion.div>
  );
}

// ── Backdrop / overlay (pairs with ModalFrame or standalone modals) ──

const BACKDROP_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

type ModalOverlayProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Animated modal backdrop with `AnimatePresence`. Renders a
 * blurred overlay that fades in/out, and passes `exit` props
 * down so child `ModalFrame` animates out correctly.
 *
 * ```tsx
 * <ModalOverlay open={showModal} onClose={() => setShowModal(false)}>
 *   <ModalFrame title="...">...</ModalFrame>
 * </ModalOverlay>
 * ```
 */
export function ModalOverlay({ open, onClose, children, className }: ModalOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate="animate"
          className={cx('ds-modal-backdrop', className)}
          exit="exit"
          initial="initial"
          onClick={onClose}
          role="presentation"
          variants={BACKDROP_VARIANTS}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={(e) => e.stopPropagation()}>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Slide panel (for drawer/side-panel patterns) ──

type SlidePanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * A panel that slides in from the right. Must be placed inside
 * an `AnimatePresence` or `ModalOverlay` to animate out on exit.
 */
export function SlidePanel({ children, className, ...props }: SlidePanelProps) {
  const { slideVariants } = useMotion();

  return (
    <motion.div
      animate="animate"
      className={cx('ds-modal', className)}
      exit="exit"
      initial="initial"
      role="dialog"
      aria-modal="true"
      variants={slideVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const dsClass = cx;
