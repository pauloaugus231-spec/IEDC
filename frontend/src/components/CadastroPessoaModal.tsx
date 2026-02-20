import { useState, useMemo } from 'react';
import './CadastroPessoaModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (pessoa: any) => void;
}

const CadastroPessoaModal = ({ open, onClose, onSuccess }: Props) => {
  // --- Estado Unificado do Formulário ---
  const [form, setForm] = useState({
    nome: '', nomeSocial: '', cpf: '', rg: '', dataNascimento: '',
    sexo: '', genero: '', cor: '', raca: '', sexualidade: '',
    telefone: '', endereco: '', cep: '', cidade: '', uf: '', naturalidade: '',
    nomeMae: '', nomePai: '', contatoEmergencia: '', telefoneEmergencia: '',
    alergias: '', condicoesCronicas: '', medicamentos: '', observacoes: ''
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Foto
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  // --- Máscaras ---
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

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'cpf') finalValue = masks.cpf(value);
    if (name === 'telefone' || name === 'telefoneEmergencia') finalValue = masks.phone(value);
    if (name === 'cep') finalValue = masks.cep(value);

    setForm(prev => ({ ...prev, [name]: finalValue }));
    // Limpa erro do campo quando usuário digita
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // --- Busca CEP ---
  const handleCepBlur = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf
          }));
        }
      } catch (e) {
        console.error('Erro ao buscar CEP:', e);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // --- Validação por Step ---
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };

  // --- Foto ---
  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. Máximo 5MB.');
        return;
      }
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  // --- Progresso ---
  const stepProgress = useMemo(() => {
    const fields = {
      1: ['nome', 'cpf', 'sexo', 'genero', 'dataNascimento', 'cor'],
      2: ['cep', 'endereco', 'cidade', 'uf', 'telefone', 'nomeMae', 'contatoEmergencia'],
      3: ['medicamentos', 'condicoesCronicas', 'alergias', 'observacoes']
    };
    
    const getProgress = (stepNum: number) => {
      const stepFields = fields[stepNum as keyof typeof fields];
      const filled = stepFields.filter(f => form[f as keyof typeof form]?.trim()).length;
      return Math.round((filled / stepFields.length) * 100);
    };

    return { 1: getProgress(1), 2: getProgress(2), 3: getProgress(3) };
  }, [form]);

  // --- Submit ---
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        nome_social: form.nomeSocial || undefined,
        cpf: form.cpf,
        rg: form.rg || undefined,
        data_nascimento: form.dataNascimento || undefined,
        sexo: form.sexo,
        genero: form.genero || undefined,
        cor: form.cor || undefined,
        raca: form.raca || undefined,
        sexualidade: form.sexualidade || undefined,
        telefone: form.telefone || undefined,
        endereco: form.endereco || undefined,
        cidade: form.cidade || undefined,
        uf: form.uf || undefined,
        cep: form.cep || undefined,
        naturalidade: form.naturalidade || undefined,
        nome_mae: form.nomeMae || undefined,
        nome_pai: form.nomePai || undefined,
        contato_emergencia: form.contatoEmergencia || undefined,
        telefone_emergencia: form.telefoneEmergencia || undefined,
        alergias: form.alergias || undefined,
        condicoes_cronicas: form.condicoesCronicas || undefined,
        medicamentos_uso_continuo: form.medicamentos || undefined,
        observacoes: form.observacoes || undefined,
        tipo_vaga: 'masculina'
      };

      const api = await import('../api');
      const pessoaSalva: any = await api.apiFetch('/api/pessoas', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Upload da foto se houver
      if (fotoFile && pessoaSalva.id) {
        try {
          const formData = new FormData();
          formData.append('file', fotoFile);
          await fetch(`/api/pessoas/${pessoaSalva.id}/foto`, {
            method: 'POST',
            body: formData
          });
        } catch (fotoError) {
          console.error('Erro no upload da foto:', fotoError);
        }
      }

      // Reset form
      setForm({
        nome: '', nomeSocial: '', cpf: '', rg: '', dataNascimento: '',
        sexo: '', genero: '', cor: '', raca: '', sexualidade: '',
        telefone: '', endereco: '', cep: '', cidade: '', uf: '', naturalidade: '',
        nomeMae: '', nomePai: '', contatoEmergencia: '', telefoneEmergencia: '',
        alergias: '', condicoesCronicas: '', medicamentos: '', observacoes: ''
      });
      setStep(1);
      setFotoFile(null);
      setFotoPreview(null);

      onSuccess(pessoaSalva);
      onClose();
    } catch (e: any) {
      alert('Erro ao cadastrar: ' + (e.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  // --- Fechar com confirmação ---
  const handleClose = () => {
    const hasData = Object.values(form).some(v => v.trim());
    if (hasData) {
      if (window.confirm('Tem certeza? Os dados não salvos serão perdidos.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!open) return null;

  const getNomeExibicao = () => form.nomeSocial?.trim() || form.nome || 'Novo Cadastro';

  return (
    <div className="cadastro-overlay" onClick={handleClose}>
      <div className="cadastro-container" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="cadastro-header">
          <div className="header-title">
            <h2>📋 {getNomeExibicao()}</h2>
            {form.nomeSocial && <span className="nome-social-badge">Nome Social</span>}
          </div>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {/* WIZARD STEPS */}
        <div className="wizard-steps">
          {[
            { num: 1, label: 'Identificação', icon: '👤' },
            { num: 2, label: 'Localização', icon: '📍' },
            { num: 3, label: 'Saúde', icon: '🏥' }
          ].map((s, i) => (
            <div key={s.num} className="step-wrapper">
              <div 
                className={`step-item ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
                onClick={() => step > s.num && setStep(s.num)}
              >
                <div className="step-circle">
                  {step > s.num ? '✓' : s.icon}
                </div>
                <span className="step-label">{s.label}</span>
                <span className="step-progress">{stepProgress[s.num as 1|2|3]}%</span>
              </div>
              {i < 2 && <div className={`step-line ${step > s.num ? 'completed' : ''}`} />}
            </div>
          ))}
        </div>

        {/* PROGRESS BAR */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
        </div>

        {/* FORM BODY */}
        <div className="cadastro-body">
          
          {/* STEP 1: IDENTIFICAÇÃO */}
          {step === 1 && (
            <div className="step-content">
              <div className="form-grid">
                <div className={`form-group full-width ${errors.nome ? 'has-error' : ''}`}>
                  <label>Nome Civil Completo <span className="required">*</span></label>
                  <input 
                    name="nome" 
                    value={form.nome} 
                    onChange={handleChange}
                    placeholder="Nome completo de registro"
                  />
                  {errors.nome && <span className="error-text">{errors.nome}</span>}
                </div>

                <div className="form-group full-width highlight-field">
                  <label>Nome Social <span className="optional-badge">Opcional</span></label>
                  <input 
                    name="nomeSocial" 
                    value={form.nomeSocial} 
                    onChange={handleChange}
                    placeholder="Como a pessoa prefere ser chamada"
                  />
                  <span className="field-hint">Será usado como nome principal</span>
                </div>

                <div className={`form-group ${errors.cpf ? 'has-error' : ''}`}>
                  <label>CPF</label>
                  <input 
                    name="cpf" 
                    value={form.cpf} 
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                  />
                  {errors.cpf && <span className="error-text">{errors.cpf}</span>}
                </div>

                <div className="form-group">
                  <label>RG</label>
                  <input name="rg" value={form.rg} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Data Nascimento</label>
                  <input 
                    type="date" 
                    name="dataNascimento" 
                    value={form.dataNascimento} 
                    onChange={handleChange}
                  />
                </div>

                <div className={`form-group ${errors.sexo ? 'has-error' : ''}`}>
                  <label>Sexo</label>
                  <select name="sexo" value={form.sexo} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                  {errors.sexo && <span className="error-text">{errors.sexo}</span>}
                </div>

                <div className="form-group">
                  <label>Gênero</label>
                  <select name="genero" value={form.genero} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    <option value="Homem cisgênero">Homem cisgênero</option>
                    <option value="Mulher cisgênero">Mulher cisgênero</option>
                    <option value="Homem transgênero">Homem transgênero</option>
                    <option value="Mulher transgênero">Mulher transgênero</option>
                    <option value="Travesti">Travesti</option>
                    <option value="Não binário">Não binário</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cor/Raça</label>
                  <select name="cor" value={form.cor} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    <option value="Branca">Branca</option>
                    <option value="Preta">Preta</option>
                    <option value="Parda">Parda</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sexualidade</label>
                  <select name="sexualidade" value={form.sexualidade} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    <option value="Heterossexual">Heterossexual</option>
                    <option value="Homossexual">Homossexual</option>
                    <option value="Bissexual">Bissexual</option>
                    <option value="Assexual">Assexual</option>
                    <option value="Pansexual">Pansexual</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCALIZAÇÃO */}
          {step === 2 && (
            <div className="step-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    CEP 
                    {loadingCep && <span className="loading-spinner">⏳</span>}
                  </label>
                  <input 
                    name="cep" 
                    value={form.cep} 
                    onChange={handleChange}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                  <span className="field-hint">Preenche endereço automaticamente</span>
                </div>

                <div className="form-group span-3">
                  <label>Endereço</label>
                  <input name="endereco" value={form.endereco} onChange={handleChange} />
                </div>

                <div className="form-group span-2">
                  <label>Cidade</label>
                  <input name="cidade" value={form.cidade} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>UF</label>
                  <input 
                    name="uf" 
                    value={form.uf} 
                    onChange={handleChange}
                    maxLength={2}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label>Naturalidade</label>
                  <input name="naturalidade" value={form.naturalidade} onChange={handleChange} />
                </div>

                <div className="section-divider">
                  <span>👨‍👩‍👦 Família e Contatos</span>
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input 
                    name="telefone" 
                    value={form.telefone} 
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-group">
                  <label>Tel. Emergência</label>
                  <input 
                    name="telefoneEmergencia" 
                    value={form.telefoneEmergencia} 
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="form-group span-2">
                  <label>Nome da Mãe</label>
                  <input name="nomeMae" value={form.nomeMae} onChange={handleChange} />
                </div>

                <div className="form-group span-2">
                  <label>Nome do Pai</label>
                  <input name="nomePai" value={form.nomePai} onChange={handleChange} />
                </div>

                <div className="form-group full-width">
                  <label>Contato de Emergência (Nome e parentesco)</label>
                  <input 
                    name="contatoEmergencia" 
                    value={form.contatoEmergencia} 
                    onChange={handleChange}
                    placeholder="Ex: Maria Silva (mãe)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SAÚDE E FOTO */}
          {step === 3 && (
            <div className="step-content">
              <div className="step3-layout">
                {/* Área de Foto */}
                <div className="foto-upload-area">
                  <label className="foto-upload-label">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Preview" className="foto-preview" />
                    ) : (
                      <div className="foto-placeholder">
                        <span className="foto-icon">📷</span>
                        <span>Adicionar Foto</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      hidden 
                      accept="image/*"
                      onChange={handleFotoSelect}
                    />
                  </label>
                  {fotoPreview && (
                    <button 
                      type="button" 
                      className="btn-remove-foto"
                      onClick={() => { setFotoPreview(null); setFotoFile(null); }}
                    >
                      🗑️ Remover
                    </button>
                  )}
                </div>

                {/* Campos de Saúde */}
                <div className="saude-fields">
                  <div className="health-card warning">
                    <label>⚠️ Alergias</label>
                    <textarea 
                      name="alergias" 
                      value={form.alergias} 
                      onChange={handleChange}
                      rows={2}
                      placeholder="Medicamentos, alimentos, substâncias..."
                    />
                  </div>

                  <div className="health-card info">
                    <label>💊 Medicamentos de Uso Contínuo</label>
                    <textarea 
                      name="medicamentos" 
                      value={form.medicamentos} 
                      onChange={handleChange}
                      rows={2}
                      placeholder="Nome, dosagem e horários..."
                    />
                  </div>

                  <div className="health-card">
                    <label>🏥 Condições Crônicas</label>
                    <textarea 
                      name="condicoesCronicas" 
                      value={form.condicoesCronicas} 
                      onChange={handleChange}
                      rows={2}
                      placeholder="Diabetes, hipertensão, etc..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>📝 Observações Gerais</label>
                <textarea 
                  name="observacoes" 
                  value={form.observacoes} 
                  onChange={handleChange}
                  rows={3}
                  placeholder="Informações adicionais importantes..."
                />
              </div>

              {/* Resumo antes de salvar */}
              <div className="summary-card">
                <h4>📋 Resumo do Cadastro</h4>
                <div className="summary-grid">
                  <div><strong>Nome:</strong> {getNomeExibicao()}</div>
                  <div><strong>CPF:</strong> {form.cpf || '-'}</div>
                  <div><strong>Telefone:</strong> {form.telefone || '-'}</div>
                  <div><strong>Cidade:</strong> {form.cidade || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="cadastro-footer">
          {step > 1 ? (
            <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>
              ← Voltar
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
          )}
          
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={handleNext}>
              Próximo →
            </button>
          ) : (
            <button 
              type="button" 
              className="btn-primary btn-success"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '⏳ Salvando...' : '✅ Finalizar Cadastro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CadastroPessoaModal;
