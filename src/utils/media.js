export function isImageFile(file) {
  return !!file && String(file.type || '').toLowerCase().startsWith('image/');
}

export const MEDIA_LIMITS = Object.freeze({
  galleryInputBytes: 15 * 1024 * 1024,
  logoInputBytes: 3 * 1024 * 1024,
  avatarInputBytes: 3 * 1024 * 1024,
  galleryMaxDimension: 1600,
  logoMaxDimension: 512,
  avatarMaxDimension: 512,
});

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem para conversao.'));
    };

    image.src = objectUrl;
  });
}

export async function convertImageToWebp(file, { quality = 0.9, maxDimension = null } = {}) {
  if (!isImageFile(file)) {
    throw new Error('Arquivo de imagem invalido.');
  }

  const image = await loadImageFromFile(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const dimensionLimit = Number(maxDimension);
  const scale = Number.isFinite(dimensionLimit) && dimensionLimit > 0
    ? Math.min(1, dimensionLimit / Math.max(originalWidth, originalHeight))
    : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(originalWidth * scale));
  canvas.height = Math.max(1, Math.round(originalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Falha ao preparar canvas para conversao.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Falha ao gerar arquivo WebP.'));
    }, 'image/webp', quality);
  });

  const originalName = String(file.name || 'imagem').replace(/\.[^.]+$/, '');
  return new File([blob], `${originalName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
