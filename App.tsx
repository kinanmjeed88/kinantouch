
import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, AlertTriangle, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Briefcase, Copy, TrendingUp, ChevronDown, ChevronUp, CheckCircle2,
  ShieldCheck, HelpCircle, MessageCircle
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

// مفاتيح التخزين المؤقت
const CACHE_KEYS = {
  JOBS: 'techtouch_jobs_cache',
  AI_NEWS: 'techtouch_ai_cache',
  PHONE_NEWS: 'techtouch_phones_cache'
};

const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [expandedPhone, setExpandedPhone] = useState<number | null>(null);
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

  // دالة التحقق من التخزين المؤقت (6 ساعات)
  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    
    if (now - timestamp < sixHoursInMs) return data;
    return null;
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  };

  const cleanAndParseJSON = (text: string) => {
    if (!text) throw new Error("لا يوجد نص لتحليله.");
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
      throw new Error("فشل في تحليل البيانات كـ JSON.");
    }
  };

  const callGroqAPI = async (prompt: string, isJson: boolean = true) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح Groq API غير متوفر (VITE_GROQ_API_KEY).");

    const systemInstruction = isJson 
      ? `أنت نظام ذكاء اصطناعي يعمل كمحرر أخبار رسمي. أخرج النتيجة بصيغة JSON فقط.
         القواعد: 10 منشورات، لا تكرار، لغة عربية فصيحة، أخبار رسمية فقط.`
      : "أنت خبير تقني مساعد.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: isJson ? { type: "json_object" } : undefined,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "فشل الاتصال بـ Groq API");
    }

    const result = await response.json();
    return result.choices[0].message.content;
  };

  const fetchToolData = async (type: ToolView, force: boolean = false) => {
    setLoading(true);
    setError(null);
    setActiveToolView(type);
    
    // محاولة استرجاع البيانات من الكاش أولاً
    const cacheKey = type === 'jobs' ? CACHE_KEYS.JOBS : type === 'ai-news' ? CACHE_KEYS.AI_NEWS : CACHE_KEYS.PHONE_NEWS;
    const cachedData = !force ? getCachedData(cacheKey) : null;

    if (cachedData) {
      if (type === 'phone-news') setPhoneNews(cachedData);
      else if (type === 'jobs') setJobs(cachedData);
      else if (type === 'ai-news') setAiNews(cachedData);
      setLoading(false);
      return;
    }

    let prompt = "";
    if (type === 'phone-news') {
      prompt = `List 10 of the ABSOLUTE LATEST smartphones for ${formattedDate}. 
      JSON structure: {"data": [{"title": "...", "manufacturer": "...", "launchDate": "...", "shortDesc": "...", "fullSpecs": [], "url": "..."}]}`;
    } else if (type === 'jobs') {
      prompt = `Search for 10 REAL official Iraqi job vacancies for ${formattedDate}. 
      JSON structure: {"data": [{"title": "...", "ministry": "...", "date": "...", "description": "...", "url": "...", "announcement_type": "actionable", "is_link_verified": true}]}`;
    } else if (type === 'ai-news') {
      prompt = `List 10 RECENT AI tools released as of ${formattedDate}. 
      JSON structure: {"data": [{"title": "...", "description": "...", "url": "..."}]}`;
    }

    try {
      const textResponse = await callGroqAPI(prompt);
      const parsed = cleanAndParseJSON(textResponse);
      const data = parsed.data || (Array.isArray(parsed) ? parsed : []);
      
      saveToCache(cacheKey, data);
      
      if (type === 'phone-news') setPhoneNews(data);
      else if (type === 'jobs') setJobs(data);
      else if (type === 'ai-news') setAiNews(data);
    } catch (err: any) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setComparisonResult(null);
    try {
      const prompt = `قارن بين ${phone1} و ${phone2} بأحدث مواصفات 2025. 
      JSON: { "specs": [{"feature": "...", "phone1": "...", "phone2": "..."}], "verdict": "...", "betterPhone": "..." }`;
      const textResponse = await callGroqAPI(prompt);
      setComparisonResult(cleanAndParseJSON(textResponse));
    } catch (err) {
      setError("فشلت المقارنة.");
    } finally { setLoading(false); }
  };

  const shareFullContent = (data: any, type: 'phone' | 'job' | 'ai', platform: 'tg' | 'copy') => {
    let text = "";
    if (type === 'phone') {
      const item = data as PhoneNewsItem;
      text = `📱 ${item.title}\n📅 2025\n🛠 المواصفات:\n${item.fullSpecs?.join('\n')}\n🔗 ${item.url}\n#Techtouch`;
    } else if (type === 'job') {
      const item = data as JobItem;
      text = `💼 ${item.title}\n🏛 ${item.ministry}\n📝 ${item.description}\n🔗 ${item.url}\n#وظائف_العراق`;
    } else {
      const item = data as AINewsItem;
      text = `🤖 ${item.title}\n📝 ${item.description}\n🔗 ${item.url}\n#AI`;
    }

    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      alert('تم نسخ المحتوى!');
      return;
    }
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(data.url);
    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 overflow-x-hidden relative font-sans text-right" dir="rtl">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        <header className={`pt-12 pb-6 text-center transition-all duration-700 transform ${loaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
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
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-6 h-6" /><span className="text-[10px] font-bold">الرئيسية</span></button>
            <div className="w-px h-8 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-6 h-6" /><span className="text-[10px] font-bold">معلومات</span></button>
            <div className="w-px h-8 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-6 h-6" /><span className="text-[10px] font-bold">أدوات</span></button>
          </nav>
        </header>

        <main className="flex-grow py-4">
          {activeTab === 'home' && telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
          
          {activeTab === 'info' && (
            <div className="space-y-5 animate-fade-in text-right">
              {/* قسم دليل الاستخدام */}
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3 text-sky-400 mb-4">
                  <HelpCircle className="w-6 h-6" />
                  <h2 className="font-black text-lg">دليل استخدام Techtouch</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-xs shrink-0">1</div>
                    <p className="text-slate-300 text-xs leading-relaxed">تصفح القنوات الرسمية من "الرئيسية" للوصول لأحدث التطبيقات والألعاب المعدلة.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-xs shrink-0">2</div>
                    <p className="text-slate-300 text-xs leading-relaxed">استخدم قسم "الأدوات" لمتابعة تعيينات العراق وأخبار الذكاء الاصطناعي التي نحدثها باستمرار.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-xs shrink-0">3</div>
                    <p className="text-slate-300 text-xs leading-relaxed">يمكنك مقارنة أي هاتفين ذكياً عبر أداة المقارنة المدعومة بـ Llama 3.3.</p>
                  </div>
                </div>
              </div>

              {/* قسم بوت الطلبات */}
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3 text-indigo-400 mb-4">
                  <MessageCircle className="w-6 h-6" />
                  <h2 className="font-black text-lg">بوت الطلبات الرسمي</h2>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  نوفر لك نظاماً آلياً لاستقبال طلبات التطبيقات. يرجى اتباع القواعد التالية:
                </p>
                <ul className="space-y-2 mb-5">
                  <li className="flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> إرسال اسم التطبيق باللغة الإنجليزية.</li>
                  <li className="flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> إرفاق صورة أو رابط متجر Google Play.</li>
                  <li className="flex items-center gap-2 text-[11px] text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-red-400" /> يمنع طلب كودات التفعيل المدفوعة.</li>
                </ul>
                <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl transition-all shadow-lg active:scale-[0.98] text-sm">
                  <ExternalLink className="w-4 h-4" />
                  <span>افتح البوت الآن</span>
                </a>
              </div>

              {/* قسم الأمان والتنويهات */}
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3 text-amber-400 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                  <h2 className="font-black text-lg">تنويهات الأمان</h2>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl">
                  <p className="text-amber-200/80 text-[11px] leading-relaxed">
                    نحن في Techtouch نقوم بفحص جميع الملفات المنشورة، ولكننا ننصح دائماً بتحميل التطبيقات من الروابط الرسمية التي نوفرها لضمان حمايتك. لا نقوم بطلب أي معلومات سرية أو كلمات مرور عبر قنواتنا.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-3">
                  <button onClick={() => fetchToolData('jobs')} className="group flex items-center p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-xl text-right">
                    <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center ml-3 group-hover:bg-emerald-500/20 transition-colors"><Briefcase className="w-5 h-5 text-emerald-400" /></div>
                    <div className="flex-grow text-right">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-xs font-bold">أخبار الوظائف والتعيينات</h3>
                        <span className="text-[7px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full font-black border border-red-600/30">جديد</span>
                      </div>
                      <p className="text-[9px] text-slate-500">متابعة التعيينات الرسمية في العراق</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>

                  <button onClick={() => fetchToolData('ai-news')} className="group flex items-center p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center ml-3 group-hover:bg-indigo-500/20 transition-colors"><Cpu className="w-5 h-5 text-indigo-400" /></div>
                    <div className="flex-grow text-right">
                      <h3 className="text-xs font-bold">أخبار الذكاء الاصطناعي</h3>
                      <p className="text-[9px] text-slate-500">آخر النماذج والتقنيات (GPT-5, Llama 3)</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>

                  <button onClick={() => fetchToolData('phone-news')} className="group flex items-center p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center ml-3 group-hover:bg-sky-500/20 transition-colors"><Smartphone className="w-5 h-5 text-sky-400" /></div>
                    <div className="flex-grow text-right">
                      <h3 className="text-xs font-bold">أخبار الهواتف</h3>
                      <p className="text-[9px] text-slate-500">أحدث إصدارات 2024-2025</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>

                  <button onClick={() => setActiveToolView('comparison')} className="group flex items-center p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-9 h-9 bg-slate-500/10 rounded-xl flex items-center justify-center ml-3 group-hover:bg-slate-500/20 transition-colors"><Search className="w-5 h-5 text-slate-400" /></div>
                    <div className="flex-grow text-right">
                      <h3 className="text-xs font-bold">المقارنة بين الهواتف</h3>
                      <p className="text-[9px] text-slate-500">مواصفات ذكية وتقييمات دقيقة</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveToolView('main')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"><ChevronLeft className="w-4 h-4 rotate-180" /><span className="text-xs font-bold">رجوع للأدوات</span></button>
                    {!loading && <button onClick={() => fetchToolData(activeToolView, true)} className="text-[9px] text-sky-500 font-bold border border-sky-500/20 px-2.5 py-1 rounded-lg hover:bg-sky-500/5 transition-all">تحديث يدوي</button>}
                  </div>
                  
                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 animate-fade-in"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-[10px] text-slate-500 font-black tracking-widest text-center">جاري جلب بيانات محدثة...</p></div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-4"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" /><p className="text-[10px] text-slate-300">{error}</p></div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl text-right animate-slide-up shadow-lg">
                          <div className="flex justify-between items-start mb-2.5">
                            <div>
                              <h3 className="text-[11px] font-black text-emerald-400 leading-snug">{job.title}</h3>
                              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-lg font-bold mt-1 inline-block">{job.ministry}</span>
                            </div>
                            <span className={`flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded-full font-black border ${job.announcement_type === 'actionable' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : 'bg-slate-600/20 text-slate-400 border-slate-600/30'}`}>
                              {job.announcement_type === 'actionable' ? 'تقديم مفتوح' : 'إعلان فقط'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed mb-4" dir="rtl">{job.description}</p>
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/50">
                            <div className="flex gap-1.5">
                               <button onClick={() => shareFullContent(job, 'job', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                               <button onClick={() => shareFullContent(job, 'job', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-200"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={job.url} target="_blank" className="text-[9px] font-black px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1 hover:bg-emerald-500/20">رابط المصدر <ExternalLink className="w-3 h-3" /></a>
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
                            <div className="flex gap-1.5">
                              <button onClick={() => shareFullContent(n, 'ai', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                              <button onClick={() => shareFullContent(n, 'ai', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-200"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={n.url} target="_blank" className="text-[9px] text-indigo-400 font-black border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10">زيارة الأداة <ExternalLink className="w-3 h-3 inline mr-1" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-4">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-2xl text-right animate-slide-up">
                            <h3 className="text-[11px] font-black text-sky-400 mb-2.5 border-b border-slate-700/30 pb-2 leading-tight">{phone.title}</h3>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-700/30">
                                <p className="text-[7px] text-slate-500">الشركة</p>
                                <p className="text-[9px] text-slate-200 font-bold">{phone.manufacturer}</p>
                              </div>
                              <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-700/30">
                                <p className="text-[7px] text-slate-500">الإصدار</p>
                                <p className="text-[9px] text-slate-200 font-bold">{phone.launchDate}</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed mb-3">{phone.shortDesc}</p>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                              <div className="flex gap-1.5">
                                <button onClick={() => shareFullContent(phone, 'phone', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                                <button onClick={() => shareFullContent(phone, 'phone', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-200"><Copy className="w-3.5 h-3.5" /></button>
                              </div>
                              <a href={phone.url} target="_blank" className="text-[9px] text-sky-400 font-black px-3 py-1.5 bg-sky-500/5 rounded-lg border border-sky-500/20">التفاصيل <ExternalLink className="w-3 h-3" /></a>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl space-y-3.5 shadow-xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1">
                          <Search className="w-4 h-4" />
                          <h3 className="text-[11px] font-black">مقارنة هواتف 2025</h3>
                        </div>
                        <input type="text" placeholder="اسم الهاتف الأول..." value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-right text-[11px] outline-none focus:border-sky-500/50" />
                        <input type="text" placeholder="اسم الهاتف الثاني..." value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-right text-[11px] outline-none focus:border-sky-500/50" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-2.5 rounded-xl active:scale-95 disabled:opacity-50 text-xs shadow-lg">{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "ابدأ المقارنة"}</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden animate-slide-up shadow-2xl">
                          <table className="w-full text-right text-[9px]">
                            <thead className="bg-slate-900/80"><tr><th className="p-2.5 text-sky-400 border-b border-slate-700">الميزة</th><th className="p-2.5 border-b border-slate-700">{phone1}</th><th className="p-2.5 border-b border-slate-700">{phone2}</th></tr></thead>
                            <tbody className="divide-y divide-slate-700/30">{comparisonResult.specs.map((s, i) => <tr key={i} className="hover:bg-slate-700/10"><td className="p-2.5 font-bold text-slate-300">{s.feature}</td><td className="p-2.5 text-slate-400">{s.phone1}</td><td className="p-2.5 text-slate-400">{s.phone2}</td></tr>)}</tbody>
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
               <span className="text-[11px] font-black text-slate-300 group-hover:text-sky-400 transition-colors tracking-wide">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
