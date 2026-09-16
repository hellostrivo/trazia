import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deliverFile } from '../../services/files/deliverFile';

describe('deliverFile (web)', () => {
  const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => 'blob:trazia/archivo');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('dispara un enlace de descarga con el nombre y libera la URL después', async () => {
    const clicks: Array<{ href: string; download: string }> = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push({ href: this.href, download: this.download });
    });

    await deliverFile(new Blob(['hola']), 'trazia-plan-2026-09.pdf', 'application/pdf');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe('application/pdf');
    expect(clicks).toEqual([{ href: 'blob:trazia/archivo', download: 'trazia-plan-2026-09.pdf' }]);
    // El enlace no se queda en el documento.
    expect(document.querySelector('a[download]')).toBeNull();

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:trazia/archivo');

    clickSpy.mockRestore();
  });
});
