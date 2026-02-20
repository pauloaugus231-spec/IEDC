import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FotoUpload from './FotoUpload';
import './EditarPessoaModal.css';

interface EditarPessoaModalProps {
  pessoa: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

type TabType = 'pessoal' | 'endereco' | 'saude';

const EditarPessoaModal: React.FC<EditarPessoaModalProps> = ({ pessoa, onClose, onSave }) => {
  const [form, setForm] = useState({ ...pessoa });
  const [originalForm] = useState({ ...pessoa }); // Para detectar mudanças
  const [activeTab, setActiveTab] = useState<TabType>('pessoal');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // --- MÁSCARAS ---
  const masks = {
    cpf: (value: string) => {
      const nums = value.replace(/\D/g, '').substring(0, 11);
      return nums.replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    },
    phone: (value: string) => {
      const nums = value.replace(/\D/g, '').substring(0, 11);
      if (nums.length <= 10) {
        return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
      }
      return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    },
    cep: (value: string) => {
      const nums = value.replace(/\D/g, '').substring(0, 8);
      return nums.replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  // --- VALIDAÇÕES ---
  const validations: Record<string, (value: string) => string> = {
    cpf: (value) => {
      const nums = value.replace(/\D/g, '');
      if (nums && nums.length !== 11) return 'CPF deve ter 11 dígitos';
      return '';
    },
    cep: (value) => {
      const nums = value.replace(/\D/g, '');
      if (nums && nums.length !== 8) return 'CEP deve ter 8 dígitos';
      return '';
    },
    nome: (value) => {
      if (!value?.trim()) return 'Nome é obrigatório';
      if (value.trim().length < 3) return 'Nome muito curto';
      return '';
    }
  };

  const getFieldError = (name: string) => {
    if (!touched[name]) return '';
    const validate = validations[name];
    return validate ? validate(form[name] || '') : '';
  };

  // --- HANDLERS ---
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cpf') finalValue = masks.cpf(value);
    if (name === 'telefone' || name === 'telefone_emergencia') finalValue = masks.phone(value);
    if (name === 'cep') finalValue = masks.cep(value);

    setForm((prev: any) => ({ ...prev, [name]: finalValue }));
  }, []);

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  // --- BUSCA CEP ---
  const handleCepBlur = async () => {
    handleBlur('cep');
    const cepLimpo = form.cep?.replace(/\D/g, '');
    if (cepLimpo?.length === 8) {
      setLoadingCep(true);
      setCepError('');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError('CEP não encontrado');
        } else {
          setForm((prev: any) => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf
          }));
        }
      } catch {
        setCepError('Erro ao buscar CEP');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // --- DETECTAR MUDANÇAS ---
  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

  // --- PROGRESSO DAS TABS ---
  const getTabProgress = (tab: TabType): { filled: number; total: number } => {
    const fields: Record<TabType, string[]> = {
      pessoal: ['nome', 'nome_social', 'cpf', 'rg', 'data_nascimento', 'genero', 'nome_mae', 'nome_pai'],
      endereco: ['cep', 'endereco', 'cidade', 'uf', 'naturalidade', 'telefone', 'telefone_emergencia', 'contato_emergencia'],
      saude: ['medicamentos_uso_continuo', 'alergias', 'condicoes_cronicas', 'observacoes']
    };
    const tabFields = fields[tab];
    const filled = tabFields.filter(f => form[f] && String(form[f]).trim()).length;
    return { filled, total: tabFields.length };
  };

  // --- FECHAR COM CONFIRMAÇÃO ---
  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('Você tem alterações não salvas. Deseja sair mesmo assim?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const nomeError = validations.nome(form.nome || '');
    if (nomeError) {
      setTouched(prev => ({ ...prev, nome: true }));
      setActiveTab('pessoal');
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const getNomeExibicao = () => form.nome_social?.trim() || form.nome || 'Sem nome';

  // --- KEYBOARD NAVIGATION ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges]);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header-custom">
          <div className="header-info">
            <h2>✏️ Editar Cadastro</h2>
            <div className="user-badge">
              {form.lgbt && <span className="lgbt-icon" title="LGBT+">🏳️‍🌈</span>}
              <strong>{getNomeExibicao()}</strong>
              <span className="name-type">
                {form.nome_social?.trim() ? '(Nome Social)' : '(Nome Civil)'}
              </span>
              {hasChanges && <span className="unsaved-badge">● Não salvo</span>}
            </div>
          </div>
          <button type="button" className="close-btn" onClick={handleClose} title="Fechar (Esc)">×</button>
        </div>

        {/* TABS */}
        <div className="modal-tabs">
          {(['pessoal', 'endereco', 'saude'] as TabType[]).map(tab => {
            const progress = getTabProgress(tab);
            const labels = { pessoal: '👤 Pessoal', endereco: '📍 Endereço', saude: '🏥 Saúde' };
            return (
              <button 
                key={tab}
                type="button"
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {labels[tab]}
                <span className="tab-progress">{progress.filled}/{progress.total}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="modal-form-body">
          
          {/* ABA PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="tab-content">
              <div className="form-section-layout">
                <div className="photo-section">
                  <FotoUpload
                    pessoaId={pessoa.id}
                    fotoUrl={form.foto_url}
                    onFotoUpdate={(url) => setForm((prev: any) => ({ ...prev, foto_url: url }))}
                  />
                  <p className="photo-hint">📷 Clique para alterar</p>
                </div>

                <div className="fields-grid">
                  <div className={`form-group full-width ${getFieldError('nome') ? 'has-error' : ''}`}>
                    <label>Nome Civil <span className="required">*</span></label>
                    <input 
                      name="nome" 
                      value={form.nome || ''} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('nome')}
                      required 
                    />
                    {getFieldError('nome') && <span className="error-text">{getFieldError('nome')}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label>Nome Social <span className="badge-optional">Opcional</span></label>
                    <input 
                      name="nome_social" 
                      value={form.nome_social || ''} 
                      onChange={handleChange} 
                      placeholder="Como prefere ser chamado(a)"
                      className="input-highlight"
                    />
                    <span className="field-hint">Será usado como nome de exibição</span>
                  </div>

                  <div className="form-group">
                    <label>Data Nascimento</label>
                    <input 
                      type="date" 
                      name="data_nascimento" 
                      value={form.data_nascimento ? form.data_nascimento.slice(0,10) : ''} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="form-group">
                    <label>Gênero</label>
                    <select name="genero" value={form.genero || ''} onChange={handleChange}>
                      <option value="">Selecione...</option>
                      <option value="Homem cisgênero">Homem cisgênero</option>
                      <option value="Mulher cisgênero">Mulher cisgênero</option>
                      <option value="Mulher transgênero">Mulher transgênero</option>
                      <option value="Homem transgênero">Homem transgênero</option>
                      <option value="Travesti">Travesti</option>
                      <option value="Não binário">Não binário</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className={`form-group ${getFieldError('cpf') ? 'has-error' : ''}`}>
                    <label>CPF</label>
                    <input 
                      name="cpf" 
                      value={form.cpf || ''} 
                      onChange={handleChange}
                      onBlur={() => handleBlur('cpf')}
                      placeholder="000.000.000-00" 
                    />
                    {getFieldError('cpf') && <span className="error-text">{getFieldError('cpf')}</span>}
                  </div>

                  <div className="form-group">
                    <label>RG</label>
                    <input name="rg" value={form.rg || ''} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Nome da Mãe</label>
                    <input name="nome_mae" value={form.nome_mae || ''} onChange={handleChange} />
                  </div>

                  <div className="form-group">
                    <label>Nome do Pai</label>
                    <input name="nome_pai" value={form.nome_pai || ''} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA ENDEREÇO */}
          {activeTab === 'endereco' && (
            <div className="tab-content">
              <div className="fields-grid">
                <div className={`form-group ${cepError ? 'has-error' : ''}`}>
                  <label>
                    CEP 
                    {loadingCep && <span className="loading-spinner">⏳</span>}
                  </label>
                  <div className="input-with-action">
                    <input 
                      name="cep" 
                      value={form.cep || ''} 
                      onChange={handleChange} 
                      onBlur={handleCepBlur}
                      placeholder="00000-000" 
                    />
                    <span className="input-icon">🔍</span>
                  </div>
                  {cepError && <span className="error-text">{cepError}</span>}
                  <span className="field-hint">Preenche endereço automaticamente</span>
                </div>

                <div className="form-group span-3">
                  <label>Endereço / Logradouro</label>
                  <input name="endereco" value={form.endereco || ''} onChange={handleChange} />
                </div>

                <div className="form-group span-2">
                  <label>Cidade</label>
                  <input name="cidade" value={form.cidade || ''} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>UF</label>
                  <input 
                    name="uf" 
                    value={form.uf || ''} 
                    onChange={handleChange} 
                    maxLength={2} 
                    style={{ textTransform: 'uppercase' }} 
                  />
                </div>

                <div className="form-group">
                  <label>Naturalidade</label>
                  <input name="naturalidade" value={form.naturalidade || ''} onChange={handleChange} />
                </div>

                <div className="section-divider full-width">
                  <span>📞 Contatos</span>
                </div>

                <div className="form-group">
                  <label>Telefone Pessoal</label>
                  <input 
                    name="telefone" 
                    value={form.telefone || ''} 
                    onChange={handleChange} 
                    placeholder="(00) 00000-0000" 
                  />
                </div>

                <div className="form-group">
                  <label>Telefone Emergência</label>
                  <input 
                    name="telefone_emergencia" 
                    value={form.telefone_emergencia || ''} 
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-group span-2">
                  <label>Nome do Contato de Emergência</label>
                  <input name="contato_emergencia" value={form.contato_emergencia || ''} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {/* ABA SAÚDE */}
          {activeTab === 'saude' && (
            <div className="tab-content">
              <div className="health-grid">
                <div className="health-card warning">
                  <label>⚠️ Alergias</label>
                  <textarea 
                    name="alergias" 
                    value={form.alergias || ''} 
                    onChange={handleChange} 
                    rows={2}
                    placeholder="Medicamentos, alimentos, substâncias..."
                  />
                </div>

                <div className="health-card info">
                  <label>💊 Medicamentos de Uso Contínuo</label>
                  <textarea 
                    name="medicamentos_uso_continuo" 
                    value={form.medicamentos_uso_continuo || ''} 
                    onChange={handleChange} 
                    rows={3}
                    placeholder="Nome do medicamento, dosagem e horários..."
                  />
                </div>

                <div className="health-card">
                  <label>🏥 Condições Crônicas</label>
                  <textarea 
                    name="condicoes_cronicas" 
                    value={form.condicoes_cronicas || ''} 
                    onChange={handleChange} 
                    rows={2}
                    placeholder="Diabetes, hipertensão, etc..."
                  />
                </div>

                <div className="health-card notes">
                  <label>📝 Observações Gerais</label>
                  <textarea 
                    name="observacoes" 
                    value={form.observacoes || ''} 
                    onChange={handleChange} 
                    rows={4}
                    placeholder="Anotações importantes da equipe..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={saving || !hasChanges}
            >
              {saving ? '⏳ Salvando...' : '✓ Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPessoaModal;
