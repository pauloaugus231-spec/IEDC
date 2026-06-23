import { useEffect, useMemo, useState } from 'react';
import {
  abrirCaixaFinanceiro,
  fecharCaixaFinanceiro,
  useCaixaFinanceiro,
  type CaixaMetodoResumo,
} from '../api';
import { CheckCircle, Clock, RefreshCw, StopCircle } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import LojasSecretariaPage from './LojasSecretariaPage';
import '../styles/caixa-financeiro.css';

const currency = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  style: 'currency',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');
const standardMethods = ['Pix', 'Dinheiro', 'Cartão débito', 'Cartão crédito'];

function formatMoneyInput(value: number) {
  return Number.isFinite(value) ? String(value.toFixed(2)) : '0.00';
}

function statusLabel(status?: string | null) {
  if (status === 'aberto') return 'Aberto';
  if (status === 'fechado') return 'Fechado';
  return 'Sem caixa aberto';
}

function methodRows(methods: CaixaMetodoResumo[]) {
  const byName = new Map(methods.map((method) => [method.metodo, method]));

  return Array.from(new Set([...standardMethods, ...methods.map((method) => method.metodo)]))
    .map((metodo) => byName.get(metodo) || {
      metodo,
      valorSistema: 0,
      valorInformado: 0,
      diferenca: 0,
      quantidadePagamentos: 0,
    })
    .sort((a, b) => {
      const indexA = standardMethods.indexOf(a.metodo);
      const indexB = standardMethods.indexOf(b.metodo);
      const orderA = indexA === -1 ? standardMethods.length : indexA;
      const orderB = indexB === -1 ? standardMethods.length : indexB;
      return orderA - orderB || a.metodo.localeCompare(b.metodo, 'pt-BR');
    });
}

const CaixaFinanceiroPage = () => {
  const { currentUser } = useAuth();
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useCaixaFinanceiro(reload, 0);
  const [saldoInicial, setSaldoInicial] = useState('0.00');
  const [observacoesAbertura, setObservacoesAbertura] = useState('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  const [methodValues, setMethodValues] = useState<Record<string, string>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => methodRows(data?.metodos ?? []), [data?.metodos]);
  const systemTotal = rows.reduce((sum, row) => sum + Number(row.valorSistema || 0), 0);
  const informedTotal = rows.reduce((sum, row) => sum + Number(methodValues[row.metodo] || 0), 0);
  const difference = informedTotal - systemTotal;
  const pendenciasTotal = (data?.pendencias ?? []).reduce((sum, item) => sum + Number(item.saldo || 0), 0);

  useEffect(() => {
    setMethodValues((current) => {
      const next: Record<string, string> = {};
      for (const row of rows) {
        next[row.metodo] = current[row.metodo] ?? formatMoneyInput(row.valorSistema);
      }
      return next;
    });
  }, [rows]);

  async function handleOpenCash() {
    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await abrirCaixaFinanceiro({
        abertoPor: currentUser?.displayName || currentUser?.login || 'Comercial',
        observacoes: observacoesAbertura.trim() || undefined,
        saldoInicial: Number(saldoInicial || 0),
      });
      setObservacoesAbertura('');
      setReload((value) => value + 1);
      setActionMessage('Caixa aberto para operação financeira.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível abrir o caixa.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseCash() {
    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await fecharCaixaFinanceiro({
        fechadoPor: currentUser?.displayName || currentUser?.login || 'Comercial',
        observacoes: observacoesFechamento.trim() || undefined,
        metodos: rows.map((row) => ({
          metodo: row.metodo,
          valorInformado: Number(methodValues[row.metodo] || 0),
        })),
      });
      setConfirmClose(false);
      setObservacoesFechamento('');
      setReload((value) => value + 1);
      setActionMessage('Caixa fechado. Comandas pendentes foram encerradas como desistência.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível fechar o caixa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-band caixa-page">
      <section className="caixa-head">
        <div>
          <span className="caixa-eyebrow">Comercial</span>
          <h1>Caixa</h1>
          <p>Abertura, conferência e fechamento das comandas comerciais com desistência automática das compras não pagas.</p>
        </div>
        <button className="caixa-refresh" onClick={() => setReload((value) => value + 1)} type="button">
          <RefreshCw size={17} />
          Atualizar
        </button>
      </section>

      {error ? <p className="caixa-alert">{error}</p> : null}
      {actionError ? <p className="caixa-alert">{actionError}</p> : null}
      {actionMessage ? <p className="caixa-success">{actionMessage}</p> : null}

      <section className="caixa-status-grid">
        <article className={`caixa-status-card ${data?.caixa ? 'open' : 'closed'}`}>
          <div className="caixa-status-icon">
            {data?.caixa ? <Clock size={22} /> : <StopCircle size={22} />}
          </div>
          <div>
            <span>Status</span>
            <strong>{statusLabel(data?.caixa?.status)}</strong>
            <small>{data?.caixa ? `${data.caixa.codigo} aberto em ${data.caixa.abertoEm}` : 'Abra o caixa antes de receber pagamentos.'}</small>
          </div>
        </article>

        <article className="caixa-metric">
          <span>Total do sistema</span>
          <strong>{currency.format(systemTotal)}</strong>
          <small>{numberFormatter.format(rows.reduce((sum, row) => sum + row.quantidadePagamentos, 0))} pagamento(s) no caixa aberto</small>
        </article>

        <article className="caixa-metric">
          <span>Pendências de fechamento</span>
          <strong>{currency.format(pendenciasTotal)}</strong>
          <small>{numberFormatter.format(data?.pendencias.length ?? 0)} comanda(s) serão desistência se fechar agora</small>
        </article>

        <article className={`caixa-metric ${Math.abs(difference) > 0.009 ? 'warning' : 'ok'}`}>
          <span>Diferença conferida</span>
          <strong>{currency.format(difference)}</strong>
          <small>Valor informado menos valor do sistema</small>
        </article>
      </section>

      {!data?.caixa ? (
        <section className="caixa-panel caixa-open-panel">
          <div className="caixa-panel-head">
            <div>
              <span className="caixa-eyebrow">Abertura</span>
              <h2>Abrir caixa comercial</h2>
            </div>
          </div>
          <div className="caixa-form-grid">
            <label>
              <span>Saldo inicial</span>
              <input
                min="0"
                onChange={(event) => setSaldoInicial(event.target.value)}
                step="0.01"
                type="number"
                value={saldoInicial}
              />
            </label>
            <label>
              <span>Observações</span>
              <input
                onChange={(event) => setObservacoesAbertura(event.target.value)}
                placeholder="Ex.: abertura para apresentação financeira"
                value={observacoesAbertura}
              />
            </label>
            <button className="caixa-primary" disabled={submitting || loading} onClick={handleOpenCash} type="button">
              <CheckCircle size={18} />
              Abrir caixa
            </button>
          </div>
        </section>
      ) : (
        <section className="caixa-work-grid">
          <article className="caixa-panel">
            <div className="caixa-panel-head">
              <div>
                <span className="caixa-eyebrow">Conferência</span>
                <h2>Valores por método</h2>
              </div>
            </div>
            <div className="caixa-method-table">
              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Sistema</th>
                    <th>Conferido</th>
                    <th>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const informed = Number(methodValues[row.metodo] || 0);
                    const rowDiff = informed - row.valorSistema;
                    return (
                      <tr key={row.metodo}>
                        <td>
                          <strong>{row.metodo}</strong>
                          <small className="caixa-method-count">{row.quantidadePagamentos} pagamento(s)</small>
                        </td>
                        <td>{currency.format(row.valorSistema)}</td>
                        <td>
                          <input
                            min="0"
                            onChange={(event) => setMethodValues((current) => ({
                              ...current,
                              [row.metodo]: event.target.value,
                            }))}
                            step="0.01"
                            type="number"
                            value={methodValues[row.metodo] ?? '0.00'}
                          />
                        </td>
                        <td className={Math.abs(rowDiff) > 0.009 ? 'warning' : 'ok'}>{currency.format(rowDiff)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="caixa-panel">
            <div className="caixa-panel-head">
              <div>
                <span className="caixa-eyebrow">Fechamento</span>
                <h2>Encerrar caixa</h2>
              </div>
            </div>
            <label className="caixa-notes">
              <span>Observações do fechamento</span>
              <textarea
                onChange={(event) => setObservacoesFechamento(event.target.value)}
                placeholder="Registre divergências, conferência manual ou justificativas."
                value={observacoesFechamento}
              />
            </label>
            <label className="caixa-confirm">
              <input
                checked={confirmClose}
                onChange={(event) => setConfirmClose(event.target.checked)}
                type="checkbox"
              />
              <span>Confirmo que revisei as comandas pendentes e aceito encerrá-las como desistência.</span>
            </label>
            <button
              className="caixa-danger"
              disabled={!confirmClose || submitting}
              onClick={handleCloseCash}
              type="button"
            >
              <StopCircle size={18} />
              Fechar caixa
            </button>
          </aside>
        </section>
      )}

      {data?.caixa ? (
        <section className="caixa-queue-module">
          <LojasSecretariaPage embedded mode="fila" />
        </section>
      ) : null}

      <section className="caixa-work-grid bottom">
        <article className="caixa-panel">
          <div className="caixa-panel-head">
            <div>
              <span className="caixa-eyebrow">Pendências</span>
              <h2>Comandas não pagas</h2>
            </div>
            <strong>{data?.pendencias.length ?? 0}</strong>
          </div>
          <div className="caixa-list-table">
            <table>
              <thead>
                <tr>
                  <th>Comanda</th>
                  <th>Cliente</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(data?.pendencias ?? []).map((comanda) => (
                  <tr key={comanda.id}>
                    <td>
                      <strong>{comanda.codigo}</strong>
                      <small>{comanda.criadaEm}</small>
                    </td>
                    <td>{comanda.cliente}</td>
                    <td>{currency.format(comanda.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && !data.pendencias.length ? <div className="caixa-empty">Nenhuma comanda aberta para fechamento.</div> : null}
          </div>
        </article>

        <article className="caixa-panel">
          <div className="caixa-panel-head">
            <div>
              <span className="caixa-eyebrow">Histórico</span>
              <h2>Últimos caixas</h2>
            </div>
          </div>
          <div className="caixa-history-list">
            {(data?.historico ?? []).map((caixa) => (
              <div key={caixa.id}>
                <span>{caixa.codigo}</span>
                <strong>{currency.format(caixa.totalSistema)}</strong>
                <small>{statusLabel(caixa.status)} · {caixa.abertoEm}{caixa.fechadoEm ? ` a ${caixa.fechadoEm}` : ''}</small>
              </div>
            ))}
            {data && !data.historico.length ? <div className="caixa-empty">Nenhum caixa registrado.</div> : null}
          </div>
        </article>
      </section>
    </main>
  );
};

export default CaixaFinanceiroPage;
