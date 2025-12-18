
import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, AlertTriangle, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Briefcase, Copy, TrendingUp, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

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
    if (!apiKey) throw new Error("مفتاح Groq API غير متوفر.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: isJson 
              ? "You are a helpful assistant that strictly outputs JSON. Do not include any conversational text." 
              : "You are a helpful tech expert."
          },
          { role: "user", content: prompt }
        ],
        response_format: isJson ? { type: "json_object" } : undefined,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "فشل الاتصال بـ Groq API");
    }

    const result = await response.json();
    return result.choices[0].message.content;
  };

  const fetchToolData = async (type: ToolView) => {
    setLoading(true);
    setError(null);
    setActiveToolView(type);
    
    let prompt = "";

    if (type === 'phone-news') {
      prompt = `List 10 of the ABSOLUTE LATEST smartphones released or leaked in late 2024/2025. Today is ${formattedDate}. Arabic. 
      Return a JSON object with a key 'data' which is an array of objects: {title, manufacturer, launchDate, shortDesc, fullSpecs: string[], url}.`;
    } else if (type === 'jobs') {
      prompt = `Search for REAL official Iraqi job vacancies for ${formattedDate}. Arabic. 
      Return a JSON object with a key 'data' which is an array: {title, ministry, date, description, url, announcement_type: 'informational'|'actionable', is_link_verified: boolean}.`;
    } else if (type === 'ai-news') {
      prompt = `List 10 RECENT AI tools released as of ${formattedDate}. Arabic. 
      Return a JSON object with a key 'data' which is an array: {title, description, url}.`;
    }

    try {
      const textResponse = await callGroqAPI(prompt);
      const parsed = cleanAndParseJSON(textResponse);
      const data = parsed.data || parsed;
      
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
      أرجع النتيجة بصيغة JSON حصراً بهذا الهيكل: { "specs": [{"feature": "...", "phone1": "...", "phone2": "..."}], "verdict": "...", "betterPhone": "..." } باللغة العربية.`;
      const textResponse = await callGroqAPI(prompt);
      setComparisonResult(cleanAndParseJSON(textResponse));
    } catch (err) {
      setError("فشلت المقارنة.");
    } finally { setLoading(false); }
  };

  const shareFullContent = (data: any, type: 'phone' | 'job' | 'ai', platform: 'tg' | 'fb' | 'insta' | 'copy') => {
    let text = "";
    if (type === 'phone') {
      const item = data as PhoneNewsItem;
      text = `📱 ${item.title}\n📅 2025 Update\n📝 ${item.shortDesc}\n🛠 Specs:\n${item.fullSpecs.map(s => `• ${s}`).join('\n')}\n🔗 Link: ${item.url}\n\n#Techtouch`;
    } else if (type === 'job') {
      const item = data as JobItem;
      text = `💼 ${item.title}\n🏛 ${item.ministry}\n📅 ${item.date}\n📝 ${item.description}\n🔗 Link: ${item.url}\n\n#وظائف_العراق #Techtouch`;
    } else {
      const item = data as AINewsItem;
      text = `🤖 ${item.title}\n📝 ${item.description}\n🔗 ${item.url}\n\n#AI #Techtouch`;
    }

    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      alert('تم نسخ المحتوى!');
      return;
    }

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(data.url);

    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
    else if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    else {
      navigator.clipboard.writeText(text);
      alert('تم النسخ لمشاركته في Instagram');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 overflow-x-hidden relative font-sans">
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
            <div className="space-y-4 animate-fade-in text-left">
              <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-3xl space-y-3.5 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2 text-sky-400 mb-0.5">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <h2 className="font-black text-sm text-right w-full" dir="rtl">بخصوص بوت الطلبات على التيليكرام</h2>
                </div>
                <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98] text-[10px]">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>الدخول لبوت الطلبات</span>
                </a>
                <div className="space-y-2.5">
                  <p className="text-slate-300 text-[10.5px] leading-relaxed text-right pr-2 border-r-2 border-sky-500/30" dir="rtl">ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط .✪</p>
                  <p className="text-slate-200/90 text-[10.5px] leading-relaxed text-right pr-2 border-r-2 border-amber-500/30" dir="rtl">لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات .✪</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-4">
                  <button onClick={() => fetchToolData('jobs')} className="group flex flex-row p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-xl items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors ml-4">
                      <Briefcase className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-grow text-left">
                      <div className="flex items-center gap-2 justify-start mb-0.5">
                        <span className="text-[8px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-black border border-red-600/30">تجريبي</span>
                        <h3 className="text-sm font-bold">أخبار الوظائف والتعيينات</h3>
                      </div>
                      <p className="text-[10px] text-slate-400">نشر ما يخص التعيينات والوظائف في العراق</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400 mr-2" />
                  </button>

                  <button onClick={() => fetchToolData('ai-news')} className="group flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center ml-4 group-hover:bg-indigo-500/20 transition-colors"><Cpu className="w-6 h-6 text-indigo-400" /></div>
                    <div className="flex-grow pr-1 text-right">
                      <h3 className="text-sm font-bold">أخبار الذكاء الاصطناعي</h3>
                      <p className="text-[10px] text-slate-400">آخر النماذج والتقنيات (Llama 3, GPT-5)</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>

                  <button onClick={() => fetchToolData('phone-news')} className="group flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center ml-4 group-hover:bg-sky-500/20 transition-colors"><Smartphone className="w-6 h-6 text-sky-400" /></div>
                    <div className="flex-grow pr-1 text-right">
                      <h3 className="text-sm font-bold">أخبار الهواتف</h3>
                      <p className="text-[10px] text-slate-400">أحدث إصدارات 2024-2025</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>

                  <button onClick={() => setActiveToolView('comparison')} className="group flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all text-right shadow-xl">
                    <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center ml-4 group-hover:bg-slate-500/20 transition-colors"><Search className="w-6 h-6 text-slate-400" /></div>
                    <div className="flex-grow pr-1 text-right">
                      <h3 className="text-sm font-bold">المقارنة بين الهواتف</h3>
                      <p className="text-[10px] text-slate-400">مواصفات ذكية وتقييمات دقيقة</p>
                    </div>
                    <ArrowRight className="w-4 h-4 rotate-180 text-slate-600 group-hover:text-sky-400" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setActiveToolView('main')} className="flex items-center gap-2 text-slate-500 mb-4 hover:text-sky-400 transition-colors"><ChevronLeft className="w-5 h-5 rotate-180" /><span className="text-sm font-bold">رجوع للأدوات</span></button>
                  
                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 animate-fade-in"><Loader2 className="w-12 h-12 text-sky-400 animate-spin" /><p className="text-[11px] text-slate-400 font-black tracking-widest text-center">جاري استرجاع البيانات عبر Groq API...</p></div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-4"><AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" /><p className="text-xs text-slate-300">{error}</p></div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-right animate-slide-up hover:border-emerald-500/30 transition-all shadow-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col items-end">
                              <h3 className="text-sm font-black text-emerald-400 leading-snug">{job.title}</h3>
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg font-black mt-1">{job.ministry}</span>
                            </div>
                            {job.announcement_type === 'actionable' ? (
                              <span className="flex items-center gap-1 text-[8px] bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded-full font-black border border-emerald-600/30"><CheckCircle2 className="w-3 h-3" /> تقديم مفتوح</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[8px] bg-slate-600/20 text-slate-400 px-2 py-1 rounded-full font-black border border-slate-600/30"><AlertTriangle className="w-3 h-3" /> إعلان رسمي</span>
                            )}
                          </div>
                          <div className="bg-slate-900/50 p-4 rounded-2xl mb-4 border border-slate-700/30">
                             <p className="text-[10.5px] text-slate-300 leading-relaxed whitespace-pre-line" dir="rtl">{job.description}</p>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2">
                               <button onClick={() => shareFullContent(job, 'job', 'tg')} className="p-2 bg-sky-500/10 rounded-xl text-sky-400"><Send className="w-4 h-4" /></button>
                               <button onClick={() => shareFullContent(job, 'job', 'copy')} className="p-2 bg-slate-700 rounded-xl text-slate-200"><Copy className="w-4 h-4" /></button>
                            </div>
                            <a href={job.url} target="_blank" className={`text-[10px] font-black px-4 py-2 rounded-xl border flex items-center gap-1.5 transition-all ${job.announcement_type === 'actionable' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700'}`}>
                              الرابط الرسمي <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNews.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-right animate-slide-up hover:border-indigo-500/30 transition-all shadow-md">
                          <h3 className="text-sm font-black text-sky-400 mb-3 leading-tight">{n.title}</h3>
                          <p className="text-[11px] text-slate-300 mb-5 leading-relaxed">{n.description}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2">
                              <button onClick={() => shareFullContent(n, 'ai', 'tg')} className="p-2 bg-sky-500/10 rounded-xl text-sky-400"><Send className="w-4 h-4" /></button>
                              <button onClick={() => shareFullContent(n, 'ai', 'copy')} className="p-2 bg-slate-700 rounded-xl text-slate-200"><Copy className="w-4 h-4" /></button>
                            </div>
                            <a href={n.url} target="_blank" className="text-[10px] text-indigo-400 font-black border border-indigo-500/30 px-5 py-2 rounded-xl hover:bg-indigo-500/10 transition-all">زيارة الموقع <ExternalLink className="w-3 h-3 inline mr-1" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-4">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl text-right animate-slide-up">
                            <h3 className="text-sm font-black text-sky-400 mb-3 border-b border-slate-700/30 pb-2 leading-tight">{phone.title}</h3>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-700/30">
                                <p className="text-[8px] text-slate-500 mb-0.5">الشركة</p>
                                <p className="text-[10px] text-slate-200 font-bold">{phone.manufacturer}</p>
                              </div>
                              <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-700/30">
                                <p className="text-[8px] text-slate-500 mb-0.5">تاريخ الإصدار</p>
                                <p className="text-[10px] text-slate-200 font-bold">{phone.launchDate}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed pr-3 border-r-2 border-sky-500/20 mb-4">{phone.shortDesc}</p>
                            
                            <button onClick={() => setExpandedPhone(expandedPhone === i ? null : i)} className="w-full flex items-center justify-between px-4 py-2.5 bg-sky-500/5 text-sky-400 text-[10px] font-black rounded-xl border border-sky-500/20 mb-3 hover:bg-sky-500/10 transition-all">
                              <span>{expandedPhone === i ? 'إخفاء التفاصيل' : 'عرض المواصفات الكاملة'}</span>
                              {expandedPhone === i ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                            </button>

                            {expandedPhone === i && (
                              <div className="bg-slate-900/80 p-4 rounded-2xl mb-4 border border-slate-700/80 shadow-inner">
                                <ul className="space-y-2.5">
                                  {phone.fullSpecs.map((spec, idx) => (
                                    <li key={idx} className="text-[10px] text-slate-300 pr-3 border-r border-sky-500/40 flex items-start"><span className="text-sky-500 ml-2 opacity-60">•</span>{spec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                              <div className="flex gap-2">
                                <button onClick={() => shareFullContent(phone, 'phone', 'tg')} className="p-2 bg-sky-500/10 rounded-xl text-sky-400"><Send className="w-4 h-4" /></button>
                                <button onClick={() => shareFullContent(phone, 'phone', 'copy')} className="p-2 bg-slate-700 rounded-xl text-slate-200"><Copy className="w-4 h-4" /></button>
                              </div>
                              <a href={phone.url} target="_blank" className="text-[10px] text-sky-400 font-black px-4 py-2 bg-sky-500/5 rounded-xl border border-sky-500/20 flex items-center gap-1.5">المصدر <ExternalLink className="w-3 h-3" /></a>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 shadow-xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1">
                          <Search className="w-5 h-5" />
                          <h3 className="text-sm font-black">مقارنة هواتف 2025</h3>
                        </div>
                        <input type="text" placeholder="الهاتف الأول..." value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm outline-none focus:border-sky-500/50 transition-colors" />
                        <input type="text" placeholder="الهاتف الثاني..." value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm outline-none focus:border-sky-500/50 transition-colors" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-3 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ابدأ المقارنة"}</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden animate-slide-up shadow-2xl">
                          <table className="w-full text-right text-[10px]">
                            <thead className="bg-slate-900/80"><tr><th className="p-3 text-sky-400 border-b border-slate-700">الميزة</th><th className="p-3 border-b border-slate-700">{phone1}</th><th className="p-3 border-b border-slate-700">{phone2}</th></tr></thead>
                            <tbody className="divide-y divide-slate-700/30">{comparisonResult.specs.map((s, i) => <tr key={i} className="hover:bg-slate-700/10 transition-colors"><td className="p-3 font-bold text-slate-300">{s.feature}</td><td className="p-3 text-slate-400">{s.phone1}</td><td className="p-3 text-slate-400">{s.phone2}</td></tr>)}</tbody>
                          </table>
                          <div className="p-5 bg-emerald-500/10 border-t border-slate-700/50">
                            <p className="text-xs text-emerald-400 font-black mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> النتيجة: {comparisonResult.betterPhone}</p>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-bold">{comparisonResult.verdict}</p>
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
               <span className="text-[10px] text-slate-500 font-bold">تم التطوير والبرمجة بواسطة</span>
               <span className="text-xs font-black text-slate-300 group-hover:text-sky-400 transition-colors tracking-wide">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
