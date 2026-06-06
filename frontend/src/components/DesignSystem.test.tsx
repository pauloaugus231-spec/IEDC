import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PageHeader,
  MetricGrid,
  MetricCard,
  Panel,
  TableShell,
  ModalFrame,
  dsClass,
} from './DesignSystem';

describe('DesignSystem — componentes primitivos', () => {
  // ── PageHeader ──
  it('renderiza título e eyebrow com classe ds-page-head', () => {
    const { container } = render(<PageHeader eyebrow="Módulo" title="Dashboard" />);
    expect(screen.getByText('Módulo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(container.querySelector('.ds-page-head')).toBeInTheDocument();
  });

  it('renderiza ações e descrição quando informados', () => {
    render(
      <PageHeader title="T" description="Descrição" actions={<button type="button">Ação</button>} />,
    );
    expect(screen.getByText('Descrição')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
  });

  // ── MetricGrid ──
  it('MetricGrid renderiza filhos com classes corretas', () => {
    const { container } = render(
      <MetricGrid data-testid="grid">
        <div>Card</div>
      </MetricGrid>,
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('ds-metric-grid');
  });

  // ── MetricCard ──
  it('MetricCard mostra label, value, detail e classe ds-metric-card', () => {
    const { container } = render(<MetricCard label="Ativos" value="42" detail="+3 esta semana" />);
    expect(screen.getByText('Ativos')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('+3 esta semana')).toBeInTheDocument();
    expect(container.querySelector('.ds-metric-card')).toBeInTheDocument();
  });

  it('MetricCard aplica classe de tone quando não-default', () => {
    const { container } = render(<MetricCard label="Alerta" value="7" tone="danger" />);
    expect(container.querySelector('article')).toHaveClass('danger');
  });

  // ── Panel ──
  it('Panel renderiza título, subtítulo e classe ds-panel', () => {
    const { container } = render(<Panel title="Painel" subtitle="Sub"><p>Conteúdo</p></Panel>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Painel');
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(container.querySelector('.ds-panel')).toBeInTheDocument();
  });

  // ── TableShell ──
  it('TableShell envolve filhos com classe ds-table-shell', () => {
    const { container } = render(<TableShell><table><tbody><tr><td>X</td></tr></tbody></table></TableShell>);
    expect(container.querySelector('.ds-table-shell')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  // ── ModalFrame ──
  it('ModalFrame renderiza dialog com título, footer e classe ds-modal', () => {
    const { container } = render(
      <ModalFrame title="Confirmar" footer={<button type="button">Salvar</button>}>
        <p>Corpo</p>
      </ModalFrame>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Confirmar');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByText('Corpo')).toBeInTheDocument();
    expect(container.querySelector('.ds-modal')).toBeInTheDocument();
  });

  // ── dsClass (cx) ──
  it('dsClass filtra valores falsy e junta com espaço', () => {
    expect(dsClass('a', false, null, undefined, 'b')).toBe('a b');
    expect(dsClass('only')).toBe('only');
  });
});
