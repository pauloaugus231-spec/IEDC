import { useState, useEffect } from 'react';
import { X, Search } from '../Icons';
import { api } from '../../api';

interface Props {
  onClose: () => void;
  onSubmit: (data: {
    pessoaId: string;
    querBanho: boolean;
    querAtendimento: boolean;
    observacoes?: string;
  }) => void;
}

interface Pessoa {
  id: string;
  nome: string;
  cpf?: string;
  foto_url?: string;
}

export default function AdicionarPessoaModal({ onClose, onSubmit }: Props) {
  const [busca, setBusca] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [querBanho, setQuerBanho] = useState(true);
  const [querAtendimento, setQuerAtendimento] = useState(true);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (busca.length >= 2) {
      buscarPessoas();
    } else {
      setPessoas([]);
    }
  }, [busca]);

  const buscarPessoas = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/pessoas/search?q=${busca}`);
      setPessoas(response.data.data || []);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
      setPessoas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaSelecionada) {
      alert('Selecione uma pessoa');
      return;
    }
    if (!querBanho && !querAtendimento) {
      alert('Selecione pelo menos banho ou atendimento');
      return;
    }
    onSubmit({
      pessoaId: pessoaSelecionada.id,
      querBanho,
      querAtendimento,
      observacoes: observacoes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Adicionar Pessoa na Fila</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Buscar Pessoa */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Pessoa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite nome ou CPF..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {loading && (
              <p className="text-sm text-gray-500 mt-2">Buscando...</p>
            )}
            {pessoas.length > 0 && !pessoaSelecionada && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {pessoas.map((pessoa) => (
                  <button
                    key={pessoa.id}
                    type="button"
                    onClick={() => {
                      setPessoaSelecionada(pessoa);
                      setBusca('');
                      setPessoas([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-3"
                  >
                    {pessoa.foto_url && (
                      <img
                        src={pessoa.foto_url}
                        alt={pessoa.nome}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{pessoa.nome}</p>
                      {pessoa.cpf && (
                        <p className="text-sm text-gray-500">{pessoa.cpf}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pessoa Selecionada */}
          {pessoaSelecionada && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pessoaSelecionada.foto_url && (
                  <img
                    src={pessoaSelecionada.foto_url}
                    alt={pessoaSelecionada.nome}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{pessoaSelecionada.nome}</p>
                  {pessoaSelecionada.cpf && (
                    <p className="text-sm text-gray-600">{pessoaSelecionada.cpf}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPessoaSelecionada(null)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Solicitações */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O que a pessoa deseja?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={querBanho}
                  onChange={(e) => setQuerBanho(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">Banho</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={querAtendimento}
                  onChange={(e) => setQuerAtendimento(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">Atendimento Social</span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Primeira vez no espaço, necessita roupas..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!pessoaSelecionada}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar na Fila
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
