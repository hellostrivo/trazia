import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../data/db';
import { RespaldoSection, formatBackupSummary } from '../../features/configuracion/RespaldoSection';
import {
  PERSISTENCE_AT_RISK_TEXT,
  PERSISTENCE_PROTECTED_TEXT,
  formatLastBackup,
} from '../../features/configuracion/EstadoAlmacenamiento';
import { BACKUP_MAX_BYTES } from '../../services/backup/backupSchema';
import * as deliverFileModule from '../../services/files/deliverFile';
import { makeValidBackup } from './fixtures';

function jsonFile(content: unknown, name = 'trazia-respaldo-2026-09-16.json'): File {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return new File([text], name, { type: 'application/json' });
}

async function seedCurrentData() {
  const backup = makeValidBackup();
  await db.categories.bulkPut([
    { ...backup.data.categories[0]!, id: 'actual-cat', name: 'Actual' },
  ]);
  await db.transactions.bulkPut([
    {
      ...backup.data.transactions[0]!,
      id: 'actual-tx',
      categoryId: 'actual-cat',
      concept: 'Movimiento actual',
    },
  ]);
  await db.settings.put({
    key: 'app',
    seededAt: '2026-01-01T00:00:00.000Z',
    lastBackupAt: null,
    persistenceRequested: false,
    backupReminderDismissedAt: null,
  });
}

function setPersisted(value: boolean | 'unsupported') {
  if (value === 'unsupported') {
    // jsdom no trae `navigator.storage`; se retira lo que puso otra prueba.
    delete (navigator as { storage?: unknown }).storage;
    return;
  }
  const storage = { persist: vi.fn(async () => value), persisted: vi.fn(async () => value) };
  Object.defineProperty(navigator, 'storage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('RespaldoSection (SPEC-07, puntos 1 a 3)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    setPersisted(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatos', () => {
    it('vista previa: "Contiene N categorías y M movimientos (del … al …)"', () => {
      expect(
        formatBackupSummary({
          categories: 2,
          transactions: 3,
          range: { from: '2026-03-01', to: '2026-09-16' },
        }),
      ).toBe(
        'Contiene 2 categorías y 3 movimientos (del 1 de marzo de 2026 al 16 de septiembre de 2026)',
      );
      expect(
        formatBackupSummary({
          categories: 1,
          transactions: 1,
          range: { from: '2026-09-16', to: '2026-09-16' },
        }),
      ).toBe(
        'Contiene 1 categoría y 1 movimiento (del 16 de septiembre de 2026 al 16 de septiembre de 2026)',
      );
      expect(formatBackupSummary({ categories: 8, transactions: 0, range: null })).toBe(
        'Contiene 8 categorías y 0 movimientos',
      );
    });

    it('último respaldo: "Nunca" cuando no hay fecha', () => {
      expect(formatLastBackup(null)).toBe('Nunca');
      expect(formatLastBackup('no-es-fecha')).toBe('Nunca');
      expect(formatLastBackup('2026-09-16T10:00:00.000Z')).toMatch(/2026/);
    });
  });

  describe('estado del almacenamiento (punto 1)', () => {
    it('muestra cuentas, último respaldo y el aviso cuando no hay persistencia', async () => {
      await seedCurrentData();
      render(<RespaldoSection />);

      expect(await screen.findByText('1 categoría y 1 movimiento')).toBeInTheDocument();
      expect(screen.getByText('Nunca')).toBeInTheDocument();
      expect(await screen.findByText(PERSISTENCE_AT_RISK_TEXT)).toBeInTheDocument();
    });

    it('muestra "Protegido contra borrado automático" cuando el navegador concedió la persistencia', async () => {
      setPersisted(true);
      render(<RespaldoSection />);
      expect(await screen.findByText(PERSISTENCE_PROTECTED_TEXT)).toBeInTheDocument();
    });

    it('sin API de almacenamiento muestra el aviso', async () => {
      setPersisted('unsupported');
      render(<RespaldoSection />);
      expect(await screen.findByText(PERSISTENCE_AT_RISK_TEXT)).toBeInTheDocument();
    });
  });

  describe('descargar (punto 2)', () => {
    it('muestra el aviso de cifrado, entrega el archivo y actualiza lastBackupAt', async () => {
      await seedCurrentData();
      const deliver = vi.spyOn(deliverFileModule, 'deliverFile').mockResolvedValue(undefined);
      render(<RespaldoSection />);

      expect(
        screen.getByText('El respaldo no está cifrado. Guárdalo en un lugar seguro.'),
      ).toBeInTheDocument();
      await userEvent.click(await screen.findByRole('button', { name: 'Descargar respaldo' }));

      await waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));
      const [blob, filename, mime] = deliver.mock.calls[0]!;
      expect(blob).toBeInstanceOf(Blob);
      expect(filename).toMatch(/^trazia-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
      expect(mime).toBe('application/json');

      expect(await screen.findByRole('status')).toHaveTextContent('Respaldo descargado.');
      await waitFor(async () => {
        expect((await db.settings.get('app'))?.lastBackupAt).not.toBeNull();
      });
      // El estado del almacenamiento deja de decir "Nunca".
      await waitFor(() => expect(screen.queryByText('Nunca')).not.toBeInTheDocument());
    });

    it('si la entrega falla no actualiza lastBackupAt y avisa', async () => {
      await seedCurrentData();
      vi.spyOn(deliverFileModule, 'deliverFile').mockRejectedValue(new Error('sin permiso'));
      render(<RespaldoSection />);

      await userEvent.click(await screen.findByRole('button', { name: 'Descargar respaldo' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo generar el archivo. Intenta de nuevo.',
      );
      expect((await db.settings.get('app'))?.lastBackupAt).toBeNull();
    });
  });

  describe('restaurar (punto 3)', () => {
    const input = () => screen.getByLabelText('Archivo de respaldo') as HTMLInputElement;

    it('valida, muestra la vista previa, confirma y reemplaza en orden', async () => {
      await seedCurrentData();
      render(<RespaldoSection />);
      await screen.findByText('1 categoría y 1 movimiento');

      await userEvent.upload(input(), jsonFile(makeValidBackup()));

      const preview = await screen.findByTestId('respaldo-vista-previa');
      expect(preview).toHaveTextContent(
        'Contiene 2 categorías y 3 movimientos (del 1 de marzo de 2026 al 16 de septiembre de 2026)',
      );
      // Nada cambió aún.
      expect(await db.transactions.count()).toBe(1);

      await userEvent.click(within(preview).getByRole('button', { name: 'Restaurar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Restaurar respaldo' });
      expect(dialog).toHaveTextContent('Esto reemplazará todos tus datos actuales.');
      expect(
        within(dialog).getByRole('button', { name: 'Descargar respaldo actual primero' }),
      ).toBeInTheDocument();
      expect(await db.transactions.count()).toBe(1);

      await userEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar' }));

      expect(
        await screen.findByText('Respaldo restaurado. Tus datos ya están actualizados.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect((await db.transactions.toArray()).map((t) => t.id).sort()).toEqual([
        'tx-1',
        'tx-2',
        'tx-3',
      ]);
      expect((await db.categories.toArray()).map((c) => c.id).sort()).toEqual([
        'cat-hogar',
        'cat-super',
      ]);
      // El estado del almacenamiento refleja los datos nuevos.
      expect(await screen.findByText('2 categorías y 3 movimientos')).toBeInTheDocument();
      expect(input().value).toBe('');
    });

    it('"Descargar respaldo actual primero" entrega los datos actuales sin cerrar la confirmación', async () => {
      await seedCurrentData();
      const deliver = vi.spyOn(deliverFileModule, 'deliverFile').mockResolvedValue(undefined);
      render(<RespaldoSection />);

      await userEvent.upload(input(), jsonFile(makeValidBackup()));
      await userEvent.click(
        within(await screen.findByTestId('respaldo-vista-previa')).getByRole('button', {
          name: 'Restaurar',
        }),
      );
      const dialog = await screen.findByRole('dialog', { name: 'Restaurar respaldo' });
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Descargar respaldo actual primero' }),
      );

      await waitFor(() => expect(deliver).toHaveBeenCalledTimes(1));
      const blob = deliver.mock.calls[0]![0];
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });
      const exported = JSON.parse(text) as { data: { transactions: Array<{ id: string }> } };
      expect(exported.data.transactions.map((t) => t.id)).toEqual(['actual-tx']);

      expect(screen.getByRole('dialog', { name: 'Restaurar respaldo' })).toBeInTheDocument();
      expect(await db.transactions.count()).toBe(1);
    });

    it('cancelar en la vista previa o en el diálogo no toca nada', async () => {
      await seedCurrentData();
      render(<RespaldoSection />);

      await userEvent.upload(input(), jsonFile(makeValidBackup()));
      const preview = await screen.findByTestId('respaldo-vista-previa');
      await userEvent.click(within(preview).getByRole('button', { name: 'Restaurar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Restaurar respaldo' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('respaldo-vista-previa')).toBeInTheDocument();

      await userEvent.click(
        within(screen.getByTestId('respaldo-vista-previa')).getByRole('button', {
          name: 'Cancelar',
        }),
      );
      expect(screen.queryByTestId('respaldo-vista-previa')).not.toBeInTheDocument();
      expect(await db.transactions.count()).toBe(1);
      expect(input().value).toBe('');
    });

    it.each([
      ['no es JSON', jsonFile('{ esto no'), 'Este archivo no es un respaldo de TRAZIA.'],
      [
        'otra app',
        jsonFile({ ...makeValidBackup(), app: 'otra' }),
        'Este archivo no es un respaldo de TRAZIA.',
      ],
      [
        'versión más nueva',
        jsonFile({ ...makeValidBackup(), formatVersion: 2 }),
        'Este respaldo se creó con una versión más reciente de TRAZIA. Actualiza la app e inténtalo de nuevo.',
      ],
      [
        'referencia rota',
        (() => {
          const backup = makeValidBackup();
          backup.data.transactions[0]!.categoryId = 'nadie';
          return jsonFile(backup);
        })(),
        'El respaldo tiene datos incompletos o dañados. Tus datos actuales no se modificaron.',
      ],
    ])('%s: muestra el mensaje exacto y no modifica nada', async (_label, file, message) => {
      await seedCurrentData();
      render(<RespaldoSection />);

      await userEvent.upload(input(), file);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByTestId('respaldo-vista-previa')).not.toBeInTheDocument();
      expect((await db.transactions.toArray()).map((t) => t.id)).toEqual(['actual-tx']);
      expect(input().value).toBe('');
    });

    it('rechaza archivos de más de 20 MB sin leerlos', async () => {
      await seedCurrentData();
      render(<RespaldoSection />);

      const big = jsonFile(makeValidBackup());
      Object.defineProperty(big, 'size', { value: BACKUP_MAX_BYTES + 1 });
      const readAsText = vi.spyOn(FileReader.prototype, 'readAsText');

      await userEvent.upload(input(), big);

      expect(await screen.findByRole('alert')).toHaveTextContent('El archivo supera 20 MB.');
      expect(readAsText).not.toHaveBeenCalled();
    });

    it('si la transacción falla, avisa que nada cambió y la base queda igual', async () => {
      await seedCurrentData();
      vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('fallo simulado'));
      render(<RespaldoSection />);

      await userEvent.upload(input(), jsonFile(makeValidBackup()));
      await userEvent.click(
        within(await screen.findByTestId('respaldo-vista-previa')).getByRole('button', {
          name: 'Restaurar',
        }),
      );
      const dialog = await screen.findByRole('dialog', { name: 'Restaurar respaldo' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reemplazar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo restaurar el respaldo. Tus datos actuales no se modificaron.',
      );
      expect((await db.transactions.toArray()).map((t) => t.id)).toEqual(['actual-tx']);
      expect((await db.categories.toArray()).map((c) => c.id)).toEqual(['actual-cat']);
    });
  });
});
