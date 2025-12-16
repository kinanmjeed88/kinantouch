import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { ShieldCheck, Share2 } from 'lucide-react';

const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 overflow-x-hidden relative">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        
        {/* Header Section */}
        <header className={`pt-12 pb-8 text-center transition-all duration-700 transform ${loaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
          <div className="inline-block relative">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center mb-6">
                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                  TT
                </span>
             </div>
          </div>
          
          <h1 className="text-3xl font-black tracking-tight mb-2 text-white drop-shadow-lg">
            Techtouch
          </h1>
          <p className="text-slate-400 text-sm font-semibold flex items-center justify-center gap-1.5 opacity-80">
            كنان الصائغ
          </p>
        </header>

        {/* Telegram Channels List */}
        <main className="flex-grow space-y-2">
          {telegramChannels.map((channel, index) => (
            <ChannelCard key={channel.id} channel={channel} index={index} />
          ))}
        </main>

        {/* Social & Footer */}
        <footer className="mt-10 pt-6 border-t border-slate-800/50">
           <div className="text-center mb-4">
             <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 py-1 bg-slate-900/50 rounded-full border border-slate-800">
                تابعنا على
             </span>
           </div>
           
           <SocialLinks links={socialLinks} />

           <div className="text-center mt-8 pb-4">
             <a 
               href={footerData.url}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex flex-col items-center group cursor-pointer"
             >
               <span className="text-xs text-slate-500 mb-1">Created By</span>
               <span className="text-sm font-bold text-slate-300 group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                 {footerData.text}
                 <Share2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
               </span>
               <div className="h-0.5 w-0 bg-sky-500 mt-1 transition-all duration-300 group-hover:w-full opacity-70"></div>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;