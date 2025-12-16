import React from 'react';
import { ChannelData } from '../types';
import { TelegramIcon, AIIcon } from './Icons';
import { ArrowLeft, FolderOpen } from 'lucide-react';

interface ChannelCardProps {
  channel: ChannelData;
  index: number;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({ channel, index }) => {
  let IconComponent = TelegramIcon;
  let bgClass = "bg-sky-500/10";
  let iconClass = "w-8 h-8 drop-shadow-md";

  if (channel.iconType === 'ai') {
    IconComponent = AIIcon;
    bgClass = "bg-violet-500/10";
    iconClass = "w-7 h-7 text-violet-400";
  } else if (channel.isFolder) {
    bgClass = "bg-amber-500/10";
  }

  return (
    <a
      href={channel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl mb-4 transition-all duration-300 hover:bg-slate-700/60 hover:scale-[1.02] hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/10 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Icon Container */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${bgClass}`}>
        {channel.iconType === 'ai' ? (
          <AIIcon className={iconClass} />
        ) : channel.isFolder ? (
           <FolderOpen className="w-7 h-7 text-amber-500" />
        ) : (
           <TelegramIcon className={iconClass} />
        )}
      </div>

      {/* Text Content */}
      <div className="flex-grow mr-4 text-right">
        <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
          {channel.name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 group-hover:text-slate-300">
          {channel.description}
        </p>
      </div>

      {/* Action Arrow */}
      <div className="flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all duration-300">
        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-sky-400" />
      </div>
      
      {/* Glossy Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </a>
  );
};