import { useState, useEffect } from 'react';
import { api } from '../api';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import IniciarSessaoModal from '../components/EspacoCuidados/IniciarSessaoModal.tsx';
import AdicionarPessoaModal from '../components/EspacoCuidados/AdicionarPessoaModal.tsx';
import FilaBanhoCard from '../components/EspacoCuidados/FilaBanhoCard.tsx';
import FilaAtendimentoCard from '../components/EspacoCuidados/FilaAtendimentoCard.tsx';
import EstatisticasCard from '../components/EspacoCuidados/EstatisticasCard.tsx';
import { RefreshCw, UserPlus, PlayCircle, StopCircle, FileDown } from '../components/Icons';
import { useWebSocket } from '../useWebSocket';

interface Sessao {
  id: string;
  data_sessao: string;
  status: 'planejada' | 'ativa' | 'encerrada';
  hora_inicio: string;
  hora_fim: string | null;
  equipe: string[];
}

interface PessoaFila {
  id: string;
  pessoa_id: string;
  pessoa: {
    id: string;
    nome: string;
    foto_url?: string;
  };
  ordem_chegada: number;
  quer_banho: boolean;
  quer_atendimento: boolean;
  posicao_banho?: number;
  posicao_atendimento?: number;
  status: string;
  vezes_passou_vez: number;
  hora_chegada: string;
  novo_cadastro: boolean;
  observacoes?: string;
}

interface Estatisticas {
  sessao: Sessao;
  contadores: {
    total: number;
    aguardandoBanho: number;
    emBanho: number;
    aguardandoAtendimento: number;
    emAtendimento: number;
    concluidos: number;
    desistencias: number;
    novosCadastros: number;
  };
  tempos: {
    medioBanhoMinutos: number;
    medioAtendimentoMinutos: number;
    medioEsperaMinutos: number;
  };
}

interface DashboardData {
  sessao: Sessao;
  estatisticas: Estatisticas;
  filas: {
    banho: PessoaFila[];
    atendimento: PessoaFila[];
  };
}

export default function EspacoCuidadosPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIniciarModal, setShowIniciarModal] = useState(false);
  const [showAdicionarModal, setShowAdicionarModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // WebSocket para atualizações em tempo real
  useWebSocket('http://localhost:3001', '', {
    'espaco-cuidados:dashboard-atualizado': () => {
      console.log('🔄 Dashboard atualizado via WebSocket');
      loadDashboard();
    },
    'espaco-cuidados:sessao-iniciada': () => {
      console.log('✅ Sessão iniciada');
      loadDashboard();
    },
    'espaco-cuidados:sessao-encerrada': () => {
      console.log('🛑 Sessão encerrada');
      loadDashboard();
    },
    'espaco-cuidados:pessoa-adicionada': () => {
      console.log('👤 Pessoa adicionada à fila');
      loadDashboard();
    },
    'espaco-cuidados:status-atualizado': () => {
      console.log('📊 Status atualizado');
      loadDashboard();
    },
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/espaco-cuidados/dashboard');
      if (response.data.success) {
        setDashboard(response.data.data);
      } else {
        setDashboard(null);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarSessao = async (data: { data: string; equipe: string[] }) => {
    try {
      const response = await api.post('/espaco-cuidados/sessao/iniciar', data);
      if (response.data.success) {
        setToast({ message: 'Sessão iniciada com sucesso!', type: 'success' });
        setShowIniciarModal(false);
        loadDashboard();
      }
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.message || 'Erro ao iniciar sessão', 
        type: 'error' 
      });
    }
  };

  const handleEncerrarSessao = async () => {
    if (!dashboard?.sessao?.id) return;
    
    if (!confirm('Tem certeza que deseja encerrar a sessão? Todos os atendimentos devem estar finalizados.')) {
      return;
    }

    try {
      const response = await api.post(`/espaco-cuidados/sessao/${dashboard.sessao.id}/encerrar`);
      if (response.data.success) {
        setToast({ message: 'Sessão encerrada com sucesso!', type: 'success' });
        loadDashboard();
      }
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.message || 'Erro ao encerrar sessão', 
        type: 'error' 
      });
    }
  };

  const handleAdicionarPessoa = async (data: any) => {
    try {
      const response = await api.post('/espaco-cuidados/fila/adicionar', data);
      if (response.data.success) {
        setToast({ message: 'Pessoa adicionada à fila!', type: 'success' });
        setShowAdicionarModal(false);
        loadDashboard();
      }
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.message || 'Erro ao adicionar pessoa', 
        type: 'error' 
      });
    }
  };

  const handleDownloadRelatorio = async (formato: 'pdf' | 'excel' | 'csv') => {
    if (!dashboard?.sessao?.id) return;

    try {
      const baseURL = 'http://localhost:3001/api';
      const url = `${baseURL}/espaco-cuidados/relatorios/${dashboard.sessao.id}/${formato}`;
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = `espaco-cuidados-${new Date().getTime()}.${formato === 'excel' ? 'xlsx' : formato}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({ message: `Relatório ${formato.toUpperCase()} baixado com sucesso!`, type: 'success' });
    } catch (error: any) {
      setToast({ message: 'Erro ao baixar relatório', type: 'error' });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Sem sessão ativa
  if (!dashboard) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <PlayCircle className="mx-auto h-24 w-24 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nenhuma Sessão Ativa
            </h2>
            <p className="text-gray-600 mb-6">
              Inicie uma nova sessão do Espaço de Cuidados para começar os atendimentos.
            </p>
            <button
              onClick={() => setShowIniciarModal(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Iniciar Nova Sessão
            </button>
          </div>

          {showIniciarModal && (
            <IniciarSessaoModal
              onClose={() => setShowIniciarModal(false)}
              onSubmit={handleIniciarSessao}
            />
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header com informações da sessão */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Espaço de Cuidados</h1>
              <p className="text-gray-600 mt-1">
                Sessão de {new Date(dashboard.sessao.data_sessao).toLocaleDateString('pt-BR')}
                {' • '}
                Iniciada às {new Date(dashboard.sessao.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Equipe: {dashboard.sessao.equipe.join(', ')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDashboard}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </button>
              
              {/* Dropdown de Relatórios */}
              <div className="relative inline-block text-left">
                <button
                  onClick={() => {
                    const menu = document.getElementById('relatorios-menu');
                    menu?.classList.toggle('hidden');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Relatórios
                </button>
                <div id="relatorios-menu" className="hidden origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleDownloadRelatorio('pdf');
                        document.getElementById('relatorios-menu')?.classList.add('hidden');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📄 Baixar PDF
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadRelatorio('excel');
                        document.getElementById('relatorios-menu')?.classList.add('hidden');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📊 Baixar Excel
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadRelatorio('csv');
                        document.getElementById('relatorios-menu')?.classList.add('hidden');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📋 Baixar CSV
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAdicionarModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Pessoa
              </button>
              <button
                onClick={handleEncerrarSessao}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <EstatisticasCard estatisticas={dashboard.estatisticas} />

        {/* Filas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Fila de Banho */}
          <FilaBanhoCard
            pessoas={dashboard.filas.banho}
            onRefresh={loadDashboard}
            onToast={(message: string, type: 'success' | 'error') => setToast({ message, type })}
          />

          {/* Fila de Atendimento */}
          <FilaAtendimentoCard
            pessoas={dashboard.filas.atendimento}
            onRefresh={loadDashboard}
            onToast={(message: string, type: 'success' | 'error') => setToast({ message, type })}
          />
        </div>

        {/* Modais */}
        {showAdicionarModal && (
          <AdicionarPessoaModal
            onClose={() => setShowAdicionarModal(false)}
            onSubmit={handleAdicionarPessoa}
          />
        )}

        {/* Toast */}
        {toast && (
          <Toast
            show={true}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  );
}
