import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import AnalyzePage from './pages/AnalyzePage';
import SamplesPage from './pages/SamplesPage';
import PatternsPage from './pages/PatternsPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/generate" element={<GeneratePage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/samples" element={<SamplesPage />} />
              <Route path="/patterns" element={<PatternsPage />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}
