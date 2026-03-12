import React from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { Cpu, LogIn } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
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

        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          <img src="https://www.gstatic.com/firebase/static/bin/white/google.svg" alt="Google" className="w-6 h-6" />
          Sign in with Google
        </button>

        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Powered by Firebase & Gemini
        </p>
      </div>
    </div>
  );
}
