import { useState } from 'react';
import { X } from '../Icons';

interface Props {
  onClose: () => void;
  onSubmit: (data: { data: string; equipe: string[] }) => void;
}

export default function IniciarSessaoModal({ onClose, onSubmit }: Props) {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [equipeMembros, setEquipeMembros] = useState<string[]>(['']);

  const handleAddMembro = () => {
    setEquipeMembros([...equipeMembros, '']);
  };

  const handleRemoveMembro = (index: number) => {
    setEquipeMembros(equipeMembros.filter((_, i) => i !== index));
  };

  const handleMembroChange = (index: number, value: string) => {
    const newMembros = [...equipeMembros];
    newMembros[index] = value;
    setEquipeMembros(newMembros);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const equipeValida = equipeMembros.filter(m => m.trim() !== '');
    if (equipeValida.length === 0) {
      alert('Adicione pelo menos um membro da equipe');
      return;
    }
    onSubmit({ data, equipe: equipeValida });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Iniciar Sessão</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Sessão
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipe
            </label>
            {equipeMembros.map((membro, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={membro}
                  onChange={(e) => handleMembroChange(index, e.target.value)}
                  placeholder="Nome do colaborador"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {equipeMembros.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMembro(index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddMembro}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Adicionar membro
            </button>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Iniciar Sessão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
