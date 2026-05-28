import './NovoPedidoModal.css';

export type PrioridadePedido = 'Normal' | 'Urgente';

export type NovoPedidoForm = {
  titulo: string;
  descricao: string;
  prioridade: PrioridadePedido;
  solicitante: string;
  setor: string;
};

type NovoPedidoModalProps = {
  form: NovoPedidoForm;
  onChange: (form: NovoPedidoForm) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const setores = [
  'Manutenção',
  'Higiene',
  'Limpeza',
  'Alimentação',
  'Saúde',
  'Administrativo',
];

const NovoPedidoModal = ({ form, onChange, onClose, onSubmit }: NovoPedidoModalProps) => {
  const updateField = (field: keyof NovoPedidoForm, value: string) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="pedido-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="novo-pedido-title">
      <div className="pedido-modal-container">
        <header className="pedido-modal-header">
          <div>
            <span>Centro operacional</span>
            <h2 id="novo-pedido-title">Novo pedido</h2>
            <p>Registre uma demanda interna para acompanhamento da equipe e da coordenação.</p>
          </div>
          <button type="button" className="pedido-close-btn" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </header>

        <div className="pedido-modal-body">
          <div className="pedido-context-card">
            <strong>Uso recomendado</strong>
            <p>
              Use este quadro para demandas operacionais como manutenção, materiais, limpeza,
              compras pequenas e solicitações internas do plantão.
            </p>
          </div>

          <div className="pedido-form-grid">
            <label className="pedido-form-group span-2">
              <span>Título do pedido <em>*</em></span>
              <input
                value={form.titulo}
                onChange={(event) => updateField('titulo', event.target.value)}
                placeholder="Ex.: Manutenção dos chuveiros"
                autoFocus
              />
            </label>

            <label className="pedido-form-group">
              <span>Setor</span>
              <select value={form.setor} onChange={(event) => updateField('setor', event.target.value)}>
                {setores.map((setor) => (
                  <option key={setor} value={setor}>
                    {setor}
                  </option>
                ))}
              </select>
            </label>

            <label className="pedido-form-group">
              <span>Solicitante</span>
              <input
                value={form.solicitante}
                onChange={(event) => updateField('solicitante', event.target.value)}
                placeholder="Nome ou equipe"
              />
            </label>

            <div className="pedido-form-group span-2">
              <span>Prioridade</span>
              <div className="pedido-priority-group">
                {(['Normal', 'Urgente'] as const).map((prioridade) => (
                  <button
                    key={prioridade}
                    type="button"
                    className={form.prioridade === prioridade ? 'active' : ''}
                    onClick={() => updateField('prioridade', prioridade)}
                  >
                    {prioridade}
                  </button>
                ))}
              </div>
            </div>

            <label className="pedido-form-group span-2">
              <span>Descrição</span>
              <textarea
                value={form.descricao}
                onChange={(event) => updateField('descricao', event.target.value)}
                placeholder="Detalhe o local, quantidade, urgência e qualquer informação útil para resolver a demanda."
                rows={4}
              />
            </label>
          </div>
        </div>

        <footer className="pedido-modal-footer">
          <button type="button" className="pedido-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="pedido-btn-primary" onClick={onSubmit} disabled={!form.titulo.trim()}>
            Criar pedido
          </button>
        </footer>
      </div>
    </div>
  );
};

export default NovoPedidoModal;
