
import React, { useState, useEffect } from 'react';
import { telegramChannels, footerData, profileConfig, socialLinks } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, Loader2, ChevronLeft, 
  AlertCircle, Send,
  Download, X, Search,
  BarChart3, PieChart,
  LayoutGrid, Copy, Facebook, Instagram, ExternalLink,
  RotateCcw
} from 'lucide-react';
import { TelegramIcon } from './components/Icons'; 
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, StatsResult } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'stats';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_strict_v1',
  PHONE_NEWS: 'techtouch_phones_strict_v1'
};

const SPEC_ORDER = [
  'network', 'launch', 'body', 'display', 'platform', 
  'memory', 'main_camera', 'selfie_camera', 'sound', 
  'comms', 'features', 'battery', 'misc'
];

const SPEC_LABELS: Record<string, string> = {
  network: "الشبكة والاتصال",
  launch: "تاريخ الإطلاق",
  body: "الهيكل والأبعاد",
  display: "الشاشة والدقة",
  platform: "المعالج والأداء",
  memory: "الذاكرة والتخزين",
  main_camera: "الكاميرا الخلفية",
  selfie_camera: "الكاميرا الأمامية",
  sound: "الصوتيات",
  comms: "واي فاي وبلوتوث",
  features: "المستشعرات والإضافات",
  battery: "البطارية والشحن",
  misc: "ألوان وسعر تقريبي"
};

// 🔴 MASTER PROMPT (القاعدة الأساسية)
const MASTER_RULES = `
أنت تعمل داخل موقع ويب اسمه "Techtouch".
دورك الوحيد هو معالجة البيانات الموثوقة فقط.

قواعد عامة صارمة:
- ممنوع اختراع معلومات.
- ممنوع افتراض أسعار أو تواريخ (إذا لم تكن متأكداً 100% اتركها فارغة).
- أي معلومة بلا مصدر رسمي أو غير موجودة في تدريبك الموثوق → تُرفض.
- الامتناع عن الإجابة أفضل من معلومة خاطئة.
- اللغة: العربية الفصحى حصراً.
`;

// 🟠 أوامر أخبار AI
const AI_NEWS_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بقسم "أخبار AI".
مهمتك:
- استخراج وعرض الأدوات الموثوقة والرسمية فقط (مثل ChatGPT, Gemini, Claude, Midjourney).
- تلخيص الوظيفة الحقيقية للأداة.
- عدم إضافة أي معلومة وهمية أو تحديث لم يحصل.
- عدم الادعاء أن الخبر حديث إن لم يكن كذلك.

المخرجات المطلوبة JSON حصراً بالتنسيق التالي:
{ "ai_news": [{ "title": "اسم الأداة الرسمي", "summary": ["نقطة 1", "نقطة 2"], "official_link": "الرابط الرسمي" }] }
`;

// 🟡 أوامر الهواتف
const PHONES_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بقسم "الهواتف".
الحقول المسموحة فقط: name, brand, display, os, chipset, ram, storage, battery, cameras, official_website.

مهمتك:
- عرض بيانات الهواتف الموجودة فعلياً في الأسواق.
- عدم إضافة سعر (إلا إذا كان رسمياً بالدولار).
- عدم إضافة تاريخ إصدار مستقبلي.
- عدم افتراض نظام تشغيل أحدث.

إذا لم تتوفر بيانات دقيقة، لا تخترعها.

المخرجات المطلوبة JSON حصراً بالتنسيق التالي:
{ "best_smartphones": [{ "phone_name": "الاسم", "brand": "الشركة", "release_date": "السنة والشهر", "price_usd": "السعر الرسمي أو اترك فارغ", "specifications": { "network": "...", "display": "...", "platform": "...", "memory": "...", "main_camera": "...", "selfie_camera": "...", "battery": "..." }, "official_link": "الرابط", "pros": ["ميزة حقيقية"], "cons": ["عيب حقيقي"] }] }
`;

// 🔵 أوامر المقارنة
const COMPARISON_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بقسم "المقارنة".
مهمتك:
- مقارنة القيم المتوفرة والحقيقية فقط.
- عدم تحديد فائز إلا إذا كان الفرق واضحاً بالأرقام.
- إذا كانت البيانات متطابقة اكتب: "الهاتفان متطابقان في المواصفات المتوفرة".
- ممنوع الرأي الشخصي.

المخرجات المطلوبة JSON حصراً:
{ "phone1_name": "الاسم 1", "phone2_name": "الاسم 2", "comparison_points": [{ "feature": "الميزة", "phone1_val": "القيمة", "phone2_val": "القيمة", "winner": 0 }], "verdict": "الخلاصة" }
ملحوظة: winner يكون 1 للأول، 2 للثاني، 0 للتعادل.
`;

// 🟣 أوامر الإحصائيات
const STATS_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بقسم "الإحصائيات".
مهمتك:
- شرح الاتجاهات الحقيقية للسوق (Market Share, Sales) بناء على بيانات شركات الأبحاث المعروفة.
- عدم إنشاء أي رقم عشوائي.

المخرجات المطلوبة JSON حصراً:
{ "title": "العنوان", "description": "الوصف", "data": [{ "label": "الاسم", "value": 50, "displayValue": "50%" }], "insight": "التحليل" }
`;

// 🟤 أوامر البحث عن الأدوات
const TOOL_SEARCH_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بقسم "الأدوات".
كل أداة يجب أن تحتوي: اسم رسمي، وصف محايد، رابط رسمي.
مهمتك: إعادة صياغة الوصف فقط. عدم اختراع إصدار (مثلاً لا تكتب Gemini 3.22).

المخرجات المطلوبة JSON حصراً:
{ "title": "الاسم الرسمي", "summary": ["وصف 1", "وصف 2"], "official_link": "الرابط" }
`;

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

  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState<AINewsItem | null>(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  const [statsQuery, setStatsQuery] = useState('');
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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

  const callGroqAPI = async (userContent: string, systemInstruction: string) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح API غير متوفر (VITE_GROQ_API_KEY).");

    try {
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
            { role: "user", content: userContent }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1, // تقليل الحرارة لأقصى درجة لمنع الإبداع/الهلوسة
          max_completion_tokens: 3000
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return JSON.parse(content);
      throw new Error("Empty response");
    } catch (e: any) {
      console.error("Groq API Error:", e);
      throw new Error("لا تتوفر بيانات موثوقة حالياً.");
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
      let userPrompt = "";
      let systemInstruction = "";

      if (type === 'ai-news') {
        systemInstruction = AI_NEWS_PROMPT;
        // محاكاة إرسال بيانات (بما أننا لا نملك Backend حقيقي، نطلب منه استرجاع المؤكد فقط)
        userPrompt = "استخرج قائمة بأهم 5 أدوات ذكاء اصطناعي مثبتة ومعروفة عالمياً. تجاهل أي شائعات.";
      } else if (type === 'phone-news') {
        systemInstruction = PHONES_PROMPT;
        userPrompt = "استخرج قائمة بأحدث 5 هواتف تم إطلاقها رسمياً من شركات كبرى (Samsung, Apple, Xiaomi). لا تذكر هواتف مسربة.";
      }

      const result = await callGroqAPI(userPrompt, systemInstruction);
      
      if (type === 'ai-news' && result.ai_news) {
        const mappedAI = result.ai_news.map((item: any) => ({
          tool_name: item.title,
          title: item.title,
          summary: item.summary || [],
          date: '', // نترك التاريخ فارغاً لمنع الهلوسة
          official_link: item.official_link
        }));
        saveToCache(cacheKey, { ai_news: mappedAI });
        setAiNews(mappedAI);
      } else if (type === 'phone-news' && result.best_smartphones) {
        const mappedPhones = result.best_smartphones.map((item: any) => ({
          phone_name: item.phone_name,
          brand: item.brand,
          release_date: item.release_date,
          specifications: item.specifications || {},
          price_usd: item.price_usd || "غير متوفر",
          official_specs_link: item.official_link || '',
          pros: item.pros || [],
          cons: item.cons || []
        }));
        saveToCache(cacheKey, { smartphones: mappedPhones });
        setPhoneNews(mappedPhones);
      } else {
        setError("لا توجد بيانات جاهزة من الويب.");
      }
    } catch (err: any) {
      setError(err.message || "لا تتوفر بيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSearch = async () => {
    if (!phoneSearchQuery.trim()) return;
    setSearchLoading(true);
    setPhoneSearchResult(null);
    setError(null);

    const systemInstruction = PHONES_PROMPT;

    try {
      const result = await callGroqAPI(`بيانات الهاتف المطلوبة: ${phoneSearchQuery}. (إذا لم يكن الهاتف حقيقياً لا تعرض نتيجة)`, systemInstruction);
      // التعامل مع الحالات الفردية حيث يرجع API كائن مباشر
      const phoneData = result.best_smartphones ? result.best_smartphones[0] : result;
      
      if (phoneData && phoneData.phone_name) {
        setPhoneSearchResult(phoneData);
      } else {
        setError("لا تتوفر بيانات هاتف موثوقة حالياً.");
      }
    } catch (e: any) {
      setError("لا تتوفر بيانات هاتف موثوقة حالياً.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearchLoading(true);
    setAiSearchResult(null);
    setError(null);

    const systemInstruction = TOOL_SEARCH_PROMPT;

    try {
      const prompt = `ابحث عن الأداة الرسمية: "${aiSearchQuery}". إذا لم يكن للأداة إصدار رسمي معلن لا تذكر رقم إصدار.`;
      const result = await callGroqAPI(prompt, systemInstruction);
      if (result && result.title) {
        setAiSearchResult({
           title: result.title,
           summary: result.summary,
           official_link: result.official_link
        });
      } else {
        setError("لا توجد بيانات لهذه الأداة.");
      }
    } catch (e: any) {
      setError("لا توجد بيانات.");
    } finally {
      setAiSearchLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const system = COMPARISON_PROMPT;
      const result = await callGroqAPI(`قارن بين: ${phone1} و ${phone2}. قارن القيم المتوفرة فقط.`, system);
      if (result && result.comparison_points) {
        setComparisonResult(result);
      } else {
        setError("لا تتوفر بيانات للمقارنة.");
      }
    } catch (err: any) { 
      setError("فشل في إجراء المقارنة."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleStatsRequest = async () => {
    if (!statsQuery.trim()) return;
    setStatsLoading(true);
    setStatsResult(null);
    setError(null);
    try {
      const system = STATS_PROMPT;
      const result = await callGroqAPI(`بيانات إحصائية عن: ${statsQuery}. إذا لم تتوفر بيانات رقمية موثوقة ارجع خطأ.`, system);
      if (result && result.data) {
         const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
         result.data = result.data.map((item: any, index: number) => ({
            ...item,
            color: colors[index % colors.length]
         }));
         setStatsResult(result);
      } else {
        setError("لا تتوفر بيانات إحصائية موثوقة.");
      }
    } catch (e: any) {
      setError("لا تتوفر بيانات.");
    } finally {
      setStatsLoading(false);
    }
  };

  // Reusable Share Toolbar Component
  const ShareToolbar = ({ title, text, url }: { title: string, text: string, url: string }) => {
    const fullText = `${title}\n\n${text}\n\n🔗 ${url || 'techtouch-hub'}`;
    
    const handleShare = (platform: 'copy' | 'tg' | 'fb' | 'insta') => {
      if (platform === 'copy') {
        navigator.clipboard.writeText(fullText);
        alert('تم نسخ المحتوى!');
      } else if (platform === 'tg') {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url || window.location.href)}&text=${encodeURIComponent(fullText)}`, '_blank');
      } else if (platform === 'fb') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || window.location.href)}`, '_blank');
      } else if (platform === 'insta') {
        navigator.clipboard.writeText(fullText);
        window.open('https://instagram.com', '_blank');
        alert('تم نسخ النص للانستجرام.');
      }
    };

    return (
      <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-slate-700/30">
        <button onClick={() => handleShare('copy')} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 transition-colors" title="نسخ">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => handleShare('tg')} className="p-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-colors" title="تيليكرام">
          <TelegramIcon className="w-4 h-4" />
        </button>
        <button onClick={() => handleShare('fb')} className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition-colors" title="فيسبوك">
          <Facebook className="w-4 h-4" />
        </button>
        <button onClick={() => handleShare('insta')} className="p-2 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 transition-colors" title="انستجرام">
          <Instagram className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const titleStyle = "font-black text-white leading-none mb-3 whitespace-nowrap overflow-hidden text-[clamp(1rem,4vw,1.25rem)]";

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
        
        {/* Header */}
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
                <SocialLinks links={socialLinks} />
             </div>
          )}
          
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="space-y-6 text-right">
                  <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold text-sky-400 text-center">بخصوص بوت الطلبات على التيليكرام</h3>
                     <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-sky-500/25 group border border-white/10">
                       <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                       <span>الدخول لبوت الطلبات</span>
                     </a>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                    <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
                      <li className="flex items-start gap-2.5"><span className="text-amber-400 text-base mt-0.5">✪</span><span>ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط.</span></li>
                      <li className="flex items-start gap-2.5"><span className="text-amber-400 text-base mt-0.5">✪</span><span>لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات.</span></li>
                    </ul>
                    <div className="pt-2 text-center">
                       <p className="text-xs font-bold text-sky-200/80 bg-sky-500/10 py-2 rounded-lg">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white border-b border-slate-700 pb-2 inline-block">طرق البحث المتاحة في قنوات المناقشات في التيليكرام:</h4>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex gap-2"><span className="font-bold text-slate-500">١.</span><span>ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.</span></li>
                      <li className="flex gap-2"><span className="font-bold text-slate-500">٢.</span><span>اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) بإسم مضبوط (مثلاً: كاب كات).</span></li>
                      <li className="flex gap-2"><span className="font-bold text-slate-500">٣.</span><span>استخدم أمر البحث بكتابة كلمة "بحث" متبوع باسم التطبيق (مثلاً: بحث ياسين).</span></li>
                      <li className="flex gap-2"><span className="font-bold text-slate-500">٤.</span><span>للاعلان في القناة تواصل من خلال البوت</span></li>
                    </ul>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <p className="text-xs text-rose-200 font-medium leading-relaxed"><span className="font-bold text-rose-400 block mb-1">تنبيه:</span>حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا</p>
                  </div>
                </div>
              </div>
              <div className="text-center pb-8 pt-6 space-y-2">
                 <p className="text-slate-400 text-sm font-bold">في النهاية دمتم برعاية الله</p>
                 <p className="text-slate-600 text-[10px] font-medium">{footerData.text} <a href={footerData.url} className="text-sky-500 hover:underline">@kinanmjeed</a></p>
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
                     <div className="text-right w-full">
                        <h3 className="font-bold text-lg text-white truncate w-full">أخبار AI</h3>
                        <p className="text-xs text-slate-400 truncate w-full">أحدث النماذج والتقنيات</p>
                     </div>
                  </div>
               </button>
               <button onClick={() => fetchToolData('phone-news')} className="group p-5 bg-slate-800/40 border border-sky-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                  <div className="flex flex-col items-start gap-3">
                     <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400"><Smartphone className="w-5 h-5" /></div>
                     <div className="w-full text-right"><h3 className="font-bold text-base text-white truncate w-full">الهواتف</h3><p className="text-[10px] text-slate-400 truncate w-full">أسعار ومواصفات</p></div>
                  </div>
               </button>
               <button onClick={() => setActiveToolView('comparison')} className="group p-5 bg-slate-800/40 border border-emerald-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                  <div className="flex flex-col items-start gap-3">
                     <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"><LayoutGrid className="w-5 h-5" /></div>
                     <div className="w-full text-right"><h3 className="font-bold text-base text-white truncate w-full">مقارنة</h3><p className="text-[10px] text-slate-400 truncate w-full">مقارنة شاملة</p></div>
                  </div>
               </button>
               <button onClick={() => setActiveToolView('stats')} className="col-span-2 group p-5 bg-slate-800/40 border border-pink-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400"><BarChart3 className="w-6 h-6" /></div>
                     <div className="text-right w-full overflow-hidden">
                        <h3 className="font-bold text-lg text-white truncate w-full">إحصائيات</h3>
                        <p className="text-xs text-slate-400 truncate w-full">رسوم بيانية وتحليلات السوق</p>
                     </div>
                   </div>
               </button>
            </div>
          )}

          {/* Sub-Tools Views */}
          {activeTab === 'tools' && activeToolView !== 'main' && (
             <div className="space-y-4 animate-slide-up pb-8">
                <button onClick={() => { setActiveToolView('main'); setPhoneSearchResult(null); setStatsResult(null); setAiSearchResult(null); }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-2">
                   <ChevronLeft className="w-5 h-5" /> <span className="text-sm font-bold">رجوع</span>
                </button>

                {/* AI News View */}
                {activeToolView === 'ai-news' && (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                        <input type="text" value={aiSearchQuery} onChange={(e)=>setAiSearchQuery(e.target.value)} placeholder="ابحث عن أداة (مثلاً: Gemini)..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm focus:border-violet-500 outline-none h-12" />
                        <button onClick={handleAISearch} className="bg-violet-600 hover:bg-violet-500 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/20">{aiSearchLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}</button>
                        <button onClick={() => fetchToolData('ai-news', true)} className="bg-slate-800 hover:bg-slate-700 text-violet-400 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-700" title="تحديث الأخبار"><RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                     </div>

                     {aiSearchResult ? (
                       <div className="bg-slate-800/60 border border-violet-500/30 p-5 rounded-3xl animate-fade-in relative shadow-2xl">
                          <button onClick={() => setAiSearchResult(null)} className="absolute top-4 left-4 p-1 bg-slate-700/50 rounded-full text-slate-300 hover:text-white"><X className="w-4 h-4" /></button>
                          
                          <h3 className={titleStyle}>{aiSearchResult.title}</h3>
                          
                          <ul className="list-disc list-inside space-y-2 mb-6 border-b border-slate-700/30 pb-4">
                            {aiSearchResult.summary.map((point, i) => (
                              <li key={i} className="text-sm text-slate-200 leading-relaxed marker:text-violet-500">{point}</li>
                            ))}
                          </ul>

                          {aiSearchResult.official_link && (
                            <a href={aiSearchResult.official_link} target="_blank" className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all mb-1 text-sm shadow-lg shadow-violet-900/20">
                               <span>الموقع الرسمي</span>
                               <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          <ShareToolbar title={aiSearchResult.title} text={aiSearchResult.summary.join('\n')} url={aiSearchResult.official_link} />
                       </div>
                     ) : (
                       <div className="space-y-4">
                          {loading && !aiNews.length && <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500" /></div>}
                          {aiNews.map((news, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-violet-500/20 rounded-2xl p-5 shadow-sm">
                                <h3 className={titleStyle}>{news.title}</h3>
                                <ul className="list-disc list-inside space-y-1.5 mb-4 border-b border-slate-700/30 pb-4">
                                  {news.summary.slice(0, 5).map((point, i) => (
                                    <li key={i} className="text-xs text-slate-300 leading-relaxed marker:text-violet-500">{point}</li>
                                  ))}
                                </ul>
                                <a href={news.official_link} target="_blank" className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl transition-all mb-1 text-sm shadow-lg shadow-violet-900/20">
                                  <span>الموقع الرسمي</span>
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                                <ShareToolbar title={news.title} text={news.summary.join('\n')} url={news.official_link} />
                            </div>
                          ))}
                       </div>
                     )}
                  </div>
                )}
                
                {/* Phone Search & News View */}
                {activeToolView === 'phone-news' && (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                        <input type="text" value={phoneSearchQuery} onChange={(e)=>setPhoneSearchQuery(e.target.value)} placeholder="اكتب اسم الهاتف للبحث..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm focus:border-sky-500 outline-none h-12" />
                        <button onClick={handlePhoneSearch} className="bg-sky-500 text-white w-12 h-12 rounded-xl flex items-center justify-center">{searchLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}</button>
                        <button onClick={() => fetchToolData('phone-news', true)} className="bg-slate-800 hover:bg-slate-700 text-sky-400 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-700" title="تحديث الهواتف"><RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                     </div>
                     
                     {phoneSearchResult ? (
                        <div className="bg-slate-800/60 border border-sky-500/30 p-5 rounded-3xl animate-fade-in relative shadow-2xl">
                           <button onClick={() => setPhoneSearchResult(null)} className="absolute top-4 left-4 p-1 bg-slate-700/50 rounded-full text-slate-300 hover:text-white"><X className="w-4 h-4" /></button>
                           
                           <div className="mb-6 border-b border-slate-700/50 pb-4">
                             <h2 className={titleStyle}>{phoneSearchResult.phone_name}</h2>
                             <div className="flex items-center gap-3">
                               <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-xs font-bold">{phoneSearchResult.brand}</span>
                               <span className="text-emerald-400 font-bold text-lg">{phoneSearchResult.price_usd}</span>
                             </div>
                           </div>

                           <div className="space-y-6">
                              {Object.entries(phoneSearchResult.specifications).length > 0 ? (
                                 SPEC_ORDER.map((key) => {
                                   if (!phoneSearchResult.specifications[key]) return null;
                                   return (
                                     <div key={key} className="space-y-2">
                                        <h4 className="text-xs font-bold text-sky-500 uppercase tracking-wider border-r-2 border-sky-500 pr-2">{SPEC_LABELS[key] || key}</h4>
                                        <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-slate-700/30" dir="rtl">
                                          {phoneSearchResult.specifications[key]}
                                        </p>
                                     </div>
                                   );
                                 })
                              ) : (
                                <p className="text-slate-400 text-center">لا توجد تفاصيل متاحة حالياً.</p>
                              )}
                           </div>

                           {phoneSearchResult.official_specs_link && (
                              <a href={phoneSearchResult.official_specs_link} target="_blank" className="flex items-center justify-center gap-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all mt-6 text-sm">
                                 <span>الموقع الرسمي</span>
                                 <ExternalLink className="w-4 h-4" />
                              </a>
                           )}
                           
                           <ShareToolbar 
                              title={phoneSearchResult.phone_name} 
                              text={Object.entries(phoneSearchResult.specifications).map(([k,v]) => `${SPEC_LABELS[k]||k}: ${v}`).join('\n')} 
                              url={phoneSearchResult.official_specs_link || ''} 
                           />
                        </div>
                     ) : (
                        <div className="space-y-3">
                           {loading && !phoneNews.length && <div className="text-center py-4"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></div>}
                           {phoneNews.map((phone, idx) => (
                              <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-all cursor-pointer group" onClick={() => setPhoneSearchResult(phone)}>
                                 <div className="flex justify-between items-start mb-2 overflow-hidden">
                                    <h3 className={titleStyle}>{phone.phone_name}</h3>
                                    <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg shrink-0 ml-2">{phone.price_usd}</span>
                                 </div>
                                 <p className="text-xs text-slate-400 mb-3 truncate">{phone.brand} • {phone.release_date}</p>
                                 <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                                    <div className="bg-slate-900/50 p-1.5 rounded truncate">📱 {phone.specifications.display?.split(',')[0]}</div>
                                    <div className="bg-slate-900/50 p-1.5 rounded truncate">⚡ {phone.specifications.platform?.split(',')[0]}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                )}

                {/* Comparison View */}
                {activeToolView === 'comparison' && (
                   <div className="space-y-4">
                      <div className="bg-slate-800/40 p-5 rounded-2xl space-y-3 border border-slate-700/50">
                          <h3 className="text-center font-bold text-white mb-2">مقارنة شاملة</h3>
                          <div className="flex gap-2">
                            <input value={phone1} onChange={e=>setPhone1(e.target.value)} placeholder="الهاتف الأول" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-center"/>
                            <span className="self-center font-bold text-slate-500">VS</span>
                            <input value={phone2} onChange={e=>setPhone2(e.target.value)} placeholder="الهاتف الثاني" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none text-center"/>
                          </div>
                          <button onClick={handleComparePhones} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/20">{loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto"/> : 'بدء المقارنة التفصيلية'}</button>
                      </div>

                      {comparisonResult && (
                         <div className="bg-slate-800/60 border border-emerald-500/30 p-4 rounded-2xl animate-fade-in">
                            <h4 className="font-black text-center text-xl mb-6 text-white bg-slate-900/50 py-2 rounded-xl border border-slate-700/50">
                               <span className="text-emerald-400">{comparisonResult.phone1_name}</span> <span className="text-slate-500 text-sm mx-2">ضد</span> <span className="text-sky-400">{comparisonResult.phone2_name}</span>
                            </h4>
                            
                            <div className="space-y-1">
                               {comparisonResult.comparison_points.map((point, i) => (
                                  <div key={i} className="grid grid-cols-[1fr,auto,1fr] gap-2 text-xs border-b border-slate-700/50 py-3 last:border-0 items-center">
                                      <div className={`text-left pl-1 leading-relaxed ${point.winner === 1 ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                         {point.phone1_val}
                                      </div>
                                      <div className="bg-slate-900 px-2 py-1 rounded text-[10px] text-slate-500 font-bold whitespace-nowrap self-start mt-0.5">
                                         {point.feature}
                                      </div>
                                      <div className={`text-right pr-1 leading-relaxed ${point.winner === 2 ? 'text-sky-400 font-bold' : 'text-slate-300'}`}>
                                         {point.phone2_val}
                                      </div>
                                  </div>
                               ))}
                            </div>

                            <div className="mt-6 bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl">
                               <h5 className="font-bold text-emerald-500 mb-2 text-sm">الخلاصة:</h5>
                               <p className="text-xs text-slate-200 leading-relaxed">{comparisonResult.verdict}</p>
                            </div>

                            <ShareToolbar 
                               title={`مقارنة: ${comparisonResult.phone1_name} vs ${comparisonResult.phone2_name}`} 
                               text={comparisonResult.verdict} 
                               url="" 
                            />
                         </div>
                      )}
                   </div>
                )}

                {/* Stats View */}
                {activeToolView === 'stats' && (
                   <div className="space-y-4">
                      <div className="flex gap-2">
                        <input value={statsQuery} onChange={e=>setStatsQuery(e.target.value)} placeholder="أكثر الهواتف مبيعا..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm outline-none" />
                        <button onClick={handleStatsRequest} className="bg-pink-500 text-white p-3 rounded-xl">{statsLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <PieChart className="w-5 h-5"/>}</button>
                      </div>
                      {statsResult && (
                         <div className="bg-slate-800/40 p-4 rounded-2xl border border-pink-500/20">
                            <h3 className="font-bold text-white mb-4 truncate">{statsResult.title}</h3>
                            {statsResult.data.map((d,i)=>(
                               <div key={i} className="mb-3">
                                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 truncate max-w-[70%]">{d.label}</span><span className="text-pink-400 font-bold">{d.displayValue}</span></div>
                                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden"><div style={{width:`${d.value}%`, backgroundColor:d.color}} className="h-full rounded-full"/></div>
                               </div>
                            ))}
                            <ShareToolbar title={statsResult.title} text={statsResult.description} url="" />
                         </div>
                      )}
                   </div>
                )}
             </div>
          )}

        </main>
      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
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

      {/* Install Prompt Banner */}
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
