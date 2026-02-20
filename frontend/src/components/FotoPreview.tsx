import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface FotoPreviewProps {
  fotoUrl?: string | null;
  size?: number;
  altText?: string;
}

const FotoPreview: React.FC<FotoPreviewProps> = ({ fotoUrl, size = 50, altText = 'Foto do perfil' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [imgErro, setImgErro] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // A URL da foto vinda do backend pode não ter o prefixo do servidor.
  const fullFotoUrl = fotoUrl 
    ? (fotoUrl.startsWith('data:') || fotoUrl.startsWith('http') ? fotoUrl : `http://localhost:3001${fotoUrl.startsWith('/') ? '' : '/'}${fotoUrl}`)
    : null;

  useEffect(() => {
    if (isHovered && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isHovered]);

  const zoomSize = 180; // Tamanho da imagem ampliada

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: fullFotoUrl ? 'pointer' : 'default',
          overflow: 'hidden',
        }}
        onMouseEnter={() => fullFotoUrl && !imgErro && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {fullFotoUrl && !imgErro ? (
          <img
            src={fullFotoUrl}
            alt={altText}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={() => setImgErro(true)}
          />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '60%', height: '60%', color: '#9ca3af' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        )}
      </div>

      {/* Overlay de zoom renderizado fora do fluxo normal via portal */}
      {isHovered && fullFotoUrl && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img
            src={fullFotoUrl}
            alt={altText}
            style={{
              width: `${zoomSize}px`,
              height: `${zoomSize}px`,
              objectFit: 'cover',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '3px solid white',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default FotoPreview;
