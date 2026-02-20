import { Play, Check } from '../Icons';
import { api } from '../../api';

interface Pessoa {
  id: string;
  pessoa_id: string;
  pessoa: {
    id: string;
    nome: string;
    foto_url?: string;
  };
  ordem_chegada: number;
  posicao_banho?: number;
  status: string;
  vezes_passou_vez: number;
  hora_chegada: string;
  novo_cadastro: boolean;
  observacoes?: string;
}

interface Props {
  pessoas: Pessoa[];
  onRefresh: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function FilaBanhoCard({ pessoas, onRefresh, onToast }: Props) {
  const handleIniciarBanho = async (id: string) => {
    try {
      await api.post(`/espaco-cuidados/banho/${id}/iniciar`);
      onToast('Banho iniciado!', 'success');
      onRefresh();
    } catch (error: any) {
      onToast(error.response?.data?.message || 'Erro ao iniciar banho', 'error');
    }
  };

  const handleFinalizarBanho = async (id: string) => {
    try {
      await api.post(`/espaco-cuidados/banho/${id}/finalizar`);
      onToast('Banho finalizado!', 'success');
      onRefresh();
    } catch (error: any) {
      onToast(error.response?.data?.message || 'Erro ao finalizar banho', 'error');
    }
  };

  const handlePassarVez = async (id: string) => {
    try {
      const response = await api.post(`/espaco-cuidados/${id}/passar-vez`, { tipo: 'banho' });
      onToast(response.data.message || 'Vez passada', response.data.alerta ? 'error' : 'success');
      onRefresh();
    } catch (error: any) {
      onToast(error.response?.data?.message || 'Erro ao passar vez', 'error');
    }
  };

  const pessoasAguardando = pessoas.filter(p => p.status === 'aguardando_banho');
  const pessoasEmBanho = pessoas.filter(p => p.status === 'em_banho');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🚿 Fila de Banho</h2>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          {pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </div>

      {/* Em Banho */}
      {pessoasEmBanho.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            EM BANHO
          </h3>
          {pessoasEmBanho.map((pessoa) => (
            <div key={pessoa.id} className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {pessoa.pessoa.foto_url && (
                    <img
                      src={pessoa.pessoa.foto_url}
                      alt={pessoa.pessoa.nome}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{pessoa.pessoa.nome}</p>
                    <p className="text-xs text-gray-500">
                      Ordem: #{pessoa.ordem_chegada}
                      {pessoa.novo_cadastro && (
                        <span className="ml-2 text-green-600 font-medium">✨ NOVO</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleFinalizarBanho(pessoa.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center text-sm"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Finalizar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aguardando */}
      {pessoasAguardando.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">AGUARDANDO</h3>
          <div className="space-y-2">
            {pessoasAguardando
              .sort((a, b) => (a.posicao_banho || 0) - (b.posicao_banho || 0))
              .map((pessoa, index) => (
                <div key={pessoa.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center flex-1">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                        {index + 1}
                      </div>
                      {pessoa.pessoa.foto_url && (
                        <img
                          src={pessoa.pessoa.foto_url}
                          alt={pessoa.pessoa.nome}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{pessoa.pessoa.nome}</p>
                        <p className="text-xs text-gray-500">
                          Chegada: {new Date(pessoa.hora_chegada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {pessoa.novo_cadastro && (
                            <span className="ml-2 text-green-600 font-medium">✨ NOVO</span>
                          )}
                        </p>
                        {pessoa.vezes_passou_vez > 0 && (
                          <p className="text-xs text-orange-600 font-medium mt-1">
                            ⚠️ Passou {pessoa.vezes_passou_vez}x a vez
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {index === 0 ? (
                        <button
                          onClick={() => handleIniciarBanho(pessoa.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm"
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Iniciar
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePassarVez(pessoa.id)}
                          className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-md hover:bg-yellow-200 text-sm"
                        >
                          Passar Vez
                        </button>
                      )}
                    </div>
                  </div>
                  {pessoa.observacoes && (
                    <p className="text-xs text-gray-600 mt-2 pl-11">
                      💬 {pessoa.observacoes}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {pessoas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhuma pessoa na fila de banho</p>
        </div>
      )}
    </div>
  );
}
