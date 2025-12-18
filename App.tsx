
import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Briefcase, Copy, TrendingUp, CheckCircle2,
  ShieldCheck, HelpCircle, MessageCircle, FileText, Globe
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

const CACHE_KEYS = {
  JOBS: 'techtouch_jobs_v2',
  AI_NEWS: 'techtouch_ai_v2',
  PHONE_NEWS: 'techtouch_phones_v2'
};

const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
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

  useEffect(() => {
    setLoaded(true);
  }, []);

  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const expiry = 6 * 60 * 60 * 1000; // 6 hours
    if (now - timestamp < expiry) return data;
    return null;
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const cleanAndParseJSON = (text: string) => {
    try {
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      }
      return JSON.parse(cleaned);
    } catch (e) {
      const arrayStart = text.indexOf('[');
      const arrayEnd = text.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1) {
        try { return JSON.parse(text.substring(arrayStart, arrayEnd + 1)); } catch (err) {}
      }
      throw new Error("فشل في تحليل البيانات.");
    }
  };

  const callGroqAPI = async (prompt: string) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("VITE_GROQ_API_KEY غير متوفر.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `أنت محرر أخبار رسمي. أخرج JSON فقط. 10 منشورات لكل قسم. أخبار حقيقية ورسمية حصراً. لا تكرار. وقت التوليد: ${formattedDate}.` 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    if (!response.ok) throw new Error("خطأ في الاتصال بالمخدم.");
    const res = await response.json();
    return res.choices[0].message.content;
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

    let prompt = "";
    if (type === 'jobs') prompt = `أحضر 10 وظائف حكومية عراقية رسمية ليوم ${formattedDate}. JSON: {"data": [{"title": "...", "ministry": "...", "date": "...", "description": "...", "url": "...", "announcement_type": "actionable"}]}`;
    else if (type === 'ai-news') prompt = `أحضر 10 أخبار ذكاء اصطناعي رسمية جديدة ليوم ${formattedDate}. JSON: {"data": [{"title": "...", "description": "...", "url": "..."}]}`;
    else if (type === 'phone-news') prompt = `أحضر 10 هواتف ذكية صدرت حديثاً في 2024-2025. JSON: {"data": [{"title": "...", "manufacturer": "...", "launchDate": "...", "shortDesc": "...", "url": "..."}]}`;

    try {
      const result = await callGroqAPI(prompt);
      const parsed = cleanAndParseJSON(result);
      const finalData = parsed.data || parsed;
      saveToCache(cacheKey, finalData);
      if (type === 'jobs') setJobs(finalData);
      else if (type === 'ai-news') setAiNews(finalData);
      else if (type === 'phone-news') setPhoneNews(finalData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setComparisonResult(null);
    try {
      const result = await callGroqAPI(`قارن بين ${phone1} و ${phone2}. JSON: {"specs": [{"feature": "...", "phone1": "...", "phone2": "..."}], "betterPhone": "...", "verdict": "..."}`);
      setComparisonResult(cleanAndParseJSON(result));
    } catch (err) {
      setError("فشلت المقارنة.");
    } finally { setLoading(false); }
  };

  const shareContent = (data: any, type: string, platform: 'tg' | 'copy') => {
    const text = `🔹 ${data.title}\n📝 ${data.description || data.shortDesc}\n🔗 ${data.url}\n#Techtouch`;
    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      alert('تم النسخ!');
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 font-sans text-right" dir="rtl">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        <header className="pt-12 pb-6 text-center animate-fade-in">
          <div className="inline-block relative mb-6">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                {profileConfig.image && !imageError ? (
                  <img src={profileConfig.image} alt="P" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                ) : (
                  <span className="text-4xl font-black text-sky-400">{profileConfig.initials}</span>
                )}
             </div>
          </div>
          <h1 className="text-3xl font-black mb-1">Techtouch</h1>
          <p className="text-slate-400 text-sm font-bold">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md">
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
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3 text-sky-400 mb-4 border-b border-slate-700 pb-3">
                  <HelpCircle className="w-6 h-6" />
                  <h2 className="font-black text-lg">دليل منصة Techtouch</h2>
                </div>
                <div className="space-y-5">
                  <section>
                    <h3 className="text-sky-400 font-bold text-sm mb-2 flex items-center gap-2"><Globe className="w-4 h-4"/> من نحن؟</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Techtouch هي منصة تقنية عراقية رائدة، تهدف لتبسيط الوصول للتطبيقات والأخبار التقنية والوظائف الرسمية، وتوفر جسراً مباشراً بين المستخدم وأحدث حلول الذكاء الاصطناعي.</p>
                  </section>
                  <section>
                    <h3 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2"><MessageCircle className="w-4 h-4"/> كيف تطلب تطبيقاً؟</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">عبر قسم "الرئيسية" ستجد "بوت الطلبات". أرسل اسم التطبيق بالإنجليزية مع رابط المتجر وسيقوم فريقنا بتوفيره لك معدلاً في أقرب وقت.</p>
                  </section>
                  <section>
                    <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> سياسة الأمان</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">جميع الملفات المنشورة تمر عبر فحص دقيق قبل النشر. نحن نضمن سلامة جهازك وخصوصيتك في جميع القنوات الرسمية التابعة لنا.</p>
                  </section>
                  <section>
                    <h3 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> الدعم والمقترحات</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">يمكنك الانضمام لكروبات المناقشة في التيليجرام لحل مشاكلك التقنية مباشرة مع المطور كنان الصائغ وفريق العمل.</p>
                  </section>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-sky-500 text-white font-black rounded-xl text-xs hover:bg-sky-400 transition-all">
                    تواصل مع بوت الطلبات الرسمي <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-3">
                  {/* أزرار الأدوات بخطوط أصغر وتنسيق أنيق */}
                  {[
                    { id: 'jobs', icon: Briefcase, color: 'emerald', title: 'أخبار الوظائف والتعيينات', desc: 'تحديثات حكومية رسمية (العراق)' },
                    { id: 'ai-news', icon: Cpu, color: 'indigo', title: 'أخبار الذكاء الاصطناعي', desc: 'جديد نماذج GPT و Llama' },
                    { id: 'phone-news', icon: Smartphone, color: 'sky', title: 'أخبار الهواتف والتقنية', desc: 'أحدث إصدارات 2025' },
                    { id: 'comparison', icon: Search, color: 'slate', title: 'مقارنة الهواتف الذكية', desc: 'تحليل مواصفات ذكي' }
                  ].map((tool) => (
                    <button key={tool.id} onClick={() => tool.id === 'comparison' ? setActiveToolView('comparison') : fetchToolData(tool.id as ToolView)} className="group flex items-center p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-lg">
                      <div className={`w-9 h-9 bg-${tool.color}-500/10 rounded-xl flex items-center justify-center ml-3 shrink-0`}><tool.icon className={`w-5 h-5 text-${tool.color}-400`} /></div>
                      <div className="flex-grow text-right">
                        <h3 className="text-[11px] font-bold text-slate-100 group-hover:text-sky-400 transition-colors">{tool.title}</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">{tool.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveToolView('main')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"><ChevronLeft className="w-4 h-4 rotate-180" /><span className="text-[10px] font-bold">رجوع للأدوات</span></button>
                    {!loading && <button onClick={() => fetchToolData(activeToolView, true)} className="text-[8px] text-sky-500 font-bold border border-sky-500/20 px-2.5 py-1 rounded-lg hover:bg-sky-500/5 transition-all">تحديث (6 ساعات)</button>}
                  </div>
                  
                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 animate-fade-in"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-[10px] text-slate-500 font-bold">جاري استرجاع البيانات الرسمية...</p></div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-4"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-[10px] text-slate-300">{error}</p></div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl animate-slide-up shadow-lg text-left" dir="ltr">
                          <div className="flex justify-between items-start mb-2.5" dir="rtl">
                            <h3 className="text-[11px] font-black text-emerald-400 leading-snug">{job.title}</h3>
                            <span className={`text-[7px] px-2 py-0.5 rounded-full font-black border ${job.announcement_type === 'actionable' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : 'bg-slate-600/20 text-slate-400 border-slate-600/30'}`}>{job.announcement_type === 'actionable' ? 'تقديم مفتوح' : 'إعلان فقط'}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4 text-right" dir="rtl">{job.description}</p>
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/50" dir="rtl">
                            <div className="flex gap-2">
                               <button onClick={() => shareContent(job, 'job', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400 hover:bg-sky-500/20"><Send className="w-3.5 h-3.5" /></button>
                               <button onClick={() => shareContent(job, 'job', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-200 hover:bg-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={job.url} target="_blank" className="text-[9px] font-black px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1">المصدر الرسمي <ExternalLink className="w-3 h-3" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNews.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl text-right animate-slide-up shadow-md">
                          <h3 className="text-[11px] font-black text-sky-400 mb-2 leading-tight">{n.title}</h3>
                          <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">{n.description}</p>
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/50">
                            <div className="flex gap-2"><button onClick={() => shareContent(n, 'ai', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button></div>
                            <a href={n.url} target="_blank" className="text-[9px] text-indigo-400 font-black border border-indigo-500/30 px-3 py-1.5 rounded-lg">زيارة الأداة <ExternalLink className="w-3 h-3 inline mr-1" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-4">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-2xl text-right animate-slide-up">
                            <h3 className="text-[11px] font-black text-sky-400 mb-2.5 leading-tight">{phone.title}</h3>
                            <p className="text-[10px] text-slate-400 leading-relaxed mb-3">{phone.shortDesc}</p>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                              <div className="flex gap-2"><button onClick={() => shareContent(phone, 'phone', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button></div>
                              <a href={phone.url} target="_blank" className="text-[9px] text-sky-400 font-black px-3 py-1.5 border border-sky-500/20 rounded-lg">التفاصيل</a>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl space-y-3.5 shadow-xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1"><Search className="w-4 h-4" /><h3 className="text-[11px] font-black">مقارنة هواتف 2025</h3></div>
                        <input type="text" placeholder="الهاتف الأول..." value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-sky-500/50" />
                        <input type="text" placeholder="الهاتف الثاني..." value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-sky-500/50" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-2.5 rounded-xl active:scale-95 disabled:opacity-50 text-[10px]">{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "ابدأ المقارنة"}</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden animate-slide-up">
                          <table className="w-full text-right text-[9px]">
                            <thead className="bg-slate-900/80"><tr><th className="p-2.5 text-sky-400">الميزة</th><th>{phone1}</th><th>{phone2}</th></tr></thead>
                            <tbody className="divide-y divide-slate-700/30">{comparisonResult.specs.map((s, i) => <tr key={i}><td className="p-2.5 font-bold text-slate-300">{s.feature}</td><td className="p-2.5 text-slate-400">{s.phone1}</td><td className="p-2.5 text-slate-400">{s.phone2}</td></tr>)}</tbody>
                          </table>
                          <div className="p-4 bg-emerald-500/10 border-t border-slate-700/50">
                            <p className="text-[10px] text-emerald-400 font-black mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5"/> الأفضل: {comparisonResult.betterPhone}</p>
                            <p className="text-[10px] text-slate-300 leading-relaxed">{comparisonResult.verdict}</p>
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

        <footer className="mt-10 pt-6 border-t border-slate-800/50 text-center">
           <SocialLinks links={socialLinks} />
           <div className="mt-8 pb-4">
             <a href={footerData.url} target="_blank" className="group inline-flex flex-col items-center">
               <span className="text-[9px] text-slate-500 font-bold">تم التطوير والبرمجة بواسطة</span>
               <span className="text-[11px] font-black text-slate-300 group-hover:text-sky-400 transition-colors">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
