import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addItemComandaComercial,
  createClienteComercial,
  createComandaComercial,
  createProdutoLoja,
  confirmarRetiradaLoja,
  getComandaComercial,
  removeItemComandaComercial,
  updateClienteComercial,
  updateProdutoLoja,
  useClientesComerciais,
  useComandasComerciais,
  useProdutosLoja,
  useRetiradasLoja,
  type ClienteComercial,
  type ComandaDetalhe,
  type ComandaResumo,
  type LojaSlug,
  type ProdutoLoja,
  type RetiradaLoja,
} from '../api';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useLojasRealtime, type LojasRealtimeEvent } from '../hooks/useLojasRealtime';
import '../styles/institutional.css';

const lojaInfo: Record<LojaSlug, { nome: string; subtitulo: string }> = {
  bazar: {
    nome: 'Bazar',
    subtitulo: 'Lance itens na comanda única e encaminhe a conferência para a secretaria.',
  },
  brecho: {
    nome: 'Brechó',
    subtitulo: 'Inclua peças na mesma comanda do cliente, mesmo quando a compra começou em outra loja.',
  },
  feirao: {
    nome: 'Feirão',
    subtitulo: 'Registre os itens escolhidos e acompanhe a retirada após liberação da secretaria.',
  },
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const statusLabel: Record<string, string> = {
  aberta: 'Aberta',
  aguardando_pagamento: 'Aguardando pagamento',
  paga: 'Quitada',
  desistencia: 'Desistência',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

const emptyClienteForm = {
  nome: '',
  telefone: '',
  cpf: '',
  email: '',
  endereco: '',
  dataNascimento: '',
  observacoes: '',
};

const emptyItemForm = {
  produtoId: '',
  descricao: '',
  categoria: '',
  quantidade: '1',
  valorUnitario: '',
  desconto: '',
};

const emptyProdutoForm = {
  nome: '',
  categoria: '',
  preco: '',
};

function asNumber(value: string) {
  const normalized = value.replace(',', '.');
  const numeric = Number(normalized || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeLojaSlug(value?: string): LojaSlug {
  if (value === 'brecho' || value === 'feirao') return value;
  return 'bazar';
}

function formFromCliente(cliente?: ClienteComercial | null) {
  if (!cliente) return emptyClienteForm;

  return {
    nome: cliente.nome || '',
    telefone: cliente.telefone || '',
    cpf: cliente.cpf || '',
    email: cliente.email || '',
    endereco: cliente.endereco || '',
    dataNascimento: cliente.dataNascimento || '',
    observacoes: cliente.observacoes || '',
  };
}

function formFromProduto(produto?: ProdutoLoja | null) {
  if (!produto) return emptyProdutoForm;

  return {
    nome: produto.nome || '',
    categoria: produto.categoria || '',
    preco: String(produto.preco || ''),
  };
}

function isRetiradaPayload(payload: unknown): payload is RetiradaLoja {
  if (!payload || typeof payload !== 'object') return false;
  const retirada = payload as Partial<RetiradaLoja>;
  return Boolean(retirada.id && retirada.comandaId && retirada.lojaSlug && retirada.codigo);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function showOperationalReceipt(message: string, type: 'success' | 'info' = 'success') {
  window.showToast?.(message, type);
}

type LojasStoreMode = 'operacao' | 'produtos' | 'historico';

const LojasStorePage = ({ mode = 'operacao' }: { mode?: LojasStoreMode }) => {
  const { lojaSlug: rawLojaSlug } = useParams();
  const lojaSlug = normalizeLojaSlug(rawLojaSlug);
  const loja = lojaInfo[lojaSlug];
  const { currentUser } = useAuth();
  const canOpenSecretaria = Boolean(
    currentUser && ['gestora', 'equipe_tecnica'].includes(currentUser.role),
  );

  const [reload, setReload] = useState(0);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClienteComercial | null>(null);
  const [clienteForm, setClienteForm] = useState(emptyClienteForm);
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProdutoLoja | null>(null);
  const [produtoForm, setProdutoForm] = useState(emptyProdutoForm);
  const [activeClient, setActiveClient] = useState<ClienteComercial | null>(null);
  const [comandaModalOpen, setComandaModalOpen] = useState(false);
  const [activeComanda, setActiveComanda] = useState<ComandaDetalhe | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [retiradaNotifications, setRetiradaNotifications] = useState<RetiradaLoja[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProductsPage = mode === 'produtos';
  const isHistoryPage = mode === 'historico';

  const { data: produtos } = useProdutosLoja(lojaSlug, reload);
  const { data: clientes, loading: loadingClientes } = useClientesComerciais(clienteSearch, reload);
  const { data: comandasAtivas } = useComandasComerciais({ status: 'ativas', lojaSlug }, reload);
  const { data: retiradasPendentes } = useRetiradasLoja(
    { lojaSlug, status: 'pendentes' },
    reload,
  );

  const refreshRealtime = useCallback((event?: LojasRealtimeEvent) => {
    setReload((value) => value + 1);

    if (event?.name === 'lojas:retirada-atualizada' && isRetiradaPayload(event.payload)) {
      const retirada = event.payload;
      if (retirada.lojaSlug !== lojaSlug) return;

      setRetiradaNotifications((current) => {
        if (retirada.status !== 'aguardando_retirada') {
          return current.filter((item) => item.id !== retirada.id);
        }

        return [
          retirada,
          ...current.filter((item) => item.id !== retirada.id),
        ].slice(0, 5);
      });
    }
  }, [lojaSlug]);

  useLojasRealtime(refreshRealtime);

  useEffect(() => {
    if (!activeComanda?.id || !comandaModalOpen) return;

    getComandaComercial(activeComanda.id, lojaSlug)
      .then(setActiveComanda)
      .catch(() => undefined);
  }, [reload, activeComanda?.id, comandaModalOpen, lojaSlug]);

  const storeStats = useMemo(() => {
    const itens = comandasAtivas.reduce((sum, comanda) => sum + Number(comanda.itensLoja ?? comanda.itens), 0);
    return {
      comandas: comandasAtivas.length,
      itens,
      produtos: produtos.length,
    };
  }, [comandasAtivas, produtos.length]);

  const openClienteModal = (cliente?: ClienteComercial) => {
    setEditingClient(cliente || null);
    setClienteForm(formFromCliente(cliente || null));
    setError(null);
    setClienteModalOpen(true);
  };

  const closeClienteModal = () => {
    setClienteModalOpen(false);
    setEditingClient(null);
    setClienteForm(emptyClienteForm);
  };

  const handleClienteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isEditingClient = Boolean(editingClient);

    if (!clienteForm.nome.trim()) {
      setError('Nome do cliente é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = editingClient
        ? await updateClienteComercial(editingClient.id, clienteForm)
        : await createClienteComercial(clienteForm);

      setClienteSearch(saved.nome);
      setReload((value) => value + 1);
      closeClienteModal();

      if (isEditingClient) {
        showOperationalReceipt('Cliente atualizado.');
      } else {
        await openComanda(saved);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar o cliente.'));
    } finally {
      setSaving(false);
    }
  };

  const openProdutoModal = (produto?: ProdutoLoja) => {
    setEditingProduct(produto || null);
    setProdutoForm(formFromProduto(produto || null));
    setError(null);
    setProdutoModalOpen(true);
  };

  const closeProdutoModal = () => {
    setProdutoModalOpen(false);
    setEditingProduct(null);
    setProdutoForm(emptyProdutoForm);
  };

  const handleProdutoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const preco = asNumber(produtoForm.preco);
    const isEditingProduct = Boolean(editingProduct);

    if (!produtoForm.nome.trim()) {
      setError('Nome do produto é obrigatório.');
      return;
    }

    if (preco <= 0) {
      setError('Preço do produto deve ser maior que zero.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingProduct) {
        await updateProdutoLoja(editingProduct.id, {
          nome: produtoForm.nome,
          categoria: produtoForm.categoria,
          preco,
        });
      } else {
        await createProdutoLoja({
          lojaSlug,
          nome: produtoForm.nome,
          categoria: produtoForm.categoria,
          preco,
        });
      }

      setReload((value) => value + 1);
      closeProdutoModal();
      showOperationalReceipt(isEditingProduct ? 'Produto atualizado no estoque.' : 'Produto cadastrado no estoque.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar o produto.'));
    } finally {
      setSaving(false);
    }
  };

  const openComanda = async (cliente: ClienteComercial) => {
    setSaving(true);
    setError(null);

    try {
      setActiveClient(cliente);
      const comanda = await createComandaComercial({
        clienteId: cliente.id,
        criadaPor: currentUser?.displayName || loja.nome,
      });
      setActiveComanda(comanda);
      setComandaModalOpen(true);
      setReload((value) => value + 1);
      showOperationalReceipt(`Comanda ${comanda.codigo} aberta.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível abrir a comanda.'));
    } finally {
      setSaving(false);
    }
  };

  const closeComandaModal = () => {
    setComandaModalOpen(false);
    setActiveClient(null);
    setActiveComanda(null);
    setItemForm(emptyItemForm);
  };

  const openExistingComanda = async (comanda: ComandaResumo) => {
    setSaving(true);
    setError(null);

    try {
      const detail = await getComandaComercial(comanda.id, lojaSlug);
      setActiveClient(null);
      setActiveComanda(detail);
      setComandaModalOpen(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível abrir a comanda.'));
    } finally {
      setSaving(false);
    }
  };

  const handleProductChange = (produtoId: string) => {
    const produto = produtos.find((item) => item.id === produtoId);
    setItemForm((current) => ({
      ...current,
      produtoId,
      descricao: produto?.nome || '',
      categoria: produto?.categoria || '',
      valorUnitario: produto ? String(produto.preco) : '',
    }));
  };

  const addItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeComanda) {
      setError('Abra uma comanda antes de lançar itens.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await addItemComandaComercial(activeComanda.id, {
        lojaSlug,
        produtoId: itemForm.produtoId || undefined,
        descricao: itemForm.descricao,
        categoria: itemForm.categoria,
        quantidade: Math.max(1, Number(itemForm.quantidade || 1)),
        valorUnitario: asNumber(itemForm.valorUnitario),
        desconto: asNumber(itemForm.desconto),
        usuario: currentUser?.displayName || loja.nome,
      });
      setActiveComanda(updated);
      setItemForm(emptyItemForm);
      setReload((value) => value + 1);
      showOperationalReceipt('Item lançado na comanda.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível lançar o item.'));
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!activeComanda) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await removeItemComandaComercial(activeComanda.id, itemId);
      setActiveComanda(updated);
      setReload((value) => value + 1);
      showOperationalReceipt('Item removido da comanda.', 'info');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível remover o item.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmarRetirada = async (retiradaId?: string | null) => {
    if (!retiradaId) return;

    setSaving(true);
    setError(null);

    try {
      await confirmarRetiradaLoja(retiradaId, {
        entreguePor: currentUser?.displayName || loja.nome,
      });
      setRetiradaNotifications((current) => current.filter((item) => item.id !== retiradaId));
      setReload((value) => value + 1);

      if (activeComanda?.id && comandaModalOpen) {
        const detail = await getComandaComercial(activeComanda.id, lojaSlug);
        setActiveComanda(detail);
      }
      showOperationalReceipt('Retirada confirmada.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível confirmar a retirada.'));
    } finally {
      setSaving(false);
    }
  };

  const searchReady = clienteSearch.trim().length >= 2;
  const activeComandaOperavel = Boolean(
    activeComanda && ['aberta', 'aguardando_pagamento'].includes(activeComanda.status),
  );
  const visibleComandaItems = activeComanda?.itens.filter((item) => item.lojaSlug === lojaSlug) ?? [];
  const visibleComandaTotal = visibleComandaItems.reduce((sum, item) => sum + item.total, 0);
  const activeRetirada = activeComanda?.retirada;
  const retiradaPendente = activeRetirada?.status === 'aguardando_retirada';
  const visibleRetiradaNotifications = retiradaNotifications.slice(0, 3);
  const hiddenRetiradaNotifications = Math.max(retiradaNotifications.length - visibleRetiradaNotifications.length, 0);
  const pageTitle = isProductsPage
    ? `Produtos do ${loja.nome}`
    : isHistoryPage
      ? `${loja.nome}: área operacional`
      : loja.nome;
  const pageSubtitle = isProductsPage
    ? 'Cadastre, edite e mantenha a base de produtos usados na criação das comandas.'
    : isHistoryPage
      ? 'Histórico financeiro fica restrito à secretaria. A loja mantém estoque, comanda e retirada.'
      : loja.subtitulo;

  return (
    <main className="page-band commerce-page">
      <PageHeader
        className="commerce-head"
        eyebrow="Lojas"
        title={pageTitle}
        description={pageSubtitle}
        actions={canOpenSecretaria ? (
            <Link className="creche-head-link secondary" to="/lojas/secretaria">
              Secretaria
            </Link>
        ) : null}
      />

      <MetricGrid className="commerce-metrics">
        <MetricCard label="Comandas abertas" value={storeStats.comandas} detail="Com itens desta loja aguardando pagamento" />
        <MetricCard label="Produtos ativos" value={storeStats.produtos} detail="Estoque precificado para lançar comanda" />
        <MetricCard label="Itens lançados" value={storeStats.itens} detail="Somando comandas ativas da loja" />
        <MetricCard label="Aguardando retirada" value={retiradasPendentes.length} detail="Pedidos pagos liberados pela secretaria" tone="warning" />
      </MetricGrid>

      {error ? <p className="commerce-alert">{error}</p> : null}

      {retiradaNotifications.length > 0 ? (
        <section className="finance-notification-stack store-pickup-notification-stack" aria-live="polite" aria-label="Notificações de retirada">
          {hiddenRetiradaNotifications > 0 ? (
            <div className="finance-notification-group">
              <span>
                {hiddenRetiradaNotifications === 1
                  ? 'Mais 1 retirada agrupada'
                  : `Mais ${hiddenRetiradaNotifications} retiradas agrupadas`}
              </span>
              <button onClick={() => setRetiradaNotifications([])} type="button">
                Limpar
              </button>
            </div>
          ) : null}

          {visibleRetiradaNotifications.map((retirada) => (
            <article className="finance-notification-card pickup-notification-card" key={retirada.id}>
              <div className="finance-notification-top">
                <div>
                  <span>Pedido liberado</span>
                  <strong>{retirada.codigo}</strong>
                </div>
                <button
                  aria-label={`Fechar notificação da retirada ${retirada.codigo}`}
                  onClick={() => setRetiradaNotifications((current) => current.filter((item) => item.id !== retirada.id))}
                  type="button"
                >
                  Fechar
                </button>
              </div>
              <div className="finance-notification-body">
                <strong>{retirada.cliente}</strong>
                <span>{retirada.itens} item(ns) liberado(s) pela secretaria</span>
              </div>
              <div className="finance-notification-footer">
                <div>
                  <span>Retirada</span>
                  <strong>Aguardando</strong>
                </div>
                <button onClick={() => confirmarRetirada(retirada.id)} type="button">
                  Confirmar
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {mode === 'operacao' ? (
        <>
          <section className="commerce-store-actions">
            <button className="commerce-primary-action" onClick={() => openClienteModal()} type="button">
              Novo cliente
            </button>
            <label className="commerce-search-field">
              <span>Buscar cliente</span>
              <input
                onChange={(event) => setClienteSearch(event.target.value)}
                placeholder="Nome, CPF ou telefone"
                value={clienteSearch}
              />
            </label>
          </section>

          <section className="commerce-store-grid commerce-store-grid-focused">
            <article className="commerce-panel commerce-client-panel">
              <div className="commerce-panel-title">
                <div>
                  <h2>Clientes encontrados</h2>
                  <span>Selecione um cliente para abrir a comanda única.</span>
                </div>
              </div>

              <div className="commerce-client-results refined">
                {!searchReady ? (
                  <div className="commerce-empty-state compact">
                    <strong>Busque para listar clientes</strong>
                    <span>A lista permanece limpa até você pesquisar, evitando uma relação infinita na operação.</span>
                  </div>
                ) : null}

                {searchReady && loadingClientes ? <p className="institutional-note">Buscando clientes...</p> : null}

                {searchReady && !loadingClientes && !clientes.length ? (
                  <div className="commerce-empty-state compact">
                    <strong>Nenhum cliente encontrado</strong>
                    <span>Cadastre o cliente pelo botão acima e abra a comanda em seguida.</span>
                  </div>
                ) : null}

                {clientes.slice(0, 8).map((cliente) => (
                  <div className="commerce-client-card" key={cliente.id}>
                    <button onClick={() => openComanda(cliente)} type="button">
                      <strong>{cliente.nome}</strong>
                      <span>{cliente.telefone || 'Sem telefone'} · {cliente.compras} compra(s)</span>
                      <small>
                        {cliente.cpf || 'CPF não informado'}
                        {cliente.endereco ? ` · ${cliente.endereco}` : ''}
                      </small>
                    </button>
                    <button className="commerce-edit-client" onClick={() => openClienteModal(cliente)} type="button">
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </article>

            <aside className="commerce-side-stack">
              <article className="commerce-panel commerce-pickup-panel">
                <div className="commerce-panel-title">
                  <div>
                    <h2>Retiradas liberadas</h2>
                    <span>Comandas pagas pela secretaria aguardando entrega ao cliente.</span>
                  </div>
                  <strong>{retiradasPendentes.length}</strong>
                </div>
                <div className="commerce-pickup-list">
                  {retiradasPendentes.slice(0, 5).map((retirada) => (
                    <div className="commerce-pickup-row" key={retirada.id}>
                      <button onClick={() => openExistingComanda({ id: retirada.comandaId } as ComandaResumo)} type="button">
                        <strong>{retirada.codigo} · {retirada.cliente}</strong>
                        <span>{retirada.itens} item(ns) liberado(s) para entrega</span>
                      </button>
                      <button onClick={() => confirmarRetirada(retirada.id)} type="button">
                        Retirado
                      </button>
                    </div>
                  ))}
                  {!retiradasPendentes.length ? (
                    <p className="institutional-note">Nenhum pedido liberado para retirada.</p>
                  ) : null}
                </div>
              </article>

              <article className="commerce-panel">
                <div className="commerce-panel-title">
                  <div>
                    <h2>Comandas da loja</h2>
                    <span>Atualização em tempo real por movimentação de comanda.</span>
                  </div>
                </div>
                <div className="commerce-command-list">
                  {comandasAtivas.map((comanda) => (
                    <button
                      key={comanda.id}
                      onClick={() => openExistingComanda(comanda)}
                      type="button"
                    >
                      <strong>{comanda.codigo} · {comanda.cliente}</strong>
                      <span>{loja.nome}</span>
                      <em>{Number(comanda.itensLoja ?? comanda.itens)} item(ns)</em>
                    </button>
                  ))}
                  {!comandasAtivas.length ? (
                    <p className="institutional-note">Nenhuma comanda ativa desta loja.</p>
                  ) : null}
                </div>
              </article>
            </aside>
          </section>
        </>
      ) : null}

      {isProductsPage ? (
        <section className="commerce-panel commerce-dedicated-panel">
          <div className="commerce-panel-title">
            <div>
              <h2>Produtos cadastrados</h2>
              <span>Itens de referência para acelerar o lançamento das comandas.</span>
            </div>
            <button className="commerce-primary-action compact-action" onClick={() => openProdutoModal()} type="button">
              Novo produto
            </button>
          </div>

          <div className="commerce-product-list commerce-product-list-wide">
            {produtos.map((produto) => (
              <button key={produto.id} onClick={() => openProdutoModal(produto)} type="button">
                <span>
                  <strong>{produto.nome}</strong>
                  <small>{produto.categoria || 'Diversos'}</small>
                </span>
                <em>{currency.format(produto.preco)}</em>
              </button>
            ))}
            {!produtos.length ? (
              <div className="commerce-empty-state compact">
                <strong>Nenhum produto cadastrado</strong>
                <span>Cadastre produtos recorrentes para acelerar o lançamento na comanda.</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {isHistoryPage ? (
        <section className="commerce-panel commerce-dedicated-panel">
          <div className="commerce-panel-title">
            <div>
              <h2>Histórico financeiro restrito</h2>
              <span>A secretaria financeira acompanha período, realizado, pendências e desistências.</span>
            </div>
            <strong>Protegido</strong>
          </div>
          <p className="institutional-note">
            A loja não acessa relatórios nem totais de vendas. Use a operação principal para lançar itens,
            consultar produtos e confirmar retiradas.
          </p>
        </section>
      ) : null}

      {clienteModalOpen ? (
        <div className="commerce-modal-overlay" role="presentation">
          <div className="commerce-modal commerce-client-modal" role="dialog" aria-modal="true">
            <div className="commerce-modal-head">
              <div>
                <span>Cliente comercial</span>
                <h2>{editingClient ? 'Editar cliente' : 'Novo cliente'}</h2>
              </div>
              <button onClick={closeClienteModal} type="button">Fechar</button>
            </div>

            <form className="commerce-form" onSubmit={handleClienteSubmit}>
              <div className="commerce-form-grid">
                <label>
                  <span>Nome</span>
                  <input
                    autoFocus
                    onChange={(event) => setClienteForm((current) => ({ ...current, nome: event.target.value }))}
                    value={clienteForm.nome}
                  />
                </label>
                <label>
                  <span>CPF para evitar duplicidade</span>
                  <input
                    onChange={(event) => setClienteForm((current) => ({ ...current, cpf: event.target.value }))}
                    placeholder="Opcional, mas recomendado"
                    value={clienteForm.cpf}
                  />
                </label>
                <label>
                  <span>Data de nascimento</span>
                  <input
                    onChange={(event) => setClienteForm((current) => ({ ...current, dataNascimento: event.target.value }))}
                    type="date"
                    value={clienteForm.dataNascimento}
                  />
                </label>
                <label>
                  <span>Telefone</span>
                  <input
                    onChange={(event) => setClienteForm((current) => ({ ...current, telefone: event.target.value }))}
                    value={clienteForm.telefone}
                  />
                </label>
                <label className="wide">
                  <span>Endereço</span>
                  <input
                    onChange={(event) => setClienteForm((current) => ({ ...current, endereco: event.target.value }))}
                    value={clienteForm.endereco}
                  />
                </label>
                <label className="wide">
                  <span>Observações</span>
                  <input
                    onChange={(event) => setClienteForm((current) => ({ ...current, observacoes: event.target.value }))}
                    value={clienteForm.observacoes}
                  />
                </label>
              </div>

              <div className="commerce-modal-actions">
                <button className="report-button secondary" onClick={closeClienteModal} type="button">
                  Cancelar
                </button>
                <button className="institutional-button" disabled={saving || !clienteForm.nome.trim()} type="submit">
                  {editingClient ? 'Salvar alterações' : 'Salvar e abrir comanda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {produtoModalOpen ? (
        <div className="commerce-modal-overlay" role="presentation">
          <div className="commerce-modal commerce-product-modal" role="dialog" aria-modal="true">
            <div className="commerce-modal-head">
              <div>
                <span>Produto da loja</span>
                <h2>{editingProduct ? 'Editar produto' : 'Novo produto'}</h2>
              </div>
              <button onClick={closeProdutoModal} type="button">Fechar</button>
            </div>

            <form className="commerce-form" onSubmit={handleProdutoSubmit}>
              <div className="commerce-form-grid">
                <label>
                  <span>Nome</span>
                  <input
                    autoFocus
                    onChange={(event) => setProdutoForm((current) => ({ ...current, nome: event.target.value }))}
                    value={produtoForm.nome}
                  />
                </label>
                <label>
                  <span>Categoria</span>
                  <input
                    onChange={(event) => setProdutoForm((current) => ({ ...current, categoria: event.target.value }))}
                    placeholder="Vestuário, higiene, livro, casa..."
                    value={produtoForm.categoria}
                  />
                </label>
                <label className="wide">
                  <span>Preço de referência</span>
                  <input
                    onChange={(event) => setProdutoForm((current) => ({ ...current, preco: event.target.value }))}
                    placeholder="0,00"
                    value={produtoForm.preco}
                  />
                </label>
              </div>

              <div className="commerce-modal-actions">
                <button className="report-button secondary" onClick={closeProdutoModal} type="button">
                  Cancelar
                </button>
                <button
                  className="institutional-button"
                  disabled={saving || !produtoForm.nome.trim() || asNumber(produtoForm.preco) <= 0}
                  type="submit"
                >
                  {editingProduct ? 'Salvar produto' : 'Cadastrar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {comandaModalOpen ? (
        <div className="commerce-modal-overlay" role="presentation">
          <div className="commerce-modal commerce-command-modal" role="dialog" aria-modal="true">
            <div className="commerce-modal-head">
              <div>
                <span>{activeComanda?.codigo || 'Comanda'}</span>
                <h2>{activeClient?.nome || activeComanda?.cliente || 'Cliente'}</h2>
              </div>
              <button onClick={closeComandaModal} type="button">Fechar</button>
            </div>

            <section className="commerce-command-summary">
              <article>
                <span>Itens da loja</span>
                <strong>{visibleComandaItems.length}</strong>
              </article>
              <article>
                <span>Subtotal operacional</span>
                <strong>{currency.format(visibleComandaTotal)}</strong>
              </article>
              <article>
                <span>Status</span>
                <strong>{activeComanda ? statusLabel[activeComanda.status] : '-'}</strong>
              </article>
            </section>

            {activeRetirada ? (
              <section className={`commerce-pickup-status ${retiradaPendente ? 'pending' : 'done'}`}>
                <div>
                  <span>Retirada da loja</span>
                  <strong>{retiradaPendente ? 'Aguardando retirada' : 'Pedido retirado'}</strong>
                  <small>
                    {retiradaPendente
                      ? 'Pagamento confirmado pela secretaria. Entregue os itens e confirme a retirada.'
                      : `${activeRetirada.entreguePor || 'Loja'} confirmou em ${activeRetirada.retiradaEm || 'data não informada'}.`}
                  </small>
                </div>
                {retiradaPendente ? (
                  <button disabled={saving} onClick={() => confirmarRetirada(activeRetirada.id)} type="button">
                    Confirmar retirada
                  </button>
                ) : null}
              </section>
            ) : null}

            {activeComandaOperavel ? (
              <form className="commerce-form" onSubmit={addItem}>
                <div className="commerce-form-grid commerce-form-grid-compact">
                  <label>
                    <span>Produto base</span>
                    <select onChange={(event) => handleProductChange(event.target.value)} value={itemForm.produtoId}>
                      <option value="">Item avulso</option>
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} · {currency.format(produto.preco)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Descrição</span>
                    <input
                      onChange={(event) => setItemForm((current) => ({ ...current, descricao: event.target.value }))}
                      value={itemForm.descricao}
                    />
                  </label>
                  <label>
                    <span>Categoria</span>
                    <input
                      onChange={(event) => setItemForm((current) => ({ ...current, categoria: event.target.value }))}
                      value={itemForm.categoria}
                    />
                  </label>
                  <label>
                    <span>Quantidade</span>
                    <input
                      min="1"
                      onChange={(event) => setItemForm((current) => ({ ...current, quantidade: event.target.value }))}
                      type="number"
                      value={itemForm.quantidade}
                    />
                  </label>
                  <label>
                    <span>Valor unitário</span>
                    <input
                      onChange={(event) => setItemForm((current) => ({ ...current, valorUnitario: event.target.value }))}
                      placeholder="0,00"
                      value={itemForm.valorUnitario}
                    />
                  </label>
                  <label>
                    <span>Desconto</span>
                    <input
                      onChange={(event) => setItemForm((current) => ({ ...current, desconto: event.target.value }))}
                      placeholder="0,00"
                      value={itemForm.desconto}
                    />
                  </label>
                </div>
                <button className="institutional-button" disabled={saving || !activeComanda} type="submit">
                  Lançar item na comanda
                </button>
              </form>
            ) : (
              <div className="commerce-empty-state compact">
                <strong>Comanda encerrada</strong>
                <span>Os dados ficam disponíveis apenas para conferência do histórico da loja.</span>
              </div>
            )}

            <div className="commerce-items-list commerce-modal-items">
              {visibleComandaItems.map((item) => (
                <div className="commerce-item-row" key={item.id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>{item.loja} · {item.quantidade} x {currency.format(item.valorUnitario)}</span>
                  </div>
                  <div>
                    <strong>{currency.format(item.total)}</strong>
                    {item.lojaSlug === lojaSlug && activeComandaOperavel ? (
                      <button onClick={() => removeItem(item.id)} type="button">
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!visibleComandaItems.length ? (
                <div className="commerce-empty-state compact">
                  <strong>Nenhum item desta loja</strong>
                  <span>A secretaria receberá a comanda para conferência após o primeiro lançamento.</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default LojasStorePage;
