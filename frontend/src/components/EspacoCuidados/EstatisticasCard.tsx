import { Users, Clock } from '../Icons';

interface Props {
  estatisticas: {
    sessao: any;
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
  };
}

export default function EstatisticasCard({ estatisticas }: Props) {
  const { contadores, tempos } = estatisticas;

  const cards = [
    { label: 'Total', value: contadores.total, color: 'bg-gray-100 text-gray-800' },
    { label: 'Aguardando Banho', value: contadores.aguardandoBanho, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Em Banho', value: contadores.emBanho, color: 'bg-blue-100 text-blue-800' },
    { label: 'Aguardando Atend.', value: contadores.aguardandoAtendimento, color: 'bg-orange-100 text-orange-800' },
    { label: 'Em Atendimento', value: contadores.emAtendimento, color: 'bg-purple-100 text-purple-800' },
    { label: 'Concluídos', value: contadores.concluidos, color: 'bg-green-100 text-green-800' },
    { label: 'Desistências', value: contadores.desistencias, color: 'bg-red-100 text-red-800' },
    { label: 'Novos Cadastros', value: contadores.novosCadastros, color: 'bg-indigo-100 text-indigo-800' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <Users className="mr-2 h-5 w-5" />
        Estatísticas da Sessão
      </h2>

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-lg p-3 text-center`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs font-medium mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Tempos Médios */}
      <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          <span>Banho: <strong>{tempos.medioBanhoMinutos}min</strong></span>
        </div>
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          <span>Atendimento: <strong>{tempos.medioAtendimentoMinutos}min</strong></span>
        </div>
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          <span>Espera: <strong>{tempos.medioEsperaMinutos}min</strong></span>
        </div>
      </div>
    </div>
  );
}
