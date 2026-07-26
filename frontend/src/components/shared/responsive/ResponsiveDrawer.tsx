import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ResponsiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 md:pl-0 w-full sm:w-[480px]">
        <div className="w-full bg-[#0D0D14] border-l border-[#1E1E2B] shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#1E1E2B] flex items-center justify-between">
            <h3 className="text-sm font-bold font-sora text-white truncate">
              {title || 'Details'}
            </h3>
            <button
              onClick={onClose}
              className="touch-target-sm rounded-lg text-[#8B8B9E] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 scroll-touch">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="p-4 border-t border-[#1E1E2B] bg-[#0A0A0F] pb-safe">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
