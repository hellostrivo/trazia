import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { strings } from './copy/strings';
import { Button } from './components/Button';
import { Dialog } from './components/Dialog';
import { EmptyState } from './components/EmptyState';
import { Field, TextField } from './components/Field';
import { ProgressBar } from './components/ProgressBar';
import { StatusBadge } from './components/StatusBadge';
import { Toast } from './components/Toast';
import { MonthSwitcher } from './components/MonthSwitcher';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Configuracion } from './pages/Configuracion';
import { useState } from 'react';

function TabLink({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={({ isActive: linkActive }) => `nav-link${linkActive ? ' active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </NavLink>
  );
}

const navigation = [
  { to: '/captura', label: strings.navigation.capture },
  { to: '/visualizacion', label: strings.navigation.visualization },
  { to: '/movimientos', label: strings.navigation.movements },
  { to: '/configuracion', label: strings.navigation.settings },
];

function AppShell() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {strings.skipToContent}
      </a>

      <div className="app-layout">
        <aside className="sidebar" aria-label="Navegación principal">
          <div className="brand">{strings.appName}</div>
          <nav className="nav" aria-label="Secciones">
            {navigation.map((item) => (
              <TabLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </aside>

        <main id="main-content" className="page-shell" role="main">
          <header className="page-header">
            <h1>Resumen del mes</h1>
            <MonthSwitcher label="Seleccionar mes" value="Sep 2026" onChange={() => undefined} />
          </header>

          <div className="stack">
            <section className="card" style={{ padding: '1.5rem' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 className="heading">Presupuesto</h2>
                  <p className="muted">Disponible</p>
                </div>
                <StatusBadge>{strings.status.available}</StatusBadge>
              </div>
              <ProgressBar value={72} max={100} label="Avance del presupuesto" />
              <div className="row" style={{ marginTop: '0.75rem', justifyContent: 'space-between' }}>
                <span className="muted">$12,400 de $17,200</span>
                <StatusBadge tone="warning">{strings.status.abovePlan}</StatusBadge>
              </div>
            </section>

            <section className="card" style={{ padding: '1.5rem' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 className="heading">Captura rápida</h2>
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  Abrir diálogo
                </Button>
              </div>

              <div className="stack">
                <TextField label="Concepto" placeholder="Ej. Mercado" />
                <Field label="Categoría">
                  <select defaultValue="alimentación">
                    <option value="alimentación">Alimentación</option>
                    <option value="transporte">Transporte</option>
                  </select>
                </Field>
                <Button onClick={() => setToastOpen(true)}>Guardar</Button>
              </div>
            </section>

            <EmptyState
              title={strings.status.noMovementsThisMonth}
              description="Registra tu primer gasto para empezar a seguir el mes."
              action={<Button onClick={() => setToastOpen(true)}>Capturar movimiento</Button>}
            />
          </div>

          <Dialog open={dialogOpen} title="Confirmar acción" onClose={() => setDialogOpen(false)}>
            <p className="muted">¿Quieres continuar con la captura?</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
            </div>
          </Dialog>

          <Toast message="Guardado con éxito" open={toastOpen} onClose={() => setToastOpen(false)} />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navigation.map((item) => (
          <TabLink key={item.to} to={item.to} label={item.label} />
        ))}
      </nav>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page-shell">
      <EmptyState
        title="No encontramos esta sección"
        description="La ruta que buscas no existe. Regresa a Captura para iniciar desde el inicio."
        action={<Button onClick={() => window.history.pushState({}, '', '/captura')}>Ir a Captura</Button>}
      />
    </div>
  );
}

function ConfiguracionShell() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {strings.skipToContent}
      </a>

      <div className="app-layout">
        <aside className="sidebar" aria-label="Navegación principal">
          <div className="brand">{strings.appName}</div>
          <nav className="nav" aria-label="Secciones">
            {navigation.map((item) => (
              <TabLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </aside>

        <main id="main-content" role="main">
          <Configuracion />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navigation.map((item) => (
          <TabLink key={item.to} to={item.to} label={item.label} />
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/captura" replace />} />
        <Route path="/captura" element={<AppShell />} />
        <Route path="/visualizacion" element={<AppShell />} />
        <Route path="/movimientos" element={<AppShell />} />
        <Route path="/configuracion" element={<ConfiguracionShell />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
