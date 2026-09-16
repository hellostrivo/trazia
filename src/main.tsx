import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
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
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();
