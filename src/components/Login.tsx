import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { Cpu, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-aec-bg flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-10 text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-aec-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-aec-accent/30">
            <Cpu className="text-white w-12 h-12" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">AEC Auto Hub</h1>
          <p className="text-slate-400">Securely manage and automate your AEC workflows in the cloud.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-400 leading-relaxed">
              <p className="font-bold mb-1">Login Error</p>
              {error}
            </div>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <Loader2 className="w-6 h-6 animate-spin text-aec-accent" />
          ) : (
            <img src="https://www.gstatic.com/firebase/static/bin/white/google.svg" alt="Google" className="w-6 h-6" />
          )}
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            Powered by Firebase & Gemini
          </p>
          <p className="text-[9px] text-slate-600 max-w-[200px] mx-auto">
            Note: If the popup doesn't appear, please check your browser's popup blocker.
          </p>
        </div>
      </div>
    </div>
  );
}
