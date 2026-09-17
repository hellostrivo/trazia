/**
 * Configuración › Privacidad (SPEC-07, punto 6).
 *
 * Texto estático dentro del bundle: no hace ninguna petición de red, así que
 * se lee igual sin conexión (criterio 6). `id="privacidad"` es el destino del
 * enlace desde "Acerca de".
 */
export const PRIVACIDAD_SECTION_ID = 'privacidad';

export function PrivacidadSection() {
  return (
    <section
      id={PRIVACIDAD_SECTION_ID}
      className="card privacidad"
      style={{ padding: '1.5rem' }}
      aria-labelledby="privacidad-title"
    >
      <h2 id="privacidad-title" style={{ marginBottom: '1rem' }}>
        Privacidad
      </h2>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <div>
          <h3>Tus datos viven en este dispositivo</h3>
          <p>
            Todo lo que registras en TRAZIA se guarda únicamente en este dispositivo y en este
            navegador. No se envía a ningún servidor.
          </p>
        </div>

        <div>
          <h3>Sin cuentas ni rastreo</h3>
          <p>
            No hay cuentas ni contraseñas. La app no usa analítica, publicidad ni rastreo, y no se
            conecta con bancos ni con ningún otro servicio.
          </p>
        </div>

        <div>
          <h3>Sin sincronización entre dispositivos</h3>
          <p>
            Cada dispositivo guarda sus propios datos. Si usas TRAZIA en el teléfono y en la
            computadora, verás información distinta en cada uno.
          </p>
        </div>

        <div>
          <h3>Cómo respaldar</h3>
          <p>
            En Configuración › Datos y respaldo puedes descargar un archivo con todas tus
            categorías, presupuestos y movimientos, y volver a cargarlo en este u otro dispositivo.
            El archivo no está cifrado; guárdalo en un lugar seguro.
          </p>
        </div>

        <div>
          <h3>Si se borran los datos del navegador</h3>
          <p>
            Si limpias los datos del navegador, eliminas la app o el sistema decide liberar espacio,
            la información se pierde y no hay forma de recuperarla salvo desde un respaldo. Instalar
            la app en la pantalla de inicio y respaldar con regularidad reduce ese riesgo.
          </p>
        </div>

        <div>
          <h3>Archivos exportados</h3>
          <p>
            Los respaldos, el Excel y el PDF que descargas quedan fuera de la app y bajo tu
            responsabilidad: tú decides dónde guardarlos y con quién compartirlos.
          </p>
        </div>
      </div>
    </section>
  );
}
