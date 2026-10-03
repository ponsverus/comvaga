export async function shareTextFile({ title, text, filename }) {
  const file = new File([text], filename, { type: 'text/plain' });

  if (typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
      } else {
        await navigator.share({ title, text });
      }
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
