import React from 'react';
import { Globe, PanelTop, Hash } from 'lucide-react';

interface ChannelIconProps {
  channel: string;
  size?: number;
  className?: string;
}

export const ChannelIcon: React.FC<ChannelIconProps> = ({ channel, size = 20, className = '' }) => {
  const name = (channel || '').toLowerCase().trim();

  // Official Brand SVG for LinkedIn
  if (name.includes('linkedin')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#0077B5]`}
      >
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    );
  }

  // Official Brand SVG for Facebook
  if (name.includes('facebook')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#1877F2]`}
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  }

  // Official Brand SVG for YouTube
  if (name.includes('youtube')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#FF0000]`}
      >
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.003 3.003 0 0 0-2.11 2.108C0 8.029 0 12 0 12s0 3.97.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }

  // Official Brand SVG for X / Twitter
  if (name.includes('twitter') || /\bx\b/.test(name)) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-white`}
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }

  // Official Brand SVG for TikTok
  if (name.includes('tiktok')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#00f2fe]`}
      >
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.86.17 1.77.26 2.68.27v4.01c-1.79-.01-3.53-.7-4.82-1.93-.05 2.82-.01 5.64-.04 8.46-.08 2.3-1.28 4.54-3.41 5.48-2.6 1.25-5.96.6-7.8-1.57-1.95-2.22-1.8-5.83.35-7.85 1.56-1.5 3.93-2.02 5.96-1.32.01-1.44 0-2.88.02-4.32-1.89-.35-3.82-.12-5.59.65-2.83 1.18-4.78 4.14-4.8 7.21-.06 3.88 2.63 7.55 6.44 8.35 4.1.98 8.64-1.44 9.54-5.54.12-.51.15-1.04.14-1.57-.02-3.83-.01-7.66-.02-11.49-.96.69-2.09 1.11-3.26 1.23-.09-1.37-.04-2.76-.05-4.14z"/>
      </svg>
    );
  }

  // Official Brand SVG for Instagram
  if (name.includes('instagram')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={`${className} text-[#E1306C]`}
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    );
  }

  // Official Brand SVG for Google / Google Ads
  if (name.includes('google') || name.includes('search') || name.includes('adwords') || name.includes('ads')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={className}
      >
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.59-5.16 3.59-8.73z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09c1.99 3.96 6.08 6.71 10.71 6.71z"/>
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.98-3.1z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.28 2.75 1.29 6.61l3.98 3.1c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
    );
  }

  // Official Brand SVG for Pinterest
  if (name.includes('pinterest')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#E60023]`}
      >
        <path d="M12 0c-6.627 0-12 5.373-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.993-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
      </svg>
    );
  }

  // Official Brand SVG for Discord
  if (name.includes('discord')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill="currentColor" 
        className={`${className} text-[#5865F2]`}
      >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
      </svg>
    );
  }

  if (name.includes('email') || name.includes('gmail') || name.includes('newsletter')) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        className={className} 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Official Google Gmail 4-Color Brand Vector */}
        <path d="M20 18h-3V9.5L12 14 7 9.5V18H4c-1.1 0-2-.9-2-2V6.5l3.5 2.6L12 14l6.5-4.9L22 6.5V16c0 1.1-.9 2-2 2z" fill="#EA4335" />
        <path d="M2 6.5V16c0 1.1.9 2 2 2h3V9.5L2 6.5z" fill="#4285F4" />
        <path d="M22 6.5V16c0 1.1-.9 2-2 2h-3V9.5L22 6.5z" fill="#34A853" />
        <path d="M20 4H4c-1.1 0-2 .9-2 2v.5l10 7.5 10-7.5V6c0-1.1-.9-2-2-2z" fill="#EA4335" />
        <path d="M17.5 9.5L22 6.13V6c0-.52-.2-1.01-.55-1.37L17.5 9.5z" fill="#FBBC04" />
        <path d="M6.5 9.5L2 6.13V6c0-.52.2-1.01.55-1.37L6.5 9.5z" fill="#C5221F" />
      </svg>
    );
  }
  if (name.includes('banner') || name.includes('display')) {
    return <PanelTop size={size} className={className} />;
  }
  if (name.includes('seo')) {
    return <Hash size={size} className={className} />;
  }

  return <Globe size={size} className={className} />;
};
