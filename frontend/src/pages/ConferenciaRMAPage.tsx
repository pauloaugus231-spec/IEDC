import { useState, useCallback, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, XCircle, Download } from '../components/Icons';
import { apiFetch, withAuthHeaders } from '../api';
import { PageHeader, Panel, MetricGrid, MetricCard, TableShell, dsClass } from '../components/DesignSystem';

interface Estatisticas {
  totalGesuas: number;
  totalSistema: number;
  totalEncontradas: number;
  totalDivergencias: number;
  pessoasSemNis: number;
  porcentagemMatch: number;
}

interface PessoaGesuas {
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  nis?: string;
}

interface PessoaConsolidada {
  nome: string;
  cpf?: string;
  dataNascimento?: Date;
  nis?: string;
  temNis: boolean;
  inicioEstadia: Date;
  pessoaId: string;
}

interface ResultadoConferencia {
  id: string;
  dataProcessamento: Date;
  periodo: { inicio: Date; fim: Date };
  encontradas: PessoaConsolidada[];
  apenasGesuas: PessoaGesuas[];
  apenasSistema: PessoaConsolidada[];
  estatisticas: Estatisticas;
}

type MatchTone = 'success' | 'warning' | 'danger';

type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const getMatchTone = (percentual: number): MatchTone => {
  if (percentual >= 90) return 'success';
  if (percentual >= 70) return 'warning';
  return 'danger';
};

const getMatchMessage = (percentual: number) => {
  if (percentual >= 90) return 'Alta correspondência entre Gesuas e sistema.';
  if (percentual >= 70) return 'Boa correspondência, com divergências para conferência.';
  return 'Baixa correspondência. A base precisa de revisão cuidadosa.';
};

export default function ConferenciaRMAPage() {
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConferencia | null>(null);
  const [erro, setErro] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapaAtual, setEtapaAtual] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);

  const validarArquivo = useCallback((file: File): { valido: boolean; erro?: string; avisos?: string[] } => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const avisosTemp: string[] = [];

    if (ext !== 'xlsx') {
      return {
        valido: false,
        erro: 'Formato inválido. Apenas arquivos Excel .xlsx são aceitos.'
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return {
        valido: false,
        erro: 'Arquivo muito grande. Tamanho máximo permitido: 5MB.'
      };
    }

    if (file.size < 1024) {
      avisosTemp.push('Arquivo muito pequeno; pode estar vazio ou corrompido.');
    }

    const nomeInvalido = /[<>:"/\\|?*]/.test(file.name);
    if (nomeInvalido) {
      avisosTemp.push('Nome do arquivo contém caracteres especiais.');
    }

    const dataModificacao = new Date(file.lastModified);
    const diasDesdeModificacao = (Date.now() - dataModificacao.getTime()) / (1000 * 60 * 60 * 24);

    if (diasDesdeModificacao > 90) {
      avisosTemp.push(`Arquivo modificado há ${Math.floor(diasDesdeModificacao)} dias. Verifique se está atualizado.`);
    }

    return { valido: true, avisos: avisosTemp.length > 0 ? avisosTemp : undefined };
  }, []);

  const validarPeriodo = useCallback((inicio: string, fim: string): { valido: boolean; erro?: string } => {
    if (!inicio || !fim) {
      return { valido: false, erro: 'Selecione o período completo, com data de início e fim.' };
    }

    const dataI = new Date(inicio);
    const dataF = new Date(fim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataF < dataI) {
      return { valido: false, erro: 'A data final deve ser posterior à data inicial.' };
    }

    if (dataI > hoje || dataF > hoje) {
      return { valido: false, erro: 'O período não pode conter datas futuras.' };
    }

    const dias = Math.floor((dataF.getTime() - dataI.getTime()) / (1000 * 60 * 60 * 24));

    if (dias < 1) {
      return { valido: false, erro: 'O período deve ter pelo menos 1 dia.' };
    }

    if (dias > 365) {
      return { valido: false, erro: 'Período muito longo. O máximo é 365 dias; divida em períodos menores.' };
    }

    return { valido: true };
  }, []);

  const receberArquivo = (file: File) => {
    const validacao = validarArquivo(file);
    if (validacao.valido) {
      setArquivo(file);
      setErro('');
      setAvisos(validacao.avisos || []);
      return;
    }

    setArquivo(null);
    setErro(validacao.erro || 'Arquivo inválido.');
    setAvisos([]);
  };

  const handleArquivoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) receberArquivo(file);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) receberArquivo(file);
  };

  const handleProcessar = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo para continuar.');
      return;
    }

    const validacaoPeriodo = validarPeriodo(dataInicio, dataFim);
    if (!validacaoPeriodo.valido) {
      setErro(validacaoPeriodo.erro || 'Período inválido.');
      return;
    }

    setLoading(true);
    setErro('');
    setProgresso(0);

    try {
      setEtapaAtual('Enviando arquivo...');
      setProgresso(10);

      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('dataInicio', dataInicio);
      formData.append('dataFim', dataFim);

      setEtapaAtual('Processando dados...');
      setProgresso(30);

      const response = await apiFetch<{ resultado: ResultadoConferencia }>('/api/rma/conferir', {
        method: 'POST',
        body: formData,
        headers: {},
      });

      setEtapaAtual('Gerando relatório...');
      setProgresso(70);

      const total = response.resultado.estatisticas.totalGesuas;
      const encontradas = response.resultado.estatisticas.totalEncontradas;
      response.resultado.estatisticas.porcentagemMatch = total > 0 ? Math.round((encontradas / total) * 100) : 0;

      setProgresso(100);
      setEtapaAtual('Concluído.');
      setResultado(response.resultado);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Erro ao processar conferência:', error);

      const apiError = error as ApiError;
      let mensagemErro = 'Erro ao processar conferência.';

      if (apiError.response?.status === 400) {
        mensagemErro = 'Arquivo inválido ou corrompido. Verifique o formato e tente novamente.';
      } else if (apiError.response?.status === 413) {
        mensagemErro = 'Arquivo muito grande para processamento.';
      } else if (apiError.response?.status === 500) {
        mensagemErro = 'Erro interno do servidor. Contate o suporte.';
      } else if (apiError.message?.toLowerCase().includes('network')) {
        mensagemErro = 'Erro de conexão. Verifique a rede e tente novamente.';
      }

      setErro(apiError.response?.data?.message || apiError.message || mensagemErro);
    } finally {
      setLoading(false);
      setProgresso(0);
      setEtapaAtual('');
    }
  };

  const handleExportar = async () => {
    if (!resultado) return;

    try {
      const response = await fetch(`/api/rma/exportar/${resultado.id}`, {
        method: 'GET',
        headers: withAuthHeaders(),
      });

      if (!response.ok) throw new Error('Erro ao exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-rma-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setErro('Erro ao exportar relatório.');
    }
  };

  const formatarData = (data: Date | string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const resetarFormulario = () => {
    setResultado(null);
    setArquivo(null);
    setDataInicio('');
    setDataFim('');
    setErro('');
    setAvisos([]);
    setProgresso(0);
    setEtapaAtual('');
  };

  const matchTone = resultado ? getMatchTone(resultado.estatisticas.porcentagemMatch) : 'success';
  const podeProcessar = !loading && Boolean(arquivo) && Boolean(dataInicio) && Boolean(dataFim);

  return (
    <main className="page-band rma-page">
      <PageHeader
        eyebrow="ALBERGUE | RMA"
        title="Conferência de RMA"
        description="Compare a planilha do Gesuas com os registros internos e transforme divergências em ação administrativa."
        actions={
          <button className="ds-button secondary" type="button" onClick={() => navigate('/albergue/relatorios')}>
            Voltar aos relatórios
          </button>
        }
      />

      {!resultado ? (
        <section className="rma-workflow">
          <Panel
            className="rma-panel"
            title="1. Arquivo Gesuas"
            subtitle="Envie a planilha .xlsx usada como referência de conferência."
          >
            <div
              className={dsClass('rma-upload-zone', isDragging && 'dragging', arquivo && 'ready')}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                accept=".xlsx"
                onChange={handleArquivoChange}
                className="rma-file-input"
              />
              <label htmlFor="file-upload">
                <span className="rma-upload-icon" aria-hidden="true">
                  {arquivo ? <CheckCircle size={34} /> : <Upload size={34} />}
                </span>
                {arquivo ? (
                  <>
                    <strong>{arquivo.name}</strong>
                    <small>
                      {(arquivo.size / 1024).toFixed(1)} KB - arquivo válido - {new Date(arquivo.lastModified).toLocaleDateString('pt-BR')}
                    </small>
                    <span className="rma-upload-action">Trocar arquivo</span>
                  </>
                ) : (
                  <>
                    <strong>{isDragging ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo'}</strong>
                    <small>Formato aceito: .xlsx - tamanho máximo: 5MB.</small>
                    <span className="rma-upload-action">Selecionar arquivo</span>
                  </>
                )}
              </label>
            </div>
          </Panel>

          <Panel
            className="rma-panel"
            title="2. Período de referência"
            subtitle="Defina o intervalo que será confrontado com a planilha enviada."
          >
            <div className="rma-date-grid">
              <label>
                <span>Data início</span>
                <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
              </label>
              <label>
                <span>Data fim</span>
                <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
              </label>
            </div>
          </Panel>

          {erro ? (
            <Notice tone="danger" icon={<XCircle size={20} />}>
              {erro}
            </Notice>
          ) : null}

          {avisos.length > 0 && !erro ? (
            <Notice tone="warning">
              {avisos.map((aviso) => (
                <span key={aviso}>{aviso}</span>
              ))}
            </Notice>
          ) : null}

          {loading ? (
            <Panel className="rma-panel rma-progress-panel">
              <div className="rma-progress-head">
                <span className="rma-spinner" aria-hidden="true" />
                <div>
                  <strong>{etapaAtual}</strong>
                  <small>{progresso}% concluído</small>
                </div>
              </div>
              <div className="rma-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso}>
                <span className={`rma-progress-fill p${progresso}`} />
              </div>
            </Panel>
          ) : null}

          <button className="ds-button rma-primary-action" type="button" onClick={handleProcessar} disabled={!podeProcessar}>
            {loading ? 'Processando...' : 'Processar conferência'}
          </button>
        </section>
      ) : (
        <section className="rma-results">
          <article className={`rma-result-banner ${matchTone}`}>
            <div className="rma-result-icon" aria-hidden="true">
              {matchTone === 'success' ? <CheckCircle size={34} /> : <XCircle size={34} />}
            </div>
            <div>
              <h2>{resultado.estatisticas.porcentagemMatch}% de correspondência</h2>
              <p>{getMatchMessage(resultado.estatisticas.porcentagemMatch)}</p>
            </div>
            <strong>
              {resultado.estatisticas.totalEncontradas}
              <span>encontradas</span>
            </strong>
          </article>

          <MetricGrid className="rma-metrics">
            <MetricCard label="Total Gesuas" value={resultado.estatisticas.totalGesuas} detail="Registros na planilha" />
            <MetricCard label="Total sistema" value={resultado.estatisticas.totalSistema} detail="Registros internos" />
            <MetricCard label="Encontradas" value={resultado.estatisticas.totalEncontradas} detail="Correspondências" tone="success" />
            <MetricCard label="Divergências" value={resultado.estatisticas.totalDivergencias} detail="Exigem revisão" tone="warning" />
            <MetricCard label="Sem NIS" value={resultado.estatisticas.pessoasSemNis} detail="Cadastro incompleto" tone="danger" />
          </MetricGrid>

          {(resultado.apenasGesuas.length > 0 || resultado.apenasSistema.length > 0) ? (
            <Panel
              className="rma-panel rma-divergence-panel"
              title="Divergências encontradas"
              subtitle="Registros que exigem conferência antes de fechar o RMA."
            >
              {resultado.apenasGesuas.length > 0 ? (
                <DivergenceGroup title={`Apenas no Gesuas (${resultado.apenasGesuas.length})`} tone="danger">
                  {resultado.apenasGesuas.map((pessoa, index) => (
                    <DivergenceItem
                      key={`${pessoa.nome}-${index}`}
                      title={pessoa.nome}
                      detail={`CPF: ${pessoa.cpf || 'Não informado'} - Nasc.: ${pessoa.dataNascimento || 'Não informado'}`}
                    />
                  ))}
                </DivergenceGroup>
              ) : null}

              {resultado.apenasSistema.length > 0 ? (
                <DivergenceGroup title={`Apenas no sistema (${resultado.apenasSistema.length})`} tone="warning">
                  {resultado.apenasSistema.map((pessoa, index) => (
                    <DivergenceItem
                      key={`${pessoa.pessoaId}-${index}`}
                      title={pessoa.nome}
                      detail={`CPF: ${pessoa.cpf || 'Não informado'} - Início: ${formatarData(pessoa.inicioEstadia)}`}
                    />
                  ))}
                </DivergenceGroup>
              ) : null}
            </Panel>
          ) : null}

          <Panel
            className="rma-panel"
            title="Relatório consolidado"
            subtitle={`${resultado.encontradas.length} pessoas encontradas no cruzamento`}
            actions={
              <button className="ds-button success" type="button" onClick={handleExportar}>
                <Download size={18} aria-hidden="true" />
                Exportar Excel
              </button>
            }
          >
            <TableShell>
              <table className="report-table rma-table">
                <thead>
                  <tr>
                    <th>Nome completo</th>
                    <th>CPF</th>
                    <th>Data nasc.</th>
                    <th>NIS</th>
                    <th>Início estadia</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.encontradas.map((pessoa, index) => (
                    <tr key={`${pessoa.pessoaId}-${index}`}>
                      <td><strong>{pessoa.nome}</strong></td>
                      <td>{pessoa.cpf || '-'}</td>
                      <td>{pessoa.dataNascimento ? formatarData(pessoa.dataNascimento) : '-'}</td>
                      <td>
                        {pessoa.temNis ? (
                          <span className="rma-nis-status ok">
                            <CheckCircle size={14} aria-hidden="true" />
                            {pessoa.nis}
                          </span>
                        ) : (
                          <span className="rma-nis-status danger">
                            <XCircle size={14} aria-hidden="true" />
                            Não
                          </span>
                        )}
                      </td>
                      <td>{formatarData(pessoa.inicioEstadia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </Panel>

          <button className="ds-button rma-reset-action" type="button" onClick={resetarFormulario}>
            Nova conferência
          </button>
        </section>
      )}
    </main>
  );
}

function Notice({ tone, icon, children }: { tone: 'danger' | 'warning'; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className={`rma-notice ${tone}`}>
      {icon ? <span className="rma-notice-icon">{icon}</span> : null}
      <div className="rma-notice-content">{children}</div>
    </div>
  );
}

function DivergenceGroup({ title, tone, children }: { title: string; tone: 'danger' | 'warning'; children: ReactNode }) {
  return (
    <section className={`rma-divergence-group ${tone}`}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function DivergenceItem({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="rma-divergence-item">
      <strong>{title}</strong>
      <span>{detail}</span>
    </article>
  );
}
