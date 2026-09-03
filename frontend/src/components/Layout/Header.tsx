import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Upload, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';

const Header: React.FC = () => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      localStorage.clear();
      await signOut();
      setIsMenuOpen(false);
      window.location.href = '/';
    } catch (e) {
      console.error('Logout error:', e);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md group-hover:scale-105 transition-transform">
              <Upload className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              ShareFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {isSignedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-slate-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-slate-100/60"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Dashboard</span>
                </Link>
                
                <div className="flex items-center space-x-4 pl-4 border-l border-slate-200">
                  <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium border border-slate-200">
                    Hello, {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1.5 text-slate-600 hover:text-red-600 text-xs font-medium transition-colors hover:bg-red-50 px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-700 hover:text-blue-600 px-4 py-2 text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-slate-700 hover:text-blue-600 p-2 rounded-lg bg-slate-100"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <div className="px-4 pt-3 pb-4 space-y-2">
            {isSignedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-2 text-slate-800 hover:text-blue-600 block px-3 py-2.5 rounded-lg text-base font-medium bg-slate-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5 text-blue-600" />
                  <span>Dashboard</span>
                </Link>
                
                <div className="pt-2">
                  <div className="text-xs text-slate-500 mb-3 px-3">
                    Signed in as: <span className="text-slate-800 font-semibold">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-red-600 hover:text-red-700 px-3 py-2.5 rounded-lg text-base font-medium bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2 pt-2">
                <Link
                  to="/login"
                  className="block text-center text-slate-700 hover:text-blue-600 px-4 py-2.5 rounded-xl text-base font-medium bg-slate-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block text-center bg-blue-600 text-white px-4 py-2.5 rounded-xl text-base font-semibold shadow-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;