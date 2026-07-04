/**
 * ErrorBoundary.tsx — the last line of defence for a public link.
 *
 * If anything in the tree throws (a three.js edge case, a lost WebGL context,
 * a bad state), a reviewer must never see a white screen. This catches, shows
 * a calm paper-styled apology with the error message, and offers a one-click
 * reload. Styling is inline-safe (no Tailwind dependency) so it renders even
 * if the CSS layer itself is what broke.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[living folly] render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#F6F4EE',
          color: '#1E1B17',
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>
            🌱
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
            something snapped a twig
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#57514A', margin: '0 0 6px' }}>
            The demo hit an unexpected error. Reloading usually fixes it.
          </p>
          <p
            style={{
              fontSize: 12,
              color: '#8B857B',
              fontFamily: 'ui-monospace, monospace',
              margin: '0 0 20px',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              borderRadius: 999,
              border: 'none',
              background: '#1E1B17',
              color: '#F6F4EE',
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            reload the demo
          </button>
        </div>
      </div>
    );
  }
}
