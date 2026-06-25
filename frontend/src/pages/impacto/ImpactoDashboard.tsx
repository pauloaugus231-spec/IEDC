import type { ImpactoSocialPeriodo } from '../../api';
import {
  periodos,
  fatoresOptions,
  proximoPassoOptions,
  tempoSemMoradiaOptions,
  situacaoTerritorialOptions,
} from './impacto-constants';
import {
  ImpactLine,
  ImpactRadar,
  ImpactDistribution,
  topItems,
  completeDistribution,
  completeChartSizeClass,
  formatPeriodo,
} from './ImpactoCharts';
import type { ImpactoDashboardData } from './impacto-types';

type ImpactoDashboardProps = {
  data: ImpactoDashboardData | null | undefined;
  loading: boolean;
  error: unknown;
  periodo: ImpactoSocialPeriodo;
  onPeriodoChange: (p: ImpactoSocialPeriodo) => void;
  onOpenForm: () => void;
  canCreate: boolean;
};

export default function ImpactoDashboard({
  data,
  loading,
  error,
  periodo,
  onPeriodoChange,
  onOpenForm,
  canCreate,
}: ImpactoDashboardProps) {
  const demandas = topItems(data?.distribuicoes.demandasEquipe ?? [], 8);
  const fatores = completeDistribution(data?.distribuicoes.fatoresSemMoradia ?? [], fatoresOptions);
  const proximosPassos = completeDistribution(data?.distribuicoes.proximosPassos ?? [], proximoPassoOptions);
  const ajudaPrincipal = topItems(data?.distribuicoes.ajudaPrincipal ?? [], 8);
  const tempoSemMoradia = completeDistribution(data?.distribuicoes.tempoSemMoradia ?? [], tempoSemMoradiaOptions);
  const situacaoTerritorial = completeDistribution(
    data?.distribuicoes.situacaoTerritorial ?? [],
    situacaoTerritorialOptions,
  );
  const periodoTexto = formatPeriodo(data?.periodo.inicio, data?.periodo.fim);

  return (
    <>
      <section className="impact-hero">
        <div>
          <p className="institutional-eyebrow">Albergue Noturno</p>
          <h1>Impacto Social do Albergue</h1>
          <p>
            Leitura anônima da experiência de acolhimento, demandas sociais,
            próximos passos e relatos qualitativos do serviço.
          </p>
        </div>
        {canCreate && (
          <button className="impact-primary-action" onClick={onOpenForm} type="button">
            Formulário de impacto
          </button>
        )}
      </section>

      <section className="impact-toolbar">
        <div>
          <strong>{periodoTexto}</strong>
          <span>Banco anônimo separado da base de pessoas e estadias</span>
        </div>
        <div className="impact-period-tabs" aria-label="Período do impacto social">
          {periodos.map((option) => (
            <button
              className={periodo === option.value ? 'active' : ''}
              key={option.value}
              onClick={() => onPeriodoChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="impact-kpis">
        <article>
          <span>Formulários</span>
          <strong>{data?.kpis.totalRespostas ?? 0}</strong>
          <small>Respostas anônimas no período</small>
        </article>
        <article>
          <span>Proteção/pernoite</span>
          <strong>{data?.kpis.protecaoPernoitePercentual ?? 0}%</strong>
          <small>{data?.kpis.protecaoPernoite ?? 0} respostas</small>
        </article>
        <article>
          <span>Respeito entre usuários</span>
          <strong>{data?.kpis.respeitoUsuariosPercentual ?? 0}%</strong>
          <small>{data?.kpis.respeitoUsuarios ?? 0} respostas positivas</small>
        </article>
        <article>
          <span>Próximos passos</span>
          <strong>{data?.kpis.proximoPassoPercentual ?? 0}%</strong>
          <small>{data?.kpis.proximoPasso ?? 0} disseram que ajuda</small>
        </article>
      </section>

      <section className="impact-chart-grid">
        <article className="impact-panel impact-panel-large">
          <div className="impact-panel-head">
            <div>
              <h2>Evolução das escutas</h2>
              <span>Formulários respondidos por mês</span>
            </div>
          </div>
          <div className="impact-chart-canvas">
            {(data?.serieMensal.length ?? 0) > 0 ? (
              <ImpactLine points={data?.serieMensal ?? []} />
            ) : (
              <div className="impact-empty">Sem respostas no período</div>
            )}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Dimensões de impacto</h2>
              <span>Proteção, vínculo, orientação e autonomia</span>
            </div>
          </div>
          <div className="impact-chart-canvas compact">
            <ImpactRadar items={data?.radar ?? []} />
          </div>
        </article>
      </section>

      <section className="impact-chart-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Fatores de vulnerabilidade</h2>
              <span>O que contribuiu para a ausência de moradia estável</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(fatores)}`}>
            <ImpactDistribution color="#0041aa" items={fatores} />
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Próximos passos desejados</h2>
              <span>Horizontes apontados após o atendimento</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(proximosPassos)}`}>
            <ImpactDistribution color="#2d6fd2" items={proximosPassos} />
          </div>
        </article>
      </section>

      <section className="impact-chart-grid impact-chart-grid-balanced">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Tempo sem moradia estável</h2>
              <span>Recorte do tempo informado em situação de rua ou instabilidade habitacional</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(tempoSemMoradia)}`}>
            <ImpactDistribution color="#18a058" items={tempoSemMoradia} />
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Público por situação territorial</h2>
              <span>Situação de rua, trânsito, migração e demais perfis informados</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(situacaoTerritorial)}`}>
            <ImpactDistribution color="#f6a623" items={situacaoTerritorial} unit="perfis" />
          </div>
        </article>
      </section>

      <section className="impact-bottom-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Demandas identificadas pela equipe</h2>
              <span>Leitura técnica ao final do formulário</span>
            </div>
          </div>
          <div className="impact-ranking">
            {demandas.map((item, index) => (
              <div key={item.label}>
                <span>{index + 1}</span>
                <p>{item.label}</p>
                <strong>{item.total}</strong>
              </div>
            ))}
            {!demandas.length && <p className="institutional-note">Sem demandas registradas no período.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>O que o Albergue representa</h2>
              <span>Frases curtas anônimas</span>
            </div>
          </div>
          <div className="impact-voice-list">
            {(data?.relatos ?? []).map((item) => (
              <blockquote key={item.id}>{item.texto}</blockquote>
            ))}
            {!data?.relatos?.length && <p className="institutional-note">Sem relatos no período.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Pontos de melhoria</h2>
              <span>Sugestões recorrentes para qualificar o serviço</span>
            </div>
          </div>
          <div className="impact-voice-list improvements">
            {(data?.melhorias ?? []).map((item) => (
              <blockquote key={item.id}>{item.texto}</blockquote>
            ))}
            {!data?.melhorias?.length && <p className="institutional-note">Sem sugestões no período.</p>}
          </div>
        </article>
      </section>

      <section className="impact-tags-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Palavras mais presentes</h2>
              <span>Extraídas das frases curtas</span>
            </div>
          </div>
          <div className="impact-tags">
            {(data?.palavrasRelatos ?? []).map((item) => (
              <span key={item.label}>{item.label}<em>{item.total}</em></span>
            ))}
            {!data?.palavrasRelatos?.length && <p className="institutional-note">Sem volume textual suficiente.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>O acesso ajuda em quê</h2>
              <span>Principais efeitos percebidos no dia</span>
            </div>
          </div>
          <div className="impact-tags strong">
            {ajudaPrincipal.map((item) => (
              <span key={item.label}>{item.label}<em>{item.total}</em></span>
            ))}
            {!ajudaPrincipal.length && <p className="institutional-note">Sem respostas no período.</p>}
          </div>
        </article>
      </section>

      {loading && <p className="institutional-note">Atualizando módulo de impacto social...</p>}
      {error && <p className="institutional-note">Não foi possível carregar os dados de impacto.</p>}
    </>
  );
}
