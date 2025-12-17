import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Share2, Home, Info, Search, MessageSquare, AlertTriangle, 
  Wrench, Cpu, Smartphone, ArrowRight, Copy, Loader2, ChevronLeft, 
  CheckCircle2, AlertCircle, ExternalLink, Facebook, Instagram, Send
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

  // دالة متطورة لتحليل الـ JSON وتنظيفه من أي نصوص زائدة
  const cleanAndParseJSON = (text: string) => {
    try {
      const cleaned = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("فشل التحليل الأولي، محاولة استخراج JSON يدويًا...");
      // محاولة البحث عن بداية المصفوفة أو الكائن
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
      throw new Error("فشل في تحليل البيانات المستلمة.");
    }
  };

  const fetchAINews = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      setNewsError("مفتاح API غير متوفر في إعدادات GitHub. يرجى التأكد من إضافة API_KEY.");
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
        contents: "قم بإنشاء 10 منشورات متنوعة عن أحدث أخبار الذكاء الاصطناعي (أدوات جديدة، تحديثات نماذج). لكل منشور: عنوان جذاب، وصف من 4 أسطر دقيقة، ورابط حقيقي للأداة. أجب بتنسيق JSON حصراً.",
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
      
      const text = response.text;
      if (text) {
        const newsData = cleanAndParseJSON(text);
        setAiNews(newsData);
      } else {
        setNewsError("لم يتم استلام نص من الذكاء الاصطناعي.");
      }
    } catch (error: any) {
      console.error("Error fetching news:", error);
      setNewsError(error.message || "حدث خطأ غير متوقع أثناء جلب الأخبار.");
    } finally {
      setLoadingNews(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      alert("خطأ: مفتاح API_KEY غير معرف في البيئة.");
      return;
    }

    setLoadingComparison(true);
    setComparisonResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `قارن بين هاتف ${phone1} وهاتف ${phone2} باللغة العربية. يجب أن تتضمن المقارنة: الشاشة، المعالج، الكاميرا، البطارية، السعر التقريبي. حدد الأفضل بناءً على المواقع التقنية الشهيرة مع ذكر السبب. أجب بتنسيق JSON.`,
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
      
      const text = response.text;
      if (text) {
        const result = cleanAndParseJSON(text);
        setComparisonResult(result);
      }
    } catch (error) {
      console.error("Error comparing phones:", error);
      alert("حدث خطأ أثناء إجراء المقارنة. حاول لاحقاً.");
    } finally {
      setLoadingComparison(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ بنجاح!');
  };

  const shareToPlatform = (item: AINewsItem, platform: 'fb' | 'insta' | 'tg') => {
    const text = `🔥 ${item.title}\n\n${item.description}\n\n🔗 رابط الأداة: ${item.url}\n\nتمت المشاركة من Techtouch`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(item.url);

    switch(platform) {
      case 'tg': window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank'); break;
      case 'fb': window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank'); break;
      case 'insta': 
        copyToClipboard(text); 
        alert('تم نسخ المنشور! يمكنك الآن لصقه في Instagram');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 overflow-x-hidden relative font-sans">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        
        {/* Header Section */}
        <header className={`pt-12 pb-6 text-center transition-all duration-700 transform ${loaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
          <div className="inline-block relative">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center mb-6 overflow-hidden">
                {profileConfig.image && !imageError ? (
                  <img 
                    src={profileConfig.image} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                    {profileConfig.initials}
                  </span>
                )}
             </div>
          </div>
          
          <h1 className="text-3xl font-black tracking-tight mb-1 text-white drop-shadow-lg">
            Techtouch
          </h1>
          <p className="text-slate-400 text-sm font-semibold flex items-center justify-center gap-1.5 opacity-80">
            كنان مجيد
          </p>

          {/* Navigation Bar */}
          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md">
            <button 
              onClick={() => { setActiveTab('home'); setActiveToolView('main'); }}
              className={`flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">الرئيسية</span>
              {activeTab === 'home' && <div className="h-1 w-4 bg-sky-400 rounded-full mt-0.5" />}
            </button>

            <div className="w-px h-8 bg-slate-700/50" />

            <button 
              onClick={() => { setActiveTab('info'); setActiveToolView('main'); }}
              className={`flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Info className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">معلومات</span>
              {activeTab === 'info' && <div className="h-1 w-4 bg-sky-400 rounded-full mt-0.5" />}
            </button>

            <div className="w-px h-8 bg-slate-700/50" />

            <button 
              onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }}
              className={`flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Wrench className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">أدوات</span>
              {activeTab === 'tools' && <div className="h-1 w-4 bg-sky-400 rounded-full mt-0.5" />}
            </button>
          </nav>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-grow py-4">
          {activeTab === 'home' && (
            <div className="space-y-2 animate-fade-in">
              {telegramChannels.map((channel, index) => (
                <ChannelCard key={channel.id} channel={channel} index={index} />
              ))}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl space-y-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sky-400 mb-2">
                  <Info className="w-5 h-5" />
                  <h2 className="font-bold text-lg">بخصوص بوت الطلبات</h2>
                </div>
                
                <p className="text-slate-300 text-sm leading-relaxed">
                  <span className="text-sky-400 ml-1">✪</span>
                  ارسل اسم التطبيق وصورته او رابط التطبيق من متجر بلي فقط .
                </p>
                
                <p className="text-slate-300 text-sm leading-relaxed border-t border-slate-700/50 pt-3">
                  <span className="text-sky-400 ml-1">✪</span>
                  لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات .
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200/80 text-xs">
                    البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-700/30">
                  <p className="text-sky-400 font-black text-sm mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    طرق البحث المتاحة في قنوات المناقشات في التيليكرام:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-slate-300 text-xs leading-relaxed group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center text-sky-400 font-bold group-hover:bg-sky-500 group-hover:text-white transition-colors">١</div>
                      <span>ابحث بالقناة من خلال زر البحث <Search className="w-3.5 h-3.5 inline-block mx-1 text-sky-400" /> واكتب اسم التطبيق بشكل دقيق.</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300 text-xs leading-relaxed group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center text-sky-400 font-bold group-hover:bg-sky-500 group-hover:text-white transition-colors">٢</div>
                      <span>اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) باسم مضبوط ومباشر (مثلاً: كاب كات).</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300 text-xs leading-relaxed group">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-700/50 flex items-center justify-center text-sky-400 font-bold group-hover:bg-sky-500 group-hover:text-white transition-colors">٣</div>
                      <span>استخدم أمر البحث السريع بكتابة كلمة <span className="text-sky-400 font-bold">"بحث"</span> متبوعة باسم التطبيق (مثلاً: بحث ياسين).</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 mt-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200/80 text-xs">
                    تنبيه: حظر البوت يؤدي لحظر تلقائي دائم ولا يمكن فكه حتى لو قمت بإزالة الحظر لاحقاً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in min-h-[400px]">
              {activeToolView === 'main' && (
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={fetchAINews}
                    className="group relative flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl transition-all duration-300 hover:bg-slate-700/60 hover:scale-[1.01] hover:border-indigo-500/30 text-right overflow-hidden shadow-xl"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center ml-4">
                      <Cpu className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-grow pr-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">أخبار الذكاء الاصطناعي</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">اكتشف 10 أدوات ونماذج جديدة يومياً</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-all rotate-180" />
                    <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500/40"></div>
                  </button>

                  <button 
                    onClick={() => setActiveToolView('comparison')}
                    className="group relative flex items-center p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl transition-all duration-300 hover:bg-slate-700/60 hover:scale-[1.01] hover:border-sky-500/30 text-right overflow-hidden shadow-xl"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center ml-4">
                      <Smartphone className="w-6 h-6 text-sky-400" />
                    </div>
                    <div className="flex-grow pr-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">مقارنة الهواتف</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">قارن بين مواصفات أي هاتفين بذكاء</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-all rotate-180" />
                    <div className="absolute top-0 right-0 w-1 h-full bg-sky-500/40"></div>
                  </button>

                  <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-500" />
                    <p className="text-[10px] text-slate-500 leading-tight">
                      المعلومات المقدمة يتم توليدها بواسطة نماذج Gemini 3 المتقدمة، يرجى التأكد من الروابط الرسمية دائماً.
                    </p>
                  </div>
                </div>
              )}

              {activeToolView === 'ai-news' && (
                <div className="space-y-4 pb-20">
                  <button 
                    onClick={() => setActiveToolView('main')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                    <span className="text-sm">العودة للأدوات</span>
                  </button>

                  {loadingNews ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                      <p className="text-slate-400 animate-pulse text-sm">جاري جلب 10 منشورات حصرية...</p>
                    </div>
                  ) : newsError ? (
                    <div className="text-center py-10 space-y-4">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                      <p className="text-slate-400 text-sm px-6">{newsError}</p>
                      <button onClick={fetchAINews} className="text-sky-400 font-bold border-b border-sky-400 pb-1 text-sm">إعادة المحاولة</button>
                    </div>
                  ) : (
                    aiNews.map((news, idx) => (
                      <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3 relative group overflow-hidden animate-slide-up">
                        <h3 className="text-base font-bold text-sky-400 text-right leading-tight">{news.title}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed text-right min-h-[3rem]">{news.description}</p>
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700/50">
                          <div className="flex gap-2">
                            <button onClick={() => shareToPlatform(news, 'tg')} className="p-2 bg-sky-500/20 rounded-xl text-sky-400 hover:bg-sky-500 hover:text-white transition-all"><Send className="w-4 h-4" /></button>
                            <button onClick={() => shareToPlatform(news, 'fb')} className="p-2 bg-blue-600/20 rounded-xl text-blue-400 hover:bg-blue-600 hover:text-white transition-all"><Facebook className="w-4 h-4" /></button>
                            <button onClick={() => shareToPlatform(news, 'insta')} className="p-2 bg-pink-500/20 rounded-xl text-pink-400 hover:bg-pink-500 hover:text-white transition-all"><Instagram className="w-4 h-4" /></button>
                            <button onClick={() => copyToClipboard(`${news.title}\n\n${news.description}\n\n${news.url}`)} className="p-2 bg-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-600 transition-all"><Copy className="w-4 h-4" /></button>
                          </div>
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:bg-indigo-500 hover:text-white transition-all">
                            زيارة الأداة <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-sky-500 to-indigo-600 opacity-50"></div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeToolView === 'comparison' && (
                <div className="space-y-6 pb-20">
                  <button 
                    onClick={() => setActiveToolView('main')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 rotate-180" />
                    <span className="text-sm">العودة للأدوات</span>
                  </button>

                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4 backdrop-blur-sm shadow-2xl">
                    <h3 className="text-lg font-black text-center text-white mb-2">مقارنة المواصفات الذكية</h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="اسم الهاتف الأول..."
                          value={phone1}
                          onChange={(e) => setPhone1(e.target.value)}
                          className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-4 text-right text-sm focus:outline-none focus:border-sky-500/50 transition-all pl-12"
                        />
                      </div>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="اسم الهاتف الثاني..."
                          value={phone2}
                          onChange={(e) => setPhone2(e.target.value)}
                          className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-4 text-right text-sm focus:outline-none focus:border-sky-500/50 transition-all pl-12"
                        />
                      </div>
                      <button 
                        onClick={handleComparePhones}
                        disabled={loadingComparison || !phone1 || !phone2}
                        className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm"
                      >
                        {loadingComparison ? <Loader2 className="w-5 h-5 animate-spin" /> : "إظهار جدول المقارنة"}
                      </button>
                    </div>
                  </div>

                  {comparisonResult && !loadingComparison && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">
                      <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 text-center font-black text-sky-400 text-sm">
                        جدول المواصفات التقني
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-[10px]">
                          <thead className="bg-slate-900/40 text-slate-400">
                            <tr>
                              <th className="p-3 border-l border-slate-700/50">الميزة</th>
                              <th className="p-3 border-l border-slate-700/50">{phone1}</th>
                              <th className="p-3">{phone2}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonResult.specs.map((spec, i) => (
                              <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                                <td className="p-3 font-bold text-sky-400 bg-slate-900/30 w-1/4">{spec.feature}</td>
                                <td className="p-3 text-slate-200">{spec.phone1}</td>
                                <td className="p-3 text-slate-200">{spec.phone2}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-6 bg-emerald-500/5 border-t border-slate-700/50 space-y-4">
                         <div className="flex items-center gap-3 text-emerald-400 font-black text-base">
                           <CheckCircle2 className="w-5 h-5" />
                           <span>الهاتف الأفضل: {comparisonResult.betterPhone}</span>
                         </div>
                         <p className="text-xs text-slate-300 leading-relaxed text-right bg-slate-900/40 p-4 rounded-2xl border border-emerald-500/20">
                           {comparisonResult.verdict}
                         </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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