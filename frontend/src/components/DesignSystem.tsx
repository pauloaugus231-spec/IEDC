import type { HTMLAttributes, ReactNode } from 'react';

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
    <section className={cx('creche-dashboard-head ds-page-head', className)} {...props}>
      <div>
        {eyebrow ? <p className="institutional-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="creche-head-actions ds-page-actions">{actions}</div> : null}
    </section>
  );
}

type MetricGridProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function MetricGrid({ children, className, ...props }: MetricGridProps) {
  return (
    <section className={cx('metrics-grid creche-metrics-grid ds-metric-grid', className)} {...props}>
      {children}
    </section>
  );
}

type MetricCardProps = HTMLAttributes<HTMLElement> & {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
};

export function MetricCard({ label, value, detail, tone = 'default', className, ...props }: MetricCardProps) {
  return (
    <article className={cx('metric-card creche-metric-card ds-metric-card', tone !== 'default' && tone, className)} {...props}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
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
    <article className={cx('support-panel ds-panel', className)} {...props}>
      {title || subtitle || actions ? (
        <div className="creche-panel-head ds-panel-head">
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
    <div className={cx('report-table-wrap ds-table-shell', className)} {...props}>
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
  return (
    <div className={cx('support-modal ds-modal', className)} role="dialog" aria-modal="true" {...props}>
      <div className="creche-panel-head ds-panel-head">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </div>
      {children}
      {footer ? <div className="support-modal-actions ds-modal-actions">{footer}</div> : null}
    </div>
  );
}

export const dsClass = cx;
