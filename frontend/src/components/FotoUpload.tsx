import React, { useState, useRef } from 'react';
import { apiFetch } from '../api';

interface FotoUploadProps {
  pessoaId: string;
  fotoUrl?: string;
  onFotoUpdate: (novaFotoUrl: string | null) => void;
}

const FotoUpload: React.FC<FotoUploadProps> = ({ pessoaId, fotoUrl, onFotoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(fotoUrl || null);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload do arquivo
    await uploadFoto(file);
  };

  const uploadFoto = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);

      const pessoaAtualizada = await apiFetch(`/api/pessoas/${pessoaId}/foto`, {
        method: 'POST',
        body: formData,
      }) as any;

      onFotoUpdate(pessoaAtualizada.foto_url);
      alert('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar foto. Tente novamente.');
      setPreview(fotoUrl || null); // Reverter preview
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFoto = async () => {
    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

    try {
      await apiFetch(`/api/pessoas/${pessoaId}/foto`, {
        method: 'DELETE',
      });

      onFotoUpdate(null);
      setPreview(null);
      alert('Foto removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      alert('Erro ao remover foto. Tente novamente.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* Preview da foto com efeito de zoom */}
      <div
        style={{
          width: '150px',
          height: '150px',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          cursor: preview ? 'pointer' : 'pointer',
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease',
        }}
        onClick={() => !preview && fileInputRef.current?.click()}
        onMouseEnter={() => preview && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {preview ? (
          <img
            src={preview.startsWith('data:') ? preview : (preview.startsWith('/') ? preview : `/uploads/fotos/${preview}`)}
            alt="Foto da pessoa"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              transform: isHovered ? 'scale(3)' : 'scale(1)',
              transformOrigin: 'center center',
              position: 'relative',
              zIndex: isHovered ? 1000 : 'auto',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
            <div style={{ fontSize: '12px' }}>Clique para adicionar foto</div>
          </div>
        )}

        {uploading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              borderRadius: '6px',
            }}
          >
            Enviando...
          </div>
        )}
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {uploading ? 'Enviando...' : preview ? 'Alterar Foto' : 'Adicionar Foto'}
        </button>

        {preview && (
          <button
            type="button"
            onClick={handleDeleteFoto}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Remover
          </button>
        )}
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Instruções */}
      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        Formatos aceitos: JPG, PNG, GIF<br />
        Tamanho máximo: 5MB<br />
        {preview && <span>Passe o mouse sobre a foto para ampliá-la</span>}
      </div>
    </div>
  );
};

export default FotoUpload;
