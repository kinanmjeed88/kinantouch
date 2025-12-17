import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, AlertTriangle, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Facebook, Send
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { AINewsItem, PhoneComparisonResult } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison';

const App: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  // States for AI News
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  
  // States for Phone Comparison
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<PhoneComparisonResult | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

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
      const objectStart = text.indexOf('{');
      const objectEnd = text.lastIndexOf('}');
      if (objectStart !== -1 && objectEnd !== -1) {
        try { return JSON.parse(text.substring(objectStart, objectEnd + 1)); } catch (err) {}
      }
      throw new Error("فشل في تحليل بيانات JSON.");
    }
  };

  const getApiKey = () => {
    // الحصول على المفتاح حصرياً من process.env.API_KEY كما هو محدد في القواعد
    const key = process.env.API_KEY;
    if (!key || key === 'undefined' || key === 'null' || key === '') return null;
    return key.trim();
  };

  const fetchAINews = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setNewsError("مفتاح VITE_API_KEY غير موجود. تأكد من إضافته في GitHub Secrets.");
      setActiveToolView('ai-news');
      return;
    }

    setLoadingNews(true);
    setNewsError(null);
    setActiveToolView('ai-news');
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "List 10 AI tools/news in Arabic. JSON: title, description, url.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
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
          }
        }
      });
      
      if (response.text) {
        setAiNews(cleanAndParseJSON(response.text));
      }
    } catch (error: any) {
      setNewsError(`خطأ API: ${error.message || 'فشل غير معروف'}`);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    const apiKey = getApiKey();
    
    if (!apiKey) {
      alert("المفتاح VITE_API_KEY مفقود تماماً من إعدادات الموقع.");
      return;
    }

    setLoadingComparison(true);
    setComparisonResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `قارن بجدول مفصل بين ${phone1} و ${phone2} بالعربي. أجب بتنسيق JSON حصراً.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              specs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    feature: { type: Type.STRING },
                    phone1: { type: Type.STRING },
                    phone2: { type: Type.STRING }
                  },
                  required: ["feature", "phone1", "phone2"]
                }
              },
              verdict: { type: Type.STRING },
              betterPhone: { type: Type.STRING }
            },
            required: ["specs", "verdict", "betterPhone"]
          }
        }
      });
      
      if (response.text) {
        setComparisonResult(cleanAndParseJSON(response.text));
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      alert(`فشل تقني: ${error.message}\n(تأكد من تفعيل Gemini API في Google AI Studio)`);
    } finally {
      setLoadingComparison(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ!');
  };

  const shareToPlatform = (item: AINewsItem, platform: 'fb' | 'insta' | 'tg') => {
    const text = `🔥 ${item.title}\n\n${item.description}\n\n🔗 ${item.url}`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(item.url);

    if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
    else if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    else { copyToClipboard(text); alert('انسخ المنشور لـ Instagram'); }
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
            <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 text-right animate-fade-in">
              <h2 className="font-bold text-sky-400 flex items-center gap-2 justify-end"><Info className="w-5 h-5" /> بوت الطلبات</h2>
              <p className="text-sm text-slate-300 leading-relaxed">أرسل اسم التطبيق أو الرابط من متجر بلاي فقط. البوت مخصص للطلبات التقنية.</p>
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 justify-end">
                <p className="text-red-200/80 text-[10px]">تنبيه: حظر البوت يؤدي لحظر تلقائي دائم.</p>
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              </div>
            </div>
          )}
          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-4">
                  <button onClick={fetchAINews} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right"><div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center ml-4"><Cpu className="w-6 h-6 text-indigo-400" /></div><div className="flex-grow pr-1"><h3 className="text-sm font-bold">أخبار الذكاء الاصطناعي</h3><p className="text-[10px] text-slate-400">10 أدوات ونماذج جديدة</p></div><ArrowRight className="w-4 h-4 rotate-180" /></button>
                  <button onClick={() => setActiveToolView('comparison')} className="flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 text-right"><div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center ml-4"><Smartphone className="w-6 h-6 text-sky-400" /></div><div className="flex-grow pr-1"><h3 className="text-sm font-bold">مقارنة الهواتف</h3><p className="text-[10px] text-slate-400">مقارنة ذكية بالمواصفات</p></div><ArrowRight className="w-4 h-4 rotate-180" /></button>
                </div>
              ) : activeToolView === 'ai-news' ? (
                <div className="space-y-4">
                  <button onClick={() => setActiveToolView('main')} className="flex items-center gap-2 text-slate-500 mb-4"><ChevronLeft className="w-5 h-5 rotate-180" /><span className="text-sm">رجوع</span></button>
                  {loadingNews ? <div className="py-20 flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-sky-400 animate-spin" /><p className="text-xs">جاري الجلب...</p></div> : newsError ? <div className="text-center py-10"><AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" /><p className="text-xs text-slate-400">{newsError}</p></div> : aiNews.map((n, i) => (
                    <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl text-right animate-slide-up">
                      <h3 className="text-sm font-bold text-sky-400 mb-1">{n.title}</h3>
                      <p className="text-[11px] text-slate-300 mb-4">{n.description}</p>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                        <div className="flex gap-2">
                          <button onClick={() => shareToPlatform(n, 'tg')} className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400"><Send className="w-3.5 h-3.5" /></button>
                          <button onClick={() => shareToPlatform(n, 'fb')} className="p-1.5 bg-blue-600/10 rounded-lg text-blue-400"><Facebook className="w-3.5 h-3.5" /></button>
                        </div>
                        <a href={n.url} target="_blank" className="text-[10px] text-indigo-400 font-bold border border-indigo-500/30 px-3 py-1 rounded-lg">رابط الأداة</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <button onClick={() => setActiveToolView('main')} className="flex items-center gap-2 text-slate-500"><ChevronLeft className="w-5 h-5 rotate-180" /><span>رجوع</span></button>
                  <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 shadow-xl">
                    <input type="text" placeholder="اسم الهاتف الأول..." value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm" />
                    <input type="text" placeholder="اسم الهاتف الثاني..." value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-right text-sm" />
                    <button onClick={handleComparePhones} disabled={loadingComparison || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-bold py-3 rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">{loadingComparison ? <Loader2 className="w-5 h-5 animate-spin" /> : "ابدأ المقارنة"}</button>
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