// ✅✅✅ VERSÃO FINAL ATUALIZADA - REESCRITO - 2026-02-05-16:20 ✅✅✅
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from '../components/Icons';
import { apiFetch } from '../api';
import { useNavigate } from 'react-router-dom';

interface Estatisticas {
  totalGesuas: number;
  totalSistema: number;
  totalEncontradas: number;
  totalDivergencias: number;
  pessoasSemNis: number;
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

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validarArquivo(file);
  };

  const validarArquivo = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xls' && ext !== 'xlsx') {
      setErro('Formato inválido. Envie um arquivo Excel');
      setArquivo(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('Arquivo muito grande. Máximo: 5MB');
      setArquivo(null);
      return;
    }
    setArquivo(file);
    setErro('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validarArquivo(file);
  };

  const handleProcessar = async () => {
    if (!arquivo || !dataInicio || !dataFim) {
      setErro('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('dataInicio', dataInicio);
      formData.append('dataFim', dataFim);
      const response = await apiFetch<{ resultado: ResultadoConferencia }>('/api/rma/conferir', {
        method: 'POST',
        body: formData,
        headers: {},
      });
      setResultado(response.resultado);
    } catch (error: any) {
      setErro('Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>Conferência de RMA</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Compare dados do Gesuas com o sistema</p>
        
        {!resultado && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Upload do Arquivo</h3>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                style={{ border: '2px dashed ' + (isDragging ? '#2563EB' : '#ccc'), borderRadius: '8px', padding: '40px', textAlign: 'center', backgroundColor: isDragging ? '#f0f9ff' : '#fafafa' }}>
                <input type="file" id="upload" accept=".xls,.xlsx" onChange={handleArquivoChange} style={{ display: 'none' }} />
                <label htmlFor="upload" style={{ cursor: 'pointer' }}>
                  <div>{arquivo ? '✅ ' + arquivo.name : '📎 Clique ou arraste o arquivo'}</div>
                </label>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Data Início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Data Fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
              </div>
            </div>
            
            {erro && <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', marginBottom: '15px' }}>{erro}</div>}
            
            <button onClick={handleProcessar} disabled={loading || !arquivo || !dataInicio || !dataFim}
              style={{ width: '100%', padding: '14px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: (loading || !arquivo || !dataInicio || !dataFim) ? 'not-allowed' : 'pointer', opacity: (loading || !arquivo || !dataInicio || !dataFim) ? 0.5 : 1 }}>
              {loading ? 'Processando...' : 'Processar Conferência'}
            </button>
          </div>
        )}
        
        {resultado && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '20px' }}>Resultado da Conferência</h2>
            <p style={{ fontSize: '18px', color: '#10B981', marginBottom: '20px' }}>
              ✅ {resultado.encontradas.length} pessoas encontradas
            </p>
            <button onClick={() => { setResultado(null); setArquivo(null); setDataInicio(''); setDataFim(''); }}
              style={{ padding: '12px 24px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Nova Conferência
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
