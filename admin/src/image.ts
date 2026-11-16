/**
 * Prepara a foto de capa no navegador antes do envio:
 *  - aceita só JPEG, PNG ou WebP de até 15 MB na origem;
 *  - redimensiona para no máximo 1600 px de largura;
 *  - recodifica em JPEG, o que descarta metadados (EXIF/GPS) do arquivo original.
 * O bucket no servidor também limita tipo (jpeg/png/webp) e tamanho (5 MB).
 */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1600;

export async function prepareCover(file: File): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Imagem muito grande (máximo 15 MB).');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Não foi possível processar a imagem.');
  if (blob.size > MAX_OUTPUT_BYTES) throw new Error('Mesmo reduzida, a imagem passou de 5 MB.');
  return blob;
}
