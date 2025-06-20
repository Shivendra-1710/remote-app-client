import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import HomePage from './components/HomePage';
import { getCurrentUser, User } from './services/auth';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleAuthSuccess = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-discord-dark">
        {isRegistering ? (
          <div className="w-full max-w-md">
            <Register onSuccess={handleAuthSuccess} />
            <p className="text-center mt-4 text-zinc-400">
              Already have an account?{' '}
              <button
                onClick={() => setIsRegistering(false)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <Login onSuccess={handleAuthSuccess} />
            <p className="text-center mt-4 text-zinc-400">
              Don't have an account?{' '}
              <button
                onClick={() => setIsRegistering(true)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Register
              </button>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Return HomePage when user is logged in
  return <HomePage />;
}

export default App;
