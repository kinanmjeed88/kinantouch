
import React, { useState } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Briefcase, Copy, TrendingUp,
  MessageCircle, Facebook, Instagram, BadgeCheck, Clock, Zap, Star,
  ShieldCheck, DollarSign
} from 'lucide-react';
import { AINewsResponse, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

const CACHE_KEYS = {
  JOBS: 'techtouch_jobs_v25',
  AI_NEWS: 'techtouch_ai_v21',
  PHONE_NEWS: 'techtouch_phones_v25'
};

const App: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  const [aiNewsData, setAiNewsData] = useState<AINewsResponse | null>(null);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<PhoneComparisonResult | null>(null);

  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];

  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
      const { data, timestamp } = JSON.parse(cached);
      return (Date.now() - timestamp < 4 * 60 * 60 * 1000) ? data : null;
    } catch (e) { return null; }
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const callGroqAPI = async (prompt: string, systemInstruction: string) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح API غير متوفر.");

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
    });

    if (!response.ok) throw new Error("فشل الاتصال بـ Groq API.");
    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  };

  const fetchToolData = async (type: ToolView, force: boolean = false) => {
    setLoading(true);
    setError(null);
    setActiveToolView(type);
    
    const cacheKey = type === 'jobs' ? CACHE_KEYS.JOBS : type === 'ai-news' ? CACHE_KEYS.AI_NEWS : CACHE_KEYS.PHONE_NEWS;
    const cached = !force ? getCachedData(cacheKey) : null;

    if (cached) {
      if (type === 'jobs') setJobs(cached.iraq_jobs);
      else if (type === 'ai-news') setAiNewsData(cached);
      else if (type === 'phone-news') setPhoneNews(cached.smartphones);
      setLoading(false);
      return;
    }

    try {
      let prompt = "";
      let system = "";

      if (type === 'jobs') {
        system = `أنت محرر إخباري محترف لموقع Techtouch. مهمتك توليد بيانات وظائف العراق لآخر أسبوع من ${formattedDate}.
القواعد: المصادر مسموحة حصراً: الوزارات، مجلس الخدمة الاتحادي، بوابة أور. 
العنوان: الجهة + نوع التعيين. 
المحتوى: الجهة، الوظيفة، الفئات، الشروط، مدة التقديم.
صيغة JSON: {"iraq_jobs": [{"title": "...", "content": ["..."], "official_link": "...", "copy_payload": "..."}]}`;
        prompt = "استخرج أحدث 8 وظائف حكومية عراقية موثقة بروابطها الرسمية.";
      } else if (type === 'ai-news') {
        system = `أنت محرر تقني لـ Techtouch. ولد بيانات أدوات AI المعتمدة فقط لآخر أسبوع من ${formattedDate}. 
العنوان: اسم الأداة + الإصدار حصراً. رابط الاستخدام المباشر فقط.
JSON: {"items": [{"id": "...", "tool_name": "...", "version": "...", "title": "...", "description": ["..."], "official_usage_link": "..."}]}`;
        prompt = "استخرج أحدث 10 أدوات AI رسمية.";
      } else if (type === 'phone-news') {
        system = `أنت محرر تقني لموقع Techtouch. ولد بيانات هواتف لآخر شهر من تاريخ ${formattedDate}.
القواعد: العنوان: اسم الهاتف فقط. المواصفات كاملة (شاشة، معالج، رام، تخزين، كاميرات، بطارية، نظام، ميزات).
السعر: بالدولار من مصدر عراقي رسمي.
JSON: {"smartphones": [{
  "phone_name": "...", "brand": "...", "release_date": "...",
  "specifications": {"display": "...", "processor": "...", "ram": "...", "storage": "...", "cameras": "...", "battery": "...", "os": "...", "features": "..."},
  "price_usd": "...", "official_link": "...", "iraqi_price_source": "...", "copy_payload": "..."
}]}`;
        prompt = "استخرج أحدث 8 هواتف ذكية بمواصفاتها الكاملة وأسعارها في السوق العراقي.";
      }

      const result = await callGroqAPI(prompt, system);
      saveToCache(cacheKey, result);
      
      if (type === 'jobs') setJobs(result.iraq_jobs || []);
      else if (type === 'ai-news') setAiNewsData(result);
      else if (type === 'phone-news') setPhoneNews(result.smartphones || []);

    } catch (err: any) {
      setError(err.message || "فشل في جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const system = "أنت خبير تقني محترف. الرد JSON فقط.";
      const prompt = `قارن تقنياً وشاملاً جداً بين ${phone1} و ${phone2} بكل التفاصيل والمميزات الرسمية. التنسيق: {"specs": [{"feature": "...", "phone1": "...", "phone2": "..."}], "betterPhone": "...", "verdict": "..."}`;
      const result = await callGroqAPI(prompt, system);
      setComparisonResult(result);
    } catch (err: any) { setError("فشل تحليل المقارنة."); } finally { setLoading(false); }
  };

  const shareContent = (item: any, platform: 'tg' | 'fb' | 'insta' | 'copy') => {
    const title = item.title || item.phone_name || item.tool_name;
    const url = item.official_usage_link || item.official_link || item.url;
    const payload = item.copy_payload || `${title}\n\n🔗 الرابط: ${url}`;
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(payload);
      alert('تم نسخ المحتوى بالكامل!');
    } else if (platform === 'tg') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(payload)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'insta') {
      navigator.clipboard.writeText(payload);
      alert('تم نسخ المحتوى لمشاركته على إنستغرام!');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 font-sans text-right" dir="rtl">
      <div className="fixed inset-0 pointer-events-none opacity-15 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        <header className="pt-12 pb-6 text-center">
          <div className="inline-block relative mb-6">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                {profileConfig.image && !imageError ? (
                  <img src={profileConfig.image} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                ) : (
                  <span className="text-4xl font-black text-sky-400">{profileConfig.initials}</span>
                )}
             </div>
          </div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">Techtouch</h1>
          <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md shadow-lg">
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-black">الرئيسية</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-5 h-5" /><span className="text-[9px] font-black">معلومات</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-5 h-5" /><span className="text-[9px] font-black">أدوات</span></button>
          </nav>
        </header>

        <main className="flex-grow py-4">
          {activeTab === 'home' && telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
          
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 text-sky-400 mb-6 border-b border-slate-700/50 pb-4 overflow-hidden">
                  <MessageCircle className="w-6 h-6 shrink-0" />
                  <h2 className="font-black text-xs sm:text-sm uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">بوت الطلبات على التيليكرام</h2>
                </div>
                
                <div className="space-y-5">
                  <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-3 w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95">
                    <Send className="w-4 h-4" />
                    <span className="text-[10px]">الدخول لبوت الطلبات</span>
                  </a>

                  <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-[9px] text-slate-200 font-bold leading-relaxed">
                    <p>✪ ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط .</p>
                    <p>✪ لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات .</p>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-emerald-400 text-[8px] font-black text-center">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-700/50">
                    <h3 className="text-sky-400 font-black text-[9px] uppercase">طرق البحث المتاحة في قنوات المناقشات:</h3>
                    <ul className="space-y-2 text-[8px] text-slate-400 font-bold leading-relaxed">
                      {[
                        "١. ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.",
                        "٢. اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) بإسم مضبوط.",
                        "٣. استخدم أمر البحث بكتابة كلمة \"بحث\" متبوع باسم التطبيق.",
                        "٤. للاعلان في القناة تواصل من خلال البوت"
                      ].map((item, i) => (
                        <li key={i} className="pr-2 border-r-2 border-slate-700">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-[8px] font-black text-center leading-relaxed">تنبيه: حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-3">
                  {[
                    { id: 'jobs', icon: Briefcase, color: 'emerald', title: 'آخر وظائف العراق', desc: 'تحديثات حكومية رسمية' },
                    { id: 'ai-news', icon: Cpu, color: 'indigo', title: 'محرر أخبار AI المحترف', desc: 'أدوات ذكاء اصطناعي موثقة بإصدارات رسمية' },
                    { id: 'phone-news', icon: Smartphone, color: 'sky', title: 'عالم الهواتف الذكية', desc: 'مواصفات وإحصائيات عراقية دقيقة' },
                    { id: 'comparison', icon: Search, color: 'slate', title: 'مقارنة فنية شاملة', desc: 'تحليل معمق ومفصل' }
                  ].map((tool) => (
                    <button key={tool.id} onClick={() => tool.id === 'comparison' ? setActiveToolView('comparison') : fetchToolData(tool.id as ToolView)} className="group flex items-center p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-md active:scale-95">
                      <div className={`w-8 h-8 bg-${tool.color}-500/10 rounded-lg flex items-center justify-center ml-3 shrink-0`}><tool.icon className={`w-4 h-4 text-${tool.color}-400`} /></div>
                      <div className="flex-grow text-right">
                        <div className="flex items-center gap-2">
                           <h3 className="text-[10px] font-black text-slate-100 group-hover:text-sky-400 transition-colors uppercase">{tool.title}</h3>
                        </div>
                        <p className="text-[8px] text-slate-500 mt-0.5 font-bold">{tool.desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180 text-slate-600 group-hover:text-sky-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveToolView('main')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"><ChevronLeft className="w-4 h-4 rotate-180" /><span className="text-[10px] font-bold">الأدوات</span></button>
                    {!loading && activeToolView !== 'comparison' && <button onClick={() => fetchToolData(activeToolView, true)} className="text-[8px] text-sky-500 font-black border border-sky-500/20 px-3 py-1.5 rounded-xl">تحديث الأخبار</button>}
                  </div>

                  {loading ? (
                    <div className="py-24 flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-[10px] text-slate-500 font-black animate-pulse">جاري جلب أحدث البيانات الموثقة...</p></div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-6"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-[10px] text-slate-300 font-bold leading-relaxed">{error}</p></div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl shadow-lg border-r-4 border-r-emerald-500/50">
                          <h3 className="text-[11px] font-black text-emerald-400 mb-2 border-b border-slate-700 pb-2">{job.title}</h3>
                          <div className="text-[10px] text-slate-300 mb-4 font-bold space-y-1.5 h-[120px] overflow-y-auto pr-1">
                            {job.content.map((line, idx) => (
                              <p key={idx} className="flex items-start gap-2 leading-relaxed opacity-80">
                                <span className="w-1 h-1 bg-emerald-500/40 rounded-full shrink-0 mt-1.5"></span>
                                {line}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-1.5">
                              <button onClick={() => shareContent(job, 'fb')} className="p-1.5 bg-slate-700/40 text-blue-400 rounded-lg"><Facebook className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(job, 'insta')} className="p-1.5 bg-slate-700/40 text-pink-400 rounded-lg"><Instagram className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(job, 'tg')} className="p-1.5 bg-slate-700/40 text-sky-400 rounded-lg"><Send className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(job, 'copy')} className="p-1.5 bg-slate-700/40 text-slate-200 rounded-lg"><Copy className="w-3 h-3" /></button>
                            </div>
                            <a href={job.official_link} target="_blank" className="text-[9px] font-black px-4 py-2 bg-emerald-500 text-white rounded-lg flex items-center gap-1.5">التقديم الحكومي <ExternalLink className="w-3 h-3" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNewsData?.items.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl shadow-md border-r-4 border-r-indigo-500/50 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 bg-indigo-500/20 text-indigo-400 text-[6px] font-black px-2 py-1 rounded-br-lg uppercase tracking-tighter flex items-center gap-1">
                            <Zap className="w-2 h-2" />
                            {n.version}
                          </div>
                          <div className="mt-2 flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] bg-slate-700 text-sky-400 px-2 py-0.5 rounded-full font-black uppercase">{n.tool_name}</span>
                              </div>
                              <h3 className="text-sm font-black text-slate-100 group-hover:text-sky-400 transition-colors">{n.title}</h3>
                            </div>
                            <div className="flex items-center gap-0.5 text-[6px] text-emerald-500 font-black uppercase">
                              <BadgeCheck className="w-2.5 h-2.5" />
                              <span>موثق تقنياً</span>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-300 mb-4 font-bold space-y-1.5 h-[95px] overflow-y-auto pr-1">
                            {n.description.map((line, idx) => (
                              <p key={idx} className="flex items-start gap-2 leading-relaxed opacity-80">
                                <span className="w-1 h-1 bg-sky-500/40 rounded-full shrink-0 mt-1.5"></span>
                                {line}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-1.5">
                              <button onClick={() => shareContent(n, 'fb')} className="p-1.5 bg-slate-700/40 text-blue-400 rounded-lg"><Facebook className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(n, 'insta')} className="p-1.5 bg-slate-700/40 text-pink-400 rounded-lg"><Instagram className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(n, 'tg')} className="p-1.5 bg-slate-700/40 text-sky-400 rounded-lg"><Send className="w-3 h-3" /></button>
                              <button onClick={() => shareContent(n, 'copy')} className="p-1.5 bg-slate-700/40 text-slate-200 rounded-lg"><Copy className="w-3 h-3" /></button>
                            </div>
                            <a href={n.official_usage_link} target="_blank" className="text-[8px] text-indigo-400 font-black px-3 py-1.5 border border-indigo-500/30 rounded-lg bg-indigo-500/5 flex items-center gap-1.5 hover:bg-indigo-500/10">استخدم الأداة <ExternalLink className="w-2.5 h-2.5" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-6">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-3xl shadow-md border-r-4 border-r-sky-500/50">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
                              <div className="flex flex-col">
                                <h3 className="text-[13px] font-black text-sky-400">{phone.phone_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase">{phone.brand}</span>
                                  <span className="text-[8px] text-slate-500 font-bold">{phone.release_date}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 text-emerald-400 font-black text-[11px]">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>{phone.price_usd}</span>
                                </div>
                                <a href={phone.iraqi_price_source} target="_blank" className="text-[6px] text-slate-500 underline flex items-center gap-1">مصدر السعر العراقي <ExternalLink className="w-2 h-2" /></a>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-5">
                               {[
                                 { icon: Smartphone, label: 'الشاشة', value: phone.specifications.display },
                                 { icon: Cpu, label: 'المعالج', value: phone.specifications.processor },
                                 { icon: Zap, label: 'رام', value: phone.specifications.ram },
                                 { icon: Briefcase, label: 'تخزين', value: phone.specifications.storage },
                                 { icon: ShieldCheck, label: 'البطارية', value: phone.specifications.battery },
                                 { icon: BadgeCheck, label: 'النظام', value: phone.specifications.os }
                               ].map((spec, idx) => (
                                 <div key={idx} className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-700/30">
                                   <div className="flex items-center gap-1.5 text-sky-400/70 mb-1">
                                      <spec.icon className="w-3 h-3" />
                                      <span className="text-[7px] font-black uppercase">{spec.label}</span>
                                   </div>
                                   <div className="text-[8px] text-slate-300 font-bold leading-tight">{spec.value}</div>
                                 </div>
                               ))}
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/30 mb-5">
                               <div className="text-sky-400/70 text-[7px] font-black uppercase mb-1">الكاميرات</div>
                               <div className="text-[8px] text-slate-300 font-bold leading-relaxed">{phone.specifications.cameras}</div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                                <div className="flex gap-1.5">
                                  <button onClick={() => shareContent(phone, 'fb')} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-blue-400"><Facebook className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => shareContent(phone, 'insta')} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-pink-400"><Instagram className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => shareContent(phone, 'tg')} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => shareContent(phone, 'copy')} className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"><Copy className="w-3.5 h-3.5" /></button>
                                </div>
                                <a href={phone.official_link} target="_blank" className="text-[9px] text-sky-400 font-black px-4 py-2 border border-sky-500/30 rounded-xl flex items-center gap-2 hover:bg-sky-500/5">المواصفات الرسمية <ExternalLink className="w-3 h-3" /></a>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1"><Search className="w-4 h-4" /><h3 className="text-[11px] font-black uppercase tracking-widest">مقارنة فنية شاملة</h3></div>
                        <input type="text" placeholder="اسم الهاتف الأول" value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <input type="text" placeholder="اسم الهاتف الثاني" value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-4 rounded-xl text-[10px] shadow-lg shadow-sky-500/20 active:scale-95 transition-all">بدء المقارنة الذكية</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                          <div className="overflow-x-auto h-[300px]">
                            <table className="w-full text-right text-[10px]">
                              <thead className="bg-slate-900/80 sticky top-0 z-20"><tr><th className="p-4 text-sky-400 border-b border-slate-700 font-black">المميزات</th><th className="p-4 border-b border-slate-700 font-black text-center">{phone1}</th><th className="p-4 border-b border-slate-700 font-black text-center">{phone2}</th></tr></thead>
                              <tbody className="divide-y divide-slate-700/30">
                                {comparisonResult.specs.map((s, i) => (
                                  <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-black text-slate-300 border-l border-slate-700/30">{s.feature}</td>
                                    <td className="p-4 text-slate-400 font-bold text-center">{s.phone1}</td>
                                    <td className="p-4 text-slate-400 font-bold text-center">{s.phone2}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-6 bg-emerald-500/10 border-t border-slate-700/50">
                            <p className="text-[11px] text-emerald-400 font-black mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> الخيار الأفضل: {comparisonResult.betterPhone}</p>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-bold whitespace-pre-line">{comparisonResult.verdict}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-10 pt-8 border-t border-slate-800/50 text-center">
           <SocialLinks links={socialLinks} />
           <div className="mt-8 pb-4">
             <a href={footerData.url} target="_blank" className="group inline-flex flex-col items-center">
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-60">تطوير وبرمجة</span>
               <span className="text-[12px] font-black text-slate-300 group-hover:text-sky-400 transition-colors tracking-tighter">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
