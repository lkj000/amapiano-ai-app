import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, Radio, Search, Library, Layers, SlidersHorizontal } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Music },
    { path: '/generate', label: 'Generate', icon: Radio },
    { path: '/analyze', label: 'Analyze', icon: Search },
    { path: '/samples', label: 'Samples', icon: Library },
    { path: '/patterns', label: 'Patterns', icon: Layers },
    { path: '/daw', label: 'DAW', icon: SlidersHorizontal },
  ];

  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-yellow-400" />
            <span className="text-2xl font-bold text-white">Amapiano AI</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  location.pathname === path
                    ? 'bg-yellow-400 text-black'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
