// ShareFlow Vercel Production Build Tag: 2026-09-01T15:02:00Z
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || 'pk_test_ZW5vdWdoLWVncmV0LTgyNC5jbGVyay5hY2NvdW50cy5kZXYk';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-amber-200">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            🔑
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Clerk Account Setup Required</h2>
          <p className="text-gray-600 mb-4 text-sm">
            To enable user authentication, please add your Clerk Publishable Key to your <code className="bg-gray-100 px-2 py-0.5 rounded text-indigo-600 font-mono text-xs">frontend/.env</code> file:
          </p>
          <div className="bg-gray-900 text-emerald-400 p-4 rounded-lg text-left text-xs font-mono overflow-x-auto mb-4">
            REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
          </div>
          <p className="text-xs text-gray-500">
            You can get your free API key at <a href="https://clerk.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">clerk.com</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/download/:id" element={<DownloadPage />} />
              <Route path="/login/*" element={
                <div className="flex items-center justify-center min-h-screen bg-slate-50 p-8">
                  <SignIn
                    afterSignInUrl="/dashboard"
                    signUpUrl="/register"
                  />
                </div>
              } />
              <Route path="/register/*" element={
                <div className="flex items-center justify-center min-h-screen bg-slate-50 p-8">
                  <SignUp
                    afterSignUpUrl="/login"
                    signInUrl="/login"
                  />
                </div>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              },
              success: {
                style: {
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                },
              },
              error: {
                style: {
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca'
                },
              },
            }}
          />
        </div>
      </Router>
    </ClerkProvider>
  );
}

export default App;
