import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from '../components/Icons';
import { apiFetch, withAuthHeaders } from '../api';
import { useNavigate } from 'react-router-dom';

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

  // Validação avançada de arquivo
  const validarArquivo = useCallback((file: File): { valido: boolean; erro?: string; avisos?: string[] } => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const avisosTemp: string[] = [];
    
    // Validação de formato
    if (ext !== 'xlsx') {
      return { 
        valido: false, 
        erro: 'Formato inválido. Apenas arquivos Excel .xlsx são aceitos.'
      };
    }
    
    // Validação de tamanho
    if (file.size > 5 * 1024 * 1024) {
      return { 
        valido: false, 
        erro: 'Arquivo muito grande. Tamanho máximo permitido: 5MB'
      };
    }
    
    if (file.size < 1024) {
      avisosTemp.push('⚠️ Arquivo muito pequeno, pode estar vazio ou corrompido.');
    }
    
    // Validação de nome
    const nomeInvalido = /[<>:"/\\|?*]/.test(file.name);
    if (nomeInvalido) {
      avisosTemp.push('⚠️ Nome do arquivo contém caracteres especiais.');
    }
    
    // Data de modificação
    const dataModificacao = new Date(file.lastModified);
    const diasDesdeModificacao = (Date.now() - dataModificacao.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diasDesdeModificacao > 90) {
      avisosTemp.push(`📅 Arquivo modificado há ${Math.floor(diasDesdeModificacao)} dias. Verifique se está atualizado.`);
    }
    
    return { valido: true, avisos: avisosTemp.length > 0 ? avisosTemp : undefined };
  }, []);

  // Validação de período
  const validarPeriodo = useCallback((inicio: string, fim: string): { valido: boolean; erro?: string } => {
    if (!inicio || !fim) {
      return { valido: false, erro: '📅 Selecione o período completo (data início e fim).' };
    }
    
    const dataI = new Date(inicio);
    const dataF = new Date(fim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Data final deve ser posterior à inicial
    if (dataF < dataI) {
      return { valido: false, erro: '⚠️ A data final deve ser posterior à data inicial.' };
    }
    
    // Período não pode ser futuro
    if (dataI > hoje || dataF > hoje) {
      return { valido: false, erro: '⚠️ O período não pode conter datas futuras.' };
    }
    
    // Calcular dias
    const dias = Math.floor((dataF.getTime() - dataI.getTime()) / (1000 * 60 * 60 * 24));
    
    // Período muito curto
    if (dias < 1) {
      return { valido: false, erro: '⚠️ O período deve ter pelo menos 1 dia.' };
    }
    
    // Período muito longo (aviso)
    if (dias > 365) {
      return { valido: false, erro: '⚠️ Período muito longo (máximo 365 dias). Considere dividir em períodos menores.' };
    }
    
    return { valido: true };
  }, []);

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validacao = validarArquivo(file);
      if (validacao.valido) {
        setArquivo(file);
        setErro('');
        setAvisos(validacao.avisos || []);
      } else {
        setArquivo(null);
        setErro(validacao.erro || 'Arquivo inválido');
        setAvisos([]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const validacao = validarArquivo(file);
      if (validacao.valido) {
        setArquivo(file);
        setErro('');
        setAvisos(validacao.avisos || []);
      } else {
        setArquivo(null);
        setErro(validacao.erro || 'Arquivo inválido');
        setAvisos([]);
      }
    }
  };

  const handleProcessar = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo para continuar');
      return;
    }
    
    // Validação de período
    const validacaoPeriodo = validarPeriodo(dataInicio, dataFim);
    if (!validacaoPeriodo.valido) {
      setErro(validacaoPeriodo.erro || 'Período inválido');
      return;
    }

    setLoading(true);
    setErro('');
    setProgresso(0);

    try {
      setEtapaAtual('Enviando arquivo...');
      setProgresso(10);

      const formData = new FormData();
      formData.append('arquivo', arquivo!);
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

      // Calcular porcentagem de match
      const total = response.resultado.estatisticas.totalGesuas;
      const encontradas = response.resultado.estatisticas.totalEncontradas;
      const porcentagem = total > 0 ? Math.round((encontradas / total) * 100) : 0;
      
      response.resultado.estatisticas.porcentagemMatch = porcentagem;

      setProgresso(100);
      setEtapaAtual('Concluído!');
      setResultado(response.resultado);
      
      // Scroll suave para o resultado
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Erro ao processar conferência:', error);
      
      // Mensagens de erro específicas
      let mensagemErro = '❌ Erro ao processar conferência.';
      
      if (error.response?.status === 400) {
        mensagemErro = '📄 Arquivo inválido ou corrompido. Verifique o formato e tente novamente.';
      } else if (error.response?.status === 413) {
        mensagemErro = '💾 Arquivo muito grande para processamento.';
      } else if (error.response?.status === 500) {
        mensagemErro = '🔧 Erro interno do servidor. Contate o suporte.';
      } else if (error.message?.includes('network')) {
        mensagemErro = '🌐 Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      setErro(error.response?.data?.message || error.message || mensagemErro);
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
      setErro('Erro ao exportar relatório');
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', 
      overflow: 'hidden', 
      backgroundColor: '#F9FAFB' 
    }}>
      
      {/* HEADER FIXO */}
      <div style={{ 
        flexShrink: 0, 
        padding: '20px 24px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/relatorios')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              <span style={{ fontSize: '20px' }}>←</span>
            </button>
            <FileSpreadsheet size={28} color="#2563EB" />
            <div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#111827', 
                margin: 0,
                letterSpacing: '-0.025em'
              }}>
                Conferência de RMA
              </h1>
              <p style={{ 
                fontSize: '14px', 
                color: '#6B7280', 
                margin: '2px 0 0 0' 
              }}>
                Compare dados do Gesuas com registros do sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO COM SCROLL */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        padding: '24px',
        paddingBottom: '120px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* FORMULÁRIO DE UPLOAD */}
          {!resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Card de Upload */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px' 
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '18px' }}>1️⃣</span>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Upload do Arquivo Excel
                  </h2>
                </div>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? '#2563EB' : arquivo ? '#10B981' : '#D1D5DB'}`,
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: isDragging ? '#EFF6FF' : arquivo ? '#F0FDF4' : '#F9FAFB',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isDragging ? '0 8px 16px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".xlsx"
                    onChange={handleArquivoChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{
                      width: '72px',
                      height: '72px',
                      margin: '0 auto 20px',
                      borderRadius: '14px',
                      backgroundColor: arquivo ? '#D1FAE5' : isDragging ? '#DBEAFE' : '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s',
                      transform: arquivo ? 'rotate(0deg)' : isDragging ? 'scale(1.1) rotate(5deg)' : 'scale(1)'
                    }}>
                      {arquivo ? (
                        <CheckCircle size={36} color="#10B981" />
                      ) : (
                        <Upload size={36} color={isDragging ? '#2563EB' : '#6B7280'} />
                      )}
                    </div>
                    
                    {arquivo ? (
                      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <p style={{ 
                          fontSize: '17px', 
                          fontWeight: '600', 
                          color: '#10B981', 
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '20px' }}>✓</span>
                          {arquivo.name}
                        </p>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '16px',
                          marginBottom: '12px',
                          fontSize: '14px',
                          color: '#6B7280'
                        }}>
                          <span>{(arquivo.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>✓ Arquivo válido</span>
                          <span>•</span>
                          <span>{new Date(arquivo.lastModified).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #2563EB',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#2563EB',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.color = '#2563EB';
                        }}
                        >
                          Trocar arquivo
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ 
                          fontSize: '17px', 
                          fontWeight: '600', 
                          color: isDragging ? '#2563EB' : '#111827', 
                          marginBottom: '8px',
                          transition: 'color 0.2s'
                        }}>
                          {isDragging ? 'Solte o arquivo aqui' : 'Clique ou arraste o arquivo'}
                        </p>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                          Formato aceito: .xlsx • Tamanho máximo: 5MB
                        </p>
                        <div style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          backgroundColor: 'white',
                          border: '1px solid #D1D5DB',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Selecionar Arquivo
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Card de Período */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px' 
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '18px' }}>2️⃣</span>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Período de Referência
                  </h2>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '16px' 
                }}>
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      <span style={{ fontSize: '16px', color: '#6B7280' }}>📅</span>
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '10px',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#374151', 
                      marginBottom: '8px' 
                    }}>
                      <span style={{ fontSize: '16px', color: '#6B7280' }}>📅</span>
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '10px',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563EB';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D1D5DB';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {erro && (
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  animation: 'slideIn 0.3s ease-out'
                }}>
                  <XCircle size={20} color="#DC2626" />
                  <span style={{ fontSize: '14px', color: '#DC2626', fontWeight: '500' }}>
                    {erro}
                  </span>
                </div>
              )}

              {/* Avisos */}
              {avisos.length > 0 && !erro && (
                <div style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  animation: 'slideIn 0.3s ease-out'
                }}>
                  {avisos.map((aviso, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '16px', marginTop: '2px' }}>⚠️</span>
                      <span style={{ fontSize: '14px', color: '#92400E', flex: 1 }}>
                        {aviso}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Barra de Progresso */}
              {loading && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E5E7EB',
                  animation: 'slideIn 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid #DBEAFE',
                      borderTop: '3px solid #2563EB',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {etapaAtual}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>
                        {progresso}% concluído
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${progresso}%`,
                      height: '100%',
                      backgroundColor: '#2563EB',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease-out',
                      boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
                    }} />
                  </div>
                </div>
              )}

              {/* Botão Processar */}
              <button
                onClick={handleProcessar}
                disabled={loading || !arquivo || !dataInicio || !dataFim}
                style={{
                  width: '100%',
                  backgroundColor: (loading || !arquivo || !dataInicio || !dataFim) ? '#D1D5DB' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (loading || !arquivo || !dataInicio || !dataFim) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: (loading || !arquivo || !dataInicio || !dataFim) ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s',
                  transform: loading ? 'none' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && arquivo && dataInicio && dataFim) {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && arquivo && dataInicio && dataFim) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '3px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Processando...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '20px' }}>✓</span>
                    Processar Conferência
                  </>
                )}
              </button>

              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                
                @keyframes slideIn {
                  from {
                    opacity: 0;
                    transform: translateY(-10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                
                @keyframes pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                }
              `}</style>
            </div>
          )}

          {/* RESULTADO DA CONFERÊNCIA */}
          {resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease-out' }}>
              
              {/* Banner de Sucesso */}
              <div style={{
                backgroundColor: resultado.estatisticas.porcentagemMatch >= 90 ? '#F0FDF4' : 
                                resultado.estatisticas.porcentagemMatch >= 70 ? '#FFFBEB' : '#FEF2F2',
                border: `2px solid ${resultado.estatisticas.porcentagemMatch >= 90 ? '#10B981' : 
                                     resultado.estatisticas.porcentagemMatch >= 70 ? '#F59E0B' : '#EF4444'}`,
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: resultado.estatisticas.porcentagemMatch >= 90 ? '#D1FAE5' : 
                                  resultado.estatisticas.porcentagemMatch >= 70 ? '#FEF3C7' : '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  flexShrink: 0
                }}>
                  {resultado.estatisticas.porcentagemMatch >= 90 ? '✓' : 
                   resultado.estatisticas.porcentagemMatch >= 70 ? '⚠️' : '✗'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '22px', 
                    fontWeight: '700', 
                    color: resultado.estatisticas.porcentagemMatch >= 90 ? '#065F46' : 
                           resultado.estatisticas.porcentagemMatch >= 70 ? '#92400E' : '#991B1B',
                    margin: '0 0 4px 0' 
                  }}>
                    {resultado.estatisticas.porcentagemMatch}% de Correspondência
                  </h3>
                  <p style={{ 
                    fontSize: '15px', 
                    color: '#6B7280', 
                    margin: 0 
                  }}>
                    {resultado.estatisticas.porcentagemMatch >= 90 && 'Excelente! Alta taxa de correspondência entre os sistemas.'}
                    {resultado.estatisticas.porcentagemMatch >= 70 && resultado.estatisticas.porcentagemMatch < 90 && 'Boa correspondência, mas há divergências a serem verificadas.'}
                    {resultado.estatisticas.porcentagemMatch < 70 && 'Atenção! Muitas divergências encontradas. Revise os dados.'}
                  </p>
                </div>
                <div style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: resultado.estatisticas.porcentagemMatch >= 90 ? '#10B981' : 
                         resultado.estatisticas.porcentagemMatch >= 70 ? '#F59E0B' : '#EF4444',
                  lineHeight: 1,
                  textAlign: 'right',
                  minWidth: '100px'
                }}>
                  {resultado.estatisticas.totalEncontradas}
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', marginTop: '4px' }}>
                    encontradas
                  </div>
                </div>
              </div>
              
              {/* Cards de Estatísticas */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <StatCard
                  label="Total Gesuas"
                  value={resultado.estatisticas.totalGesuas}
                  icon={<span style={{ fontSize: '24px' }}>📊</span>}
                  color="#2563EB"
                  bgColor="#EFF6FF"
                />
                <StatCard
                  label="Total Sistema"
                  value={resultado.estatisticas.totalSistema}
                  icon={<span style={{ fontSize: '24px' }}>📊</span>}
                  color="#7C3AED"
                  bgColor="#F5F3FF"
                />
                <StatCard
                  label="Encontradas"
                  value={resultado.estatisticas.totalEncontradas}
                  icon={<span style={{ fontSize: '24px' }}>✓</span>}
                  color="#10B981"
                  bgColor="#F0FDF4"
                />
                <StatCard
                  label="Divergências"
                  value={resultado.estatisticas.totalDivergencias}
                  icon={<span style={{ fontSize: '24px' }}>⚠️</span>}
                  color="#F59E0B"
                  bgColor="#FFFBEB"
                />
                <StatCard
                  label="Sem NIS"
                  value={resultado.estatisticas.pessoasSemNis}
                  icon={<span style={{ fontSize: '24px' }}>✗</span>}
                  color="#EF4444"
                  bgColor="#FEF2F2"
                />
              </div>

              {/* Divergências */}
              {(resultado.apenasGesuas.length > 0 || resultado.apenasSistema.length > 0) && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  border: '1px solid #FDE68A'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    marginBottom: '20px' 
                  }}>
                    <span style={{ fontSize: '24px', color: '#F59E0B' }}>⚠️</span>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Divergências Encontradas
                    </h2>
                  </div>

                  {resultado.apenasGesuas.length > 0 && (
                    <div style={{ marginBottom: resultado.apenasSistema.length > 0 ? '24px' : 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#FEF2F2',
                        borderRadius: '8px',
                        width: 'fit-content'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#DC2626' }}>
                          📌 Apenas no Gesuas ({resultado.apenasGesuas.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {resultado.apenasGesuas.map((pessoa, idx) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <p style={{ 
                              fontSize: '15px', 
                              fontWeight: '600', 
                              color: '#111827', 
                              margin: '0 0 4px 0' 
                            }}>
                              {pessoa.nome}
                            </p>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                              CPF: {pessoa.cpf || 'Não informado'} •
                              Nasc: {pessoa.dataNascimento || 'Não informado'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultado.apenasSistema.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#FFF7ED',
                        borderRadius: '8px',
                        width: 'fit-content'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#EA580C' }}>
                          📌 Apenas no Sistema ({resultado.apenasSistema.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {resultado.apenasSistema.map((pessoa, idx) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#FFF7ED',
                              border: '1px solid #FED7AA',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <p style={{ 
                              fontSize: '15px', 
                              fontWeight: '600', 
                              color: '#111827', 
                              margin: '0 0 4px 0' 
                            }}>
                              {pessoa.nome}
                            </p>
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                              CPF: {pessoa.cpf || 'Não informado'} • 
                              Início: {formatarData(pessoa.inicioEstadia)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tabela Consolidada */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileSpreadsheet size={24} color="#2563EB" />
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Relatório Consolidado
                      </h2>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: '2px 0 0 0' }}>
                        {resultado.encontradas.length} pessoas encontradas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportar}
                    style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Download size={18} />
                    Exportar Excel
                  </button>
                </div>

                <div style={{ 
                  overflowX: 'auto',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        <th style={{ 
                          padding: '14px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          Nome Completo
                        </th>
                        <th style={{ 
                          padding: '14px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          CPF
                        </th>
                        <th style={{ 
                          padding: '14px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          Data Nasc.
                        </th>
                        <th style={{ 
                          padding: '14px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          NIS
                        </th>
                        <th style={{ 
                          padding: '14px 16px', 
                          textAlign: 'left', 
                          fontWeight: '600', 
                          color: '#374151',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          Início Estadia
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.encontradas.map((pessoa, idx) => (
                        <tr 
                          key={idx}
                          style={{ 
                            borderBottom: '1px solid #F3F4F6',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '14px 16px', color: '#111827', fontWeight: '500' }}>
                            {pessoa.nome}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6B7280' }}>
                            {pessoa.cpf || '-'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6B7280' }}>
                            {pessoa.dataNascimento ? formatarData(pessoa.dataNascimento) : '-'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {pessoa.temNis ? (
                              <span style={{ 
                                color: '#10B981', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <CheckCircle size={14} />
                                {pessoa.nis}
                              </span>
                            ) : (
                              <span style={{ 
                                color: '#EF4444', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <XCircle size={14} />
                                NÃO
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#6B7280' }}>
                            {formatarData(pessoa.inicioEstadia)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão Nova Conferência */}
              <button
                onClick={resetarFormulario}
                style={{
                  backgroundColor: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(37, 99, 235, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.3)';
                }}
              >
                <span style={{ fontSize: '18px' }}>🔄</span>
                Nova Conferência
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de Card de Estatística
function StatCard({ 
  label, 
  value, 
  icon, 
  color, 
  bgColor 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #E5E7EB',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      animation: 'fadeIn 0.5s ease-out',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
      e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0, 0, 0, 0.15)';
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.borderColor = '#E5E7EB';
    }}
    >
      {/* Background decorativo */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        backgroundColor: bgColor,
        opacity: 0.3,
        transition: 'all 0.3s'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <p style={{ 
            fontSize: '13px', 
            color: '#6B7280', 
            margin: '0 0 8px 0',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {label}
          </p>
          <p style={{ 
            fontSize: '36px', 
            fontWeight: '700', 
            color: '#111827', 
            margin: 0,
            lineHeight: 1,
            transition: 'all 0.3s'
          }}>
            {value.toLocaleString('pt-BR')}
          </p>
        </div>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          transition: 'all 0.3s',
          boxShadow: `0 4px 6px -1px ${color}20`
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
