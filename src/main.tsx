// Primero: apaga el JIT de Zod antes de que se definan los esquemas (ver zodConfig.ts).
import './zodConfig';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ActualizacionDisponible } from './features/pwa/ActualizacionDisponible';
import { ensureSeedCategories } from './data/repositories/categories';
import './styles/tokens.css';
import './styles/global.css';

// SPEC-01: la semilla corre una sola vez, cuando `settings.seededAt` es `null`.
// Sin esto, una instalación nueva abre Captura sin ninguna categoría.
async function bootstrap() {
  try {
    await ensureSeedCategories();
  } catch (error) {
    console.error('No se pudieron sembrar las categorías iniciales', error);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        {/* SPEC-08: registro del service worker y aviso de versión nueva. */}
        <ActualizacionDisponible />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();
