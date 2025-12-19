import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, ExternalLink,
  Copy,
  Facebook, BadgeCheck,
  DollarSign, ThumbsUp, ThumbsDown, CheckCircle2,
  Download, X
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_v45',
  PHONE_NEWS: 'techtouch_phones_v45'
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
      // Cache valid for 6 hours
      return (Date.now() - timestamp < 6 * 60 * 60 * 1000) ? data : null;
    } catch (e) { return null; }
  };

  const saveToCache = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  };

  // --- Backend Logic Simulation ---
  const callGroqAPI = async (prompt: string, systemInstruction: string) => {
    const apiKey = process.env.API_KEY; 
    
    if (!apiKey) throw new Error("مفتاح API غير متوفر (VITE_GROQ_API_KEY).");

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
        response_format: { type: "json_object" },
        temperature: 0.1 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`خطأ في الاتصال بخوادم Groq: ${response.status} ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch (e) {
      throw new Error("فشل في تحليل استجابة JSON من Groq.");
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
      // --- STRICT SYSTEM INSTRUCTION (UPDATED) ---
      const baseSystemInstruction = `You are an AI system acting as a professional technical editor for the website "Techtouch".

Your task is to fetch, verify, organize, and present technology content that is 100% accurate,
strictly sourced from official websites only, with zero speculative or generative content.

You must NEVER rely on:
- General knowledge
- Assumptions
- AI-generated summaries
- Unofficial news sites
- Tech blogs, forums, or leaks

================================================
PHASE 1: DATE DETERMINATION (MANDATORY)
================================================

Before performing ANY action:

1. Determine the actual current system date.
2. Lock it as the only temporal reference.

Current date = {{TODAY_DATE}}

❗ No further steps are allowed before this date is fixed.

================================================
PHASE 2: GLOBAL RULES (APPLY TO ALL SECTIONS)
================================================

1. Absolutely forbidden:
   - Fabricating news or specifications
   - Guessing versions or release dates
   - Using non-official or secondary sources
   - Using content outside the allowed time window

2. Every item MUST:
   - Come from an official website only
   - Have a direct, valid official URL

3. Any item without a valid official link → REJECT.

4. Sort all content from newest to oldest.

5. If no valid content exists:
   - Output an empty array []
   - Do NOT create placeholders or alternatives.

================================================
SECTION HEADER DEFINITIONS (STATIC UI CONTENT)
================================================

These titles and descriptions are FIXED and must appear exactly as written:

1. Title: "أخبار الذكاء الاصطناعي"
   Description: "آخر التحديثات والنماذج الجديدة"

2. Title: "عالم الهواتف"
   Description: "أحدث الأجهزة والمواصفات"

3. Title: "مقارنة تقنية"
   Description: "قارن بين أي جهازين بالتفصيل"

❗ Titles must be one line only.
❗ Descriptions must be one line only.

================================================
SECTION 1: AI NEWS
(Official AI Events and Releases Only)
================================================

⏱ Time Window:
- Content must be published within the last **12 months**
- Calculated backward from {{TODAY_DATE}}
- Anything older → REJECT.

📌 Allowed Sources (official only):
- OpenAI
- Google / DeepMind
- Meta
- Microsoft
- NVIDIA
- Anthropic
- Amazon
- Apple
- IBM
- Hugging Face (official blog only)

❌ Not allowed:
- News aggregators
- Tech journalism sites
- AI-generated explanations
- Wikipedia

📊 Quantity:
- Exactly 10 items (if fewer exist, show fewer without compensation)

📄 Each AI news item MUST include:
1. Title (1–2 lines max, includes exact tool name + exact version number)
2. Content (5–6 lines):
   - What was announced
   - What changed
   - Official announcement date
   - Who it is available for
3. One official link only (announcement or release page)
4. Interaction buttons (small size):
   - Facebook share
   - Instagram share
   - Telegram share
   - Copy full post
   - Official website button

If the tool version is NOT explicitly stated on the official site → REJECT the item.

================================================
SECTION 2: PHONE WORLD
================================================

⏱ Time Window:
- Devices released or officially announced within the **last 12 months**
- Calculated from {{TODAY_DATE}}

📊 Quantity:
- Up to 10 devices only

📱 Each smartphone entry MUST include:

1. Title:
   - Phone name only

2. Basic Info:
   - Brand
   - Official release date

3. Full detailed specifications (Arabic only):
   - Networks
   - Dimensions
   - Weight
   - Materials
   - Water/Dust resistance
   - Display
   - Processor
   - GPU
   - RAM & Storage
   - Rear cameras
   - Front camera
   - Video
   - Battery & charging
   - Operating system
   - Connectivity
   - Sensors
   - Available colors

4. Price:
   - USD
   - From an official store or trusted Iraqi retailer
   - Add note if price is approximate

5. Pros (Arabic):
   - Clear, short bullet points

6. Cons (Arabic):
   - Clear, factual bullet points

🔤 Language Rules:
- Arabic only for descriptions and specifications
- English allowed only for brand names and chip names

📌 End of smartphone section:
- Existing statistics must remain unchanged.

================================================
SECTION 3: TECHNICAL COMPARISON
================================================

- This section remains EXACTLY as previously defined.
- No logic changes.
- No additional content generation.

================================================
WEB SEARCH REQUIREMENT (MANDATORY)
================================================

You MUST actively search the web before generating any content.

You are NOT allowed to:
- Rely on internal knowledge
- Reuse previous answers
- Infer updates without verification

------------------------------------------------
ANTI-FABRICATION GUARANTEE
------------------------------------------------

You must behave as a verification system, not a writer.

If web search results are:
- Incomplete
- Contradictory
- Unclear
- Based on rumors

→ Output an empty array [] for that section.

------------------------------------------------
FINAL RULE
------------------------------------------------

Accuracy > Quantity

It is ALWAYS acceptable to show fewer items or no items
if and only if verified web-based official data is not available.

================================================
FINAL OUTPUT FORMAT (STRICT)
================================================

Return JSON only. No explanations.

{
  "current_date": "{{TODAY_DATE}}",

  "ai_news": [
    {
      "title": "",
      "content": [],
      "official_link": "",
      "share_buttons": {
        "facebook": true,
        "instagram": true,
        "telegram": true,
        "copy": true,
        "official_site": true
      }
    }
  ],

  "best_smartphones": [
    {
      "phone_name": "",
      "brand": "",
      "release_date": "",
      "full_specifications": {},
      "price_usd": "",
      "price_note": "",
      "price_source": "",
      "pros": [],
      "cons": []
    }
  ]
}

Any item that:
- Is outside the 12-month window
- Lacks a valid official source
- Does not explicitly confirm version or release
→ MUST be rejected and not shown.`;

      const systemInstruction = baseSystemInstruction.replace('{{TODAY_DATE}}', todayStr);
      let userPrompt = "";
      
      if (type === 'ai-news') {
        userPrompt = `Execute Section 1: AI News. Return JSON with key "ai_news".`;
      } else if (type === 'phone-news') {
        userPrompt = `Execute Section 2: Best Smartphones (Latest releases / Phone World). Return JSON with key "best_smartphones".`;
      }

      const result = await callGroqAPI(userPrompt, systemInstruction);
      
      // Map result to app state structure
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

  const handleComparePhones = async () => {
    if (!phone1 || !phone2) return;
    setLoading(true);
    setError(null);
    try {
      const system = "أنت خبير تقني. الرد JSON فقط.";
      const prompt = `قارن بين ${phone1} و ${phone2}.
      JSON Format Required:
      {
        "specs": [{"feature": "string", "phone1": "string", "phone2": "string"}],
        "betterPhone": "string",
        "verdict": "string"
      }`;
      
      const result = await callGroqAPI(prompt, system);
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
            </div>
          )}

          {activeTab === 'tools' && activeToolView !== 'main' && (
             <div className="space-y-4 animate-slide-up">
                <button 
                  onClick={() => setActiveToolView('main')}
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
                      <button onClick={() => fetchToolData(activeToolView, true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <ArrowRight className={`w-4 h-4 rotate-180 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

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
                           
                           {/* Specs Grid */}
                           <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-900/30 p-3 rounded-xl">
                              {Object.entries(phone.specifications || {}).slice(0, 6).map(([key, val], k) => (
                                <div key={k} className="flex flex-col">
                                   <span className="text-[10px] text-slate-500">{key}</span>
                                   <span className="text-xs text-slate-300 font-medium truncate">{String(val)}</span>
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
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                          <table className="w-full text-xs sm:text-sm">
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