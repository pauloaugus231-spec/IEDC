import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';
import './FotoUpload.css';

interface FotoUploadProps {
  pessoaId: string;
  fotoUrl?: string | null;
  onFotoUpdate: (novaFotoUrl: string | null) => void;
}

const resolvePhotoUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  return `/uploads/fotos/${url}`;
};

const FotoUpload: React.FC<FotoUploadProps> = ({ pessoaId, fotoUrl, onFotoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(resolvePhotoUrl(fotoUrl));
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(resolvePhotoUrl(fotoUrl));
  }, [fotoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFeedback('');

    if (!file.type.startsWith('image/')) {
      setFeedback('Selecione um arquivo de imagem.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback('A imagem deve ter no máximo 5MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setPreview(readerEvent.target?.result as string);
    };
    reader.readAsDataURL(file);

    await uploadFoto(file);
    event.target.value = '';
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

      const novaFoto = pessoaAtualizada.foto_url || null;
      onFotoUpdate(novaFoto);
      setPreview(resolvePhotoUrl(novaFoto));
      setFeedback('Foto atualizada.');
    } catch (error) {
      console.error('Erro no upload:', error);
      setPreview(resolvePhotoUrl(fotoUrl));
      setFeedback('Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFoto = async () => {
    if (!window.confirm('Deseja remover a foto deste cadastro?')) return;

    setUploading(true);
    setFeedback('');
    try {
      await apiFetch(`/api/pessoas/${pessoaId}/foto`, {
        method: 'DELETE',
      });

      onFotoUpdate(null);
      setPreview(null);
      setFeedback('Foto removida.');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      setFeedback('Não foi possível remover a foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="foto-upload">
      <button
        className={`foto-upload-preview ${preview ? 'has-image' : ''}`}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        {preview ? (
          <img alt="Foto da pessoa atendida" src={preview} />
        ) : (
          <span>
            <strong>Foto</strong>
            <small>Adicionar imagem</small>
          </span>
        )}
        {uploading && <div className="foto-upload-loading">Enviando</div>}
      </button>

      <div className="foto-upload-actions">
        <button disabled={uploading} onClick={() => fileInputRef.current?.click()} type="button">
          {preview ? 'Alterar foto' : 'Adicionar foto'}
        </button>
        {preview && (
          <button className="danger" disabled={uploading} onClick={handleDeleteFoto} type="button">
            Remover
          </button>
        )}
      </div>

      <input
        accept="image/*"
        className="foto-upload-input"
        onChange={handleFileSelect}
        ref={fileInputRef}
        type="file"
      />

      <p className="foto-upload-hint">JPG, PNG ou GIF até 5MB.</p>
      {feedback && <p className="foto-upload-feedback">{feedback}</p>}
    </section>
  );
};

export default FotoUpload;
