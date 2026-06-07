import type { FormEvent, ReactNode } from 'react';
import type { CreateImpactoAlberguePayload } from '../../api';
import {
  situacaoTerritorialOptions,
  tempoSemMoradiaOptions,
  fatoresOptions,
  ajudaOptions,
  respostaOptions,
  comunicacaoOptions,
  proximoPassoAjudaOptions,
  oficinaOptions,
  proximoPassoOptions,
  demandasEquipeOptions,
  acaoEquipeOptions,
  toggleArray,
} from './impacto-constants';

// ── Form sub-components ──

function FormSection({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  number: string;
  title: string;
}) {
  return (
    <section className="impact-form-section">
      <div className="impact-form-section-title">
        <span>{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function QuestionField({
  children,
  number,
  title,
  wide = false,
}: {
  children: ReactNode;
  number: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <label className={`impact-question-card${wide ? ' wide' : ''}`}>
      <span className="impact-question-label"><em>{number}</em>{title}</span>
      {children}
    </label>
  );
}

function QuestionFieldset({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description?: string;
  number: string;
  title: string;
}) {
  return (
    <fieldset className="impact-question-fieldset">
      <legend>
        <span>{number}</span>
        <strong>{title}</strong>
        {description ? <em>{description}</em> : null}
      </legend>
      {children}
    </fieldset>
  );
}

// ── Check grid (reusable checkbox list) ──

function CheckGrid({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="impact-check-grid">
      {options.map((option) => (
        <label key={option}>
          <input
            checked={selected.includes(option)}
            onChange={() => onChange(toggleArray(option, selected))}
            type="checkbox"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

// ── Modal ──

type ImpactoFormModalProps = {
  open: boolean;
  onClose: () => void;
  form: CreateImpactoAlberguePayload;
  onUpdateForm: <K extends keyof CreateImpactoAlberguePayload>(
    key: K,
    value: CreateImpactoAlberguePayload[K],
  ) => void;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ImpactoFormModal({
  open,
  onClose,
  form,
  onUpdateForm,
  saving,
  onSubmit,
}: ImpactoFormModalProps) {
  if (!open) return null;

  return (
    <div className="impact-modal-backdrop" role="presentation">
      <form className="impact-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <span>Formulário anônimo</span>
            <h2>Formulário de impacto</h2>
            <p>As respostas não ficam vinculadas a pessoa, estadia, CPF ou NIS.</p>
            <div className="impact-modal-badges" aria-label="Características do formulário">
              <strong>Anônimo</strong>
              <strong>Banco separado</strong>
              <strong>Uso institucional</strong>
            </div>
          </div>
          <button onClick={onClose} type="button">Fechar</button>
        </header>

        <FormSection
          description="Registre o período e a situação territorial sem identificar a pessoa atendida."
          number="01"
          title="Contexto do acesso"
        >
          <div className="impact-form-grid">
            <QuestionField number="1" title="Data de referência">
              <input
                onChange={(event) => onUpdateForm('dataReferencia', event.target.value)}
                required
                type="date"
                value={form.dataReferencia}
              />
            </QuestionField>

            <QuestionField number="2" title="Situação territorial informada ou observada">
              <select
                onChange={(event) => onUpdateForm('situacaoTerritorial', event.target.value)}
                value={form.situacaoTerritorial}
              >
                {situacaoTerritorialOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>

            <QuestionField
              number="3"
              title="Há quanto tempo está em situação de rua ou sem moradia estável?"
              wide
            >
              <select
                onChange={(event) => onUpdateForm('tempoSemMoradia', event.target.value)}
                value={form.tempoSemMoradia}
              >
                {tempoSemMoradiaOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>
          </div>

          <QuestionFieldset
            description="É possível escolher mais de uma alternativa."
            number="4"
            title="O que mais contribuiu para estar sem moradia estável?"
          >
            <CheckGrid
              options={fatoresOptions}
              selected={form.fatoresSemMoradia}
              onChange={(next) => onUpdateForm('fatoresSemMoradia', next)}
            />
            {form.fatoresSemMoradia.includes('Outro') ? (
              <input
                onChange={(event) => onUpdateForm('fatoresSemMoradiaOutro', event.target.value)}
                placeholder="Descreva o outro fator"
                value={form.fatoresSemMoradiaOutro}
              />
            ) : null}
          </QuestionFieldset>
        </FormSection>

        <FormSection
          description="Perguntas rápidas sobre a experiência no serviço e os efeitos percebidos no dia."
          number="02"
          title="Experiência no acolhimento"
        >
          <QuestionFieldset
            description="Marque tudo que fizer sentido para a resposta."
            number="5"
            title="Acessar o albergue hoje ajuda principalmente em quê?"
          >
            <CheckGrid
              options={ajudaOptions}
              selected={form.ajudaPrincipal}
              onChange={(next) => onUpdateForm('ajudaPrincipal', next)}
            />
            {form.ajudaPrincipal.includes('Outro') ? (
              <input
                onChange={(event) => onUpdateForm('ajudaPrincipalOutro', event.target.value)}
                placeholder="Descreva outro efeito percebido"
                value={form.ajudaPrincipalOutro}
              />
            ) : null}
          </QuestionFieldset>

          <div className="impact-form-grid">
            <QuestionField number="6" title="Sentiu-se respeitado por outros usuários?">
              <select
                onChange={(event) => onUpdateForm('respeitoUsuarios', event.target.value)}
                value={form.respeitoUsuarios}
              >
                {respostaOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>

            <QuestionField number="7" title="A comunicação/orientação da equipe é clara?">
              <select
                onChange={(event) => onUpdateForm('comunicacaoEquipe', event.target.value)}
                value={form.comunicacaoEquipe}
              >
                {comunicacaoOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>

            <QuestionField number="8" title="O atendimento ajuda a pensar em próximo passo?">
              <select
                onChange={(event) => onUpdateForm('proximoPassoAjuda', event.target.value)}
                value={form.proximoPassoAjuda}
              >
                {proximoPassoAjudaOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>

            <QuestionField number="9" title="Já participou de oficina/atividade?">
              <select
                onChange={(event) => onUpdateForm('participouOficina', event.target.value)}
                value={form.participouOficina}
              >
                {oficinaOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </QuestionField>
          </div>
        </FormSection>

        <FormSection
          description="Identifique quais caminhos a pessoa gostaria de buscar a partir do atendimento."
          number="03"
          title="Próximos passos"
        >
          <QuestionFieldset
            description="Use esta pergunta quando houver abertura para falar sobre possibilidades."
            number="10"
            title="Se sim, quais próximos passos gostaria de buscar agora?"
          >
            <CheckGrid
              options={proximoPassoOptions}
              selected={form.proximosPassos}
              onChange={(next) => onUpdateForm('proximosPassos', next)}
            />
            {form.proximosPassos.includes('Outro') ? (
              <input
                onChange={(event) => onUpdateForm('proximoPassoOutro', event.target.value)}
                placeholder="Descreva outro próximo passo"
                value={form.proximoPassoOutro}
              />
            ) : null}
          </QuestionFieldset>
        </FormSection>

        <FormSection
          description="Campo qualitativo para transformar escutas em evidência institucional."
          number="04"
          title="Relato e melhoria"
        >
          <div className="impact-form-grid">
            <QuestionField
              number="11"
              title="Em uma palavra ou frase curta, o que o Albergue representa neste momento?"
              wide
            >
              <textarea
                onChange={(event) => onUpdateForm('relatoRepresenta', event.target.value)}
                placeholder="Ex.: segurança, descanso, recomeço..."
                value={form.relatoRepresenta}
              />
            </QuestionField>

            <QuestionField number="12" title="Há algo que poderia melhorar?" wide>
              <textarea
                onChange={(event) => onUpdateForm('melhoriaSugerida', event.target.value)}
                placeholder="Registre uma sugestão curta, se houver."
                value={form.melhoriaSugerida}
              />
            </QuestionField>
          </div>
        </FormSection>

        <FormSection
          description="Registro técnico feito pelo educador ou pela equipe ao final da escuta."
          number="05"
          title="Leitura da equipe"
        >
          <QuestionFieldset
            description="Selecione todas as demandas percebidas durante a abordagem."
            number="13"
            title="Demanda identificada pela equipe"
          >
            <CheckGrid
              options={demandasEquipeOptions}
              selected={form.demandasEquipe}
              onChange={(next) => onUpdateForm('demandasEquipe', next)}
            />
          </QuestionFieldset>

          <QuestionFieldset
            description="Registre a resposta concreta realizada ou pactuada pela equipe."
            number="14"
            title="Ação realizada pela equipe"
          >
            <CheckGrid
              options={acaoEquipeOptions}
              selected={form.acaoEquipe}
              onChange={(next) => onUpdateForm('acaoEquipe', next)}
            />
          </QuestionFieldset>
        </FormSection>

        <footer>
          <button onClick={onClose} type="button">Cancelar</button>
          <button disabled={saving} type="submit">
            {saving ? 'Salvando...' : 'Salvar formulário'}
          </button>
        </footer>

      </form>
    </div>
  );
}
