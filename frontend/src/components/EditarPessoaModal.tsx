import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FotoUpload from './FotoUpload';
import './EditarPessoaModal.css';

interface EditarPessoaModalProps {
  pessoa: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

type EditTab = 'identificacao' | 'identidade' | 'contatos' | 'saude';

const TAB_CONFIG: Array<{ id: EditTab; label: string; description: string; fields: string[] }> = [
  {
    id: 'identificacao',
    label: 'Identificação',
    description: 'Nome, documentos e base da aferição',
    fields: ['nome', 'nome_social', 'cpf', 'nis', 'rg', 'data_nascimento'],
  },
  {
    id: 'identidade',
    label: 'Identidade e vaga',
    description: 'Perfil declarado e quarto de referência',
    fields: ['sexo', 'genero', 'cor', 'raca', 'sexualidade', 'tipo_vaga', 'lgbt'],
  },
  {
    id: 'contatos',
    label: 'Contato e vínculos',
    description: 'Endereço, telefones e família',
    fields: ['cep', 'endereco', 'cidade', 'uf', 'naturalidade', 'telefone', 'telefone_emergencia', 'contato_emergencia', 'nome_mae', 'nome_pai'],
  },
  {
    id: 'saude',
    label: 'Saúde e observações',
    description: 'Cuidados relevantes para a equipe',
    fields: ['alergias', 'condicoes_cronicas', 'medicamentos_uso_continuo', 'observacoes'],
  },
];

const EDITABLE_FIELDS = [
  'nome',
  'nome_social',
  'cpf',
  'rg',
  'nis',
  'data_nascimento',
  'naturalidade',
  'telefone',
  'sexo',
  'genero',
  'cor',
  'raca',
  'sexualidade',
  'endereco',
  'cidade',
  'uf',
  'cep',
  'nome_mae',
  'nome_pai',
  'contato_emergencia',
  'telefone_emergencia',
  'tipo_vaga',
  'observacoes',
  'alergias',
  'condicoes_cronicas',
  'medicamentos_uso_continuo',
  'lgbt',
  'foto_url',
];

function normalizePessoa(pessoa: any) {
  return {
    ...pessoa,
    data_nascimento: pessoa?.data_nascimento ? String(pessoa.data_nascimento).slice(0, 10) : '',
    lgbt: Boolean(pessoa?.lgbt),
  };
}

function editablePayload(form: any) {
  return EDITABLE_FIELDS.reduce((payload: Record<string, any>, field) => {
    const value = form[field];
    if (field === 'tipo_vaga' && value === '') return payload;
    payload[field] = value === '' ? null : value;
    return payload;
  }, {});
}

function cleanComparable(payload: Record<string, any>) {
  return Object.keys(payload)
    .sort()
    .reduce((acc: Record<string, any>, key) => {
      acc[key] = payload[key] ?? '';
      return acc;
    }, {});
}

const EditarPessoaModal: React.FC<EditarPessoaModalProps> = ({ pessoa, onClose, onSave }) => {
  const [form, setForm] = useState(() => normalizePessoa(pessoa));
  const [originalForm] = useState(() => normalizePessoa(pessoa));
  const [activeTab, setActiveTab] = useState<EditTab>('identificacao');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const masks = {
    cpf: (value: string) => {
      const nums = value.replace(/\D/g, '').substring(0, 11);
      return nums.replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    },
    nis: (value: string) => value.replace(/\D/g, '').substring(0, 11),
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
    },
  };

  const validations: Record<string, (value: string) => string> = {
    nome: (value) => {
      if (!value?.trim()) return 'Nome é obrigatório';
      if (value.trim().length < 3) return 'Nome muito curto';
      return '';
    },
    cpf: (value) => {
      const nums = value.replace(/\D/g, '');
      if (nums && nums.length !== 11) return 'CPF deve ter 11 dígitos';
      return '';
    },
    nis: (value) => {
      const nums = value.replace(/\D/g, '');
      if (nums && nums.length !== 11) return 'NIS deve ter 11 dígitos';
      return '';
    },
    cep: (value) => {
      const nums = value.replace(/\D/g, '');
      if (nums && nums.length !== 8) return 'CEP deve ter 8 dígitos';
      return '';
    },
  };

  const originalPayload = useMemo(() => cleanComparable(editablePayload(originalForm)), [originalForm]);
  const currentPayload = useMemo(() => cleanComparable(editablePayload(form)), [form]);

  const hasChanges = useMemo(
    () => JSON.stringify(currentPayload) !== JSON.stringify(originalPayload),
    [currentPayload, originalPayload],
  );

  const getNomeExibicao = () => form.nome_social?.trim() || form.nome || 'Sem nome';

  const getFieldError = (name: string) => {
    if (!touched[name]) return '';
    const validate = validations[name];
    return validate ? validate(String(form[name] || '')) : '';
  };

  const getTabProgress = (tab: EditTab) => {
    const tabFields = TAB_CONFIG.find((item) => item.id === tab)?.fields || [];
    const filled = tabFields.filter((field) => {
      const value = form[field];
      return typeof value === 'boolean' ? value : Boolean(String(value || '').trim());
    }).length;
    return { filled, total: tabFields.length };
  };

  const completionPercent = useMemo(() => {
    const allFields = TAB_CONFIG.flatMap((tab) => tab.fields);
    const filled = allFields.filter((field) => {
      const value = form[field];
      return typeof value === 'boolean' ? value : Boolean(String(value || '').trim());
    }).length;
    return Math.round((filled / allFields.length) * 100);
  }, [form]);

  const pendingAfericao = [
    ['Nome', form.nome],
    ['CPF', form.cpf],
    ['Nascimento', form.data_nascimento],
    ['NIS', form.nis],
  ].filter(([, value]) => !value).map(([label]) => label);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = event.target;
    const rawValue = type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;

    let finalValue = rawValue;
    if (typeof rawValue === 'string') {
      if (name === 'cpf') finalValue = masks.cpf(rawValue);
      if (name === 'nis') finalValue = masks.nis(rawValue);
      if (name === 'telefone' || name === 'telefone_emergencia') finalValue = masks.phone(rawValue);
      if (name === 'cep') finalValue = masks.cep(rawValue);
      if (name === 'uf') finalValue = rawValue.toUpperCase().substring(0, 2);
    }

    setForm((previous: any) => ({ ...previous, [name]: finalValue }));
  }, []);

  const handleBlur = (name: string) => {
    setTouched((previous) => ({ ...previous, [name]: true }));
  };

  const handleCepBlur = async () => {
    handleBlur('cep');
    const cepLimpo = form.cep?.replace(/\D/g, '');
    if (cepLimpo?.length !== 8) return;

    setLoadingCep(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        return;
      }
      setForm((previous: any) => ({
        ...previous,
        endereco: data.logradouro || previous.endereco,
        cidade: data.localidade || previous.cidade,
        uf: data.uf || previous.uf,
      }));
    } catch {
      setCepError('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!hasChanges || window.confirm('Existem alterações não salvas. Deseja sair mesmo assim?')) {
      onClose();
    }
  }, [hasChanges, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = ['nome', 'cpf', 'nis', 'cep'].filter((field) => validations[field](String(form[field] || '')));
    if (errors.length) {
      setTouched((previous) => errors.reduce((acc, field) => ({ ...acc, [field]: true }), previous));
      const firstTab = TAB_CONFIG.find((tab) => tab.fields.some((field) => errors.includes(field)));
      if (firstTab) setActiveTab(firstTab.id);
      return;
    }

    setSaving(true);
    try {
      await onSave(editablePayload(form));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div className="edit-person-overlay" onClick={handleClose}>
      <div className="edit-person-container" onClick={(event) => event.stopPropagation()}>
        <header className="edit-person-header">
          <div>
            <span>Edição de cadastro</span>
            <h2>Atualizar perfil</h2>
            <p>Revise dados operacionais, documentos, vínculos e cuidados da pessoa atendida.</p>
          </div>
          <button aria-label="Fechar edição" className="edit-person-close" onClick={handleClose} type="button">
            ×
          </button>
        </header>

        <form className="edit-person-shell" onSubmit={handleSubmit}>
          <aside className="edit-person-aside">
            <FotoUpload
              fotoUrl={form.foto_url}
              onFotoUpdate={(url) => setForm((previous: any) => ({ ...previous, foto_url: url }))}
              pessoaId={pessoa.id}
            />

            <div className="edit-person-card identity">
              <span>Nome de exibição</span>
              <strong>{getNomeExibicao()}</strong>
              <small>{form.nome_social?.trim() ? 'Nome social priorizado' : 'Nome civil em uso'}</small>
            </div>

            <div className="edit-person-card progress">
              <div>
                <span>Cadastro preenchido</span>
                <strong>{completionPercent}%</strong>
              </div>
              <div className="edit-progress-track">
                <div style={{ width: `${completionPercent}%` }} />
              </div>
            </div>

            <div className={`edit-person-card afericao ${pendingAfericao.length ? 'warning' : 'complete'}`}>
              <span>Aferição</span>
              <strong>{pendingAfericao.length ? `${pendingAfericao.length} pendência(s)` : 'Campos completos'}</strong>
              <small>{pendingAfericao.length ? pendingAfericao.join(', ') : 'Nome, CPF, nascimento e NIS informados'}</small>
            </div>

            {hasChanges && (
              <div className="edit-unsaved-alert">
                Alterações ainda não salvas.
              </div>
            )}
          </aside>

          <section className="edit-person-workspace">
            <nav className="edit-person-tabs" aria-label="Seções de edição">
              {TAB_CONFIG.map((tab) => {
                const progress = getTabProgress(tab.id);
                return (
                  <button
                    className={activeTab === tab.id ? 'active' : ''}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <strong>{tab.label}</strong>
                    <span>{tab.description}</span>
                    <em>{progress.filled}/{progress.total}</em>
                  </button>
                );
              })}
            </nav>

            <div className="edit-person-body">
              {activeTab === 'identificacao' && (
                <EditSection eyebrow="Base cadastral" title="Identificação e documentos" description="Campos usados na rotina, busca e instrumentos de aferição.">
                  <div className="edit-form-grid">
                    <TextField
                      error={getFieldError('nome')}
                      label="Nome civil completo"
                      name="nome"
                      onBlur={() => handleBlur('nome')}
                      onChange={handleChange}
                      required
                      value={form.nome || ''}
                      wide
                    />
                    <TextField
                      hint="Será usado como nome principal nas telas operacionais."
                      label="Nome social"
                      name="nome_social"
                      onChange={handleChange}
                      placeholder="Como a pessoa prefere ser chamada"
                      value={form.nome_social || ''}
                      wide
                    />
                    <TextField
                      error={getFieldError('cpf')}
                      label="CPF"
                      name="cpf"
                      onBlur={() => handleBlur('cpf')}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      value={form.cpf || ''}
                    />
                    <TextField
                      error={getFieldError('nis')}
                      hint="Campo importante para aferição e comparação externa."
                      label="NIS"
                      name="nis"
                      onBlur={() => handleBlur('nis')}
                      onChange={handleChange}
                      placeholder="11 dígitos"
                      value={form.nis || ''}
                    />
                    <TextField label="RG" name="rg" onChange={handleChange} value={form.rg || ''} />
                    <TextField label="Data de nascimento" name="data_nascimento" onChange={handleChange} type="date" value={form.data_nascimento || ''} />
                  </div>
                </EditSection>
              )}

              {activeTab === 'identidade' && (
                <EditSection eyebrow="Dados declarados" title="Identidade, perfil e vaga" description="Informações usadas para cuidado, acolhimento e organização de quartos.">
                  <div className="edit-form-grid">
                    <SelectField label="Sexo" name="sexo" onChange={handleChange} value={form.sexo || ''}>
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </SelectField>
                    <SelectField label="Gênero" name="genero" onChange={handleChange} value={form.genero || ''}>
                      <option value="">Selecione...</option>
                      <option value="Homem cisgênero">Homem cisgênero</option>
                      <option value="Mulher cisgênero">Mulher cisgênero</option>
                      <option value="Homem transgênero">Homem transgênero</option>
                      <option value="Mulher transgênero">Mulher transgênero</option>
                      <option value="Travesti">Travesti</option>
                      <option value="Não binário">Não binário</option>
                      <option value="Outro">Outro</option>
                    </SelectField>
                    <SelectField label="Cor/raça" name="cor" onChange={handleChange} value={form.cor || ''}>
                      <option value="">Selecione...</option>
                      <option value="Branca">Branca</option>
                      <option value="Preta">Preta</option>
                      <option value="Parda">Parda</option>
                      <option value="Amarela">Amarela</option>
                      <option value="Indígena">Indígena</option>
                    </SelectField>
                    <TextField label="Raça complementar" name="raca" onChange={handleChange} value={form.raca || ''} />
                    <SelectField label="Sexualidade" name="sexualidade" onChange={handleChange} value={form.sexualidade || ''}>
                      <option value="">Selecione...</option>
                      <option value="Heterossexual">Heterossexual</option>
                      <option value="Homossexual">Homossexual</option>
                      <option value="Bissexual">Bissexual</option>
                      <option value="Assexual">Assexual</option>
                      <option value="Pansexual">Pansexual</option>
                      <option value="Não informada">Não informada</option>
                    </SelectField>
                    <SelectField hint="Usado como sugestão inicial no check-in." label="Tipo de vaga" name="tipo_vaga" onChange={handleChange} value={form.tipo_vaga || ''}>
                      <option value="">Selecione...</option>
                      <option value="masculina">Quarto Masculino</option>
                      <option value="feminina">Quarto Feminino</option>
                      <option value="lgbt">Quarto LGBT+</option>
                      <option value="idoso">Quarto de Idosos</option>
                    </SelectField>
                    <label className="edit-checkbox-card">
                      <input checked={Boolean(form.lgbt)} name="lgbt" onChange={handleChange} type="checkbox" />
                      <span>
                        <strong>Identificação LGBT+</strong>
                        <small>Disponibiliza marcador textual e apoia a sugestão de vaga quando necessário.</small>
                      </span>
                    </label>
                  </div>
                </EditSection>
              )}

              {activeTab === 'contatos' && (
                <EditSection eyebrow="Rede de contato" title="Endereço, telefones e vínculos" description="Dados de referência para localização, contato familiar e emergência.">
                  <div className="edit-form-grid">
                    <TextField
                      error={cepError || getFieldError('cep')}
                      hint={loadingCep ? 'Buscando endereço...' : 'Preenche endereço automaticamente ao sair do campo.'}
                      label="CEP"
                      name="cep"
                      onBlur={handleCepBlur}
                      onChange={handleChange}
                      placeholder="00000-000"
                      value={form.cep || ''}
                    />
                    <TextField label="Endereço / logradouro" name="endereco" onChange={handleChange} value={form.endereco || ''} wide />
                    <TextField label="Cidade" name="cidade" onChange={handleChange} value={form.cidade || ''} />
                    <TextField label="UF" name="uf" onChange={handleChange} value={form.uf || ''} />
                    <TextField label="Naturalidade" name="naturalidade" onChange={handleChange} value={form.naturalidade || ''} />
                    <TextField label="Telefone" name="telefone" onChange={handleChange} placeholder="(00) 00000-0000" value={form.telefone || ''} />
                    <TextField label="Telefone de emergência" name="telefone_emergencia" onChange={handleChange} placeholder="(00) 00000-0000" value={form.telefone_emergencia || ''} />
                    <TextField label="Contato de emergência" name="contato_emergencia" onChange={handleChange} value={form.contato_emergencia || ''} wide />
                    <TextField label="Nome da mãe" name="nome_mae" onChange={handleChange} value={form.nome_mae || ''} />
                    <TextField label="Nome do pai" name="nome_pai" onChange={handleChange} value={form.nome_pai || ''} />
                  </div>
                </EditSection>
              )}

              {activeTab === 'saude' && (
                <EditSection eyebrow="Cuidados" title="Saúde e observações" description="Registre informações que ajudam a equipe a acolher com continuidade e segurança.">
                  <div className="edit-health-grid">
                    <TextAreaField label="Alergias" name="alergias" onChange={handleChange} placeholder="Medicamentos, alimentos, substâncias..." tone="warning" value={form.alergias || ''} />
                    <TextAreaField label="Medicamentos de uso contínuo" name="medicamentos_uso_continuo" onChange={handleChange} placeholder="Nome, dosagem e horários..." tone="info" value={form.medicamentos_uso_continuo || ''} />
                    <TextAreaField label="Condições crônicas" name="condicoes_cronicas" onChange={handleChange} placeholder="Diabetes, hipertensão, acompanhamento..." value={form.condicoes_cronicas || ''} />
                    <TextAreaField label="Observações gerais" name="observacoes" onChange={handleChange} placeholder="Anotações importantes da equipe..." rows={4} tone="notes" value={form.observacoes || ''} />
                  </div>
                </EditSection>
              )}
            </div>

            <footer className="edit-person-footer">
              <button className="edit-secondary-button" onClick={handleClose} type="button">
                Cancelar
              </button>
              <button className="edit-primary-button" disabled={saving || !hasChanges} type="submit">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </footer>
          </section>
        </form>
      </div>
    </div>
  );
};

const EditSection = ({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) => (
  <section className="edit-section">
    <div className="edit-section-heading">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    {children}
  </section>
);

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  wide?: boolean;
  autoFocus?: boolean;
  children?: React.ReactNode;
}

const TextField = ({ label, name, value, onChange, onBlur, error, hint, placeholder, required, type = 'text', wide, autoFocus }: FieldProps) => (
  <label className={`edit-field ${wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
    <span>{label}{required && <em>*</em>}</span>
    <input
      autoFocus={autoFocus}
      name={name}
      onBlur={onBlur}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      value={value}
    />
    {error && <small className="edit-error">{error}</small>}
    {!error && hint && <small>{hint}</small>}
  </label>
);

const SelectField = ({ label, name, value, onChange, hint, wide, children }: FieldProps) => (
  <label className={`edit-field ${wide ? 'wide' : ''}`}>
    <span>{label}</span>
    <select name={name} onChange={onChange} value={value}>
      {children}
    </select>
    {hint && <small>{hint}</small>}
  </label>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, rows = 3, tone }: FieldProps & { rows?: number; tone?: string }) => (
  <label className={`edit-textarea-card ${tone || ''}`}>
    <span>{label}</span>
    <textarea name={name} onChange={onChange} placeholder={placeholder} rows={rows} value={value} />
  </label>
);

export default EditarPessoaModal;
