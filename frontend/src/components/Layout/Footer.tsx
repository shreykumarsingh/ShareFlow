import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail, Shield, Upload } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-tr from-cyan-500 to-purple-600 p-2 rounded-xl text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Upload className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                ShareFlow
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Simple, fast, and secure file & notes sharing platform. Upload files, generate shareable links, and share them with anyone, anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              <li>
                <Link 
                  to="/" 
                  className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                >
                  Upload Files
                </Link>
              </li>
              <li>
                <Link 
                  to="/dashboard" 
                  className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                >
                  User Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link 
                  to="/register" 
                  className="text-slate-400 hover:text-cyan-400 text-sm transition-colors"
                >
                  Create Free Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Security Features */}
          <div>
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Security Features</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Encrypted Storage</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Automated 7-Day Expiry</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>Password Protection</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span>Read-Only Locking</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} ShareFlow. Built with React & Node.js.
          </p>
          
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="mailto:support@fileshare.com"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;