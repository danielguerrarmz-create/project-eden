import React from 'react';
import ReactDOM from 'react-dom/client';
import { Root } from './Root';
import { ErrorBoundary } from './ui/ErrorBoundary';

// Self-hosted fonts for the documentation layer (the studio keeps its
// Google-served Fraunces + Inter). Source Serif 4 = free Freight Big Pro
// stand-in (upright + italic variable), Bodoni Moda = pull-quote serif, IBM
// Plex Mono = technical annotation face.
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/600.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
);
