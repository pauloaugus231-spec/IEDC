import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  getComandaComercial,
  registrarPagamentoComanda,
  updateStatusComandaComercial,
  useLojasDashboard,
  type ComandaDetalhe,
  type ComandaResumo,
  type LojasPeriodo,
} from '../api';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useLojasRealtime, type LojasRealtimeEvent } from '../hooks/useLojasRealtime';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, GRID_LINE_STYLE, LEGEND_STYLE, IEDC_BLUE_800, formatCurrencyAxis } from '../styles/echarts-theme-iedc';
import '../styles/institutional.css';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const periodos: { label: string; value: LojasPeriodo }[] = [
  { label: 'Dia', value: 'dia' },
  { label: 'Semanal', value: 'semana' },
  { label: 'Mensal', value: 'mes' },
  { label: 'Anual', value: 'ano' },
];

const statusLabel: Record<string, string> = {
  aberta: 'Aberta',
  aguardando_pagamento: 'Aguardando pagamento',
  paga: 'Paga',
  desistencia: 'Desistência',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

const statusHistory: Record<string, string> = {
  paga: 'Quitada',
  aguardando_pagamento: 'Parcial',
  desistencia: 'Desistência',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

const emptyPayments = {
  Dinheiro: '',
  Pix: '',
  Débito: '',
  Crédito: '',
};

type FinanceNotification = {
  comandaId: string;
  codigo: string;
  cliente: string;
  origem: string;
  saldo: number;
  total: number;
  status: string;
  horario: string;
  count: number;
};

function parseMoney(value: string) {
  const numeric = Number(value.replace(',', '.') || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isComandaDetalhePayload(payload: unknown): payload is ComandaDetalhe {
  if (!payload || typeof payload !== 'object') return false;
  const comanda = payload as Partial<ComandaDetalhe>;
  return Boolean(comanda.id && comanda.codigo && comanda.cliente);
}

function getComandaOrigem(comanda: ComandaDetalhe) {
  const totais = comanda.totaisPorLoja?.map((loja) => loja.nome).filter(Boolean) ?? [];

  if (totais.length) {
    return totais.join(', ');
  }

  const lojas = Array.from(new Set(comanda.itens?.map((item) => item.loja).filter(Boolean) ?? []));
  return lojas.length ? lojas.join(', ') : 'Lojas';
}

function getNotificationTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function showOperationalReceipt(message: string, type: 'success' | 'info' = 'success') {
  window.showToast?.(message, type);
}

type LojasSecretariaMode = 'overview' | 'fila' | 'historico';

const LojasSecretariaPage = ({
  embedded = false,
  mode = 'overview',
}: {
  embedded?: boolean;
  mode?: LojasSecretariaMode;
}) => {
  const { currentUser } = useAuth();
  const isGestoraView = currentUser?.role === 'gestora';
  const isQueuePage = mode === 'fila';
  const isHistoryPage = mode === 'historico';
  const [periodo, setPeriodo] = useState<LojasPeriodo>('dia');
  const [reload, setReload] = useState(0);
  const { data: dashboard, loading } = useLojasDashboard(periodo, reload);
  const [selected, setSelected] = useState<ComandaDetalhe | null>(null);
  const [payments, setPayments] = useState(emptyPayments);
  const [motivo, setMotivo] = useState('Cliente foi embora sem finalizar o pagamento.');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [financeNotifications, setFinanceNotifications] = useState<FinanceNotification[]>([]);
  const lojas = dashboard?.porLoja ?? [];
  const totalVendasLojas = lojas.reduce((sum, loja) => sum + loja.realizado, 0);

  const pushComandaNotification = useCallback((comanda: ComandaDetalhe) => {
    const isCobrável = ['aberta', 'aguardando_pagamento'].includes(comanda.status);
    const temValor = Number(comanda.saldo || 0) > 0 && (comanda.itens?.length ?? 0) > 0;

    setFinanceNotifications((current) => {
      if (!isCobrável || !temValor) {
        return current.filter((notification) => notification.comandaId !== comanda.id);
      }

      const existing = current.find((notification) => notification.comandaId === comanda.id);
      const notification: FinanceNotification = {
        comandaId: comanda.id,
        codigo: comanda.codigo,
        cliente: comanda.cliente,
        origem: getComandaOrigem(comanda),
        saldo: comanda.saldo,
        total: comanda.total,
        status: comanda.status,
        horario: getNotificationTime(comanda.atualizadaEm),
        count: existing ? existing.count + 1 : 1,
      };

      return [
        notification,
        ...current.filter((item) => item.comandaId !== comanda.id),
      ].slice(0, 8);
    });
  }, []);

  const refreshRealtime = useCallback((event?: LojasRealtimeEvent) => {
    setReload((value) => value + 1);

    if (event?.name === 'lojas:comanda-atualizada' && isComandaDetalhePayload(event.payload)) {
      if (selected?.id === event.payload.id) {
        setSelected(event.payload);
        return;
      }

      if (!isGestoraView) {
        pushComandaNotification(event.payload);
      }
    }
  }, [isGestoraView, pushComandaNotification, selected?.id]);

  useLojasRealtime(refreshRealtime);

  const serieLabels = useMemo(
    () => (dashboard?.serie ?? []).map((point) => {
      const data = new Date(`${point.data}T12:00:00`);
      return data.toLocaleDateString('pt-BR', {
        day: periodo === 'ano' ? undefined : '2-digit',
        month: 'short',
      });
    }),
    [dashboard?.serie, periodo],
  );

  const barChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = `<strong>${items[0]?.name ?? ''}</strong>`;
          for (const item of items) {
            html += `<br/>${item.seriesName}: ${currency.format(Number(item.value || 0))}`;
          }
          return html;
        },
      },
      legend: { bottom: 0, ...LEGEND_STYLE },
      grid: { left: 56, right: 18, top: 18, bottom: 44, containLabel: false },
      xAxis: {
        type: 'category',
        data: serieLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL_STYLE, fontWeight: 800 },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        splitLine: { lineStyle: GRID_LINE_STYLE },
        axisLabel: { ...AXIS_LABEL_STYLE, formatter: (value: number) => formatCurrencyAxis(value) },
      },
      series: [
        {
          type: 'bar',
          name: 'Previsto',
          data: (dashboard?.serie ?? []).map((point) => point.previsto),
          itemStyle: { color: 'rgba(64, 119, 207, 0.32)', borderRadius: [9, 9, 0, 0] },
          barMaxWidth: 28,
        },
        {
          type: 'bar',
          name: 'Realizado',
          data: (dashboard?.serie ?? []).map((point) => point.realizado),
          itemStyle: { color: IEDC_BLUE_800, borderRadius: [9, 9, 0, 0] },
          barMaxWidth: 28,
        },
      ],
      animationDuration: 850,
      animationEasing: 'quarticOut',
    }),
    [dashboard?.serie, serieLabels, periodo],
  );

  const doughnutChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'item',
        formatter: (params: any) => {
          const value = Number(params.value || 0);
          const percentage = totalVendasLojas ? Math.round((value / totalVendasLojas) * 100) : 0;
          return `${params.name}: ${currency.format(value)} (${percentage}%)`;
        },
      },
      legend: { bottom: 0, ...LEGEND_STYLE },
      series: [
        {
          type: 'pie',
          radius: ['64%', '90%'],
          center: ['50%', '45%'],
          data: lojas.map((loja, i) => ({
            value: loja.realizado,
            name: loja.nome,
            itemStyle: { color: ['#0041aa', '#4077cf', '#f7b044'][i] ?? '#4077cf' },
          })),
          emphasis: { scaleSize: 8 },
          itemStyle: { borderColor: '#ffffff', borderWidth: 4 },
          label: { show: false },
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [lojas, totalVendasLojas],
  );

  const openComanda = async (comanda: ComandaResumo | ComandaDetalhe) => {
    setSaving(true);
    setError(null);

    try {
      const detail = await getComandaComercial(comanda.id);
      setSelected(detail);
      setPayments(emptyPayments);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível abrir a comanda.'));
    } finally {
      setSaving(false);
    }
  };

  const closePaymentModal = () => {
    setSelected(null);
    setPayments(emptyPayments);
  };

  const dismissFinanceNotification = (comandaId: string) => {
    setFinanceNotifications((current) => current.filter((notification) => notification.comandaId !== comandaId));
  };

  const clearFinanceNotifications = () => {
    setFinanceNotifications([]);
  };

  const openNotificationComanda = (notification: FinanceNotification) => {
    dismissFinanceNotification(notification.comandaId);
    void openComanda({ id: notification.comandaId } as ComandaResumo);
  };

  const totalPayments = Object.values(payments).reduce((sum, value) => sum + parseMoney(value), 0);
  const selectedBalance = selected?.saldo ?? 0;
  const paymentExceedsBalance = Boolean(selected && totalPayments > selectedBalance + 0.01);

  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;

    const pagamentos = Object.entries(payments)
      .map(([metodo, valor]) => ({ metodo, valor: parseMoney(valor) }))
      .filter((pagamento) => pagamento.valor > 0);

    if (!pagamentos.length) {
      setError('Informe ao menos um valor de pagamento.');
      return;
    }

    if (paymentExceedsBalance) {
      setError('O valor informado ultrapassa o saldo da comanda.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await registrarPagamentoComanda(selected.id, {
        pagamentos,
        recebidoPor: currentUser?.displayName || 'Secretaria',
      });
      setSelected(updated);
      setPayments(emptyPayments);
      setReload((value) => value + 1);
      showOperationalReceipt('Pagamento registrado na comanda.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível registrar o pagamento.'));
    } finally {
      setSaving(false);
    }
  };

  const markDesistencia = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await updateStatusComandaComercial(selected.id, {
        status: 'desistencia',
        motivo,
        usuario: currentUser?.displayName || 'Secretaria',
      });
      setSelected(updated);
      setReload((value) => value + 1);
      showOperationalReceipt('Desistência registrada.', 'info');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível marcar a desistência.'));
    } finally {
      setSaving(false);
    }
  };

  const downloadFechamento = (formato: 'pdf' | 'excel') => {
    window.location.href = `/api/lojas/fechamento/${formato}?periodo=${periodo}`;
  };

  const visibleFinanceNotifications = financeNotifications.slice(0, 3);
  const hiddenFinanceNotifications = Math.max(financeNotifications.length - visibleFinanceNotifications.length, 0);
  const financeHistory = (dashboard?.recentes ?? []).filter((comanda) => (
    comanda.pago > 0 ||
    ['paga', 'desistencia', 'cancelada', 'expirada'].includes(comanda.status)
  ));
  const selectedReceivesPayment = Boolean(
    selected && ['aberta', 'aguardando_pagamento'].includes(selected.status) && selected.saldo > 0.01,
  );
  const pageTitle = isQueuePage
    ? 'Fila de pagamento'
    : isHistoryPage
      ? 'Histórico de pagamento'
      : isGestoraView
        ? 'Painel financeiro das Lojas'
        : 'Comandas das Lojas';
  const pageSubtitle = isQueuePage
    ? 'Abra a comanda, confira os itens por loja e registre o pagamento no modal de cobrança.'
    : isHistoryPage
      ? 'Consulte comandas pagas, parciais, canceladas ou encerradas para conferência financeira.'
      : isGestoraView
        ? 'Acompanhe vendas previstas, realizadas, desistências e desempenho por loja sem entrar na rotina de cobrança.'
        : 'Acompanhe vendas previstas, realizadas, desistências e desempenho por loja.';

  const Shell = embedded ? 'section' : 'main';

  return (
    <Shell className={embedded ? 'commerce-embedded-queue' : 'page-band commerce-page'}>
      {!embedded ? (
        <>
          <PageHeader
            className="commerce-head"
            eyebrow="Secretaria e Financeiro"
            title={pageTitle}
            description={pageSubtitle}
            actions={!isQueuePage ? (
            <div className="commerce-head-controls">
              <div className="creche-period-tabs">
                {periodos.map((option) => (
                  <button
                    className={periodo === option.value ? 'active' : ''}
                    key={option.value}
                    onClick={() => setPeriodo(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="commerce-export-actions">
                <button onClick={() => downloadFechamento('pdf')} type="button">
                  PDF
                </button>
                <button onClick={() => downloadFechamento('excel')} type="button">
                  Excel
                </button>
              </div>
            </div>
            ) : null}
          />

          <MetricGrid className="commerce-metrics commerce-finance-metrics">
            <MetricCard label="Previsto" value={currency.format(dashboard?.kpis.vendasPrevistas ?? 0)} detail="Valor ainda em aberto nas comandas" />
            <MetricCard label="Realizado" value={currency.format(dashboard?.kpis.vendasPagas ?? 0)} detail={`${dashboard?.kpis.comandasPagas ?? 0} comandas pagas no período`} tone="success" />
            <MetricCard label="Pendente" value={dashboard?.kpis.comandasAguardando ?? 0} detail="Comandas aguardando pagamento" tone="warning" />
            <MetricCard label="Desistências" value={dashboard?.kpis.desistencias ?? 0} detail={`${currency.format(dashboard?.kpis.valorDesistido ?? 0)} em venda perdida`} tone="warning" />
            <MetricCard
              label="Retiradas"
              value={(dashboard?.kpis.retiradasPendentes ?? 0) + (dashboard?.kpis.retiradasConcluidas ?? 0)}
              detail={`${dashboard?.kpis.retiradasPendentes ?? 0} pendente(s), ${dashboard?.kpis.retiradasConcluidas ?? 0} concluída(s)`}
            />
          </MetricGrid>
        </>
      ) : null}

      {error ? <p className="commerce-alert">{error}</p> : null}

      {!isGestoraView && financeNotifications.length > 0 ? (
        <section className="finance-notification-stack" aria-live="polite" aria-label="Notificações financeiras">
          {hiddenFinanceNotifications > 0 ? (
            <div className="finance-notification-group">
              <span>
                {hiddenFinanceNotifications === 1
                  ? 'Mais 1 comanda agrupada'
                  : `Mais ${hiddenFinanceNotifications} comandas agrupadas`}
              </span>
              <button onClick={clearFinanceNotifications} type="button">
                Limpar todas
              </button>
            </div>
          ) : null}

          {visibleFinanceNotifications.map((notification) => (
            <article className="finance-notification-card" key={notification.comandaId}>
              <div className="finance-notification-top">
                <div>
                  <span>Comanda para cobrança</span>
                  <strong>{notification.codigo}</strong>
                </div>
                <button
                  aria-label={`Fechar notificação da comanda ${notification.codigo}`}
                  onClick={() => dismissFinanceNotification(notification.comandaId)}
                  type="button"
                >
                  Fechar
                </button>
              </div>

              <div className="finance-notification-body">
                <strong>{notification.cliente}</strong>
                <span>{notification.origem} · {statusLabel[notification.status] ?? notification.status}</span>
              </div>

              <div className="finance-notification-footer">
                <div>
                  <span>Saldo</span>
                  <strong>{currency.format(notification.saldo)}</strong>
                </div>
                <div>
                  <span>{notification.count > 1 ? `${notification.count} atualizações` : notification.horario}</span>
                </div>
                <button onClick={() => openNotificationComanda(notification)} type="button">
                  Cobrar
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {mode === 'overview' ? (
        <section className="commerce-secretary-grid">
          <article className="commerce-panel commerce-chart-panel">
            <div className="commerce-panel-title">
              <div>
                <h2>Previsto x realizado</h2>
                <span>{loading ? 'Carregando dados financeiros...' : 'Leitura financeira por período selecionado.'}</span>
              </div>
            </div>
            <div className="commerce-chart-box">
              {dashboard?.serie?.length ? (
                <EChartCanvas ariaLabel="Gráfico previsto x realizado das lojas" option={barChartOption} />
              ) : (
                <div className="executive-empty-chart">Sem movimento no período</div>
              )}
            </div>
          </article>

          <aside className="commerce-panel commerce-store-chart-panel">
            <div className="commerce-panel-title">
              <div>
                <h2>Participação por loja</h2>
                <span>Percentual de vendas realizadas por origem.</span>
              </div>
            </div>
            <div className="executive-commerce-donut commerce-store-donut">
              {totalVendasLojas > 0 ? (
                <>
                  <EChartCanvas ariaLabel="Participação por loja" option={doughnutChartOption} />
                  <div className="executive-commerce-donut-center">
                    <strong>{currency.format(totalVendasLojas)}</strong>
                    <span>realizado</span>
                  </div>
                </>
              ) : (
                <div className="executive-empty-chart executive-empty-chart-compact">
                  {loading ? 'Carregando vendas...' : 'Sem vendas realizadas no período'}
                </div>
              )}
            </div>
            <div className="commerce-store-breakdown compact">
              {lojas.map((loja) => (
                <div key={loja.slug}>
                  <strong>{loja.nome}</strong>
                  <span>Realizado: {currency.format(loja.realizado)}</span>
                  <em>Previsto: {currency.format(loja.previsto)}</em>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : null}

      {!isGestoraView && isQueuePage ? (
        <section className="commerce-panel commerce-dedicated-panel">
          <div className="commerce-panel-title">
            <div>
              <h2>Fila de pagamento</h2>
              <span>Comandas ativas aparecem aqui para cobrança. Clique para abrir o modal.</span>
            </div>
            <strong>{dashboard?.comandasAguardando?.length ?? 0}</strong>
          </div>
          <div className="commerce-command-list secretary-list commerce-history-list-large">
            {(dashboard?.comandasAguardando ?? []).map((comanda) => (
              <button
                className={selected?.id === comanda.id ? 'active' : ''}
                key={comanda.id}
                onClick={() => openComanda(comanda)}
                type="button"
              >
                <strong>{comanda.codigo} · {comanda.cliente}</strong>
                <span>{comanda.lojas || 'Sem itens'} · {statusLabel[comanda.status]}</span>
                <em>{currency.format(comanda.saldo)}</em>
              </button>
            ))}
            {!dashboard?.comandasAguardando?.length ? (
              <p className="institutional-note">Nenhuma comanda aguardando pagamento.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {!isGestoraView && isHistoryPage ? (
        <section className="commerce-panel commerce-dedicated-panel">
          <div className="commerce-panel-title">
            <div>
              <h2>Histórico financeiro</h2>
              <span>Comandas quitadas, parciais ou encerradas no período selecionado.</span>
            </div>
            <strong>{financeHistory.length}</strong>
          </div>

          <div className="commerce-command-list commerce-history-list commerce-history-list-large">
            {financeHistory.map((comanda) => (
              <button
                className={selected?.id === comanda.id ? 'active' : ''}
                key={comanda.id}
                onClick={() => openComanda(comanda)}
                type="button"
              >
                <strong>{comanda.codigo} · {comanda.cliente}</strong>
                <span>
                  {statusHistory[comanda.status] ?? statusLabel[comanda.status] ?? comanda.status}
                  {' · '}
                  {comanda.finalizadaEm || comanda.atualizadaEm}
                  {comanda.lojas ? ` · ${comanda.lojas}` : ''}
                  {comanda.retiradasPendentes ? ` · ${comanda.retiradasPendentes} retirada(s) pendente(s)` : ''}
                  {!comanda.retiradasPendentes && comanda.retiradasConcluidas ? ' · Retiradas concluídas' : ''}
                </span>
                <em>{currency.format(comanda.pago || comanda.total)}</em>
              </button>
            ))}

            {!financeHistory.length ? (
              <p className="institutional-note">Nenhum pagamento ou encerramento registrado neste período.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {selected && !isGestoraView ? (
        <div className="commerce-modal-overlay" role="presentation">
          <div className="commerce-modal commerce-payment-modal" role="dialog" aria-modal="true">
            <div className="commerce-modal-head">
              <div>
                <span>{selected.codigo}</span>
                <h2>{selected.cliente}</h2>
              </div>
              <button onClick={closePaymentModal} type="button">Fechar</button>
            </div>

            <section className="commerce-command-summary">
              <article>
                <span>Total</span>
                <strong>{currency.format(selected.total)}</strong>
              </article>
              <article>
                <span>Pago</span>
                <strong>{currency.format(selected.pago)}</strong>
              </article>
              <article>
                <span>Saldo</span>
                <strong>{currency.format(selected.saldo)}</strong>
              </article>
            </section>

            <div className="commerce-items-list compact">
              {selected.itens.map((item) => (
                <div className="commerce-item-row" key={item.id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>{item.loja} · {item.quantidade} x {currency.format(item.valorUnitario)}</span>
                  </div>
                  <strong>{currency.format(item.total)}</strong>
                </div>
              ))}
            </div>

            <div className="commerce-totals-by-store">
              {selected.totaisPorLoja.map((loja) => (
                <span key={loja.slug}>{loja.nome}: {currency.format(loja.total)}</span>
              ))}
            </div>

            {selected.retiradasPorLoja?.length ? (
              <div className="commerce-pickup-summary">
                <h3>Retirada nas lojas</h3>
                {selected.retiradasPorLoja.map((retirada) => (
                  <div key={retirada.id}>
                    <span>{retirada.loja}</span>
                    <strong>
                      {retirada.status === 'retirado'
                        ? `Retirado${retirada.retiradaEm ? ` em ${retirada.retiradaEm}` : ''}`
                        : 'Aguardando retirada'}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}

            {selected.pagamentos.length ? (
              <div className="commerce-payment-history">
                <h3>Pagamentos registrados</h3>
                {selected.pagamentos.map((pagamento) => (
                  <div key={pagamento.id}>
                    <span>{pagamento.metodo} · {pagamento.criadoEm}</span>
                    <strong>{currency.format(pagamento.valor)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedReceivesPayment ? (
              <form className="commerce-form" onSubmit={handlePayment}>
                <div className="commerce-form-grid payment-grid">
                  {Object.entries(payments).map(([metodo, value]) => (
                    <label key={metodo}>
                      <span>{metodo}</span>
                      <input
                        onChange={(event) => setPayments((current) => ({ ...current, [metodo]: event.target.value }))}
                        placeholder="0,00"
                        value={value}
                      />
                    </label>
                  ))}
                </div>
                <div className="commerce-payment-summary">
                  <span>Informado agora: {currency.format(totalPayments)}</span>
                  <span>Saldo após pagamento: {currency.format(Math.max(selectedBalance - totalPayments, 0))}</span>
                </div>
                {paymentExceedsBalance ? (
                  <p className="commerce-inline-error">O pagamento informado passa do saldo disponível.</p>
                ) : null}
                <button
                  className="institutional-button"
                  disabled={saving || totalPayments <= 0 || paymentExceedsBalance}
                  type="submit"
                >
                  Registrar pagamento
                </button>
              </form>
            ) : (
              <div className="commerce-empty-state compact">
                <strong>Sem saldo para cobrança</strong>
                <span>Esta comanda fica disponível apenas para conferência do histórico.</span>
              </div>
            )}

            {selectedReceivesPayment ? (
              <div className="commerce-desistance-box">
                <label>
                  <span>Motivo da desistência</span>
                  <textarea onChange={(event) => setMotivo(event.target.value)} value={motivo} />
                </label>
                <button disabled={saving} onClick={markDesistencia} type="button">
                  Marcar desistência
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Shell>
  );
};

export default LojasSecretariaPage;
