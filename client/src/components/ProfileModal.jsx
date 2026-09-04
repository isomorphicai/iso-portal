import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, User, Mail, Phone, Briefcase, 
  FileText, Save, Loader2, Trash2, CheckCircle2, Shield
} from 'lucide-react';
import { apiUrl } from '../config/api';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  showToast
}) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    title: '',
    bio: '',
    photo: ''
  });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        fullName: currentUser.fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        title: currentUser.title || 'Principal Systems Architect',
        bio: currentUser.bio || '',
        photo: currentUser.photo || ''
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  // Handle local image file upload & automatically resize/crop to 256x256 square avatar
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB input allowed, will be compressed to ~30-50KB)
    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('Image file must be under 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for 256x256 avatar cropping/resizing
        const canvas = document.createElement('canvas');
        const TARGET_SIZE = 256;
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setFormData(prev => ({ ...prev, photo: event.target?.result || '' }));
          return;
        }

        // Center crop math (cover aspect ratio)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(
          img,
          sx, sy, minDim, minDim, // source coords (square center crop)
          0, 0, TARGET_SIZE, TARGET_SIZE // destination coords
        );

        // Convert to high-quality JPEG/PNG data URI
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFormData(prev => ({ ...prev, photo: resizedDataUrl }));
      };

      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const sessionId = currentUser.sessionId || localStorage.getItem('iso_session_id');
      const res = await fetch(apiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId || ''
        },
        body: JSON.stringify({
          username: currentUser.username,
          sessionId: sessionId || '',
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          title: formData.title.trim(),
          bio: formData.bio.trim(),
          photo: formData.photo
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (showToast) showToast('Profile updated successfully!', 'success');
        
        // Update user across portal
        const updatedUser = {
          ...currentUser,
          ...data.user
        };
        localStorage.setItem('iso_user', JSON.stringify(updatedUser));
        if (onProfileUpdated) {
          onProfileUpdated(updatedUser);
        }
        onClose();
      } else {
        if (showToast) showToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Network error saving profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const userInitials = (formData.fullName || currentUser.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-iso-cardBg border border-iso-border rounded-md shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-iso-border flex items-center justify-between bg-iso-bgSecondary/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-iso-accent/15 border border-iso-accent/30 flex items-center justify-center text-iso-primary font-bold font-mono text-xs">
              <User size={16} />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-iso-primary">
                Edit Account Profile
              </h2>
              <p className="text-[11px] text-iso-textMuted font-mono">
                Manage personal credentials &amp; avatar
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-iso-textMuted hover:text-iso-primary hover:bg-iso-bgSecondary rounded-sm transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 text-xs">
          
          {/* Avatar & Photo Upload Section */}
          <div className="flex items-center gap-5 p-4 bg-iso-bg border border-iso-border rounded-sm">
            
            {/* Clickable Avatar with Camera Overlay */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-18 h-18 rounded-sm bg-iso-accent/15 border-2 border-iso-accent/40 flex items-center justify-center text-iso-primary font-bold font-mono text-xl shrink-0 select-none shadow-sm cursor-pointer group overflow-hidden"
              title="Click to upload avatar"
            >
              {formData.photo ? (
                <img 
                  src={formData.photo} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                  onError={() => setFormData(prev => ({ ...prev, photo: '' }))}
                />
              ) : (
                <span>{userInitials}</span>
              )}

              {/* Camera Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                <Camera size={18} />
                <span className="text-[8px] font-mono uppercase tracking-wider">Upload</span>
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleImageFileSelect}
              className="hidden" 
            />

            {/* Photo Action Buttons */}
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="font-bold text-iso-primary text-xs">Profile Avatar</span>
              <span className="text-[10px] text-iso-textMuted">JPG, PNG, or GIF up to 2MB.</span>
              
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-[11px] font-bold border border-iso-primary transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Camera size={12} />
                  <span>Upload Image</span>
                </button>

                {formData.photo && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                    className="px-2.5 py-1 text-iso-error hover:bg-iso-errorBg border border-iso-error/20 rounded-sm text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* User Role & System Identity Banner */}
          <div className="px-3 py-2 bg-iso-bgSecondary border border-iso-border rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-iso-accent" />
              <span className="text-[11px] font-mono text-iso-textMuted">System Username:</span>
              <strong className="text-xs font-mono text-iso-primary">{currentUser.username}</strong>
            </div>
            <span className="px-2 py-0.5 bg-iso-primary text-white rounded-xs text-[9px] font-mono uppercase font-bold tracking-wider">
              {currentUser.role}
            </span>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                Full Name <span className="text-iso-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3 py-2 text-xs text-iso-text outline-none transition-colors"
                  required
                />
                <User size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              </div>
            </div>

            {/* Job Title */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                Job Title / Position
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AI Operations Lead"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3 py-2 text-xs text-iso-text outline-none transition-colors"
                />
                <Briefcase size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@isomorphic.com"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3 py-2 text-xs text-iso-text outline-none transition-colors font-mono"
                />
                <Mail size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm pl-8 pr-3 py-2 text-xs text-iso-text outline-none transition-colors font-mono"
                />
                <Phone size={13} className="absolute left-2.5 top-2.5 text-iso-textMuted" />
              </div>
            </div>

          </div>

          {/* Bio / Description */}
          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-iso-textMuted block mb-1 font-bold">
              Account Bio &amp; Role Summary
            </label>
            <div className="relative">
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={2}
                placeholder="Brief summary of administrative duties or team role..."
                className="w-full bg-iso-bg border border-iso-border focus:border-iso-accent rounded-sm p-2.5 text-xs text-iso-text outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-iso-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-iso-bgSecondary hover:bg-iso-border/50 text-iso-text border border-iso-border rounded-sm text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-iso-primary hover:bg-iso-primaryLight text-white rounded-sm text-xs font-bold border border-iso-primary flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
