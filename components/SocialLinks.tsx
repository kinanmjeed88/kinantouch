import React from 'react';
import { SocialData } from '../types';
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from './Icons';

interface SocialLinksProps {
  links: SocialData[];
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ links }) => {
  const getIcon = (platform: string) => {
    switch (platform) {
      case 'Facebook': return <FacebookIcon className="w-6 h-6" />;
      case 'Instagram': return <InstagramIcon className="w-6 h-6" />;
      case 'TikTok': return <TiktokIcon className="w-6 h-6" />;
      case 'YouTube': return <YoutubeIcon className="w-6 h-6" />;
      default: return null;
    }
  };

  return (
    <div className="flex justify-center gap-4 mt-8 mb-6 animate-fade-in delay-500">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group p-3.5 bg-slate-800/80 rounded-full border border-slate-700 hover:border-slate-500 hover:bg-slate-700 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20"
          aria-label={link.platform}
        >
          <div className="transition-transform duration-300 group-hover:scale-110">
            {getIcon(link.platform)}
          </div>
          {/* Tooltip-ish glow */}
          <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
        </a>
      ))}
    </div>
  );
};