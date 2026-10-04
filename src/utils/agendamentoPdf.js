let rendererPromise;

export function loadHistoryPdfRenderer() {
  if (!rendererPromise) {
    rendererPromise = Promise.all([
      import('jspdf'),
      fetch(new URL('../assets/fonts/RobotoCondensed-Regular.ttf', import.meta.url)).then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar a fonte do PDF');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 8192) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
        }
        return btoa(binary);
      }),
      fetch(`${import.meta.env?.BASE_URL || '/'}Comvaga%20Logo.png`).then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar a logo do PDF');
        return new Uint8Array(await response.arrayBuffer());
      }),
    ]).then(([{ jsPDF }, font, logo]) => ({ jsPDF, font, logo })).catch((error) => {
      rendererPromise = undefined;
      throw error;
    });
  }
  return rendererPromise;
}

export function createHistoryPdfFile(renderer, { filename, fields }) {
  const doc = new renderer.jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('RobotoCondensed-Regular.ttf', renderer.font);
  doc.addFont('RobotoCondensed-Regular.ttf', 'RobotoCondensed', 'normal');
  doc.setFont('RobotoCondensed');
  doc.setProperties({ title: 'Agendamento - Comvaga', creator: 'Comvaga' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  const logoSize = 42;
  doc.addImage(renderer.logo, 'PNG', (pageWidth - logoSize) / 2, 16, logoSize, logoSize);
  let y = 68;

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(22);
  doc.text('', pageWidth / 2, y, { align: 'center' });
  y += 18;
  doc.setFontSize(14);
  doc.text('AGENDAMENTO', margin, y);
  y += 6;
  doc.setDrawColor(230, 180, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + width, y);
  y += 12;

  for (const [label, value] of fields) {
    const content = String(value ?? '').replace(/\s+/g, ' ').trim() || '-';
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(content, width);
    if (y + 14 > bottom) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);
    y += 6;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    for (const line of lines) {
      if (y + 6 > bottom) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 6;
    }
    y += 6;
  }

  return new File([doc.output('blob')], filename, { type: 'application/pdf' });
}

export async function shareHistoryPdf(file) {
  if (typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: 'Agendamento - ', files: [file] });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
