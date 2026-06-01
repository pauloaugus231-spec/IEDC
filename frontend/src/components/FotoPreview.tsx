import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './FotoPreview.css';

interface FotoPreviewProps {
  fotoUrl?: string | null;
  size?: number;
  altText?: string;
}

const FotoPreview: React.FC<FotoPreviewProps> = ({ fotoUrl, size = 50, altText = 'Foto do perfil' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgErro, setImgErro] = useState(false);

  // A URL da foto vinda do backend pode não ter o prefixo do servidor.
  const fullFotoUrl = fotoUrl 
    ? (fotoUrl.startsWith('data:') || fotoUrl.startsWith('http') ? fotoUrl : `${fotoUrl.startsWith('/') ? '' : '/'}${fotoUrl}`)
    : null;

  const sizeClass = size >= 100 ? 'large' : size >= 58 ? 'medium' : 'small';

  return (
    <>
      <div
        className={`foto-preview-thumb ${sizeClass} ${fullFotoUrl && !imgErro ? 'interactive' : ''}`}
        onMouseEnter={() => fullFotoUrl && !imgErro && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {fullFotoUrl && !imgErro ? (
          <img
            src={fullFotoUrl}
            alt={altText}
            className="foto-preview-image"
            onError={() => setImgErro(true)}
          />
        ) : (
          <svg className="foto-preview-placeholder" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        )}
      </div>

      {isHovered && fullFotoUrl && ReactDOM.createPortal(
        <div className="foto-preview-zoom" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <img
            src={fullFotoUrl}
            alt={altText}
            className="foto-preview-zoom-image"
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default FotoPreview;
