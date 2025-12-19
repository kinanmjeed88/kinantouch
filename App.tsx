import React, { useState, useEffect } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, ExternalLink,
  Copy,
  MessageCircle, Facebook, BadgeCheck, Zap,
  ShieldCheck, DollarSign, ThumbsUp, ThumbsDown, CheckCircle2,
  Download, Star, X
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news' | 'best-phones';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_v45',
  PHONE_NEWS: 'techtouch_phones_v45',
  BEST_PHONES: 'techtouch_best_v45'
};

const App: React.FC = () => {
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeToolView, setActiveToolView] = useState<ToolView>('main');
  
  const [aiNews, setAiNews] = useState<AINewsItem[]>([]);
  const [phoneNews, setPhoneNews] = useState<PhoneNewsItem[]>([]);
  const [bestPhones, setBestPhones] = useState<PhoneNewsItem[]>([]); 
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
    else if (type === 'best-phones') cacheKey = CACHE_KEYS.BEST_PHONES;

    const cached = (!force && cacheKey) ? getCachedData(cacheKey) : null;

    if (cached) {
      if (type === 'ai-news') setAiNews(cached.ai_news || []);
      else if (type === 'phone-news') setPhoneNews(cached.smartphones || []);
      else if (type === 'best-phones') setBestPhones(cached.smartphones || []);
      setLoading(false);
      return;
    }

    try {
      // --- STRICT SYSTEM INSTRUCTION (MANDATORY COMPLIANCE) ---
      const baseSystemInstruction = `You are an AI assistant acting as a professional technology editor for the website “Techtouch”.

Your role is to organize, validate, and present technology content that is 100% accurate and sourced ONLY from official websites using tools like browse_page or web_search.
You are NOT allowed to generate, infer, estimate, or invent any information.
You are a formatter and verifier ONLY, not a source of facts.

================================================
PHASE 1: DATE DETERMINATION (MANDATORY)
================================================

Before performing any action:

1. Determine the actual system date.
2. Fix it as the single authoritative reference date.
3. Store it as a constant value.

Current date = {{TODAY_DATE}}

No further step is allowed before fixing this date.

================================================
PHASE 2: UPDATE LOGIC
================================================

- Content must be refreshed automatically every 6 hours by using browse_page or web_search tools to fetch latest data from official sources.
- Between refresh cycles:
  - All content remains static.
- On manual refresh or if data is older than 6 hours:
  - Re-execute the entire prompt from Phase 1, calling tools to update ai_news and smartphones sections.
- If no valid content exists or tool calls fail:
  - Output empty arrays []
  - Do NOT generate replacements or filler content.

================================================
GLOBAL RULES (APPLY TO ALL SECTIONS)
================================================

1. It is strictly forbidden to:
   - Invent news, versions, or specifications
   - Modify dates to make old content look recent
   - Use model knowledge or assumptions
   - Use non-official or secondary sources
   - Use content outside the defined time range

2. All information MUST:
   - Exist verbatim on an official website, fetched via tools
   - Be directly related to the specific product or update
   - Be translated to Arabic for specifications if original is English (use exact terms, no inference)

3. Any item without a valid official direct link fetched via tool → REJECT.

4. Sorting is always from newest to oldest based on tool-fetched dates.

5. For Arabic translations: Use standard Arabic for specs (e.g., "الشاشة" for display), but keep technical terms in English if standard (e.g., "Snapdragon 8 Gen 4").

================================================
OFFICIAL SOURCE MATCHING RULE (CRITICAL)
================================================

1. The official website is the single source of truth. Use browse_page to fetch and verify.
2. A news item is valid ONLY if it exists verbatim on the official site.

3. The following must match exactly with the official page:
   - Title
   - Product or model name
   - Version number
   - Announcement date
   - Content meaning

4. If there is:
   - Any mismatch in version number
   - Any mismatch in product name
   - Any mismatch in date
   - Or the content cannot be found on the official site via tool

   → Reject the item completely.

5. AI is NOT allowed to:
   - Confirm news validity
   - Infer versions
   - Fill missing details

6. If no full match exists:
   - Output []
   - Do not create alternative news.

================================================
SECTION 1: ARTIFICIAL INTELLIGENCE NEWS
================================================

Timeframe:
- Only news from the last 5 months relative to {{TODAY_DATE}}.
- Anything older → REJECT.

Mandatory condition:
- The title MUST include:
  Product name + explicit official version number.

Examples of ACCEPTED titles:
- ChatGPT 4.5
- Gemini 1.5 Pro
- Claude 3.5 Sonnet
- LLaMA 3 70B

Examples of REJECTED titles:
- Google AI 3.1
- Microsoft AI Update
- NVIDIA AI 1.9
- AWS AI Platform

Official sources ONLY (fetch via browse_page):
- https://openai.com/news
- https://platform.openai.com/docs/release-notes
- https://blog.google/technology/ai
- https://deepmind.google/discover/blog
- https://www.anthropic.com/news
- https://ai.meta.com/blog
- https://www.microsoft.com/ai/blog
- https://learn.microsoft.com/azure/ai-services
- https://www.nvidia.com/ai-data-science/blog
- https://aws.amazon.com/blogs/machine-learning

Quantity:
- Exactly 10 items maximum, fetched and verified via parallel tool calls.

Each item must include:
- Large title (1–2 lines max)
- 5–6 factual lines describing the update (verbatim from tool fetch)
- ONE official link only
- Small interaction buttons:
  Facebook, Instagram, Telegram, Copy, Official Site

================================================
SECTION 2: SMARTPHONE WORLD (CURRENT YEAR ONLY)
================================================

A smartphone is considered valid ONLY if ALL conditions apply:
1. Official release year == current year (fetched via tool)
2. Processor belongs to the current generation (e.g., Snapdragon 8 Gen 4, A19, etc.)
3. OS is modern:
   - Android 15+ OR iOS 18+

Changing the date alone does NOT make a phone modern.

Quantity:
- Exactly 10 smartphones maximum, fetched via browse_page.

Official sources by brand ONLY (fetch via browse_page):

Samsung:
- https://news.samsung.com/global
- https://www.samsung.com/global/galaxy

Apple:
- https://www.apple.com/newsroom
- https://www.apple.com/iphone

Google:
- https://blog.google/products/pixel
- https://store.google.com/category/phones

Xiaomi:
- https://www.mi.com/global/news
- https://www.mi.com/global/phone

Oppo:
- https://www.oppo.com/en/newsroom

Vivo:
- https://www.vivo.com/en/about-vivo/news

Huawei:
- https://consumer.huawei.com/global/news

Honor:
- https://www.hihonor.com/global/news

Phone post structure:
- Title: Phone name only
- Brand
- Official release date

Specifications (Arabic language only, translated from fetched data):
- الشبكات
- الأبعاد
- الوزن
- المواد
- مقاومة الماء/الغبار
- الشاشة
- المعالج
- معالج الرسوميات
- الذاكرة والتخزين
- الكاميرات
- الفيديو
- البطارية والشحن
- نظام التشغيل
- الاتصال
- المستشعرات
- الألوان

Price:
- USD only, fetched from official source or trusted Iraqi retailer (e.g., via web_search site:iraqimarket.com if official)
- Mandatory note:
  "The price is approximate and may vary depending on the Iraqi market and storage option." (translated to Arabic if needed)

Pros:
- Short, clear bullet points (Arabic, fetched or summarized verbatim)

Cons:
- Short, objective bullet points (Arabic, fetched or summarized verbatim)

Link:
- Official specification page ONLY

End of section:
- Existing statistics remain unchanged.

================================================
SECTION 3: TECHNICAL COMPARISON
================================================

- No changes allowed
- No additional content generation
- Existing logic remains intact

================================================
SECTION 4: BEST SMARTPHONES OF THE CURRENT YEAR (SPECIAL RULE)
================================================

When a user explicitly asks for:
"Best smartphones of the current year"

Follow these EXACT steps:

1. Assume the current year is 2025 unless stated otherwise.
   Reference date: December 19, 2025.

2. Fetch data using tools ONLY:
   - web_search query:
     "best smartphones 2025 list"
     with num_results = 20
   - Use browse_page on top URLs to extract details.

3. Optionally use browse_page on specific URLs to extract:
   - Models
   - Brands
   - Ratings
   - Key features

4. Analyze ONLY reliable sources:
   - PCMag
   - CNET
   - GSMArena
   - Tom’s Guide
   - What Hi-Fi
   - TechAdvisor
   - NotebookCheck
   - Reddit (user insights only)
   - YouTube (review consensus, not opinions)
   - UL Benchmarks

5. Processing rules:
   - Remove duplicates
   - Normalize regional model names
   - Rank top 10 by consensus (mentions + ratings from fetched data)

6. Presentation:
   - Start with a numbered Top 10 list
   - Include brief reasons for ranking (verbatim from sources)
   - Use inline citations after each phone:
     [web:citation_id]

7. Notes:
   - Rankings are review-based and subjective
   - Suggest category-specific requests if needed

8. Do NOT invent rankings or phones.
   All data must come from fetched sources.

================================================
UI / UX RULES
================================================

- Share icons must be small and responsive
- No element may overflow container boundaries
- No horizontal overflow is allowed

================================================
FINAL OUTPUT FORMAT
================================================

Output JSON only, no additional text:

{
  "current_date": "{{TODAY_DATE}}",
  "ai_news": [array of items],
  "smartphones": [array of items]
}

Any item that:
- Does not fully match the official source
- Lacks a direct official link
- Has an unverified version number
- Is not truly current-year hardware

→ MUST BE REJECTED.`;

      const systemInstruction = baseSystemInstruction.replace('{{TODAY_DATE}}', todayStr);
      let userPrompt = "";
      
      if (type === 'ai-news') {
        userPrompt = `Execute Phase 2: Update AI News (Section 1). Return JSON.`;
      } else if (type === 'phone-news') {
        userPrompt = `Execute Phase 2: Update Smartphone World (Section 2). Return JSON.`;
      } else if (type === 'best-phones') {
        userPrompt = `Execute Section 4: Best Smartphones of the Current Year (2025). Return JSON with key "smartphones".`;
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
      } else if ((type === 'phone-news' || type === 'best-phones') && result.smartphones) {
        const mappedPhones = result.smartphones.map((item: any) => ({
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
        if (type === 'phone-news') setPhoneNews(mappedPhones);
        else setBestPhones(mappedPhones);
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
        <div className="fixed top-4 left-4 right-4 z-[100] bg-rose-500/90 text-white p-3 rounded-xl text-center shadow-lg backdrop-blur-md animate-fade-in border border-rose-400/50">
            <p className="text-sm font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </p>
            <button onClick={() => setError(null)} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/70 hover:text-white p-1">
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
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 text-sky-400 mb-6 border-b border-slate-700/50 pb-4 overflow-hidden">
                  <MessageCircle className="w-6 h-6 shrink-0" />
                  <h2 className="font-black text-sm sm:text-base uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">بوت الطلبات على التيليكرام</h2>
                </div>
                
                <div className="space-y-5">
                  <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-3 w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-sky-500/20 group">
                    <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    <span>تشغيل البوت</span>
                  </a>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-center">
                       <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                       <span className="text-xs font-bold text-slate-300">رد سريع</span>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-center">
                       <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                       <span className="text-xs font-bold text-slate-300">آمن 100%</span>
                    </div>
                  </div>
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
                onClick={() => fetchToolData('best-phones')}
                className="group relative p-6 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden transition-all hover:bg-slate-700/60"
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative flex items-center gap-4">
                   <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400">
                     <Star className="w-6 h-6" />
                   </div>
                   <div className="text-right">
                     <h3 className="font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors">أفضل هواتف السنة</h3>
                     <p className="text-xs text-slate-400">قائمة بأقوى الهواتف لعام 2025</p>
                   </div>
                   <ArrowRight className="mr-auto text-slate-500 group-hover:text-amber-400 group-hover:-translate-x-1 transition-all" />
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

                {/* --- Phone News & Best Phones View --- */}
                {(activeToolView === 'phone-news' || activeToolView === 'best-phones') && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-sky-400 flex items-center gap-2">
                        {activeToolView === 'best-phones' ? <Star className="w-6 h-6 text-amber-400" /> : <Smartphone className="w-6 h-6" />}
                        {activeToolView === 'best-phones' ? 'أفضل الهواتف 2025' : 'عالم الهواتف الذكية'}
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
                    ) : (activeToolView === 'best-phones' ? bestPhones : phoneNews).length > 0 ? (
                       (activeToolView === 'best-phones' ? bestPhones : phoneNews).map((phone, idx) => (
                         <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm overflow-hidden relative">
                           {activeToolView === 'best-phones' && (
                             <div className="absolute top-0 left-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-br-xl shadow-lg z-10">#{idx + 1}</div>
                           )}
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