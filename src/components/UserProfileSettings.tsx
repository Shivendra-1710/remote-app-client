import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '../types/user';

interface UserProfileSettingsProps {
  user: User;
  onSave: (updatedProfile: Partial<User>) => void;
  onCancel: () => void;
}

export const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({
  user,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    username: user.username,
    title: user.title || '',
    department: user.department || '',
    location: user.location || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState(user.avatar);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Update avatar preview when name changes
    if (name === 'name') {
      setPreviewAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${value}&backgroundColor=b6e3f4`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        avatar: previewAvatar,
      });
      onCancel();
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 overflow-y-auto"
    >
      <div className="p-6 border-b border-discord-divider">
        <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
        <p className="text-discord-text-muted mt-1">Change your profile information</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Avatar Preview Section */}
        <div className="flex items-start space-x-6">
          <div className="relative group">
            <img
              src={previewAvatar}
              alt={formData.name}
              className="w-24 h-24 rounded-full ring-4 ring-discord-dark-secondary"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">Updates with name</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-discord-text">Profile Picture</h3>
            <p className="text-sm text-discord-text-muted mt-1">
              Your avatar is automatically generated based on your name using DiceBear Avatars
            </p>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-discord-text border-b border-discord-divider pb-2">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-discord-text">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-discord-text">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-discord-text">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Work Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-discord-text border-b border-discord-divider pb-2">
            Work Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-discord-text">
                Job Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
              />
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
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
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
                className="w-full px-3 py-2 bg-discord-dark-secondary text-white rounded-lg 
                         border border-discord-divider focus:border-discord-accent focus:ring-1 
                         focus:ring-discord-accent outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="p-4 bg-discord-dark-secondary rounded-lg border border-discord-divider">
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium
              ${user.role === 'admin' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
            >
              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
            </div>
            <span className="text-discord-text-muted text-sm">
              Your role cannot be changed here. Contact an administrator for role changes.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-discord-divider">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-discord-text hover:text-white hover:bg-discord-hover 
                     rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-discord-accent text-white rounded-lg
                     transition-colors ${
                       isSubmitting
                         ? 'opacity-50 cursor-not-allowed'
                         : 'hover:bg-discord-accent-hover'
                     }`}
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <i className="fas fa-spinner fa-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}; 