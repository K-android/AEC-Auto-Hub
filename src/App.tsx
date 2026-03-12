/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { auth, onAuthStateChanged, User } from './firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-aec-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-aec-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="antialiased">
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}
