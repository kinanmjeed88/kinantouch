
import React, { useState, useEffect, useMemo } from 'react';
import { telegramChannels, footerData, profileConfig, socialLinks } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Smartphone, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, Send,
  Download, X, Search,
  BarChart3, PieChart,
  LayoutGrid, Copy, Facebook, Instagram, ExternalLink,
  RotateCcw, Eye, Command, AlertTriangle
} from 'lucide-react';
import { TelegramIcon } from './components/Icons'; 
import { PhoneComparisonResult, PhoneNewsItem, StatsResult, BrandFile, LocalPhone, AITool } from './types';

// Importing Local Data - Using relative paths
import samsungData from './data/phones-backup/samsung.json';
import appleData from './data/phones-backup/apple.json';
import googleData from './data/phones-backup/google.json';
import xiaomiData from './data/phones-backup/xiaomi.json';
import huaweiData from './data/phones-backup/huawei.json';
import oneplusData from './data/phones-backup/oneplus.json';
import oppoData from './data/phones-backup/oppo.json';
import vivoData from './data/phones-backup/vivo.json';
import realmeData from './data/phones-backup/realme.json';
import sonyData from './data/phones-backup/sony.json';
import tecnoData from './data/phones-backup/tecno.json'; 

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-directory' | 'comparison' | 'phone-news' | 'stats';

const CACHE_KEYS = {
  AI_TOOLS: 'techtouch_ai_tools_v1',
  PHONE_NEWS: 'techtouch_phones_strict_v4'
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
  misc: "ألوان ومعلومات إضافية"
};

// 🔴 MASTER PROMPT
const MASTER_RULES = `
أنت تعمل داخل موقع ويب اسمه "Techtouch".
دورك الوحيد هو معالجة البيانات الموثوقة فقط.
اللغة: العربية الفصحى حصراً.
`;

// 🟡 أوامر الهواتف (للبحث فقط في حال عدم التوفر محلياً)
const PHONES_MEMORY_PROMPT = `
${MASTER_RULES}
هذا الطلب خاص بهاتف.
مهمتك: عرض مواصفات عامة ودقيقة.
يجب استخدام المفاتيح التالية حصراً في specifications:
display, platform, memory, main_camera, selfie_camera, battery, body, sound, comms, misc
المخرجات JSON:
{ "phone_name": "الاسم", "brand": "الشركة", "release_date": "السنة", "specifications": { "display": "...", "platform": "...", "memory": "...", "main_camera": "...", "battery": "...", "body": "..." }, "official_link": "", "pros": [], "cons": [] }
`;

// 🔵 أوامر المقارنة
const COMPARISON_ANALYSIS_PROMPT = `
${MASTER_RULES}
قارن بين الهاتفين بناءً على البيانات المقدمة.
الصيغة: "الهاتفان يقدمان أداءً قويًا، ولكن يتفوق {A} في... بينما {B}..."
المخرجات JSON: { "verdict": "النص" }
`;

// 🟣 أوامر الإحصائيات الذكية
const STATS_AI_PROMPT = `
${MASTER_RULES}
أنت خبير إحصائي دقيق جداً.
المخرجات JSON حصراً:
{
  "main_insight": "جملة تلخيصية دقيقة",
  "charts": [
    {
      "title": "العنوان",
      "description": "شرح",
      "chart_type": "pie" | "bar",
      "data": [
        { "label": "العنصر", "value": 50, "displayValue": "50%", "color": "#HEX" }
      ]
    }
  ]
}
`;

// --- LOCAL DB LOGIC ---
const allBrandFiles: BrandFile[] = [
  samsungData, appleData, googleData, xiaomiData, huaweiData, 
  oneplusData, oppoData, vivoData, realmeData, sonyData, tecnoData
].filter(Boolean) as unknown as BrandFile[];

const getAllLocalPhones = (): LocalPhone[] => {
  return allBrandFiles.flatMap(brand => brand.phones || []);
};

const mapLocalToDisplay = (local: LocalPhone): PhoneNewsItem => {
  let displayStr = "";
  if (local.specs.display.main && local.specs.display.cover) {
     displayStr = `Main: ${local.specs.display.main}, Cover: ${local.specs.display.cover}`;
  } else {
     displayStr = `${local.specs.display.size || ''} ${local.specs.display.type || ''}, ${local.specs.display.resolution || ''}, ${local.specs.display.refresh_rate || ''}`.replace(/,\s*,/g, ',').trim();
  }

  const defaultNetwork = "5G / 4G LTE / Wi-Fi 6E/7";
  const defaultSound = "Stereo Speakers, High-Res Audio";
  const defaultComms = "Bluetooth 5.3/5.4, NFC, USB Type-C";

  return {
    phone_name: local.name,
    brand: local.id.split('-')[0].toUpperCase(),
    release_date: local.release_year.toString(),
    specifications: {
      network: defaultNetwork,
      launch: `Released ${local.release_year}`,
      body: `${local.manufacturing.frame}, ${local.manufacturing.back}`,
      display: displayStr,
      platform: local.specs.chipset,
      memory: `${local.specs.ram} RAM, ${local.specs.storage} Storage`,
      main_camera: local.specs.rear_camera,
      selfie_camera: local.specs.front_camera,
      sound: defaultSound,
      comms: defaultComms,
      features: `${local.manufacturing.protection}, ${local.manufacturing.water_resistance}`,
      battery: `${local.specs.battery}, ${local.specs.charging}`,
      misc: `Weight: ${local.specs.weight}, OS: ${local.specs.os}`
    },
    pros: [],
    cons: []
  };
};

const normalize = (text: string) => {
  return text.toLowerCase().trim();
};

const App: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  // AI Tools Directory State
  const [aiTools, setAiTools] = useState<AITool[]>([]);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [toolPage, setToolPage] = useState(1);
  const toolsPerPage = 20;
  
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const localPhonesDB = useMemo(() => getAllLocalPhones(), []);

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
      // Cache valid for 24h
      const validity = 24 * 60 * 60 * 1000;
      return (Date.now() - timestamp < validity) ? data : null;
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
          temperature: 0.1, 
          max_completion_tokens: 3000
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return JSON.parse(content);
      throw new Error("Empty response");
    } catch (e: any) {
      console.error("Groq API Error:", e);
      throw new Error("لا تتوفر بيانات.");
    }
  };

  const searchPhonesInLocalDB = (query: string): LocalPhone[] => {
    if (!query) return [];
    const queryParts = normalize(query).split(/\s+/).filter(q => q.length > 0);
    if (queryParts.length === 0) return [];

    return localPhonesDB.filter(phone => {
       const targetText = (normalize(phone.name) + " " + normalize(phone.id));
       return queryParts.every(part => targetText.includes(part));
    }).sort((a, b) => {
        return a.name.length - b.name.length;
    });
  };

  const findPhoneInLocalDB = (query: string): LocalPhone | undefined => {
     const matches = searchPhonesInLocalDB(query);
     return matches.length > 0 ? matches[0] : undefined;
  };

  const handlePhoneSearch = async () => {
    if (!phoneSearchQuery.trim()) return;
    setSearchLoading(true);
    setPhoneSearchResult(null);
    setError(null);

    const localMatches = searchPhonesInLocalDB(phoneSearchQuery);

    if (localMatches.length > 0) {
      setPhoneSearchResult(mapLocalToDisplay(localMatches[0]));
      setSearchLoading(false);
      return;
    }

    try {
      const result = await callGroqAPI(`User asked for phone: "${phoneSearchQuery}". Return specs.`, PHONES_MEMORY_PROMPT);
      if (result && result.phone_name) {
        setPhoneSearchResult(result);
      } else {
        setError("لم يتم العثور على نتائج.");
      }
    } catch (e: any) {
      setError("لا تتوفر بيانات حالياً.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    setComparisonResult(null);

    const p1Local = findPhoneInLocalDB(phone1);
    const p2Local = findPhoneInLocalDB(phone2);

    let p1Data: any = p1Local ? mapLocalToDisplay(p1Local) : null;
    let p2Data: any = p2Local ? mapLocalToDisplay(p2Local) : null;

    try {
      if (!p1Data) {
         const r = await callGroqAPI(`Phone: ${phone1}`, PHONES_MEMORY_PROMPT);
         if (r.phone_name) p1Data = r;
      }
      if (!p2Data) {
         const r = await callGroqAPI(`Phone: ${phone2}`, PHONES_MEMORY_PROMPT);
         if (r.phone_name) p2Data = r;
      }

      if (!p1Data || !p2Data) {
        setError("أحد الهاتفين غير متوفر في قاعدة البيانات للمقارنة.");
        setLoading(false);
        return;
      }

      const comparisonInput = JSON.stringify({ phone1: p1Data, phone2: p2Data });
      let verdict = "كلا الهاتفين متميزان.";
      try {
          const verdictResult = await callGroqAPI(`Compare strictly based on this data: ${comparisonInput}`, COMPARISON_ANALYSIS_PROMPT);
          if (verdictResult.verdict) verdict = verdictResult.verdict;
      } catch (e) { console.log("AI Verdict failed"); }

      setComparisonResult({
        phone1_name: p1Data.phone_name,
        phone2_name: p2Data.phone_name,
        comparison_points: [
            { feature: "الشاشة", phone1_val: p1Data.specifications?.display || "-", phone2_val: p2Data.specifications?.display || "-", winner: 0 },
            { feature: "المعالج", phone1_val: p1Data.specifications?.platform || "-", phone2_val: p2Data.specifications?.platform || "-", winner: 0 },
            { feature: "الذاكرة", phone1_val: p1Data.specifications?.memory || "-", phone2_val: p2Data.specifications?.memory || "-", winner: 0 },
            { feature: "الكاميرا", phone1_val: p1Data.specifications?.main_camera || "-", phone2_val: p2Data.specifications?.main_camera || "-", winner: 0 },
            { feature: "البطارية", phone1_val: p1Data.specifications?.battery || "-", phone2_val: p2Data.specifications?.battery || "-", winner: 0 },
            { feature: "الهيكل", phone1_val: p1Data.specifications?.body || "-", phone2_val: p2Data.specifications?.body || "-", winner: 0 }
        ],
        verdict: verdict
      });

    } catch (err: any) { 
      setError("فشل في إجراء المقارنة."); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchToolData = async (type: ToolView, force: boolean = false) => {
    setLoading(true);
    setError(null);
    setActiveToolView(type);
    
    let cacheKey = '';
    if (type === 'phone-news') cacheKey = CACHE_KEYS.PHONE_NEWS;
    else if (type === 'ai-directory') cacheKey = CACHE_KEYS.AI_TOOLS;

    const cached = (!force && cacheKey) ? getCachedData(cacheKey) : null;
    
    if (cached) {
      if (type === 'phone-news') {
        setPhoneNews(cached.smartphones || []);
        setCurrentPage(1);
      } else if (type === 'ai-directory') {
        setAiTools(cached.tools || []);
        setToolPage(1);
      }
      setLoading(false);
      return;
    }

    try {
      if (type === 'phone-news') {
        const allPhones = [...localPhonesDB].sort((a, b) => b.release_year - a.release_year);
        const mappedPhones = allPhones.map(mapLocalToDisplay);
        saveToCache(cacheKey, { smartphones: mappedPhones });
        setPhoneNews(mappedPhones);
        setCurrentPage(1);
      } else if (type === 'ai-directory') {
        const res = await fetch(`./ai-tools.json?t=${Date.now()}`);
        if (!res.ok) throw new Error("فشل تحميل دليل الأدوات");
        const data = await res.json();
        saveToCache(cacheKey, { tools: data.tools });
        setAiTools(data.tools);
        setToolPage(1);
      }
    } catch (err: any) {
      setError(err.message || "لا تتوفر بيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatsRequest = async () => {
     if (!statsQuery.trim()) return;
     setStatsLoading(true);
     setStatsResult(null);

     try {
       const result = await callGroqAPI(statsQuery, STATS_AI_PROMPT);
       if (result && result.charts && Array.isArray(result.charts)) {
         setStatsResult(result);
       } else {
         setError("لم أتمكن من توليد إحصائيات دقيقة لهذا السؤال.");
       }
     } catch (e) {
       setError("حدث خطأ أثناء تحليل البيانات.");
     } finally {
       setStatsLoading(false);
     }
  };

  // AI Tools Filtering
  const filteredTools = aiTools.filter(tool => 
    tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) || 
    tool.description.some(d => d.includes(toolSearchQuery)) ||
    tool.category.toLowerCase().includes(toolSearchQuery.toLowerCase())
  );
  
  const toolSuggestions = toolSearchQuery.length > 0 
    ? aiTools.filter(tool => tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) || tool.description.some(d => d.includes(toolSearchQuery))).slice(0, 5) 
    : [];

  // Pagination for Tools
  const indexOfLastTool = toolPage * toolsPerPage;
  const indexOfFirstTool = indexOfLastTool - toolsPerPage;
  const currentTools = filteredTools.slice(indexOfFirstTool, indexOfLastTool);
  const totalToolPages = Math.ceil(filteredTools.length / toolsPerPage);

  const nextToolPage = () => setToolPage(prev => Math.min(prev + 1, totalToolPages));
  const prevToolPage = () => setToolPage(prev => Math.max(prev - 1, 1));

  const titleStyle = "font-black text-white leading-none mb-3 whitespace-nowrap overflow-hidden text-[clamp(1rem,4vw,1.25rem)]";
  
  const ShareToolbar = ({ title, text, url }: { title: string, text: string, url: string }) => {
    const fullText = `${title}\n\n${text}\n\n🔗 ${url || 'techtouch-hub'}`;
    const handleShare = (platform: 'copy' | 'tg' | 'fb' | 'insta') => {
      if (platform === 'copy') { navigator.clipboard.writeText(fullText); alert('تم نسخ المحتوى!'); }
      else if (platform === 'tg') window.open(`https://t.me/share/url?url=${encodeURIComponent(url || 'https://t.me/techtouch7')}&text=${encodeURIComponent(fullText)}`, '_blank');
      else if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || 'https://t.me/techtouch7')}`, '_blank');
      else if (platform === 'insta') { navigator.clipboard.writeText(fullText); alert('تم نسخ النص للانستجرام'); window.open('https://instagram.com', '_blank'); }
    };
    return (
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-700/30">
        <button onClick={() => handleShare('copy')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors">
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ كامل المحتوى</span>
        </button>
        <div className="flex gap-2">
            <button onClick={() => handleShare('tg')} className="p-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 transition-colors" title="تيليكرام"><TelegramIcon className="w-4 h-4" /></button>
            <button onClick={() => handleShare('fb')} className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition-colors" title="فيسبوك"><Facebook className="w-4 h-4" /></button>
            <button onClick={() => handleShare('insta')} className="p-2 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 transition-colors" title="انستجرام"><Instagram className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const indexOfLastPhone = currentPage * itemsPerPage;
  const indexOfFirstPhone = indexOfLastPhone - itemsPerPage;
  const currentPhones = phoneNews.slice(indexOfFirstPhone, indexOfLastPhone);
  const totalPages = Math.ceil(phoneNews.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-sky-500/30 font-sans text-right pb-24" dir="rtl">
      
      <div className="fixed inset-0 pointer-events-none opacity-15 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
      </div>
      
      {error && (
        <div className="fixed top-20 left-4 right-4 z-[100] bg-rose-500/95 text-white p-4 rounded-2xl shadow-xl backdrop-blur-md animate-fade-in border border-rose-400/50 flex flex-col gap-2">
            <div className="flex items-start gap-3">
               <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
               <p className="text-sm font-bold leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="self-end text-xs bg-rose-700/50 px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors">إغلاق</button>
        </div>
      )}

      <div className="relative z-10 max-w-lg mx-auto px-4 min-h-screen flex flex-col">
        
        <main className="flex-grow py-2 animate-fade-in">
          
          {activeTab === 'home' && (
             <div className="space-y-3 pb-4">
                {/* Header Section - Moved inside Home tab, removed sticky, reduced sizes */}
                <div className="pt-8 pb-4 flex flex-col items-center justify-center -mx-4 px-4 mb-2">
                  <div className="flex flex-col items-center gap-2">
                     <div className="w-16 h-16 bg-slate-800 rounded-full border-2 border-sky-500/20 shadow-xl overflow-hidden shrink-0 p-0.5">
                        {profileConfig.image && !imageError ? (
                          <img src={profileConfig.image} alt="Profile" className="w-full h-full object-cover rounded-full" onError={() => setImageError(true)} />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-lg font-black text-sky-400">{profileConfig.initials}</span>
                        )}
                     </div>
                     <div className="text-center space-y-0.5">
                        <h1 className="text-xl font-black tracking-tighter text-white drop-shadow-md font-sans">Techtouch</h1>
                        <p className="text-[10px] text-sky-400 font-bold tracking-widest uppercase bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/10">كنان مجيد الصائغ</p>
                     </div>
                  </div>
                </div>

                {/* Channels Title Section */}
                <div className="flex items-center gap-2 mb-4 px-2 opacity-80">
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1"></div>
                    <span className="text-xs font-bold text-slate-400">قنواتي على التيليكرام</span>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1"></div>
                </div>

                {telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
                <SocialLinks links={socialLinks} />
             </div>
          )}
          
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in pt-6">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="space-y-6 text-right">
                  
                  <div className="flex flex-col gap-4">
                     <h3 className="text-lg font-bold text-sky-400 text-center">بخصوص بوت الطلبات على التيليكرام</h3>
                     <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-sky-500/25 group border border-white/10">
                       <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                       <span>الدخول لبوت الطلبات</span>
                     </a>
                  </div>
                   <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 text-sm space-y-3 leading-relaxed text-slate-300">
                     <p>✪ ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط.</p>
                     <p>✪ لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات.</p>
                     <p className="text-yellow-400 font-bold">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات.</p>
                  </div>
                  
                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-600/30 text-sm space-y-4">
                      <h4 className="font-bold text-sky-400 border-b border-slate-700 pb-2">طرق البحث المتاحة في قنوات المناقشات:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-slate-300">
                          <li>ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.</li>
                          <li>اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) بإسم مضبوط (مثلاً: كاب كات).</li>
                          <li>استخدم أمر البحث بكتابة كلمة "بحث" متبوع باسم التطبيق (مثلاً: بحث ياسين).</li>
                          <li>للاعلان في القناة تواصل من خلال البوت.</li>
                      </ol>
                      <p className="text-rose-400 font-bold text-xs pt-2">تنبيه: حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا.</p>
                  </div>

                </div>
              </div>
               {/* ... footer ... */}
               <div className="text-center pb-8 pt-6 space-y-2">
                 <p className="text-slate-400 text-sm font-bold">في النهاية دمتم برعاية الله</p>
                 <p className="text-slate-600 text-[10px] font-medium">{footerData.text} <a href={footerData.url} className="text-sky-500 hover:underline">@kinanmjeed</a></p>
              </div>
            </div>
          )}

          {activeTab === 'tools' && activeToolView === 'main' && (
            <div className="animate-fade-in pt-6">
               <div className="flex justify-center mb-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                     <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                     <span className="text-xs font-bold text-amber-400">قسم تجريبي</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => fetchToolData('ai-directory')} className="col-span-2 group p-6 bg-slate-800/40 border border-amber-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Command size={80} /></div>
                      <div className="relative z-10 flex flex-col items-start gap-3">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400"><Command className="w-7 h-7" /></div>
                        <div className="text-right w-full">
                           <h3 className="font-bold text-xl text-white truncate w-full">دليل أدوات AI</h3>
                           <p className="text-sm text-slate-400 truncate w-full">أكثر من 50 أداة (بحث فوري)</p>
                        </div>
                      </div>
                  </button>

                  <button onClick={() => fetchToolData('phone-news')} className="group p-5 bg-slate-800/40 border border-sky-500/30 rounded-3xl relative overflow-hidden hover:bg-slate-800/60 transition-all">
                     <div className="flex flex-col items-start gap-3">
                        <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400"><Smartphone className="w-5 h-5" /></div>
                        <div className="w-full text-right"><h3 className="font-bold text-base text-white truncate w-full">الهواتف</h3><p className="text-[10px] text-slate-400 truncate w-full">قاعدة بيانات موثوقة</p></div>
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
                           <h3 className="font-bold text-lg text-white truncate w-full">إحصائيات ذكية</h3>
                           <p className="text-xs text-slate-400 truncate w-full">تحليل بياني مدقق زمنياً</p>
                        </div>
                      </div>
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'tools' && activeToolView !== 'main' && (
             <div className="space-y-4 animate-slide-up pb-8 pt-6">
                <button onClick={() => { 
                    setActiveToolView('main'); setPhoneSearchResult(null); setStatsResult(null); setToolSearchQuery('');
                }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-2">
                   <ChevronLeft className="w-5 h-5" /> <span className="text-sm font-bold">رجوع</span>
                </button>

                {/* AI Tools Directory View */}
                {activeToolView === 'ai-directory' && (
                   <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="relative">
                         <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 focus-within:border-amber-500/50 transition-colors">
                            <Search className="w-5 h-5 text-slate-400 ml-3" />
                            <input 
                               type="text" 
                               value={toolSearchQuery}
                               onChange={(e) => {
                                   setToolSearchQuery(e.target.value);
                                   setToolPage(1); // Reset to first page on search
                               }}
                               placeholder="ابحث عن أداة ذكاء اصطناعي..."
                               className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-slate-500"
                            />
                            {toolSearchQuery && (
                                <button onClick={() => { setToolSearchQuery(''); setToolPage(1); }} className="p-1 hover:bg-slate-700 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
                            )}
                         </div>

                         {/* Autocomplete Suggestions */}
                         {toolSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl z-50 overflow-hidden">
                               {toolSuggestions.map(tool => (
                                  <button 
                                    key={tool.id}
                                    onClick={() => { setToolSearchQuery(tool.name); setToolPage(1); }}
                                    className="w-full text-right px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white border-b border-slate-700/30 last:border-0 transition-colors flex items-center justify-between group"
                                  >
                                     <span>{tool.name}</span>
                                     <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded group-hover:bg-slate-800 group-hover:text-amber-400 transition-colors">{tool.category}</span>
                                  </button>
                               ))}
                            </div>
                         )}
                      </div>

                      {/* Tools Grid */}
                      <div className="grid gap-4">
                         {currentTools.length > 0 ? (
                            currentTools.map(tool => (
                               <div key={tool.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                                   <div className="flex justify-between items-start mb-3">
                                      <div>
                                         <h3 className="font-black text-lg text-white mb-1 group-hover:text-amber-400 transition-colors">{tool.name}</h3>
                                         <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <span className="bg-slate-700/50 px-2 py-0.5 rounded">{tool.company}</span>
                                            <span className="opacity-50">•</span>
                                            <span>{tool.country}</span>
                                         </div>
                                      </div>
                                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg font-bold">
                                         {tool.category}
                                      </span>
                                   </div>

                                   <ul className="space-y-1.5 mb-4">
                                      {tool.description.map((line, idx) => (
                                         <li key={idx} className="text-xs text-slate-300 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-slate-600">
                                            {line}
                                         </li>
                                      ))}
                                   </ul>

                                   {tool.free_note && (
                                      <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold flex items-center gap-2">
                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                         {tool.free_note}
                                      </div>
                                   )}

                                   <a href={tool.official_url} target="_blank" className="flex items-center justify-center gap-2 w-full bg-slate-700/50 hover:bg-amber-600 hover:text-white text-slate-300 font-bold py-2.5 rounded-xl transition-all text-sm group-hover:shadow-lg group-hover:shadow-amber-900/20 mb-2">
                                      <span>زيارة الموقع الرسمي</span>
                                      <ExternalLink className="w-4 h-4" />
                                   </a>
                                   
                                   <ShareToolbar 
                                      title={tool.name} 
                                      text={`${tool.description.join('\n')}\n\n${tool.official_url}`} 
                                      url={tool.official_url} 
                                   />
                               </div>
                            ))
                         ) : (
                            <div className="text-center py-10 text-slate-500">
                               <p>لم يتم العثور على أداة بهذا الاسم.</p>
                            </div>
                         )}
                      </div>
                      
                      {/* Pagination Controls */}
                      {totalToolPages > 1 && (
                          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-700/50">
                             <button onClick={prevToolPage} disabled={toolPage === 1} className="p-2 rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                             <span className="text-xs font-bold text-slate-400">صفحة {toolPage} من {totalToolPages}</span>
                             <button onClick={nextToolPage} disabled={toolPage === totalToolPages} className="p-2 rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                          </div>
                      )}
                   </div>
                )}
                
                {/* Phone Search & News View - UNCHANGED logic, just layout context */}
                {activeToolView === 'phone-news' && (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                        <input type="text" value={phoneSearchQuery} onChange={(e)=>setPhoneSearchQuery(e.target.value)} placeholder="اكتب اسم الهاتف للبحث..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm focus:border-sky-500 outline-none h-12" />
                        <button onClick={handlePhoneSearch} className="bg-sky-500 text-white w-12 h-12 rounded-xl flex items-center justify-center">{searchLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}</button>
                        <button onClick={() => fetchToolData('phone-news', true)} className="bg-slate-800 hover:bg-slate-700 text-sky-400 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-700" title="اقتراح هواتف"><RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                     </div>
                     
                     {phoneSearchResult ? (
                        <div className="bg-slate-800/60 border border-sky-500/30 p-5 rounded-3xl animate-fade-in relative shadow-2xl">
                           <button onClick={() => setPhoneSearchResult(null)} className="absolute top-4 left-4 p-1 bg-slate-700/50 rounded-full text-slate-300 hover:text-white"><X className="w-4 h-4" /></button>
                           
                           <div className="mb-6 border-b border-slate-700/50 pb-4">
                             <h2 className={titleStyle}>{phoneSearchResult.phone_name}</h2>
                             <div className="flex items-center gap-3">
                               <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-xs font-bold">{phoneSearchResult.brand}</span>
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
                           <ShareToolbar title={phoneSearchResult.phone_name} text="مواصفات" url="" />
                        </div>
                     ) : (
                        <div className="space-y-3">
                           {currentPhones.map((phone, idx) => (
                              <div key={idx} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 hover:bg-slate-800/60 transition-all cursor-pointer group" onClick={() => setPhoneSearchResult(phone)}>
                                 <div className="flex justify-between items-center mb-2 overflow-hidden">
                                    <h3 className="font-bold text-white text-base">{phone.phone_name}</h3>
                                    <button className="flex items-center gap-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
                                      <Eye className="w-3.5 h-3.5" />
                                      عرض التفاصيل
                                    </button>
                                 </div>
                              </div>
                           ))}

                           {totalPages > 1 && (
                              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-700/50">
                                 <button onClick={prevPage} disabled={currentPage === 1} className="p-2 rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                                 <span className="text-xs font-bold text-slate-400">صفحة {currentPage} من {totalPages}</span>
                                 <button onClick={nextPage} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
                )}

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
                                      <div className="text-left pl-1 text-slate-300">{point.phone1_val}</div>
                                      <div className="bg-slate-900 px-2 py-1 rounded text-[10px] text-slate-500 font-bold">{point.feature}</div>
                                      <div className="text-right pr-1 text-slate-300">{point.phone2_val}</div>
                                  </div>
                               ))}
                            </div>
                            <div className="mt-6 bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-xl">
                               <h5 className="font-bold text-emerald-500 mb-2 text-sm">الخلاصة:</h5>
                               <p className="text-xs text-slate-200 leading-relaxed">{comparisonResult.verdict}</p>
                            </div>
                            <ShareToolbar title={`مقارنة: ${comparisonResult.phone1_name} vs ${comparisonResult.phone2_name}`} text={comparisonResult.verdict} url="" />
                         </div>
                      )}
                   </div>
                )}

                {activeToolView === 'stats' && (
                   <div className="space-y-4">
                      <div className="flex gap-2">
                        <input value={statsQuery} onChange={e=>setStatsQuery(e.target.value)} placeholder="مثال: عدد سكان العالم سنة 2030..." className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm outline-none" />
                        <button onClick={handleStatsRequest} className="bg-pink-500 text-white p-3 rounded-xl">{statsLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <PieChart className="w-5 h-5"/>}</button>
                      </div>
                      
                      {statsResult && (
                         <div className="space-y-4 animate-fade-in">
                            <div className="bg-slate-800/40 p-3 rounded-xl border border-pink-500/10">
                               <p className="text-sm font-bold text-pink-300 text-center">{statsResult.main_insight}</p>
                            </div>
                            
                            {statsResult.charts.map((chart, chartIndex) => (
                              <div key={chartIndex} className="bg-slate-800/40 p-4 rounded-2xl border border-pink-500/20 shadow-lg">
                                  <h3 className="font-bold text-white mb-2 truncate">{chart.title}</h3>
                                  <p className="text-xs text-slate-400 mb-4">{chart.description}</p>
                                  
                                  {chart.data.map((d,i)=>(
                                    <div key={i} className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className="text-slate-300 truncate max-w-[70%]">{d.label}</span>
                                          <span className="text-pink-400 font-bold">{d.displayValue}</span>
                                        </div>
                                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                          <div style={{width: `${Math.min(d.value, 100)}%`, backgroundColor: d.color || '#ec4899'}} className="h-full rounded-full transition-all duration-1000"/>
                                        </div>
                                    </div>
                                  ))}
                              </div>
                            ))}
                            <ShareToolbar title="إحصائيات Techtouch" text={statsResult.main_insight} url="" />
                         </div>
                      )}
                   </div>
                )}
             </div>
          )}

        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 pb-safe z-50 h-[80px] px-6 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center h-full max-w-lg mx-auto">
           <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'home' ? 'text-sky-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'home' ? 'bg-sky-500/10' : ''}`}><Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-sky-500/20' : ''}`} /></div><span className="text-[10px] font-bold">الرئيسية</span>
           </button>
           <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'tools' ? 'text-violet-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'tools' ? 'bg-violet-500/10' : ''}`}><Wrench className={`w-6 h-6 ${activeTab === 'tools' ? 'fill-violet-500/20' : ''}`} /></div><span className="text-[10px] font-bold">الأدوات</span>
           </button>
           <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-all duration-300 ${activeTab === 'info' ? 'text-emerald-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'info' ? 'bg-emerald-500/10' : ''}`}><Info className={`w-6 h-6 ${activeTab === 'info' ? 'fill-emerald-500/20' : ''}`} /></div><span className="text-[10px] font-bold">معلومات</span>
           </button>
        </div>
      </nav>

      {showInstallBanner && (
        <div className="fixed bottom-[90px] left-4 right-4 z-[100] animate-slide-up">
          <div className="bg-gradient-to-r from-sky-900/90 to-slate-900/90 border border-sky-500/30 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20"><Download className="w-6 h-6 text-white" /></div>
              <div className="text-right"><h3 className="font-bold text-sm text-white">تثبيت التطبيق</h3><p className="text-[10px] text-sky-200">أضف للشاشة الرئيسية</p></div>
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
