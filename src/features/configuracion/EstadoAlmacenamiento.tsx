import { useEffect, useState } from 'react';
import { db } from '../../data/db';
import { useLiveQuery } from '../../data/hooks/useLiveQuery';
import { getPersistenceStatus, isStoragePersisted } from '../../data/storage';

export const PERSISTENCE_PROTECTED_TEXT = 'Protegido contra borrado automático';
export const PERSISTENCE_AT_RISK_TEXT =
  'El navegador podría borrar los datos si no usas la app por un tiempo. Instálala en tu pantalla de inicio y haz respaldos.';

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatLastBackup(lastBackupAt: string | null): string {
  if (!lastBackupAt) return 'Nunca';
  const date = new Date(lastBackupAt);
  return Number.isNaN(date.getTime()) ? 'Nunca' : dateTimeFormatter.format(date);
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString('es-MX')} ${count === 1 ? singular : plural}`;
}

/**
 * Configuración › Datos y respaldo › Estado del almacenamiento (SPEC-07, punto 1).
 * Las cuentas y la fecha del último respaldo vienen de una consulta viva; el
 * estado de persistencia se consulta una vez al montar.
 */
export function EstadoAlmacenamiento() {
  const counts = useLiveQuery(async () => {
    const [categories, transactions, settings] = await Promise.all([
      db.categories.count(),
      db.transactions.count(),
      db.settings.get('app'),
    ]);
    return { categories, transactions, lastBackupAt: settings?.lastBackupAt ?? null };
  });

  // `null` mientras se consulta; el texto no se muestra hasta tener respuesta
  // para no enseñar un estado que luego cambie.
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    if (getPersistenceStatus() !== 'available') {
      setPersisted(false);
      return;
    }
    void isStoragePersisted().then((value) => {
      if (active) setPersisted(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      <h3 style={{ margin: 0 }}>Estado del almacenamiento</h3>
      <dl className="almacenamiento-lista">
        <div>
          <dt>Datos guardados</dt>
          <dd>
            {counts.data
              ? `${pluralize(counts.data.categories, 'categoría', 'categorías')} y ${pluralize(
                  counts.data.transactions,
                  'movimiento',
                  'movimientos',
                )}`
              : '…'}
          </dd>
        </div>
        <div>
          <dt>Último respaldo</dt>
          <dd>{counts.data ? formatLastBackup(counts.data.lastBackupAt) : '…'}</dd>
        </div>
        <div>
          <dt>Persistencia</dt>
          <dd>
            {persisted === null
              ? '…'
              : persisted
                ? PERSISTENCE_PROTECTED_TEXT
                : PERSISTENCE_AT_RISK_TEXT}
          </dd>
        </div>
      </dl>
    </div>
  );
}
