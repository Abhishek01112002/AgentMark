import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);

  useEffect(() => {
    setFormData({
      fullName: user?.name || '',
    });
    setAvatarUrl(user?.avatarUrl || null);
  }, [user]);

  const initials = useMemo(() => {
    const source = formData.fullName || user?.name || 'User';
    const parts = source.split(' ').filter(Boolean).slice(0, 2);
    const value = parts.map((part) => part[0]?.toUpperCase()).join('');
    return value || 'U';
  }, [formData.fullName, user?.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const uploadToImageKit = async (file: File) => {
    const uploadResponse = await api.get('/imagekit/auth');
    const { token, expire, signature, publicKey } = uploadResponse.data;
    const uploadEndpoint =
      import.meta.env.VITE_IMAGEKIT_UPLOAD_ENDPOINT || 'https://upload.imagekit.io/api/v1/files/upload';

    if (!publicKey) {
      throw new Error('ImageKit is not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('token', token);
    formData.append('expire', String(expire));
    formData.append('signature', signature);
    formData.append('publicKey', publicKey);

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let details = 'Failed to upload image';
      try {
        const errorBody = await response.json();
        details = errorBody?.message || errorBody?.error || details;
      } catch {
        // ignore JSON parsing issues and fall back to generic message
      }
      throw new Error(details);
    }

    const result = await response.json();
    return result.url as string;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 800 * 1024) {
      toast.error('Please choose an image smaller than 800KB');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadToImageKit(file);
      setAvatarUrl(uploadedUrl);
      toast.success('Photo uploaded');
    } catch (error: any) {
      const message = error?.message || 'unable to reach ImageKit';
      toast.error(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveChanges = async () => {
    if (!formData.fullName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/auth/me', {
        name: formData.fullName,
        avatarUrl,
      });

      updateUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to update profile';
      toast.error(`Could not save profile: ${message}`);
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
      const message = error.response?.data?.error || error.message || 'Failed to delete account';
      toast.error(`Could not delete account: ${message}`);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-base">
          <h2 className="font-headline-md text-headline-md text-text-primary">Profile Information</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Update your personal details and how others see you.
          </p>
        </div>

        <div className="p-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border-base ring-4 ring-primary/10 bg-[#111118]">
                {avatarUrl ? (
                  <img className="w-full h-full object-cover" src={avatarUrl} alt="Profile" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#c0c1ff]">
                    <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}>
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="text-white animate-spin" size={20} />
                ) : (
                  <Camera className="text-white" size={20} />
                )}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="px-4 py-2 border border-border-base text-text-secondary rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                    disabled={isUploading}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <p className="font-body-sm text-body-sm text-text-muted">
                JPG, GIF or PNG. Max size of 800K.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

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
                value={user?.email || ''}
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
            disabled={isLoading || isUploading}
            className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

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
