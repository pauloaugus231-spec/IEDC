import { useEffect } from 'react';
import { io } from 'socket.io-client';

export type LojasRealtimeEventName =
  | 'lojas:atualizado'
  | 'lojas:comanda-atualizada'
  | 'lojas:cliente-atualizado'
  | 'lojas:retirada-atualizada';

export interface LojasRealtimeEvent {
  name: LojasRealtimeEventName;
  payload?: unknown;
}

function getSocketUrl() {
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
}

export function useLojasRealtime(onUpdate: (event?: LojasRealtimeEvent) => void) {
  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ['polling', 'websocket'],
      withCredentials: true,
    });

    const handleUpdate = (name: LojasRealtimeEventName) => (payload?: unknown) => {
      onUpdate({ name, payload });
    };

    const handleLojasAtualizado = handleUpdate('lojas:atualizado');
    const handleComandaAtualizada = handleUpdate('lojas:comanda-atualizada');
    const handleClienteAtualizado = handleUpdate('lojas:cliente-atualizado');
    const handleRetiradaAtualizada = handleUpdate('lojas:retirada-atualizada');

    socket.on('lojas:atualizado', handleLojasAtualizado);
    socket.on('lojas:comanda-atualizada', handleComandaAtualizada);
    socket.on('lojas:cliente-atualizado', handleClienteAtualizado);
    socket.on('lojas:retirada-atualizada', handleRetiradaAtualizada);

    return () => {
      socket.off('lojas:atualizado', handleLojasAtualizado);
      socket.off('lojas:comanda-atualizada', handleComandaAtualizada);
      socket.off('lojas:cliente-atualizado', handleClienteAtualizado);
      socket.off('lojas:retirada-atualizada', handleRetiradaAtualizada);
      socket.disconnect();
    };
  }, [onUpdate]);
}
