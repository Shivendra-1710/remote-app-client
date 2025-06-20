import React, { useState } from 'react';
import { login } from '../services/auth';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-discord-dark to-discord-dark-primary relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTEyIDI0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnptLTI0IDBjMy4zMSAwIDYgMi42OSA2IDZzLTIuNjkgNi02IDYtNi0yLjY5LTYtNiAyLjY5LTYgNi02eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mx-4 relative"
      >
        <div className="bg-discord-dark-primary/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.6 
              }}
              className="flex justify-center mb-6"
            >
              <Logo className="w-20 h-20" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Welcome back!</h2>
              <p className="text-discord-text-muted text-lg">We're excited to see you again!</p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <label htmlFor="email-address" className="text-left block text-xs font-medium text-discord-text mb-2">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-discord-text-muted" />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-discord-dark/50 rounded-lg border border-discord-divider text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-accent focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <label htmlFor="password" className="block text-left text-xs font-medium text-discord-text mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-discord-text-muted" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-discord-dark/50 rounded-lg border border-discord-divider text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-accent focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-400/10 p-4 rounded-lg border border-red-400/20 flex items-center"
              >
                <i className="fas fa-exclamation-circle text-lg mr-3" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium text-base transition-all duration-200 ${
                  isLoading
                    ? 'bg-discord-accent/70 cursor-not-allowed'
                    : 'bg-discord-accent hover:bg-discord-accent-hover transform hover:scale-[1.02] active:scale-[0.98]'
                } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-discord-accent focus:ring-offset-discord-dark-primary shadow-lg`}
              >
                {isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center"
                  >
                    <i className="fas fa-circle-notch fa-spin mr-2" />
                    Signing in...
                  </motion.div>
                ) : (
                  'Sign in'
                )}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="flex items-center justify-between text-sm mt-6"
            >
              <label className="flex items-center text-discord-text-muted hover:text-discord-text cursor-pointer">
                <input type="checkbox" className="form-checkbox h-4 w-4 text-discord-accent rounded border-discord-divider bg-discord-dark focus:ring-discord-accent" />
                <span className="ml-2">Remember me</span>
              </label>
              <a href="#" className="text-discord-accent hover:text-discord-accent-hover hover:underline transition-colors duration-200">
                Forgot password?
              </a>
            </motion.div>
          </form>
        </div>


      </motion.div>
    </div>
  );
};

export default Login; 