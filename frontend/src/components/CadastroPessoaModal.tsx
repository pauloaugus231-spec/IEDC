import { useState, useMemo } from 'react';
import { apiFetch, withAuthHeaders } from '../api';
import './CadastroPessoaModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (pessoa: any) => void;
}

const CadastroPessoaModal = ({ open, onClose, onSuccess }: Props) => {
  // --- Estado Unificado do Formulário ---
  const [form, setForm] = useState({
    nome: '', nomeSocial: '', cpf: '', rg: '', nis: '', dataNascimento: '',
    sexo: '', genero: '', cor: '', raca: '', sexualidade: '', escolaridade: '',
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
    nis: (value: string) => value.replace(/\D/g, '').substring(0, 11),
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
    if (name === 'nis') finalValue = masks.nis(value);
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
      1: ['nome', 'cpf', 'nis', 'sexo', 'genero', 'dataNascimento', 'cor', 'escolaridade'],
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
        nis: form.nis || undefined,
        data_nascimento: form.dataNascimento || undefined,
        sexo: form.sexo,
        genero: form.genero || undefined,
        cor: form.cor || undefined,
        raca: form.raca || undefined,
        sexualidade: form.sexualidade || undefined,
        escolaridade: form.escolaridade || undefined,
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

      const pessoaSalva: any = await apiFetch('/api/pessoas', {
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
            body: formData,
            headers: withAuthHeaders(),
          });
        } catch (fotoError) {
          console.error('Erro no upload da foto:', fotoError);
        }
      }

      // Reset form
      setForm({
        nome: '', nomeSocial: '', cpf: '', rg: '', nis: '', dataNascimento: '',
        sexo: '', genero: '', cor: '', raca: '', sexualidade: '', escolaridade: '',
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
  const etapaAtual = stepProgress[step as 1 | 2 | 3];
  const etapas = [
    { num: 1, label: 'Identificação', description: 'Dados civis e sociais' },
    { num: 2, label: 'Contato e vínculos', description: 'Endereço, família e emergência' },
    { num: 3, label: 'Saúde e observações', description: 'Cuidados, foto e revisão' },
  ];

  return (
    <div className="cadastro-overlay" onClick={handleClose}>
      <div className="cadastro-container" onClick={e => e.stopPropagation()}>
        <div className="cadastro-header">
          <div>
            <span>Cadastro operacional</span>
            <h2>Novo cadastro</h2>
            <p>Identificação, contato e informações relevantes para a rotina do albergue.</p>
          </div>
          <button aria-label="Fechar cadastro" className="close-btn" onClick={handleClose} type="button">×</button>
        </div>

        <div className="cadastro-shell">
          <aside className="cadastro-aside">
            <label className="cadastro-photo-card">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="foto-preview" />
              ) : (
                <span>Foto</span>
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
                Remover foto
              </button>
            )}

            <div className="cadastro-aside-person">
              <strong>{getNomeExibicao()}</strong>
              <span>{form.cpf || 'CPF não informado'}</span>
              {form.nis && <span>NIS: {form.nis}</span>}
              {form.nomeSocial?.trim() && <em>Nome social informado</em>}
            </div>

            <div className="cadastro-progress-card">
              <div>
                <span>Etapa {step} de 3</span>
                <strong>{etapaAtual}%</strong>
              </div>
              <progress className="progress-bar" value={etapaAtual} max={100} aria-label="Progresso do cadastro" />
            </div>

            <nav className="wizard-steps" aria-label="Etapas do cadastro">
              {etapas.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  className={`step-item ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
                  onClick={() => s.num <= step && setStep(s.num)}
                >
                  <span>{s.num}</span>
                  <strong>{s.label}</strong>
                  <small>{s.description}</small>
                </button>
              ))}
            </nav>

            <p className="cadastro-lgpd-note">
              Dados pessoais devem ser preenchidos apenas para finalidade institucional e operacional.
            </p>
          </aside>

          <section className="cadastro-workspace">
            <div className="cadastro-body">
              {step === 1 && (
                <div className="step-content">
                  <div className="step-heading">
                    <span>Etapa 1</span>
                    <h3>Identificação</h3>
                    <p>Informe os dados básicos da pessoa atendida. O nome social, quando informado, será priorizado na exibição.</p>
                  </div>

                  <div className="form-grid">
                    <div className={`form-group full-width ${errors.nome ? 'has-error' : ''}`}>
                      <label>Nome civil completo <span className="required">*</span></label>
                      <input
                        name="nome"
                        value={form.nome}
                        onChange={handleChange}
                        placeholder="Nome completo de registro"
                      />
                      {errors.nome && <span className="error-text">{errors.nome}</span>}
                    </div>

                    <div className="form-group full-width highlight-field">
                      <label>Nome social <span className="optional-badge">Opcional</span></label>
                      <input
                        name="nomeSocial"
                        value={form.nomeSocial}
                        onChange={handleChange}
                        placeholder="Como a pessoa prefere ser chamada"
                      />
                      <span className="field-hint">Será usado como nome principal na operação.</span>
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
                      <label>NIS <span className="optional-badge">Opcional</span></label>
                      <input
                        name="nis"
                        value={form.nis}
                        onChange={handleChange}
                        placeholder="00000000000"
                        maxLength={11}
                      />
                      <span className="field-hint">11 dígitos, sem formatação.</span>
                    </div>

                    <div className="form-group">
                      <label>RG</label>
                      <input name="rg" value={form.rg} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                      <label>Data de nascimento</label>
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
                        <option value="Intersexual">Intersexual</option>
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
                      <label>Escolaridade</label>
                      <select name="escolaridade" value={form.escolaridade} onChange={handleChange}>
                        <option value="">Selecione...</option>
                        <option value="Não alfabetizado/a">Não alfabetizado/a</option>
                        <option value="Ensino Fundamental incompleto">Ensino Fundamental incompleto</option>
                        <option value="Ensino Fundamental completo">Ensino Fundamental completo</option>
                        <option value="Ensino Médio incompleto">Ensino Médio incompleto</option>
                        <option value="Ensino Médio completo">Ensino Médio completo</option>
                        <option value="Ensino Superior incompleto">Ensino Superior incompleto</option>
                        <option value="Ensino Superior completo">Ensino Superior completo</option>
                        <option value="Pós-graduação">Pós-graduação</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Cor/raça</label>
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

              {step === 2 && (
                <div className="step-content">
                  <div className="step-heading">
                    <span>Etapa 2</span>
                    <h3>Contato e vínculos</h3>
                    <p>Registre endereço, telefones e referências familiares para uso operacional.</p>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        CEP
                        {loadingCep && <span className="loading-spinner" />}
                      </label>
                      <input
                        name="cep"
                        value={form.cep}
                        onChange={handleChange}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                      />
                      <span className="field-hint">Preenche endereço automaticamente.</span>
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
                        className="uppercase-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Naturalidade</label>
                      <input name="naturalidade" value={form.naturalidade} onChange={handleChange} />
                    </div>

                    <div className="section-divider">
                      <span>Família e contatos</span>
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
                      <label>Telefone de emergência</label>
                      <input
                        name="telefoneEmergencia"
                        value={form.telefoneEmergencia}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="form-group span-2">
                      <label>Nome da mãe</label>
                      <input name="nomeMae" value={form.nomeMae} onChange={handleChange} />
                    </div>

                    <div className="form-group span-2">
                      <label>Nome do pai</label>
                      <input name="nomePai" value={form.nomePai} onChange={handleChange} />
                    </div>

                    <div className="form-group full-width">
                      <label>Contato de emergência</label>
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

              {step === 3 && (
                <div className="step-content">
                  <div className="step-heading">
                    <span>Etapa 3</span>
                    <h3>Saúde e observações</h3>
                    <p>Registre informações que ajudam a equipe a acolher com segurança e continuidade.</p>
                  </div>

                  <div className="saude-fields">
                    <div className="health-card warning">
                      <label>Alergias</label>
                      <textarea
                        name="alergias"
                        value={form.alergias}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Medicamentos, alimentos, substâncias..."
                      />
                    </div>

                    <div className="health-card info">
                      <label>Medicamentos de uso contínuo</label>
                      <textarea
                        name="medicamentos"
                        value={form.medicamentos}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Nome, dosagem e horários..."
                      />
                    </div>

                    <div className="health-card">
                      <label>Condições crônicas</label>
                      <textarea
                        name="condicoesCronicas"
                        value={form.condicoesCronicas}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Diabetes, hipertensão, etc..."
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Observações gerais</label>
                    <textarea
                      name="observacoes"
                      value={form.observacoes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Informações adicionais importantes..."
                    />
                  </div>

                  <div className="summary-card">
                    <h4>Resumo do cadastro</h4>
                    <div className="summary-grid">
                      <div><strong>Nome:</strong> {getNomeExibicao()}</div>
                      <div><strong>CPF:</strong> {form.cpf || '-'}</div>
                      <div><strong>NIS:</strong> {form.nis || '-'}</div>
                      <div><strong>Telefone:</strong> {form.telefone || '-'}</div>
                      <div><strong>Cidade:</strong> {form.cidade || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="cadastro-footer">
              {step > 1 ? (
                <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>
                  Voltar
                </button>
              ) : (
                <button type="button" className="btn-secondary" onClick={handleClose}>
                  Cancelar
                </button>
              )}

              {step < 3 ? (
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar cadastro'}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CadastroPessoaModal;
