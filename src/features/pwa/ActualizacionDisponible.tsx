import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../../components/Button';

export const UPDATE_AVAILABLE_TEXT = 'Hay una nueva versión disponible';
export const UPDATE_ACTION_TEXT = 'Actualizar';
export const UPDATE_LATER_TEXT = 'Después';

interface AvisoActualizacionProps {
  onUpdate: () => void;
  onLater: () => void;
  updating: boolean;
}

/** Aviso fijo, discreto, encima de la barra inferior. Sólo la vista; el estado viene de arriba. */
export function AvisoActualizacion({ onUpdate, onLater, updating }: AvisoActualizacionProps) {
  return (
    <div className="actualizacion-disponible" role="status" aria-live="polite" aria-atomic="true">
      <p className="actualizacion-disponible__texto">
        {UPDATE_AVAILABLE_TEXT}
        <span aria-hidden="true"> · </span>
      </p>
      <div className="row">
        <Button onClick={onUpdate} disabled={updating} aria-busy={updating}>
          {updating ? 'Actualizando…' : UPDATE_ACTION_TEXT}
        </Button>
        <Button variant="ghost" onClick={onLater} disabled={updating}>
          {UPDATE_LATER_TEXT}
        </Button>
      </div>
    </div>
  );
}

/**
 * SPEC-08: registra el service worker (`registerType: 'prompt'`) y muestra el
 * aviso cuando hay una versión nueva instalada y en espera. "Actualizar" le
 * pide al service worker nuevo que tome el control y la página se recarga;
 * los datos viven en IndexedDB y no se tocan. "Después" oculta el aviso hasta
 * la próxima carga (el service worker nuevo sigue en espera).
 *
 * En `npm run dev` y en vitest el módulo virtual es un stub sin service worker.
 */
export function ActualizacionDisponible() {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('No se pudo registrar el service worker', error);
    },
  });

  if (!needRefresh) return null;

  const handleUpdate = () => {
    setUpdating(true);
    // Envía SKIP_WAITING; al activarse el nuevo service worker, el registro
    // recarga la página (evento `controlling`).
    void updateServiceWorker(true);
  };

  return (
    <AvisoActualizacion
      onUpdate={handleUpdate}
      onLater={() => setNeedRefresh(false)}
      updating={updating}
    />
  );
}
