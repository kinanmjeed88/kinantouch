
import React, { useState } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Briefcase, Copy, TrendingUp,
  ShieldCheck, HelpCircle, MessageCircle, FileText, Globe
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

const CACHE_KEYS = {
  JOBS: 'techtouch_jobs_v7',
  AI_NEWS: 'techtouch_ai_v7',
  PHONE_NEWS: 'techtouch_phones_v7'
};

const App: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<PhoneComparisonResult | null>(null);

  const today = new Date();
  const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      if (now - timestamp < sixHours) return data;
    } catch (e) { return null; }
    return null;
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const callGroqAPI = async (prompt: string) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("مفتاح API غير متوفر. يرجى التأكد من إعدادات البيئة.");
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: "أنت محرر تقني خبير ومحترف. تقدم بيانات دقيقة وحقيقية من العراق والعالم باللغة العربية الفصيحة. يجب أن تكون الاستجابة دائماً بصيغة JSON صالحة."
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `فشل الاتصال بـ Groq: ${response.status}`);
    }

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
      if (type === 'jobs') setJobs(cached);
      else if (type === 'ai-news') setAiNews(cached);
      else if (type === 'phone-news') setPhoneNews(cached);
      setLoading(false);
      return;
    }

    try {
      let prompt = "";
      if (type === 'jobs') {
        prompt = `قائمة بـ 8 وظائف حكومية عراقية حقيقية معلنة لتاريخ ${formattedDate}.
        التنسيق: {"data": [{"title": "عنوان الوظيفة", "ministry": "الوزارة", "date": "${formattedDate}", "description": "وصف مختصر", "url": "رابط رسمي", "announcement_type": "actionable", "is_link_verified": true}]}`;
      } else if (type === 'ai-news') {
        prompt = `أهم 8 أخبار تقنية وذكاء اصطناعي عالمية ليوم ${formattedDate}.
        التنسيق: {"data": [{"title": "عنوان الخبر", "description": "تفاصيل مختصرة", "url": "رابط المصدر"}]}`;
      } else if (type === 'phone-news') {
        prompt = `أحدث 8 هواتف ذكية تم إطلاقها في 2024-2025.
        التنسيق: {"data": [{"title": "اسم الهاتف", "manufacturer": "الشركة", "launchDate": "تاريخ الإطلاق", "shortDesc": "المواصفات الأساسية", "url": "رابط التفاصيل"}]}`;
      }

      const result = await callGroqAPI(prompt);
      const data = result.data || [];
      saveToCache(cacheKey, data);
      
      if (type === 'jobs') setJobs(data);
      else if (type === 'ai-news') setAiNews(data);
      else if (type === 'phone-news') setPhoneNews(data);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل جلب البيانات عبر Groq. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = `قارن تقنياً بين هاتف ${phone1} وهاتف ${phone2}.
      التنسيق: {"specs": [{"feature": "الميزة", "phone1": "مواصفات الهاتف الأول", "phone2": "مواصفات الهاتف الثاني"}], "betterPhone": "اسم الهاتف الأفضل", "verdict": "الخلاصة الفنية"}`;
      
      const result = await callGroqAPI(prompt);
      setComparisonResult(result);
    } catch (err: any) {
      setError("تعذر إجراء المقارنة حالياً باستخدام Groq.");
    } finally {
      setLoading(false);
    }
  };

  const shareContent = (item: any, platform: 'tg' | 'copy') => {
    const text = `🔹 ${item.title}\n📝 ${item.description || item.shortDesc || ''}\n🔗 ${item.url}\n#Techtouch`;
    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      alert('تم النسخ!');
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(item.url)}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 font-sans text-right" dir="rtl">
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
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
          <h1 className="text-3xl font-black mb-1">Techtouch</h1>
          <p className="text-slate-400 text-sm font-bold tracking-widest">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md shadow-lg">
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-bold">الرئيسية</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-5 h-5" /><span className="text-[9px] font-bold">معلومات</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-5 h-5" /><span className="text-[9px] font-bold">أدوات</span></button>
          </nav>
        </header>

        <main className="flex-grow py-4">
          {activeTab === 'home' && telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
          
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 text-sky-400 mb-6 border-b border-slate-700/50 pb-4">
                  <HelpCircle className="w-6 h-6" />
                  <h2 className="font-black text-lg uppercase tracking-tight">دليل Techtouch</h2>
                </div>
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sky-400 font-bold text-sm mb-2 flex items-center gap-2"><Globe className="w-4 h-4"/> هويتنا</h3>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">نحن أكبر تجمع تقني عراقي يوفر التطبيقات المعدلة، الألعاب، وشروحات البرمجيات بأمان تام.</p>
                  </section>
                  <section>
                    <h3 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> نظام الطلبات</h3>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">عبر بوت الطلبات الذكي، يمكنك إرسال اسم أي تطبيق وسوف ندرجه في القناة بعد فحصه.</p>
                  </section>
                  <section>
                    <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> الأمان</h3>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">كل ما ننشره مفحوص بأحدث تقنيات مكافحة الفيروسات لضمان خصوصيتك.</p>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-3">
                  {[
                    { id: 'jobs', icon: Briefcase, color: 'emerald', title: 'وظائف العراق', desc: 'تحديثات وزارية رسمية' },
                    { id: 'ai-news', icon: Cpu, color: 'indigo', title: 'الأخبار التقنية', desc: 'جديد الذكاء الاصطناعي' },
                    { id: 'phone-news', icon: Smartphone, color: 'sky', title: 'الهواتف 2025', desc: 'أحدث المواصفات والأسعار' },
                    { id: 'comparison', icon: Search, color: 'slate', title: 'مقارنة ذكية', desc: 'تحليل فني دقيق للهواتف' }
                  ].map((tool) => (
                    <button key={tool.id} onClick={() => tool.id === 'comparison' ? setActiveToolView('comparison') : fetchToolData(tool.id as ToolView)} className="group flex items-center p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-md active:scale-95">
                      <div className={`w-8 h-8 bg-${tool.color}-500/10 rounded-lg flex items-center justify-center ml-3 shrink-0 transition-transform group-hover:scale-110`}><tool.icon className={`w-4 h-4 text-${tool.color}-400`} /></div>
                      <div className="flex-grow text-right">
                        <h3 className="text-[10px] font-black text-slate-100 group-hover:text-sky-400 transition-colors uppercase">{tool.title}</h3>
                        <p className="text-[8px] text-slate-500 mt-0.5">{tool.desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180 text-slate-600 group-hover:text-sky-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveToolView('main')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"><ChevronLeft className="w-4 h-4 rotate-180" /><span className="text-[10px] font-bold">رجوع</span></button>
                    {!loading && activeToolView !== 'comparison' && <button onClick={() => fetchToolData(activeToolView, true)} className="text-[8px] text-sky-500 font-bold border border-sky-500/20 px-2.5 py-1 rounded-lg">تحديث</button>}
                  </div>

                  {loading ? (
                    <div className="py-24 flex flex-col items-center gap-3"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-[10px] text-slate-500 font-black animate-pulse">جاري جلب البيانات عبر Groq...</p></div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-6"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-[10px] text-slate-300 font-bold leading-relaxed">{error}</p></div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl shadow-lg border-r-4 border-r-emerald-500/50">
                          <h3 className="text-[11px] font-black text-emerald-400 mb-2 leading-tight">{job.title}</h3>
                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4 font-medium">{job.description}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2">
                               <button onClick={() => shareContent(job, 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400 hover:bg-sky-500/20 transition-colors"><Send className="w-3.5 h-3.5" /></button>
                               <button onClick={() => shareContent(job, 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-200 hover:bg-slate-600 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={job.url} target="_blank" className="text-[9px] font-black px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/20">رابط التقديم <ExternalLink className="w-3 h-3" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNews.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl shadow-md border-r-4 border-r-indigo-500/50">
                          <h3 className="text-[11px] font-black text-sky-400 mb-2 leading-tight">{n.title}</h3>
                          <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-medium">{n.description}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2"><button onClick={() => shareContent(n, 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button></div>
                            <a href={n.url} target="_blank" className="text-[9px] text-indigo-400 font-black border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-all flex items-center gap-1">قراءة المزيد <ExternalLink className="w-3 h-3" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-4">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl shadow-md border-r-4 border-r-sky-500/50">
                            <h3 className="text-[11px] font-black text-sky-400 mb-2">{phone.title}</h3>
                            <p className="text-[10px] text-slate-400 mb-3 font-medium">{phone.shortDesc}</p>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                              <div className="flex gap-2"><button onClick={() => shareContent(phone, 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button></div>
                              <a href={phone.url} target="_blank" className="text-[9px] text-sky-400 font-black px-4 py-1.5 border border-sky-500/20 rounded-lg">التفاصيل الفنية</a>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1"><Search className="w-4 h-4" /><h3 className="text-[11px] font-black uppercase tracking-widest">مقارنة فنية</h3></div>
                        <input type="text" placeholder="اسم الهاتف الأول (مثال: S24 Ultra)" value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <input type="text" placeholder="اسم الهاتف الثاني (مثال: iPhone 16)" value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-3 rounded-xl text-[10px] shadow-lg shadow-sky-500/20 active:scale-95 transition-all uppercase tracking-tighter">{loading ? "جاري التحليل..." : "بدء المقارنة الذكية"}</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-[9px]">
                              <thead className="bg-slate-900/80"><tr><th className="p-3 text-sky-400 border-b border-slate-700">الميزة</th><th className="p-3 border-b border-slate-700">{phone1}</th><th className="p-3 border-b border-slate-700">{phone2}</th></tr></thead>
                              <tbody className="divide-y divide-slate-700/30">{comparisonResult.specs.map((s, i) => <tr key={i} className="hover:bg-white/5 transition-colors"><td className="p-3 font-black text-slate-300">{s.feature}</td><td className="p-3 text-slate-400 font-medium">{s.phone1}</td><td className="p-3 text-slate-400 font-medium">{s.phone2}</td></tr>)}</tbody>
                            </table>
                          </div>
                          <div className="p-5 bg-emerald-500/10 border-t border-slate-700/50">
                            <p className="text-[10px] text-emerald-400 font-black mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> الأفضل: {comparisonResult.betterPhone}</p>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-bold">{comparisonResult.verdict}</p>
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
               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 opacity-60">تطوير وبرمجة</span>
               <span className="text-[12px] font-black text-slate-300 group-hover:text-sky-400 transition-colors tracking-tighter">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
