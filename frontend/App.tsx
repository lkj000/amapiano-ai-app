import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import AnalyzePage from './pages/AnalyzePage';
import SamplesPage from './pages/SamplesPage';
import PatternsPage from './pages/PatternsPage';
import DawPage from './pages/DawPage';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isDawPage = location.pathname === '/daw';

  return (
    <div className={`min-h-screen ${isDawPage ? 'bg-background' : 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'}`}>
      <Header />
      <main className={!isDawPage ? "container mx-auto px-4 py-8" : "h-[calc(100vh-4rem)]"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/samples" element={<SamplesPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/daw" element={<DawPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
