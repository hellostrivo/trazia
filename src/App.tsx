import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { strings } from './copy/strings';
import { Button } from './components/Button';
import { EmptyState } from './components/EmptyState';
import { ErrorBoundary } from './components/ErrorBoundary';
import Captura from './pages/Captura';
import { Configuracion } from './pages/Configuracion';
import Visualizacion from './pages/Visualizacion';
import Movimientos from './pages/Movimientos';
import {
  REMINDER_DOT_TEXT,
  useBackupReminder,
} from './features/configuracion/RecordatorioRespaldo';

function TabLink({ to, label, dot = false }: { to: string; label: string; dot?: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      // `/` es la raíz: sin `end` quedaría activa en todas las secciones.
      end={to === '/'}
      className={({ isActive: linkActive }) => `nav-link${linkActive ? ' active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
      {dot && (
        <>
          <span className="nav-dot" aria-hidden="true" />
          <span className="sr-only"> ({REMINDER_DOT_TEXT})</span>
        </>
      )}
    </NavLink>
  );
}

const navigation = [
  { to: '/', label: strings.navigation.capture },
  { to: '/visualizacion', label: strings.navigation.visualization },
  { to: '/movimientos', label: strings.navigation.movements },
  { to: '/configuracion', label: strings.navigation.settings },
];

function Nav() {
  // SPEC-07, punto 4: punto en la pestaña Configuración cuando el recordatorio está activo.
  const reminder = useBackupReminder();
  return (
    <>
      {navigation.map((item) => (
        <TabLink
          key={item.to}
          to={item.to}
          label={item.label}
          dot={item.to === '/configuracion' && reminder.due}
        />
      ))}
    </>
  );
}

/** Cromo compartido por todas las secciones: riel lateral en escritorio y barra inferior en móvil. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {strings.skipToContent}
      </a>

      <div className="app-layout">
        <aside className="sidebar" aria-label="Navegación principal">
          <div className="brand">{strings.appName}</div>
          <nav className="nav" aria-label="Secciones">
            <Nav />
          </nav>
        </aside>

        <main id="main-content" role="main">
          {children}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        <Nav />
      </nav>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();

  return (
    <Shell>
      <div className="page-shell">
        <EmptyState
          title="No encontramos esta sección"
          description="La ruta que buscas no existe. Regresa a Captura para iniciar desde el inicio."
          action={<Button onClick={() => navigate('/')}>Ir a Captura</Button>}
        />
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* SPEC-03 define Captura en `/`; `/captura` queda solo como redirección. */}
        <Route
          path="/"
          element={
            <Shell>
              <Captura />
            </Shell>
          }
        />
        <Route path="/captura" element={<Navigate to="/" replace />} />
        <Route
          path="/visualizacion"
          element={
            <Shell>
              <Visualizacion />
            </Shell>
          }
        />
        <Route
          path="/movimientos"
          element={
            <Shell>
              <Movimientos />
            </Shell>
          }
        />
        <Route
          path="/configuracion"
          element={
            <Shell>
              <Configuracion />
            </Shell>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
