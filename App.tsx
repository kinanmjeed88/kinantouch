import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { GoogleGenAI } from "@google/genai";
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, ExternalLink,
  Copy,
  Facebook, BadgeCheck,
  DollarSign, ThumbsUp, ThumbsDown, CheckCircle2,
  Download, X, Search,
  BarChart3, PieChart
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem, StatsResult } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'stats';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_v48', // Incremented version to clear old cache
  PHONE_NEWS: 'techtouch_phones_v48'
};

// Mapping for strict specification keys to Arabic Labels
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

  // Phone Search State
  const [showPhoneSearch, setShowPhoneSearch] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [phoneSearchResult, setPhoneSearchResult] = useState<PhoneNewsItem | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Stats State
  const [statsQuery, setStatsQuery] = useState('');
  const [statsResult, setStatsResult] = useState<StatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // PWA Install State
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

  // --- Google Gemini Implementation ---
  const callGeminiAPI = async (prompt: string, systemInstruction: string, useSearch: boolean = false) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("مفتاح API غير متوفر.");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Use gemini-2.5-flash-latest for best balance of speed and search capability
    const modelId = 'gemini-2.5-flash-latest';

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          // Enable Google Search only when needed to get fresh 2025 data
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
      throw new Error(`خطأ في معالجة البيانات: ${e.message || 'Unknown error'}`);
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

Your task is to fetch, verify, organize, and present technology content that is 100% accurate, strictly sourced from the web using Google Search, with zero speculation.

================================================
CRITICAL: DATE & SCOPE
================================================
1. Current System Date: {{TODAY_DATE}}.
2. Time Window: Content MUST be from the **Last 12 Months** only.
3. Global Scope: 
   - Phones: Include ALL manufacturers (Samsung, Apple, Xiaomi, Realme, Infinix, Tecno, Oppo, Vivo, Honor).
   - AI: Include US companies (OpenAI, Google, Meta) AND Chinese/Global companies (Baidu, Alibaba, Tencent, DeepSeek, Mistral).

================================================
LANGUAGE RULES (STRICT ARABIC)
================================================
1. All descriptions, pros, cons, and SPECIFICATIONS details must be in **ARABIC**.
2. English is ONLY allowed for: Brand Names, Model Names, Chipset Names (e.g., Snapdragon 8 Gen 3).
3. Do not output specs like "12GB RAM". Output "ذاكرة عشوائية 12 كيكابايت".

================================================
SECTION 1: AI NEWS
================================================
Fetch real recent news from the web via Search.
- Focus on model releases.
- Quantity: 10 items.
- Structure:
  {
    "title": "Exact Title with Version",
    "content": ["Arabic point 1", "Arabic point 2", "Arabic point 3"],
    "official_link": "URL"
  }

================================================
SECTION 2: PHONE WORLD
================================================
Fetch diverse smartphones released in the last 12 months.
- Quantity: 10 devices (Mix of Flagship, Mid-range, and Budget).
- Specifications MUST be purely Arabic sentences.
- Structure:
  {
    "phone_name": "String",
    "brand": "String",
    "release_date": "YYYY-MM",
    "price_usd": "$XXX",
    "full_specifications": {
       "display": "Arabic description",
       "processor": "Name + Arabic details",
       "rear_cameras": "Arabic details",
       "battery_charging": "Arabic details"
    },
    "pros": ["Arabic point"],
    "cons": ["Arabic point"],
    "official_link": "URL"
  }

================================================
FINAL OUTPUT FORMAT (JSON ONLY)
================================================
Return JSON only. Keys: "ai_news" OR "best_smartphones".`;

      const systemInstruction = baseSystemInstruction.replace('{{TODAY_DATE}}', todayStr);
      let userPrompt = "";
      
      if (type === 'ai-news') {
        userPrompt = `Execute Section 1: AI News (Global & Chinese). Return JSON with key "ai_news". Use Google Search to ensure latest news.`;
      } else if (type === 'phone-news') {
        userPrompt = `Execute Section 2: Phone World (Diverse Brands, Last 12 Months). Return JSON with key "best_smartphones". Use Google Search to find latest releases.`;
      }

      // Enable Search for News/Phones listing to get latest data
      const result = await callGeminiAPI(userPrompt, systemInstruction, true);
      
      if (type === 'ai-news' && result.ai_news) {
        const mappedAI = result.ai_news.map((item: any) => ({
          tool_name: item.title ? item.title.split(' ')[0] : 'AI', 
          title: item.title,
          summary: item.content || [],
          date: result.current_date || todayStr,
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
      console.error(err);
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

    const systemInstruction = `أنت نظام ذكاء اصطناعي يعمل كمحرر تقني محترف لموقع Techtouch.

عند البحث عن أي هاتف ذكي، مهمتك هي جلب وعرض المواصفات الرسمية الكاملة للهاتف فقط، بالاعتماد على البحث في الويب (Google Search) للوصول إلى المواقع الرسمية أو الإعلانات الرسمية الحديثة.

------------------------------------------------
قواعد التعامل مع الهواتف الحديثة (2025 وما بعد)
------------------------------------------------
1. استخدم Google Search بذكاء للعثور على مواصفات الهواتف التي صدرت حديثاً (مثل Samsung S25 Series, iPhone 16, etc).
2. إذا لم تكن صفحة "المواصفات" متاحة، ابحث عن "البيان الصحفي الرسمي" (Official Press Release) واستخرج المواصفات منه.
3. لا تُرجع قيم "غير محدد" (Unknown) إلا إذا كان الهاتف مجرد شائعة ولم يتم الإعلان عنه رسمياً أبداً.
4. بالنسبة للسعر، ابحث عن سعر الإطلاق الرسمي العالمي بالدولار.

------------------------------------------------
قواعد اللغة
------------------------------------------------
1. يجب كتابة جميع المحتويات باللغة العربية الفصحى.
2. يُسمح باستخدام اللغة الإنجليزية فقط في:
   - اسم الهاتف
   - اسم الشركة
   - اسم المعالج
   - اسم المعالج الرسومي

------------------------------------------------
تنسيق الإخراج (JSON حصراً)
------------------------------------------------
{
  "phone_name": "الاسم الكامل للهاتف",
  "brand": "الشركة المصنعة",
  "release_date": "تاريخ الإطلاق الرسمي (YYYY-MM)",
  "price_usd": "السعر الرسمي (مثال: $1200)",
  "full_specifications": {
    "networks": "الشبكات المدعومة",
    "dimensions": "الأبعاد",
    "weight": "الوزن",
    "materials": "الخامات",
    "water_resistance": "مقاومة الماء",
    "display": "الشاشة (النوع، الحجم، الدقة، التردد)",
    "processor": "المعالج",
    "gpu": "المعالج الرسومي",
    "memory_storage": "الذاكرة العشوائية + التخزين + دعم بطاقة الذاكرة",
    "rear_cameras": "الكاميرات الخلفية",
    "front_camera": "الكاميرا الأمامية",
    "video": "تصوير الفيديو",
    "battery_charging": "البطارية والشحن",
    "operating_system": "نظام التشغيل",
    "connectivity": "وسائل الاتصال",
    "sensors": "المستشعرات",
    "colors": "الألوان"
  },
  "pros": [],
  "cons": [],
  "official_specs_link": "رابط الصفحة الرسمية المستخدمة"
}`;

    try {
      // Use Search = true explicitly for phone search to solve "Unknown" issue
      const result = await callGeminiAPI(`ابحث عن المواصفات الرسمية الكاملة والحديثة للهاتف: ${phoneSearchQuery}`, systemInstruction, true);
      if (result) {
        setPhoneSearchResult(result);
      } else {
        setError("لم يتم العثور على معلومات رسمية لهذا الهاتف.");
      }
    } catch (e) {
      setError("حدث خطأ أثناء البحث. تأكد من الاتصال بالإنترنت.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStatsRequest = async () => {
    if (!statsQuery.trim()) return;
    setStatsLoading(true);
    setStatsResult(null);
    setError(null);

    const systemInstruction = `أنت محلل بيانات تقني محترف.
    مهمتك: إنشاء إحصائيات دقيقة ورسوم بيانية بناءً على طلب المستخدم.
    استخدم Google Search للبحث عن أحدث التقارير (IDC, Canalys, Statista) لعام 2024 و 2025.
    
    القواعد:
    1. العناوين والنصوص بالعربية.
    2. الأرقام دقيقة.
    3. الهيكل JSON حصراً:
    {
      "title": "عنوان الإحصائية",
      "description": "وصف قصير للفترة الزمنية والمصدر",
      "total_samples": "إجمالي العدد (اختياري)",
      "chart_type": "bar",
      "data": [
        { "label": "اسم العنصر", "value": 25, "displayValue": "25% أو 50 مليون" },
        { "label": "اسم العنصر", "value": 75, "displayValue": "..." }
      ],
      "insight": "استنتاج ذكي قصير من سطرين حول هذه البيانات"
    }`;

    try {
      // Use Search = true for stats
      const result = await callGeminiAPI(`قم بإنشاء إحصائية دقيقة وحديثة لـ: ${statsQuery}`, systemInstruction, true);
      if (result) {
         const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
         result.data = result.data.map((item: any, index: number) => ({
            ...item,
            color: colors[index % colors.length]
         }));
         setStatsResult(result);
      } else {
         setError("لم أتمكن من استخراج إحصائيات لهذا الطلب.");
      }
    } catch (e) {
      setError("فشل في تحليل طلب الإحصائيات.");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const system = `أنت خبير تقني. 
      قارن بين الهاتفين بدقة. استخدم بحث Google للتأكد من مواصفات الهواتف الحديثة.
      - المخرجات يجب أن تكون باللغة العربية حصراً للمواصفات.
      - الجدول يجب أن يكون مختصراً ومفيداً.
      الرد JSON فقط.`;
      
      const prompt = `قارن بين ${phone1} و ${phone2}.
      JSON Format Required:
      {
        "specs": [{"feature": "string (Arabic)", "phone1": "string (Arabic)", "phone2": "string (Arabic)"}],
        "betterPhone": "string",
        "verdict": "string (Arabic)"
      }`;
      
      // Use Search = true for comparison
      const result = await callGeminiAPI(prompt, system, true);
      setComparisonResult(result);
    } catch (err: any) { 
      setError("فشل تحليل المقارنة."); 
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
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none opacity-15 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
      </div>
      
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-4 right-4 z-[100] bg-rose-500/90 text-white p-3 rounded-xl text-center shadow-lg backdrop-blur-md animate-fade-in border border-rose-400/50 flex items-center justify-between">
            <p className="text-sm font-bold flex items-center justify-center gap-2 flex-1">
                <AlertCircle className="w-5 h-5" /> {error}
            </p>
            <button onClick={() => setError(null)} className="text-white/70 hover:text-white p-1 ml-2">
                <X className="w-5 h-5" />
            </button>
        </div>
      )}

      <div className="relative z-10 max-w-lg mx-auto px-4 pb-8 min-h-screen flex flex-col">
        <header className="pt-8 pb-6 text-center relative">
          
          <div className="inline-block relative mb-6">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                {profileConfig.image && !imageError ? (
                  <img src={profileConfig.image} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                ) : (
                  <span className="text-4xl font-black text-sky-400">{profileConfig.initials}</span>
                )}
             </div>
             
             {/* Small PWA Install Button integrated near profile (Hidden if banner is shown) */}
             {installPrompt && !showInstallBanner && (
                <button 
                  onClick={() => setShowInstallBanner(true)}
                  className="absolute -bottom-2 -right-2 p-2 bg-sky-500 text-white rounded-full shadow-lg shadow-sky-500/30 animate-bounce hover:bg-sky-400 transition-colors"
                  title="تثبيت التطبيق"
                >
                  <Download className="w-4 h-4" />
                </button>
             )}
          </div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">Techtouch</h1>
          <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md shadow-lg sticky top-4 z-50">
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-black">الرئيسية</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-5 h-5" /><span className="text-[9px] font-black">معلومات</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-5 h-5" /><span className="text-[9px] font-black">أدوات</span></button>
          </nav>
        </header>

        <main className="flex-grow py-4 animate-fade-in">
          {activeTab === 'home' && telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
          
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="space-y-5 text-right">
                  {/* Header + Button */}
                  <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold text-sky-400 text-center sm:text-right">بخصوص بوت الطلبات على التيليكرام</h3>
                     <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 group">
                       <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                       <span>الدخول لبوت الطلبات</span>
                     </a>
                  </div>

                  {/* Rules List */}
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold mt-1">✪</span>
                      <span className="leading-relaxed">ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط .</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-sky-500 font-bold mt-1">✪</span>
                      <span className="leading-relaxed">لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات .</span>
                    </li>
                  </ul>

                  {/* Note */}
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-center">
                    <p className="text-xs text-amber-400 font-bold leading-relaxed">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات</p>
                  </div>

                  {/* Search Methods */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-slate-200 border-b border-slate-700/50 pb-2 mb-3">طرق البحث المتاحة في قنوات المناقشات في التيليكرام:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-300 marker:text-sky-500 marker:font-bold">
                      <li className="leading-relaxed"><span className="text-slate-400">ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.</span></li>
                      <li className="leading-relaxed"><span className="text-slate-400">اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) بإسم مضبوط (مثلاً: كاب كات).</span></li>
                      <li className="leading-relaxed"><span className="text-slate-400">استخدم أمر البحث بكتابة كلمة "بحث" متبوع باسم التطبيق (مثلاً: بحث ياسين).</span></li>
                      <li className="leading-relaxed"><span className="text-slate-400">للاعلان في القناة تواصل من خلال البوت</span></li>
                    </ol>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mt-2">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-300 font-medium leading-relaxed">
                      <span className="font-bold text-rose-400">تنبيه:</span> حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا
                    </p>
                  </div>

                  {/* Closing */}
                  <p className="text-center text-slate-400 text-sm font-bold pt-4 border-t border-slate-700/30 mt-2">في النهاية دمتم برعاية الله</p>
                </div>
              </div>
              
              <SocialLinks links={socialLinks} />
            </div>
          )}

          {activeTab === 'tools' && activeToolView === 'main' && (
            <div className="grid gap-4">
               <button 
                onClick={() => fetchToolData('ai-news')}
                className="group relative p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden transition-all hover:bg-slate-700/60"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center gap-4">
                   <div className="w-12 h-12 bg-violet-500/20 rounded-2xl flex items-center justify-center text-violet-400">
                     <Cpu className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                     <h3 className="font-bold text-lg mb-1 group-hover:text-violet-400 transition-colors">أخبار الذكاء الاصطناعي</h3>
                     <p className="text-xs text-slate-400">آخر التحديثات والنماذج الجديدة</p>
                   </div>
                   <ArrowRight className="mr-auto text-slate-500 group-hover:text-violet-400 group-hover:-translate-x-1 transition-all" />
                 </div>
               </button>

               <button 
                onClick={() => fetchToolData('phone-news')}
                className="group relative p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden transition-all hover:bg-slate-700/60"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center gap-4">
                   <div className="w-12 h-12 bg-sky-500/20 rounded-2xl flex items-center justify-center text-sky-400">
                     <Smartphone className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                     <h3 className="font-bold text-lg mb-1 group-hover:text-sky-400 transition-colors">عالم الهواتف</h3>
                     <p className="text-xs text-slate-400">أحدث الأجهزة والمواصفات</p>
                   </div>
                   <ArrowRight className="mr-auto text-slate-500 group-hover:text-sky-400 group-hover:-translate-x-1 transition-all" />
                 </div>
               </button>

               <button 
                onClick={() => setActiveToolView('comparison')}
                className="group relative p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden transition-all hover:bg-slate-700/60"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                     <ArrowRight className="w-6 h-6 rotate-45" />
                   </div>
                   <div className="text-right">
                     <h3 className="font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">مقارنة تقنية</h3>
                     <p className="text-xs text-slate-400">قارن بين أي جهازين بالتفصيل</p>
                   </div>
                   <ArrowRight className="mr-auto text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all" />
                 </div>
               </button>

               <button 
                onClick={() => setActiveToolView('stats')}
                className="group relative p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden transition-all hover:bg-slate-700/60"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center gap-4">
                   <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-400">
                     <BarChart3 className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                     <h3 className="font-bold text-lg mb-1 group-hover:text-pink-400 transition-colors">إحصائيات بيانية</h3>
                     <p className="text-xs text-slate-400">رسوم بيانية لأكثر الهواتف والأعطال</p>
                   </div>
                   <ArrowRight className="mr-auto text-slate-500 group-hover:text-pink-400 group-hover:-translate-x-1 transition-all" />
                 </div>
               </button>
            </div>
          )}

          {activeTab === 'tools' && activeToolView !== 'main' && (
             <div className="space-y-4 animate-slide-up">
                <button 
                  onClick={() => {
                     setActiveToolView('main');
                     setShowPhoneSearch(false);
                     setPhoneSearchResult(null);
                     setStatsResult(null);
                     setStatsQuery('');
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                >
                   <ChevronLeft className="w-5 h-5" />
                   <span className="text-sm font-bold">رجوع للأدوات</span>
                </button>

                {/* --- AI News View --- */}
                {activeToolView === 'ai-news' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-violet-400 flex items-center gap-2">
                        <Cpu className="w-6 h-6" /> أخبار الذكاء الاصطناعي
                      </h2>
                      <button onClick={() => fetchToolData('ai-news', true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <ArrowRight className={`w-4 h-4 rotate-180 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    
                    {loading ? (
                       <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                          <Loader2 className="w-8 h-8 animate-spin mb-3" />
                          <p className="text-xs">جاري جلب أحدث الأخبار...</p>
                       </div>
                    ) : aiNews.length > 0 ? (
                       aiNews.map((news, idx) => (
                         <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                           <div className="flex justify-between items-start mb-3">
                              <span className="bg-violet-500/10 text-violet-300 text-[10px] font-bold px-2 py-1 rounded-md border border-violet-500/20">{news.tool_name}</span>
                              <span className="text-[10px] text-slate-500">{news.date}</span>
                           </div>
                           <h3 className="font-bold text-lg mb-2 text-slate-100 leading-snug">{news.title}</h3>
                           <ul className="space-y-1 mb-4">
                             {news.summary.map((line, i) => (
                               <li key={i} className="text-xs text-slate-400 leading-relaxed list-disc list-inside marker:text-violet-500">{line}</li>
                             ))}
                           </ul>
                           <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/30">
                              <button onClick={() => shareContent(news, 'tg')} className="p-2 bg-[#229ED9]/10 text-[#229ED9] rounded-lg hover:bg-[#229ED9]/20"><Send className="w-4 h-4" /></button>
                              <button onClick={() => shareContent(news, 'fb')} className="p-2 bg-[#1877F2]/10 text-[#1877F2] rounded-lg hover:bg-[#1877F2]/20"><Facebook className="w-4 h-4" /></button>
                              <button onClick={() => shareContent(news, 'copy')} className="p-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700"><Copy className="w-4 h-4" /></button>
                              <a href={news.official_link} target="_blank" className="ml-auto flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors">
                                 المصدر الرسمي <ExternalLink className="w-3 h-3" />
                              </a>
                           </div>
                         </div>
                       ))
                    ) : (
                       <div className="text-center text-slate-500 py-10 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">لا توجد أخبار حالياً</div>
                    )}
                  </div>
                )}

                {/* --- Phone News View --- */}
                {activeToolView === 'phone-news' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-sky-400 flex items-center gap-2">
                         <Smartphone className="w-6 h-6" /> عالم الهواتف الذكية
                      </h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowPhoneSearch(!showPhoneSearch)} 
                          className={`p-2 rounded-lg transition-colors ${showPhoneSearch ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button onClick={() => fetchToolData(activeToolView, true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <ArrowRight className={`w-4 h-4 rotate-180 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Search Input Area */}
                    {showPhoneSearch && (
                      <div className="animate-slide-up bg-slate-800/60 border border-sky-500/30 p-4 rounded-2xl mb-6 backdrop-blur-md">
                         <div className="relative flex items-center gap-2">
                            <input 
                              type="text" 
                              value={phoneSearchQuery}
                              onChange={(e) => setPhoneSearchQuery(e.target.value)}
                              placeholder="أدخل اسم الهاتف للبحث عن مواصفاته الدقيقة..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-500"
                              onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                            />
                            <button 
                              onClick={handlePhoneSearch}
                              disabled={searchLoading || !phoneSearchQuery.trim()}
                              className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-sky-500/20"
                            >
                              {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                         </div>
                      </div>
                    )}

                    {/* Search Result Display */}
                    {phoneSearchResult && showPhoneSearch ? (
                      <div className="animate-fade-in bg-slate-800/40 border border-sky-500/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm overflow-hidden relative">
                         <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
                           <div>
                              <h3 className="font-black text-2xl text-white mb-1">{phoneSearchResult.phone_name}</h3>
                              <p className="text-sm text-sky-400 font-bold uppercase tracking-wider">{phoneSearchResult.brand} • {phoneSearchResult.release_date}</p>
                           </div>
                           {phoneSearchResult.price_usd && (
                              <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-base font-bold flex items-center gap-1">
                                 <DollarSign className="w-4 h-4" />{phoneSearchResult.price_usd}
                              </div>
                           )}
                         </div>

                         {/* Full Specifications List (Zebra Striping) */}
                         <div className="mb-6 rounded-xl overflow-hidden border border-slate-700/50">
                            {Object.entries(phoneSearchResult.specifications || {}).map(([key, val], idx) => {
                               // Translate Key if exists in map, else use key as is (if valid)
                               const label = SPEC_LABELS[key] || key;
                               return (
                                 <div key={idx} className={`flex flex-col sm:flex-row sm:items-center p-4 gap-2 ${idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-800/60'}`}>
                                    <span className="text-sky-400 font-bold text-sm min-w-[140px] border-r-0 sm:border-r border-slate-700/50 pl-0 sm:pl-4 ml-0 sm:ml-4">{label}</span>
                                    <span className="text-slate-200 text-sm leading-relaxed">{String(val)}</span>
                                 </div>
                               );
                            })}
                         </div>

                         {(phoneSearchResult.pros.length > 0 || phoneSearchResult.cons.length > 0) && (
                           <div className="flex flex-col sm:flex-row gap-4 mb-4">
                             {phoneSearchResult.pros.length > 0 && (
                               <div className="flex-1 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                 <h4 className="flex items-center gap-2 text-emerald-400 text-sm font-bold mb-3"><ThumbsUp className="w-4 h-4" /> المميزات</h4>
                                 <ul className="space-y-2">
                                   {phoneSearchResult.pros.map((p, i) => <li key={i} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500/50 shrink-0 mt-0.5" />{p}</li>)}
                                 </ul>
                               </div>
                             )}
                             {phoneSearchResult.cons.length > 0 && (
                               <div className="flex-1 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                                 <h4 className="flex items-center gap-2 text-rose-400 text-sm font-bold mb-3"><ThumbsDown className="w-4 h-4" /> العيوب</h4>
                                 <ul className="space-y-2">
                                   {phoneSearchResult.cons.map((c, i) => <li key={i} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2"><AlertCircle className="w-4 h-4 text-rose-500/50 shrink-0 mt-0.5" />{c}</li>)}
                                 </ul>
                               </div>
                             )}
                           </div>
                         )}
                         
                         <div className="flex justify-end">
                            <button 
                              onClick={() => {
                                setPhoneSearchResult(null);
                                setPhoneSearchQuery('');
                              }}
                              className="text-xs text-slate-500 hover:text-white underline transition-colors"
                            >
                              إغلاق البحث والعودة للقائمة
                            </button>
                         </div>
                      </div>
                    ) : (
                      <>
                        {loading ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                              <Loader2 className="w-8 h-8 animate-spin mb-3" />
                              <p className="text-xs">جاري جلب البيانات...</p>
                          </div>
                        ) : phoneNews.length > 0 ? (
                          phoneNews.map((phone, idx) => (
                            <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm overflow-hidden relative">
                              <div className="flex justify-between items-start mb-4 pl-8">
                                <div>
                                    <h3 className="font-black text-xl text-white mb-1">{phone.phone_name}</h3>
                                    <p className="text-xs text-sky-400 font-bold uppercase tracking-wider">{phone.brand} • {phone.release_date}</p>
                                </div>
                                {phone.price_usd && (
                                    <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20 text-sm font-bold flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />{phone.price_usd}
                                    </div>
                                )}
                              </div>
                              
                              {/* Specs Grid: Updated to display arabic specs neatly */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-slate-900/30 p-3 rounded-xl">
                                  {Object.entries(phone.specifications || {}).slice(0, 6).map(([key, val], k) => (
                                    <div key={k} className="flex flex-col">
                                      <span className="text-[10px] text-slate-500 font-bold mb-0.5">{SPEC_LABELS[key] || key}</span>
                                      <span className="text-xs text-slate-300 font-medium leading-relaxed">{String(val)}</span>
                                    </div>
                                  ))}
                              </div>

                              <div className="flex gap-2 mb-4">
                                <div className="flex-1 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                  <h4 className="flex items-center gap-1 text-emerald-400 text-xs font-bold mb-2"><ThumbsUp className="w-3 h-3" /> المميزات</h4>
                                  <ul className="space-y-1">
                                    {phone.pros.slice(0, 3).map((p, i) => <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500/50 shrink-0 mt-0.5" />{p}</li>)}
                                  </ul>
                                </div>
                                <div className="flex-1 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                                  <h4 className="flex items-center gap-1 text-rose-400 text-xs font-bold mb-2"><ThumbsDown className="w-3 h-3" /> العيوب</h4>
                                  <ul className="space-y-1">
                                    {phone.cons.slice(0, 3).map((c, i) => <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1"><AlertCircle className="w-3 h-3 text-rose-500/50 shrink-0 mt-0.5" />{c}</li>)}
                                  </ul>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/30">
                                  <button onClick={() => shareContent(phone, 'tg')} className="p-2 bg-[#229ED9]/10 text-[#229ED9] rounded-lg hover:bg-[#229ED9]/20"><Send className="w-4 h-4" /></button>
                                  <button onClick={() => shareContent(phone, 'copy')} className="p-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700"><Copy className="w-4 h-4" /></button>
                                  <a href={phone.official_specs_link} target="_blank" className="ml-auto flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg transition-colors">
                                    المواصفات الكاملة <ExternalLink className="w-3 h-3" />
                                  </a>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-slate-500 py-10 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">لا توجد بيانات متاحة</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* --- Comparison View --- */}
                {activeToolView === 'comparison' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-emerald-400 flex items-center gap-2">
                       <ArrowRight className="w-6 h-6 rotate-45" /> مقارنة الأجهزة
                    </h2>
                    
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm space-y-4">
                       <div>
                         <label className="text-xs text-slate-400 block mb-1">الهاتف الأول</label>
                         <input 
                           type="text" 
                           value={phone1}
                           onChange={(e) => setPhone1(e.target.value)}
                           placeholder="مثال: iPhone 15 Pro Max"
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                         />
                       </div>
                       <div>
                         <label className="text-xs text-slate-400 block mb-1">الهاتف الثاني</label>
                         <input 
                           type="text" 
                           value={phone2}
                           onChange={(e) => setPhone2(e.target.value)}
                           placeholder="مثال: Samsung S24 Ultra"
                           className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                         />
                       </div>
                       <button 
                         onClick={handleComparePhones}
                         disabled={loading || !phone1 || !phone2}
                         className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"
                       >
                         {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'بدء المقارنة'}
                       </button>
                    </div>

                    {comparisonResult && (
                      <div className="animate-slide-up space-y-4">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
                          {/* Added horizontal scroll container for responsive table */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[320px] text-xs sm:text-sm whitespace-nowrap">
                              <thead>
                                <tr className="bg-slate-900/50 text-slate-400">
                                  <th className="p-3 text-right">المواصفات</th>
                                  <th className="p-3 text-center w-1/3">{phone1}</th>
                                  <th className="p-3 text-center w-1/3">{phone2}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50">
                                {comparisonResult.specs.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="p-3 font-bold text-slate-300">{row.feature}</td>
                                    <td className="p-3 text-center text-slate-400">{row.phone1}</td>
                                    <td className="p-3 text-center text-slate-400">{row.phone2}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-emerald-500/10 to-slate-800/40 border border-emerald-500/20 rounded-2xl p-5">
                           <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><BadgeCheck className="w-5 h-5" /> الحكم النهائي</h3>
                           <p className="text-sm text-slate-300 leading-relaxed mb-3">{comparisonResult.verdict}</p>
                           <div className="bg-slate-900/50 rounded-xl p-3 flex justify-between items-center">
                              <span className="text-xs text-slate-400">الأفضل هو:</span>
                              <span className="font-black text-white">{comparisonResult.betterPhone}</span>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- Stats View (New) --- */}
                {activeToolView === 'stats' && (
                  <div className="space-y-6">
                     <h2 className="text-xl font-black text-pink-400 flex items-center gap-2">
                       <BarChart3 className="w-6 h-6" /> إحصائيات تقنية
                    </h2>

                    <div className="bg-slate-800/60 border border-pink-500/30 p-4 rounded-2xl backdrop-blur-md">
                       <div className="relative flex items-center gap-2">
                          <input 
                            type="text" 
                            value={statsQuery}
                            onChange={(e) => setStatsQuery(e.target.value)}
                            placeholder="مثال: أكثر الهواتف مبيعا في 2024"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all placeholder:text-slate-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleStatsRequest()}
                          />
                          <button 
                            onClick={handleStatsRequest}
                            disabled={statsLoading || !statsQuery.trim()}
                            className="bg-pink-500 hover:bg-pink-600 disabled:bg-slate-700 disabled:text-slate-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-pink-500/20"
                          >
                            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PieChart className="w-5 h-5" />}
                          </button>
                       </div>
                       
                       {/* Predefined Chips */}
                       <div className="flex flex-wrap gap-2 mt-3">
                          {['أكثر الهواتف عطلاً', 'أفضل معالجات 2024', 'نسبة استخدام iOS vs Android', 'أكثر الحواسيب مبيعا'].map((q) => (
                             <button 
                                key={q}
                                onClick={() => { setStatsQuery(q); handleStatsRequest(); }} // Will trigger next render
                                className="text-[10px] bg-slate-700/50 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors border border-slate-600"
                             >
                                {q}
                             </button>
                          ))}
                       </div>
                    </div>

                    {statsResult && (
                       <div className="animate-slide-up bg-slate-800/40 border border-pink-500/20 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                          <div className="mb-6">
                             <h3 className="text-lg font-bold text-white mb-1">{statsResult.title}</h3>
                             <p className="text-xs text-slate-400">{statsResult.description}</p>
                          </div>

                          {/* Bar Chart Visualization */}
                          <div className="space-y-4 mb-6">
                             {statsResult.data.map((item, idx) => (
                                <div key={idx} className="relative">
                                   <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-200 font-bold">{item.label}</span>
                                      <span className="text-pink-300 font-medium">{item.displayValue}</span>
                                   </div>
                                   <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden">
                                      <div 
                                         className="h-full rounded-full transition-all duration-1000 ease-out"
                                         style={{ 
                                            width: `${item.value}%`, 
                                            backgroundColor: item.color || '#f472b6',
                                            animation: `slideInRight 1s ease-out ${idx * 0.1}s backwards`
                                         }}
                                      />
                                   </div>
                                </div>
                             ))}
                          </div>

                          {/* Insight Box */}
                          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 flex gap-3">
                             <div className="mt-1"><Info className="w-5 h-5 text-pink-400" /></div>
                             <p className="text-sm text-slate-300 leading-relaxed">{statsResult.insight}</p>
                          </div>
                       </div>
                    )}
                  </div>
                )}
             </div>
          )}
        </main>

        <footer className="mt-8 pt-6 border-t border-slate-800 text-center pb-24 sm:pb-8">
          <p className="text-slate-500 text-xs font-medium">
            {footerData.text}
            <a href={footerData.url} className="text-sky-500 hover:text-sky-400 mr-1 transition-colors">@kinanmjeed</a>
          </p>
        </footer>
      </div>

      {/* --- PWA Install Banner --- */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] animate-slide-up">
          <div className="bg-slate-800/95 border border-sky-500/30 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-sky-400" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-white">تثبيت التطبيق</h3>
                <p className="text-[10px] text-slate-400">أضف TechTouch إلى شاشتك الرئيسية لتجربة أسرع</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={handleInstallClick}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-sky-500/20"
              >
                تثبيت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;