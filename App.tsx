import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, AlertTriangle, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Facebook, Send, Search, MessageSquare, ExternalLink,
  Briefcase, Copy, Share2, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, JobItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'jobs';

const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  // States
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [expandedPhone, setExpandedPhone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<PhoneComparisonResult | null>(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

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

  const getApiKey = () => process.env.API_KEY?.trim() || null;

  const fetchToolData = async (type: ToolView) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("مفتاح API غير متوفر.");
      setActiveToolView(type);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveToolView(type);

    let prompt = "";
    let schema: any = {};

    if (type === 'phone-news') {
      prompt = "List 10 latest phones of 2024/2025. JSON array: title (1 line), manufacturer, launchDate, shortDesc, fullSpecs (array of strings), url (official).";
      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            manufacturer: { type: Type.STRING },
            launchDate: { type: Type.STRING },
            shortDesc: { type: Type.STRING },
            fullSpecs: { type: Type.ARRAY, items: { type: Type.STRING } },
            url: { type: Type.STRING }
          },
          required: ["title", "manufacturer", "launchDate", "shortDesc", "fullSpecs", "url"]
        }
      };
    } else if (type === 'jobs') {
      prompt = "List 10 latest government job openings in Iraq/Arab region for today. JSON array: title, ministry, date, description, url (official gov site).";
      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ministry: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ["title", "ministry", "date", "description", "url"]
        }
      };
    } else if (type === 'ai-news') {
      prompt = "List 10 latest AI tools/news in Arabic. JSON array: title, description, url.";
      schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            url: { type: Type.STRING }
          },
          required: ["title", "description", "url"]
        }
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      
      const data = cleanAndParseJSON(response.text);
      if (type === 'phone-news') setPhoneNews(data);
      else if (type === 'jobs') setJobs(data);
      else if (type === 'ai-news') setAiNews(data);
    } catch (err: any) {
      setError(`فشل الجلب: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    const apiKey = getApiKey();
    if (!apiKey) return;
    setLoading(true);
    setComparisonResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `قارن بجدول مفصل بين ${phone1} و ${phone2} بالعربي بتنسيق JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              specs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { feature: { type: Type.STRING }, phone1: { type: Type.STRING }, phone2: { type: Type.STRING } } } },
              verdict: { type: Type.STRING },
              betterPhone: { type: Type.STRING }
            }
          }
        }
      });
      setComparisonResult(cleanAndParseJSON(response.text));
    } catch (err) {} finally { setLoading(false); }
  };

  const shareFullContent = (data: any, type: 'phone' | 'job' | 'ai', platform: 'tg' | 'fb' | 'insta' | 'copy') => {
    let text = "";
    if (type === 'phone') {
      const item = data as PhoneNewsItem;
      text = `📱 ${item.title}\n🏢 الشركة: ${item.manufacturer}\n📅 التاريخ: ${item.launchDate}\n📝 الوصف: ${item.shortDesc}\n🛠 المواصفات:\n${item.fullSpecs.map(s => `• ${s}`).join('\n')}\n🔗 الرابط: ${item.url}`;
    } else if (type === 'job') {
      const item = data as JobItem;
      text = `💼 ${item.title}\n🏛 الوزارة: ${item.ministry}\n📅 التاريخ: ${item.date}\n📝 التفاصيل: ${item.description}\n🔗 الرابط: ${item.url}`;
    } else {
      const item = data as AINewsItem;
      text = `🤖 ${item.title}\n📝 ${item.description}\n🔗 ${item.url}`;
    }

    if (platform === 'copy') {
      navigator.clipboard.writeText(text);
      alert('تم نسخ كامل المحتوى!');
      return;
    }

    const encodedText = encodeURIComponent(text);
    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodedText}`, '_blank');
    else if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`, '_blank');
    else alert('انسخ النص وشاركه على انستغرام');
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
          <p className="text-slate-400 text-sm">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md">
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-6 h-6" /><span className="text-[10px]">الرئيسية</span></button>
            <div className="w-px h-8 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-6 h-6" /><span className="text-[10px]">معلومات</span></button>
            <div className="w-px h-8 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-6 h-6" /><span className="text-[10px]">أدوات</span></button>
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
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200/90 text-[10px] text-right leading-relaxed flex-1 font-bold" dir="rtl">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات</p>
                </div>
                <div className="space-y-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-sky-400 mb-0.5"><Search className="w-4.5 h-4.5 flex-shrink-0" /><p className="font-black text-[12px] text-right w-full" dir="rtl">طرق البحث المتاحة في قنوات المناقشات:</p></div>
                  <ul className="space-y-3">
                    {[
                      "ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.",
                      "اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) باسم مضبوط (مثلاً: كاب كات).",
                      "استخدم أمر البحث بكتابة كلمة \"بحث\" متبوعة باسم التطبيق (مثلاً: بحث ياسين).",
                      "للاعلان في القناة تواصل من خلال البوت"
                    ].map((text, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center text-sky-400 font-black text-[10px] border border-slate-600/50">{["١","٢","٣","٤"][idx]}</div>
                        <p className="text-slate-300 text-[10px] leading-relaxed text-right flex-1 pt-1" dir="rtl">{text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 mt-1.5">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-red-200/90 text-[10px] text-right leading-relaxed font-black" dir="rtl">تنبيه: حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا</p>
                    <p className="text-slate-400 text-[8px] text-right" dir="rtl">في النهاية دمتم برعاية الله</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-4">
                  <button onClick={() => fetchToolData('ai-news')} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center ml-4"><Cpu className="w-6 h-6 text-indigo-400" /></div>
                    <div className="flex-grow pr-1"><h3 className="text-sm font-bold">أخبار الذكاء الاصطناعي</h3><p className="text-[10px] text-slate-400">أدوات ونماذج جديدة</p></div>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>

                  <button onClick={() => fetchToolData('phone-news')} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center ml-4"><Smartphone className="w-6 h-6 text-sky-400" /></div>
                    <div className="flex-grow pr-1"><h3 className="text-sm font-bold">آخر أخبار الهواتف</h3><p className="text-[10px] text-slate-400">أحدث إصدارات 2024-2025</p></div>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>

                  <button onClick={() => fetchToolData('jobs')} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center ml-4"><Briefcase className="w-6 h-6 text-emerald-400" /></div>
                    <div className="flex-grow pr-1"><h3 className="text-sm font-bold">الوظائف والتعيينات</h3><p className="text-[10px] text-slate-400">تحديثات المواقع الحكومية</p></div>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>

                  <button onClick={() => setActiveToolView('comparison')} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right">
                    <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center ml-4"><Smartphone className="w-6 h-6 text-slate-400" /></div>
                    <div className="flex-grow pr-1"><h3 className="text-sm font-bold">مقارنة الهواتف</h3><p className="text-[10px] text-slate-400">مقارنة ذكية بالمواصفات</p></div>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setActiveToolView('main')} className="flex items-center gap-2 text-slate-500 mb-4"><ChevronLeft className="w-5 h-5 rotate-180" /><span className="text-sm">رجوع</span></button>
                  
                  {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-xs">جاري جلب أحدث البيانات من الذكاء الاصطناعي...</p></div>
                  ) : error ? (
                    <div className="text-center py-10"><AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" /><p className="text-xs text-slate-400">{error}</p></div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-4">
                       {phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl text-right animate-slide-up">
                            <h3 className="text-sm font-bold text-sky-400 mb-2">{phone.title}</h3>
                            <div className="space-y-1 mb-3">
                              <p className="text-[10px] text-slate-300">• الشركة: {phone.manufacturer}</p>
                              <p className="text-[10px] text-slate-300">• تاريخ الإعلان: {phone.launchDate}</p>
                            </div>
                            
                            <button 
                              onClick={() => setExpandedPhone(expandedPhone === i ? null : i)}
                              className="flex items-center gap-1 text-[10px] text-sky-500 font-bold mb-3"
                            >
                              {expandedPhone === i ? <><ChevronUp className="w-3 h-3"/> عرض أقل</> : <><ChevronDown className="w-3 h-3"/> المزيد من التفاصيل</>}
                            </button>

                            {expandedPhone === i && (
                              <div className="bg-slate-900/50 p-3 rounded-xl mb-3 animate-fade-in">
                                <ul className="space-y-1">
                                  {phone.fullSpecs.map((spec, idx) => (
                                    <li key={idx} className="text-[9px] text-slate-400 pr-2 border-r border-sky-500/30">{spec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                              <div className="flex gap-2">
                                <button onClick={() => shareFullContent(phone, 'phone', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400" title="مشاركة للتيليجرام"><Send className="w-3.5 h-3.5" /></button>
                                <button onClick={() => shareFullContent(phone, 'phone', 'fb')} className="p-1.5 bg-blue-600/10 rounded-lg text-blue-400" title="مشاركة للفيس بوك"><Facebook className="w-3.5 h-3.5" /></button>
                                <button onClick={() => shareFullContent(phone, 'phone', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-300" title="نسخ المحتوى"><Copy className="w-3.5 h-3.5" /></button>
                              </div>
                              <a href={phone.url} target="_blank" className="text-[9px] text-indigo-400 font-bold border border-indigo-500/30 px-3 py-1 rounded-lg flex items-center gap-1">الموقع الرسمي <ExternalLink className="w-2.5 h-2.5" /></a>
                            </div>
                         </div>
                       ))}
                       <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-right">
                         <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <h4 className="text-xs font-black">إحصائية مبيعات السنة</h4>
                         </div>
                         <p className="text-[10px] text-slate-300 leading-relaxed" dir="rtl">تتصدر شركة Apple و Samsung المبيعات العالمية بهواتف iPhone 16 و Galaxy S25، مع نمو ملحوظ لهواتف Xiaomi في الشرق الأوسط.</p>
                       </div>
                    </div>
                  ) : activeToolView === 'jobs' ? (
                    <div className="space-y-4">
                      {jobs.map((job, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl text-right animate-slide-up">
                          <h3 className="text-sm font-bold text-emerald-400 mb-1">{job.title}</h3>
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{job.ministry}</span>
                             <span className="text-[9px] text-slate-500">{job.date}</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mb-4">{job.description}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2">
                               <button onClick={() => shareFullContent(job, 'job', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                               <button onClick={() => shareFullContent(job, 'job', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-300"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={job.url} target="_blank" className="text-[9px] text-emerald-400 font-bold border border-emerald-500/30 px-3 py-1 rounded-lg flex items-center gap-1">التقديم الرسمي <ExternalLink className="w-2.5 h-2.5" /></a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNews.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-right animate-slide-up">
                          <h3 className="text-sm font-bold text-sky-400 mb-1">{n.title}</h3>
                          <p className="text-[11px] text-slate-300 mb-4">{n.description}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                            <div className="flex gap-2">
                              <button onClick={() => shareFullContent(n, 'ai', 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                              <button onClick={() => shareFullContent(n, 'ai', 'copy')} className="p-1.5 bg-slate-700 rounded-lg text-slate-300"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={n.url} target="_blank" className="text-[10px] text-indigo-400 font-bold border border-indigo-500/30 px-3 py-1 rounded-lg">رابط الأداة</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 shadow-xl">
                        <input type="text" placeholder="اسم الهاتف الأول..." value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm" />
                        <input type="text" placeholder="اسم الهاتف الثاني..." value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ابدأ المقارنة"}</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden animate-slide-up">
                          <table className="w-full text-right text-[10px]">
                            <thead className="bg-slate-900/50"><tr><th className="p-3">الميزة</th><th className="p-3">{phone1}</th><th className="p-3">{phone2}</th></tr></thead>
                            <tbody>{comparisonResult.specs.map((s, i) => <tr key={i} className="border-t border-slate-700/20"><td className="p-3 font-bold text-sky-400">{s.feature}</td><td className="p-3">{s.phone1}</td><td className="p-3">{s.phone2}</td></tr>)}</tbody>
                          </table>
                          <div className="p-4 bg-emerald-500/5 border-t border-slate-700/50">
                            <p className="text-xs text-emerald-400 font-bold mb-1">النتيجة: {comparisonResult.betterPhone}</p>
                            <p className="text-[10px] text-slate-300">{comparisonResult.verdict}</p>
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
           <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">تابعنا على</p>
           <SocialLinks links={socialLinks} />
           <div className="mt-8 pb-4">
             <a href={footerData.url} target="_blank" className="group inline-flex flex-col items-center">
               <span className="text-[10px] text-slate-500">Created By</span>
               <span className="text-xs font-bold text-slate-300 group-hover:text-sky-400">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;