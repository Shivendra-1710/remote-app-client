import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, UserStatus } from '../types/user';
import { createUser } from '../utils/api';

interface AddUserProps {
  onClose: () => void;
  onUserAdded: () => void;
}

export const AddUser: React.FC<AddUserProps> = ({ onClose, onUserAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    title: '',
    location: '',
    status: 'online' as UserStatus
  });

  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAvatarPreview = () => {
    if (customAvatar) {
      return customAvatar;
    }
    return formData.name 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}&backgroundColor=b6e3f4`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder&backgroundColor=b6e3f4`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const userData = {
        ...formData,
        avatar: customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}&backgroundColor=b6e3f4`
      };

      await createUser(userData);
      onUserAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 overflow-y-auto bg-discord-dark"
    >
      <div className="p-6 border-b border-discord-divider">
        <h2 className="text-2xl font-bold text-white">Add New User</h2>
        <p className="text-discord-text-muted mt-1">Create a new user account</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Avatar Upload Section */}
        <div className="flex items-start space-x-6 bg-discord-dark-secondary p-6 rounded-lg">
          <div 
            className="relative group cursor-pointer"
            onClick={handleAvatarClick}
          >
            <img
              src={getAvatarPreview()}
              alt="User avatar"
              className="w-24 h-24 rounded-full ring-4 ring-discord-dark object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <i className="fas fa-camera text-white mb-1" />
              <span className="text-xs text-white text-center px-2">
                {customAvatar ? 'Change Photo' : 'Upload Photo'}
              </span>
            </div>
            {customAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <i className="fas fa-times text-xs" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
            <p className="text-sm text-discord-text-muted mt-1">
              {customAvatar 
                ? 'Custom avatar uploaded. Click to change.'
                : 'Upload a custom avatar or let us generate one based on the name'}
            </p>
            <div className="mt-2 text-xs text-discord-text-muted">
              Recommended: Square image, max 5MB
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="bg-discord-dark-secondary p-6 rounded-lg space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-discord-divider pb-2">
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="johndoe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-discord-dark-secondary p-6 rounded-lg space-y-6">
            <h3 className="text-lg font-semibold text-white border-b border-discord-divider pb-2">
              Additional Information
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="Engineering"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                  placeholder="San Francisco, CA"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-discord-text">
                  Initial Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-discord-dark text-white rounded-lg 
                           border border-discord-divider focus:border-discord-accent focus:ring-1 
                           focus:ring-discord-accent outline-none transition-colors"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="busy">Busy</option>
                  <option value="in-call">In Call</option>
                  <option value="idle">Idle</option>
                  <option value="dnd">Do Not Disturb</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-discord-divider">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-discord-text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-discord-accent text-white rounded-lg
                     ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-discord-accent-hover'}
                     transition-colors`}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}; 