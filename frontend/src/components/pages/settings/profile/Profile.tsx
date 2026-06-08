import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setFormData({
      fullName: user?.name || '',
      email: user?.email || '',
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveChanges = async () => {
    if (!formData.fullName || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/user/profile', {
        name: formData.fullName,
        email: formData.email,
      });

      updateUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await api.delete('/user/account');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-base">
          <h2 className="font-headline-md text-headline-md text-text-primary">Profile Information</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Update your personal details and how others see you.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border-base ring-4 ring-primary/10">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop"
                  alt="Profile"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="%238B8B9E"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                  }}
                />
              </div>
              <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </button>
            </div>
            <div className="space-y-2">
              <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity">
                Change Photo
              </button>
              <p className="font-body-sm text-body-sm text-text-muted">JPG, GIF or PNG. Max size of 800K</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant ml-1">Full Name</label>
              <input
                className="w-full bg-surface-container-lowest border border-border-base rounded-lg px-4 py-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant ml-1">Email Address</label>
              <input
                className="w-full bg-surface-container-lowest border border-border-base rounded-lg px-4 py-3 text-on-surface font-body-md opacity-60 cursor-not-allowed outline-none"
                type="email"
                name="email"
                value={formData.email}
                disabled
                readOnly
              />
              <p className="font-body-sm text-body-sm text-text-muted ml-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low px-6 py-4 flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-surface border border-danger/20 rounded-xl overflow-hidden">
        <div className="p-6">
          <h2 className="font-headline-md text-headline-md text-danger">Danger Zone</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Permanently delete your account and all associated data.
          </p>

          <div className="mt-8 p-4 bg-danger/5 rounded-lg border border-danger/10 flex items-start space-x-4">
            <span className="material-symbols-outlined text-danger">warning</span>
            <div>
              <h4 className="font-label-md text-label-md text-danger font-bold">Are you sure?</h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="px-6 py-2 border border-danger text-danger hover:bg-danger hover:text-white rounded-lg font-label-md text-label-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  className="px-6 py-2 bg-danger text-white hover:bg-danger/90 rounded-lg font-label-md text-label-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Deleting...' : 'Yes, Delete Forever'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="px-6 py-2 border border-border-base text-text-secondary hover:bg-surface-container-high rounded-lg font-label-md text-label-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
