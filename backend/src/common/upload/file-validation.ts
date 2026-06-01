import { BadRequestException } from '@nestjs/common';

const MB = 1024 * 1024;

export const FILE_LIMITS = {
  pessoaFoto: 5 * MB,
  rmaPlanilha: 5 * MB,
};

export function assertImageUpload(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('Nenhum arquivo enviado.');
  }

  if (file.size > FILE_LIMITS.pessoaFoto) {
    throw new BadRequestException('Imagem deve ter no máximo 5MB.');
  }

  if (!isSupportedImage(file.buffer)) {
    throw new BadRequestException('Arquivo de imagem inválido. Use JPG, PNG ou WebP.');
  }
}

export function resolveImageExtension(file: Express.Multer.File) {
  const buffer = file.buffer;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return '.png';
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }

  throw new BadRequestException('Arquivo de imagem inválido. Use JPG, PNG ou WebP.');
}

export function assertXlsxUpload(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('Arquivo não enviado.');
  }

  if (file.size > FILE_LIMITS.rmaPlanilha) {
    throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 5MB.');
  }

  if (!isXlsx(file)) {
    throw new BadRequestException('Formato de arquivo inválido. Envie um arquivo .xlsx.');
  }
}

function isSupportedImage(buffer: Buffer) {
  if (buffer.length < 12) {
    return false;
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

  return isJpeg || isPng || isWebp;
}

function isXlsx(file: Express.Multer.File) {
  const extensionOk = /\.xlsx$/i.test(file.originalname || '');
  const mimeOk = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const zipMagicOk = file.buffer.length >= 4 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;

  return extensionOk && mimeOk && zipMagicOk;
}
