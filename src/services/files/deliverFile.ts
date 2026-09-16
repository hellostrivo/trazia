/**
 * Entrega un archivo generado en memoria a la persona usuaria.
 *
 * En web crea una URL temporal con `URL.createObjectURL`, dispara un enlace de
 * descarga y libera la URL después. Está aislado en su propio módulo porque
 * SPEC-09 lo reimplementará para iOS (hoja de compartir / Guardar en Archivos).
 */
export async function deliverFile(blob: Blob, filename: string, mime: string): Promise<void> {
  const typed = blob.type === mime ? blob : new Blob([blob], { type: mime });
  const url = URL.createObjectURL(typed);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Safari cancela la descarga si la URL se revoca en el mismo tic del clic.
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}
