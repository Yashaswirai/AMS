import React from 'react';
import { useLocation } from 'react-router-dom';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

class RouteErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route content failed to render:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-2xl p-8 text-center max-w-lg mx-auto">
          <FiAlertTriangle className="mx-auto mb-3 text-amber-500" size={32} />
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>This page could not be loaded</h1>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Please choose another tab or refresh the page and try again.
          </p>
          <button className="btn-primary mx-auto" onClick={() => window.location.reload()}>
            <FiRefreshCw /> Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RouteContentBoundary({ children }) {
  const location = useLocation();
  return <RouteErrorBoundary key={location.pathname}>{children}</RouteErrorBoundary>;
}
