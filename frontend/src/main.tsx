import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111118',
              border: '1px solid #2A2A38',
              color: '#F1F1F3',
              fontFamily: 'Sora, sans-serif',
              fontSize: '13px',
              borderRadius: '10px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#111118' },
            },
            error: {
              iconTheme: { primary: '#F43F5E', secondary: '#111118' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
