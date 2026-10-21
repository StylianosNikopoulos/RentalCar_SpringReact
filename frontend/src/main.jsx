import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LangProvider } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import './assets/styles/theme.css';
import { initAnalytics } from './services/analytics';

const queryClient = new QueryClient();
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
