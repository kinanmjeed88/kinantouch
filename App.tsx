
import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, Loader2, ChevronLeft, 
  AlertCircle, Send,
  Download, X, Search,
  BarChart3, PieChart,
  LayoutGrid
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, StatsResult } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'stats';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_v49',
  PHONE_NEWS: 'techtouch_phones_v49'
};

const SPEC_LABELS: Record<string, string> = {
  networks: "الشبكات والاتصال",
  dimensions: "أبعاد الهاتف",
  weight: "الوزن",
  materials: "خامات التصنيع",
  water_resistance: "مقاومة الماء والغبار",
  display: "الشاشة",
  processor: "المعالج (CPU)",
  gpu: "معالج الرسوميات (GPU)",
  memory_storage: "الذاكرة والتخزين",
  rear_cameras: "الكاميرات الخلفية",
  front_camera: "الكاميرا الأمامية",
  video: "تصوير الفيديو",
  battery_charging: "البطارية والشحن",
  operating_system: "نظام التشغيل",
  connectivity: "الواي فاي والبلوتوث",
  sensors: "المستشعرات",
  colors: "الألوان المتوفرة"
};

const App: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<PhoneComparisonResult | null>(null);

  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [phoneSearchResult, setPhoneSearchResult] = useState<PhoneNewsItem | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [statsQuery, setStatsQuery] = useState('');
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
      const { data, timestamp } = JSON.parse(cached);
      return (Date.now() - timestamp < 6 * 60 * 60 * 1000) ? data : null;
    } catch (e) { return null; }
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const callGeminiAPI = async (prompt: string, systemInstruction: string, useSearch: boolean = false) => {
    const apiKey = process.env.API_KEY;
    
    // Check for common mistake: using Groq key for Gemini
    if (apiKey?.startsWith('gsk_')) {
        throw new Error("المفتاح المدخل مخصص لـ Groq ولكن التطبيق يستخدم Google Gemini. يرجى توفير مفتاح Gemini API صالح.");
    }

    if (!apiKey) throw new Error("مفتاح API غير متوفر.");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const modelId = 'gemini-2.5-flash-latest';

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: useSearch ? [{googleSearch: {}}] : [],
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      if (response.text) {
         return JSON.parse(response.text);
      } else {
         throw new Error("لم يتم استلام رد نصي من النموذج.");
      }
    } catch (e: any) {
      console.error("Gemini API Error:", e);
      let msg = e.message || 'Unknown error';
      if (msg.includes('API key not valid')) {
          msg = "مفتاح API غير صالح. تأكد من صحة المفتاح في الإعدادات.";
      }
      throw new Error(msg);
    }
  };

  const fetchToolData = async (type: ToolView, force: boolean = false) => {
    setLoading(true);
    setError(null);
    setActiveToolView(type);
    
    let cacheKey = '';
    if (type === 'ai-news') cacheKey = CACHE_KEYS.AI_NEWS;
    else if (type === 'phone-news') cacheKey = CACHE_KEYS.PHONE_NEWS;

    const cached = (!force && cacheKey) ? getCachedData(cacheKey) : null;

    if (cached) {
      if (type === 'ai-news') setAiNews(cached.ai_news || []);
      else if (type === 'phone-news') setPhoneNews(cached.smartphones || []);
      setLoading(false);
      return;
    }

    try {
      const baseSystemInstruction = `You are an AI system acting as a professional technical editor for the website "Techtouch".
      Current Date: ${todayStr}. Fetch latest tech news (last 12 months).
      Return JSON only. Keys: "ai_news" OR "best_smartphones".`;

      let userPrompt = "";
      if (type === 'ai-news') {
        userPrompt = `Fetch 10 recent AI model news (Global/Chinese). Return JSON { "ai_news": [{ "title": "Arabic", "content": ["Arabic"], "official_link": "URL" }] }`;
      } else if (type === 'phone-news') {
        userPrompt = `Fetch 10 recent smartphones (diverse brands). Return JSON { "best_smartphones": [{ "phone_name": "English", "brand": "English", "release_date": "YYYY-MM", "price_usd": "$XXX", "full_specifications": { "display": "Arabic", ... }, "pros": ["Arabic"], "cons": ["Arabic"], "official_link": "URL" }] }`;
      }

      const result = await callGeminiAPI(userPrompt, baseSystemInstruction, true);
      
      if (type === 'ai-news' && result.ai_news) {
        const mappedAI = result.ai_news.map((item: any) => ({
          tool_name: item.title ? item.title.split(' ')[0] : 'AI', 
          title: item.title,
          summary: item.content || [],
          date: todayStr,
          official_link: item.official_link
        }));
        saveToCache(cacheKey, { ai_news: mappedAI });
        setAiNews(mappedAI);
      } else if (type === 'phone-news' && result.best_smartphones) {
        const mappedPhones = result.best_smartphones.map((item: any) => ({
          phone_name: item.phone_name,
          brand: item.brand,
          release_date: item.release_date,
          specifications: item.full_specifications || {},
          price_usd: item.price_usd,
          official_specs_link: item.official_link || '',
          iraqi_price_source: '',
          pros: item.pros,
          cons: item.cons
        }));
        saveToCache(cacheKey, { smartphones: mappedPhones });
        setPhoneNews(mappedPhones);
      }
    } catch (err: any) {
      setError(err.message || "فشل في جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSearch = async () => {
    if (!phoneSearchQuery.trim()) return;
    setSearchLoading(true);
    setPhoneSearchResult(null);
    setError(null);

    const systemInstruction = `Provide official specs for the requested phone in Arabic. JSON Output.`;

    try {
      const result = await callGeminiAPI(`ابحث عن مواصفات: ${phoneSearchQuery}`, systemInstruction, true);
      if (result) {
        setPhoneSearchResult(result);
      } else {
        setError("لم يتم العثور على معلومات.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStatsRequest = async () => {
    if (!statsQuery.trim()) return;
    setStatsLoading(true);
    setStatsResult(null);
    setError(null);
    try {
      const system = "Generate tech stats JSON { title, description, data: [{label, value, displayValue}], insight } in Arabic.";
      const result = await callGeminiAPI(`إحصائية: ${statsQuery}`, system, true);
      if (result) {
         const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
         result.data = result.data.map((item: any, index: number) => ({
            ...item,
            color: colors[index % colors.length]
         }));
         setStatsResult(result);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const system = "Compare phones in Arabic JSON { specs: [{feature, phone1, phone2}], betterPhone, verdict }.";
      const result = await callGeminiAPI(`Compare ${phone1} vs ${phone2}`, system, true);
      setComparisonResult(result);
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const shareContent = (item: any, platform: 'tg' | 'fb' | 'insta' | 'copy') => {
    const title = item.title || item.phone_name || item.tool_name;
    const url = item.official_link || item.official_specs_link || item.url || '';
    const summaryText = item.summary ? item.summary.join('\n') : '';
    const payload = item.copy_payload || `${title}\n${summaryText}\n\n🔗 الرابط: ${url}`;
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(payload);
      alert('تم نسخ المحتوى!');
    } else if (platform === 'tg') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(payload)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 font-sans text-right pb-24" dir="rtl">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none opacity-15 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
      </div>
      
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-4 right-4 z-[100] bg-rose-500/95 text-white p-4 rounded-2xl shadow-xl backdrop-blur-md animate-fade-in border border-rose-400/50 flex flex-col gap-2">
            <div className="flex items-start gap-3">
               <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
               <p className="text-sm font-bold leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="self-end text-xs bg-rose-700/50 px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors">إغلاق</button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 max-w-lg mx-auto px-4 min-h-screen flex flex-col">
        
        {/* Header - Simplified */}
        <header className="pt-10 pb-4 flex flex-col items-center justify-center sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-800/50 -mx-4 px-4 transition-all">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-800 rounded-xl border border-white/10 shadow-lg overflow-hidden shrink-0">
                {profileConfig.image && !imageError ? (
                  <img src={profileConfig.image} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-sm font-black text-sky-400">{profileConfig.initials}</span>
                )}
             </div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-none text-white">Techtouch</h1>
                <p className="text-[10px] text-sky-400 font-bold tracking-widest uppercase mt-0.5">كنان مجيد</p>
             </div>
          </div>
        </header>

        <main className="flex-grow py-6 animate-fade-in">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
             <div className="space-y-4 pb-4">
                {telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
             </div>
          )}
          
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="space-y-5 text-right">
                  <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold text-sky-400 text-center">بوت الطلبات على التيليكرام</h3>
                     <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 group">
                       <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                       <span>الدخول للبوت</span>
                     </a>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">✪</span><span>ارسل اسم التطبيق مع صورته او الرابط.</span></li>
                    <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">✪</span><span>لا تطلب تطبيقات مدفوعة أو أكواد.</span></li>
                  </ul>
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    <p className="text-xs text-rose-300 font-medium"><span className="font-bold text-rose-400">تنبيه:</span> حظر البوت يؤدي لحظر تلقائي.</p>
                  </div>
                </div>
              </div>
              <SocialLinks links={socialLinks} />
              <div className="text-center pb-8 pt-4">
                 <p className="text-slate-500 text-xs font-medium">{footerData.text} <a href={footerData.url} className="text-sky-500">@kinanmjeed</a></p>
              </div>
            </div>
          )}

          {/* TOOLS TAB */}
          {activeTab === 'tools' && activeToolView === 'main' && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
               <button onClick={() => fetchToolData('ai-news')} className="col-span-2 group p-6 bg-slate-800/40 border border-violet-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Cpu size={80} /></div>
                  <div className="relative z-10 flex flex-col items-start gap-2">
                     <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-400"><Cpu className="w-6 h-6" /></div>
                     <div className="text-right">
                        <h3 className="font-bold text-lg text-white">أخبار AI</h3>
                        <p className="text-xs text-slate-400">أحدث النماذج والتقنيات</p>
                     </div>
                  </div>
               </button>

               <button onClick={() => fetchToolData('phone-news')} className="group p-5 bg-slate-800/40 border border-sky-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                  <div className="flex flex-col items-start gap-3">
                     <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400"><Smartphone className="w-5 h-5" /></div>
                     <div><h3 className="font-bold text-base text-white">الهواتف</h3><p className="text-[10px] text-slate-400">أسعار ومواصفات</p></div>
                  </div>
               </button>

               <button onClick={() => setActiveToolView('comparison')} className="group p-5 bg-slate-800/40 border border-emerald-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                  <div className="flex flex-col items-start gap-3">
                     <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"><LayoutGrid className="w-5 h-5" /></div>
                     <div><h3 className="font-bold text-base text-white">مقارنة</h3><p className="text-[10px] text-slate-400">مقارنة شاملة</p></div>
                  </div>
               </button>

               <button onClick={() => setActiveToolView('stats')} className="col-span-2 group p-5 bg-slate-800/40 border border-pink-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400"><BarChart3 className="w-6 h-6" /></div>
                     <div className="text-right">
                        <h3 className="font-bold text-lg text-white">إحصائيات</h3>
                        <p className="text-xs text-slate-400">رسوم بيانية وتحليلات السوق</p>
                     </div>
                   </div>
               </button>
            </div>
          )}

          {/* Sub-Tools Views (Keep largely same logic but styled to match new layout) */}
          {activeTab === 'tools' && activeToolView !== 'main' && (
             <div className="space-y-4 animate-slide-up pb-8">
                <button onClick={() => { setActiveToolView('main'); setPhoneSearchResult(null); setStatsResult(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-2">
                   <ChevronLeft className="w-5 h-5" /> <span className="text-sm font-bold">رجوع</span>
                </button>

                {activeToolView === 'ai-news' && (
                  <div className="space-y-4">
                     {loading && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500" /></div>}
                     {aiNews.map((news, idx) => (
                       <div key={idx} className="bg-slate-800/40 border border-violet-500/20 rounded-2xl p-4">
                          <h3 className="font-bold text-white mb-2">{news.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">{news.summary[0]}</p>
                          <div className="flex gap-2">
                             <button onClick={() => shareContent(news, 'copy')} className="flex-1 bg-slate-700/50 py-2 rounded-lg text-xs font-bold text-slate-300">نسخ</button>
                             <a href={news.official_link} target="_blank" className="flex-1 bg-violet-600/20 text-violet-300 py-2 rounded-lg text-xs font-bold text-center">المصدر</a>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
                
                {/* Phone Search & News Simplified */}
                {activeToolView === 'phone-news' && (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                        <input type="text" value={phoneSearchQuery} onChange={(e)=>setPhoneSearchQuery(e.target.value)} placeholder="ابحث عن هاتف..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm focus:border-sky-500 outline-none" />
                        <button onClick={handlePhoneSearch} className="bg-sky-500 text-white p-3 rounded-xl">{searchLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}</button>
                     </div>
                     {phoneSearchResult ? (
                        <div className="bg-slate-800/60 border border-sky-500/30 p-4 rounded-2xl animate-fade-in relative">
                           <button onClick={() => setPhoneSearchResult(null)} className="absolute top-2 left-2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                           <h3 className="font-black text-xl mb-1">{phoneSearchResult.phone_name}</h3>
                           <div className="grid grid-cols-1 gap-2 mt-4">
                              {Object.entries(phoneSearchResult.specifications || {}).slice(0,8).map(([k,v],i) => (
                                 <div key={i} className="flex justify-between text-xs border-b border-slate-700/50 pb-2"><span className="text-slate-400">{SPEC_LABELS[k]||k}</span><span className="text-white max-w-[60%] text-left" dir="ltr">{String(v)}</span></div>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-3">
                           {loading && <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500" /></div>}
                           {phoneNews.map((phone, idx) => (
                              <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                                 <h3 className="font-bold text-white text-sm">{phone.phone_name}</h3>
                                 <p className="text-xs text-slate-400 mt-1">{phone.brand} - {phone.release_date}</p>
                                 <div className="mt-2 text-xs text-sky-400 font-bold">{phone.price_usd}</div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                )}

                {/* Comparison Simplified */}
                {activeToolView === 'comparison' && (
                   <div className="bg-slate-800/40 p-4 rounded-2xl space-y-3">
                      <input value={phone1} onChange={e=>setPhone1(e.target.value)} placeholder="الهاتف الأول" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm"/>
                      <input value={phone2} onChange={e=>setPhone2(e.target.value)} placeholder="الهاتف الثاني" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm"/>
                      <button onClick={handleComparePhones} className="w-full bg-emerald-500 py-3 rounded-xl font-bold">{loading ? 'جاري المقارنة...' : 'قارن الآن'}</button>
                      {comparisonResult && (
                         <div className="mt-4 bg-slate-900/50 p-3 rounded-xl">
                            <h4 className="font-bold text-emerald-400 mb-2">النتيجة:</h4>
                            <p className="text-sm text-slate-300">{comparisonResult.verdict}</p>
                         </div>
                      )}
                   </div>
                )}

                {/* Stats Simplified */}
                {activeToolView === 'stats' && (
                   <div className="space-y-4">
                      <div className="flex gap-2">
                        <input value={statsQuery} onChange={e=>setStatsQuery(e.target.value)} placeholder="أكثر الهواتف مبيعا..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm outline-none" />
                        <button onClick={handleStatsRequest} className="bg-pink-500 text-white p-3 rounded-xl">{statsLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <PieChart className="w-5 h-5"/>}</button>
                      </div>
                      {statsResult && (
                         <div className="bg-slate-800/40 p-4 rounded-2xl">
                            <h3 className="font-bold text-white mb-4">{statsResult.title}</h3>
                            {statsResult.data.map((d,i)=>(
                               <div key={i} className="mb-2">
                                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{d.label}</span><span className="text-pink-400">{d.displayValue}</span></div>
                                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden"><div style={{width:`${d.value}%`, backgroundColor:d.color}} className="h-full rounded-full"/></div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                )}
             </div>
          )}

        </main>
      </div>

      {/* --- BOTTOM NAVIGATION BAR (PWA Style) --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 pb-safe z-50 h-[80px] px-6 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center h-full max-w-lg mx-auto">
           <button 
             onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} 
             className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'home' ? 'text-sky-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'home' ? 'bg-sky-500/10' : ''}`}>
                 <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-sky-500/20' : ''}`} />
              </div>
              <span className="text-[10px] font-bold">الرئيسية</span>
           </button>

           <button 
             onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} 
             className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'tools' ? 'text-violet-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'tools' ? 'bg-violet-500/10' : ''}`}>
                 <Wrench className={`w-6 h-6 ${activeTab === 'tools' ? 'fill-violet-500/20' : ''}`} />
              </div>
              <span className="text-[10px] font-bold">الأدوات</span>
           </button>

           <button 
             onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} 
             className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'info' ? 'text-emerald-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'info' ? 'bg-emerald-500/10' : ''}`}>
                 <Info className={`w-6 h-6 ${activeTab === 'info' ? 'fill-emerald-500/20' : ''}`} />
              </div>
              <span className="text-[10px] font-bold">معلومات</span>
           </button>
        </div>
      </nav>

      {/* Install Prompt Banner (Styled as Bottom Sheet above Nav) */}
      {showInstallBanner && (
        <div className="fixed bottom-[90px] left-4 right-4 z-[100] animate-slide-up">
          <div className="bg-gradient-to-r from-sky-900/90 to-slate-900/90 border border-sky-500/30 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-white">تثبيت التطبيق</h3>
                <p className="text-[10px] text-sky-200">أضف للشاشة الرئيسية</p>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setShowInstallBanner(false)} className="p-2 text-slate-400 hover:bg-white/10 rounded-lg"><X className="w-4 h-4"/></button>
               <button onClick={handleInstallClick} className="px-4 py-2 bg-white text-sky-600 text-xs font-black rounded-xl hover:bg-sky-50">تثبيت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
