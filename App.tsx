
import React, { useState } from 'react';
import { telegramChannels, socialLinks, footerData, profileConfig } from './data/content';
import { ChannelCard } from './components/ChannelCard';
import { SocialLinks } from './components/SocialLinks';
import { 
  Home, Info, 
  Wrench, Cpu, Smartphone, ArrowRight, Loader2, ChevronLeft, 
  AlertCircle, Send, Search, ExternalLink,
  Copy, TrendingUp,
  MessageCircle, Facebook, Instagram, BadgeCheck, Zap,
  ShieldCheck, DollarSign, ThumbsUp, ThumbsDown, CheckCircle2
} from 'lucide-react';
import { AINewsItem, PhoneComparisonResult, PhoneNewsItem } from './types';

type TabType = 'home' | 'info' | 'tools';
type ToolView = 'main' | 'ai-news' | 'comparison' | 'phone-news';

const CACHE_KEYS = {
  AI_NEWS: 'techtouch_ai_v43', // Updated version for strict source rules
  PHONE_NEWS: 'techtouch_phones_v43'
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

  const todayStr = new Date().toISOString().split('T')[0];

  const getCachedData = (key: string) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    try {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 6 hours as requested
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
        temperature: 0.1 // Low temperature for strict factual accuracy
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
    
    const cacheKey = type === 'ai-news' ? CACHE_KEYS.AI_NEWS : CACHE_KEYS.PHONE_NEWS;
    const cached = !force ? getCachedData(cacheKey) : null;

    if (cached) {
      if (type === 'ai-news') setAiNews(cached.ai_news || []);
      else if (type === 'phone-news') setPhoneNews(cached.smartphones || []);
      setLoading(false);
      return;
    }

    try {
      // --- STRICT SYSTEM INSTRUCTION (BACKEND LOGIC) ---
      const systemInstruction = `أنت نظام ذكاء اصطناعي يعمل كمحرر تقني احترافي لموقع Techtouch.
مهمتك جلب وتنظيم محتوى تقني موثوق 100% فقط من مصادر رسمية مباشرة،
دون أي توليد تخميني أو اعتماد على معرفة عامة أو ذكاء اصطناعي آخر.
أنت منسق ومراجع فقط ولست مصدراً للمعلومة.

================================================
المرحلة الأولى: تحديد التاريخ (إلزامي)
================================================

قبل أي جلب أو تحليل أو إخراج:
1. حدّد التاريخ الحالي الفعلي للنظام.
2. اعتمده كمرجع زمني صارم.
3. خزّن التاريخ في متغير ثابت.

التاريخ الحالي = ${todayStr}

يُمنع تنفيذ أي خطوة لاحقة قبل تثبيت هذا التاريخ.

================================================
القواعد العامة (تنطبق على كل الأقسام)
================================================

1. يُمنع منعاً باتاً:
   - اختلاق معلومات
   - تعديل تواريخ لإظهار محتوى قديم كحديث
   - استخدام معرفة النموذج
   - استخدام مصادر غير رسمية
   - استخدام أخبار خارج الإطار الزمني

2. جميع البيانات يجب أن تكون:
   - من مواقع رسمية فقط
   - مرتبطة مباشرة بالخبر أو الهاتف أو الأداة

3. أي عنصر:
   - بلا رابط رسمي مباشر
   - أو برابط عام غير مخصص للتحديث
   → يُرفض فوراً.

4. الترتيب دائماً من الأحدث إلى الأقدم.

5. عند عدم توفر محتوى صالح:
   - أخرج [] فقط
   - دون إنشاء محتوى بديل.

================================================
القسم الأول: أخبار الذكاء الاصطناعي
================================================

الإطار الزمني:
- آخر 5 أشهر فقط محسوبة من ${todayStr}
- أي خبر أقدم يُرفض.

شرط إلزامي:
- يجب أن يحتوي العنوان على:
  اسم الأداة + رقم الإصدار الصريح
  (مثال: ChatGPT 5.2 – Gemini 3.0 – Claude 3.5)

أي خبر بدون رقم إصدار → مرفوض.

المصادر الرسمية المعتمدة فقط:
- openai.com/news
- platform.openai.com/docs/release-notes
- blog.google/technology/ai
- deepmind.google/discover/blog
- anthropic.com/news
- ai.meta.com/blog
- microsoft.com/ai/blog
- learn.microsoft.com/azure/ai-services
- nvidia.com/ai-data-science/blog
- aws.amazon.com/blogs/machine-learning

عدد المنشورات:
- 10 فقط

تنسيق كل منشور (JSON):
- title: عنوان كبير (اسم الاداة + الاصدار)
- content: مصفوفة نصوص 5-6 أسطر عربية
- official_link: رابط رسمي واحد فقط

================================================
القسم الثاني: عالم الهواتف الذكية
================================================

شرط الحداثة (إلزامي):
لا يُعرض الهاتف إلا إذا:
- الإطلاق في السنة الحالية فقط
- المعالج من جيل السنة الحالية
- النظام: Android 15+ أو iOS 18+

تغيير التاريخ لا يجعل الهاتف حديثاً.

عدد الهواتف:
- 10 فقط

المصادر الرسمية حسب الشركة فقط:
- news.samsung.com/global
- apple.com/newsroom
- blog.google/products/pixel
- mi.com/global/news
- oppo.com/en/newsroom
- vivo.com/en/about-vivo/news
- consumer.huawei.com/global/news
- hihonor.com/global/news

تنسيق منشور الهاتف (JSON):
- phone_name: اسم الهاتف فقط
- brand: الشركة
- release_date: تاريخ الإطلاق
- full_specifications: كائن يحتوي المفاتيح العربية (الشبكات, الأبعاد, الوزن, الخامات, مقاومة الماء والغبار, الشاشة, المعالج, المعالج الرسومي, الذاكرة والتخزين, الكاميرات, الفيديو, البطارية والشحن, نظام التشغيل, الاتصال, المستشعرات, الألوان)
- price_usd: السعر بالدولار مع ملاحظة "السعر تقريبي وقد يختلف حسب السوق العراقي وسعة التخزين"
- official_link: صفحة المواصفات الرسمية
- pros: مصفوفة إيجابيات بالعربية
- cons: مصفوفة عيوب بالعربية

================================================
صيغة الإخراج النهائية
================================================

أخرج النتيجة بصيغة JSON فقط دون أي نص إضافي:

{
  "current_date": "${todayStr}",
  "ai_news": [
    { "title": "...", "content": ["...", "..."], "official_link": "..." }
  ],
  "smartphones": [
     { "phone_name": "...", "brand": "...", "release_date": "...", "full_specifications": {}, "price_usd": "...", "official_link": "...", "pros": [], "cons": [] }
  ]
}

أي عنصر خارج الإطار الزمني أو بلا رابط رسمي أو بلا رقم إصدار (AI) أو هاتف غير حديث فعلياً (نظام قديم) → يُرفض ولا يُعرض.`;

      let userPrompt = "";
      
      if (type === 'ai-news') {
        userPrompt = `نفذ التعليمات بدقة. استخرج أحدث 10 أخبار ذكاء اصطناعي (آخر 5 أشهر) من المصادر الرسمية فقط. تأكد من وجود رقم الإصدار في العنوان.`;
      } else if (type === 'phone-news') {
        userPrompt = `نفذ التعليمات بدقة. استخرج أحدث 10 هواتف ذكية (أندرويد 15+ أو iOS 18+) لسنة ${new Date().getFullYear()}.`;
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
      } else if (type === 'phone-news' && result.smartphones) {
        const mappedPhones = result.smartphones.map((item: any) => ({
          phone_name: item.phone_name,
          brand: item.brand,
          release_date: item.release_date,
          specifications: item.full_specifications || {},
          price_usd: item.price_usd,
          official_specs_link: item.official_link || '',
          iraqi_price_source: '', // Can be kept generic or added if prompt provides
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

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-8 min-h-screen flex flex-col">
        <header className="pt-12 pb-6 text-center">
          <div className="inline-block relative mb-6">
             <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full"></div>
             <div className="relative w-24 h-24 mx-auto bg-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                {profileConfig.image && !imageError ? (
                  <img src={profileConfig.image} alt="Profile" className="w-full h-full object-cover" onError={() => setImageError(true)} />
                ) : (
                  <span className="text-4xl font-black text-sky-400">{profileConfig.initials}</span>
                )}
             </div>
          </div>
          <h1 className="text-3xl font-black mb-1 tracking-tight">Techtouch</h1>
          <p className="text-slate-400 text-sm font-bold tracking-[0.2em] uppercase">كنان مجيد</p>

          <nav className="flex justify-center items-center gap-4 mt-8 px-4 py-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md shadow-lg">
            <button onClick={() => { setActiveTab('home'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Home className="w-5 h-5" /><span className="text-[9px] font-black">الرئيسية</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('info'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'info' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Info className="w-5 h-5" /><span className="text-[9px] font-black">معلومات</span></button>
            <div className="w-px h-6 bg-slate-700/50" />
            <button onClick={() => { setActiveTab('tools'); setActiveToolView('main'); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tools' ? 'text-sky-400 scale-110' : 'text-slate-500'}`}><Wrench className="w-5 h-5" /><span className="text-[9px] font-black">أدوات</span></button>
          </nav>
        </header>

        <main className="flex-grow py-4">
          {activeTab === 'home' && telegramChannels.map((ch, i) => <ChannelCard key={ch.id} channel={ch} index={i} />)}
          
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 text-sky-400 mb-6 border-b border-slate-700/50 pb-4 overflow-hidden">
                  <MessageCircle className="w-6 h-6 shrink-0" />
                  <h2 className="font-black text-sm sm:text-base uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">بوت الطلبات على التيليكرام</h2>
                </div>
                
                <div className="space-y-5">
                  <a href="https://t.me/techtouchAI_bot" target="_blank" className="flex items-center justify-center gap-3 w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95">
                    <Send className="w-4 h-4" />
                    <span className="text-[12px]">الدخول لبوت الطلبات</span>
                  </a>

                  <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-[11px] text-slate-200 font-bold leading-relaxed">
                    <p>✪ ارسل اسم التطبيق مع صورته او رابط التطبيق من متجر بلي فقط .</p>
                    <p>✪ لاتطلب كود تطبيقات مدفوعة ولا اكستريم ذني كل مايتوفر جديد مباشر انشر انته فقط تابع القنوات .</p>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <p className="text-emerald-400 text-[10px] font-black text-center">البوت مخصص للطلبات مو للدردشة عندك مشكلة او سؤال اكتب بالتعليقات</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-700/50">
                    <h3 className="text-sky-400 font-black text-[11px] uppercase">طرق البحث المتاحة في قنوات المناقشات:</h3>
                    <ul className="space-y-2 text-[10px] text-slate-400 font-bold leading-relaxed">
                      {[
                        "١. ابحث بالقناة من خلال زر البحث 🔍 واكتب اسم التطبيق بشكل صحيح.",
                        "٢. اكتب اسم التطبيق في التعليقات (داخل قنوات المناقشة) بإسم مضبوط.",
                        "٣. استخدم أمر البحث بكتابة كلمة \"بحث\" متبوع باسم التطبيق.",
                        "٤. للاعلان في القناة تواصل من خلال البوت"
                      ].map((item, i) => (
                        <li key={i} className="pr-2 border-r-2 border-slate-700">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-[10px] font-black text-center leading-relaxed">تنبيه: حظر البوت يؤدي لحظر تلقائي لحسابك ولا يمكن استقبال اي طلب حتى لو قمت بإزالة الحظر لاحقا</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="animate-fade-in">
              {activeToolView === 'main' ? (
                <div className="grid gap-3">
                  {[
                    { id: 'ai-news', icon: Cpu, color: 'indigo', title: 'أخبار الذكاء الاصطناعي', desc: 'أحداث وإصدارات تقنية موثقة' },
                    { id: 'phone-news', icon: Smartphone, color: 'sky', title: 'عالم الهواتف الذكية', desc: 'مواصفات كاملة وأسعار السنة الحالية' },
                    { id: 'comparison', icon: Search, color: 'slate', title: 'مقارنة فنية شاملة', desc: 'تحليل معمق ومفصل' }
                  ].map((tool) => (
                    <button key={tool.id} onClick={() => tool.id === 'comparison' ? setActiveToolView('comparison') : fetchToolData(tool.id as ToolView)} className="group flex items-center p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-700/60 transition-all shadow-md active:scale-95">
                      <div className={`w-8 h-8 bg-${tool.color}-500/10 rounded-lg flex items-center justify-center ml-3 shrink-0`}><tool.icon className={`w-4 h-4 text-${tool.color}-400`} /></div>
                      <div className="flex-grow text-right">
                        <div className="flex items-center gap-2">
                           <h3 className="text-[10px] font-black text-slate-100 group-hover:text-sky-400 transition-colors uppercase">{tool.title}</h3>
                        </div>
                        <p className="text-[8px] text-slate-500 mt-0.5 font-bold">{tool.desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180 text-slate-600 group-hover:text-sky-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setActiveToolView('main')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"><ChevronLeft className="w-4 h-4 rotate-180" /><span className="text-[10px] font-bold">الأدوات</span></button>
                    {!loading && activeToolView !== 'comparison' && <button onClick={() => fetchToolData(activeToolView, true)} className="text-[8px] text-sky-500 font-black border border-sky-500/20 px-3 py-1.5 rounded-xl">تحديث الآن</button>}
                  </div>

                  {loading ? (
                    <div className="py-24 flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                      <p className="text-[10px] text-slate-500 font-black animate-pulse">جاري التحقق من المصادر الرسمية والتاريخ المرجعي...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-10 bg-red-500/5 rounded-2xl border border-red-500/20 px-6">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-[10px] text-slate-300 font-bold leading-relaxed">{error}</p>
                    </div>
                  ) : activeToolView === 'ai-news' ? (
                    <div className="space-y-4">
                      {aiNews.length > 0 ? aiNews.map((n, i) => (
                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-[2rem] shadow-md border-r-4 border-r-indigo-500/50 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 bg-indigo-500/20 text-indigo-400 text-[7px] font-black px-3 py-1.5 rounded-br-2xl uppercase tracking-tighter flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {n.date}
                          </div>
                          <div className="mt-4 flex justify-between items-start mb-4 border-b border-slate-700/50 pb-3">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] bg-slate-700 text-sky-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">{n.tool_name || 'AI NEWS'}</span>
                              </div>
                              <h3 className="text-sm font-black text-slate-100 group-hover:text-sky-400 transition-colors">{n.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 text-[7px] text-emerald-500 font-black uppercase">
                              <BadgeCheck className="w-3 h-3" />
                              <span>حدث رسمي</span>
                            </div>
                          </div>
                          <div className="text-[12px] text-slate-300 mb-5 font-bold space-y-2 h-[100px] overflow-y-auto pr-1">
                            {n.summary.map((line, idx) => (
                              <p key={idx} className="flex items-start gap-2 leading-relaxed opacity-80">
                                <span className="w-1 h-1 bg-sky-500/40 rounded-full shrink-0 mt-1.5"></span>
                                {line}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-slate-700/50 flex-wrap gap-y-2">
                            <div className="flex gap-1.5 sm:gap-2">
                              <button onClick={() => shareContent(n, 'fb')} className="p-1.5 sm:p-2 bg-slate-700/40 text-blue-400 rounded-xl hover:bg-slate-700 transition-colors"><Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                              <button onClick={() => shareContent(n, 'insta')} className="p-1.5 sm:p-2 bg-slate-700/40 text-pink-400 rounded-xl hover:bg-slate-700 transition-colors"><Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                              <button onClick={() => shareContent(n, 'tg')} className="p-1.5 sm:p-2 bg-slate-700/40 text-sky-400 rounded-xl hover:bg-slate-700 transition-colors"><Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                              <button onClick={() => shareContent(n, 'copy')} className="p-1.5 sm:p-2 bg-slate-700/40 text-slate-200 rounded-xl hover:bg-slate-700 transition-colors"><Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                            </div>
                            <a href={n.official_link} target="_blank" className="text-[9px] text-indigo-400 font-black px-4 py-2.5 border border-indigo-500/30 rounded-2xl bg-indigo-500/5 flex items-center gap-2 hover:bg-indigo-500/10 transition-all">رابط الإعلان <ExternalLink className="w-3.5 h-3.5" /></a>
                          </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center opacity-40">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[11px] font-black">لا توجد أخبار ذكاء اصطناعي موثقة حالياً.</p>
                        </div>
                      )}
                    </div>
                  ) : activeToolView === 'phone-news' ? (
                    <div className="space-y-6">
                       {phoneNews.length > 0 ? phoneNews.map((phone, i) => (
                         <div key={i} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-[2.5rem] shadow-2xl border-r-4 border-r-sky-500/50 overflow-hidden relative group">
                            <div className="absolute top-0 left-0 bg-sky-500/20 text-sky-400 text-[8px] font-black px-4 py-2 rounded-br-[1.5rem] uppercase tracking-tighter z-10">إصدار رسمي {new Date().getFullYear()}</div>
                            
                            <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-5 mt-4">
                              <div className="flex flex-col">
                                <h3 className="text-xl font-black text-slate-100 group-hover:text-sky-400 transition-colors tracking-tight">{phone.phone_name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] bg-slate-900 text-sky-400 px-3 py-0.5 rounded-full font-black uppercase border border-sky-500/20">{phone.brand}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">{phone.release_date}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-xl">
                                  <DollarSign className="w-5 h-5" />
                                  <span>{phone.price_usd}</span>
                                </div>
                                <span className="text-[8px] text-slate-500 font-bold text-center leading-tight max-w-[100px]">السعر تقريبي</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-6">
                               {[
                                 { icon: Smartphone, label: 'الشاشة', key: 'display' },
                                 { icon: Cpu, label: 'المعالج', key: 'processor' },
                                 { icon: Zap, label: 'الذاكرة', key: 'memory' },
                                 { icon: ShieldCheck, label: 'البطارية', key: 'battery' },
                                 { icon: BadgeCheck, label: 'النظام', key: 'os' },
                                 { icon: Search, label: 'الألوان', key: 'colors' }
                               ].map((spec, idx) => (
                                 <div key={idx} className="bg-slate-900/60 p-3.5 rounded-[1.2rem] border border-slate-700/30 flex flex-col gap-1 transition-all group-hover:bg-slate-900/80">
                                   <div className="flex items-center gap-2 text-sky-400/80">
                                      <spec.icon className="w-4 h-4" />
                                      <span className="text-[11px] font-black uppercase tracking-widest">{spec.label}</span>
                                   </div>
                                   <div className="text-[12px] text-slate-200 font-bold leading-tight line-clamp-2">{phone.specifications[spec.key] || 'غير محدد'}</div>
                                 </div>
                               ))}
                            </div>

                            <div className="space-y-3 mb-6">
                               <div className="bg-slate-900/40 p-4 rounded-[1.2rem] border border-slate-700/30">
                                  <div className="text-sky-400/70 text-[11px] font-black uppercase mb-1.5 flex items-center gap-2 tracking-widest">الكاميرات والفيديو</div>
                                  <div className="text-[12px] text-slate-300 font-bold leading-relaxed">{phone.specifications.cameras || ''} • {phone.specifications.video || ''}</div>
                               </div>
                               <div className="bg-slate-900/40 p-4 rounded-[1.2rem] border border-slate-700/30">
                                  <div className="text-sky-400/70 text-[11px] font-black uppercase mb-1.5 flex items-center gap-2 tracking-widest">التصميم والاتصال</div>
                                  <div className="text-[12px] text-slate-300 font-bold leading-relaxed">{phone.specifications.dimensions || ''} • {phone.specifications.weight || ''} • {phone.specifications.connectivity || ''}</div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-900/20 rounded-[1.5rem] border border-slate-700/20">
                               <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-widest"><ThumbsUp className="w-4 h-4" /> المميزات</div>
                                  <ul className="space-y-1.5">
                                    {phone.pros.map((p, idx) => (
                                      <li key={idx} className="text-[11px] text-slate-300 font-bold flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500/60 shrink-0 mt-0.5" />
                                        <span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                               </div>
                               <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-red-400 text-[11px] font-black uppercase tracking-widest"><ThumbsDown className="w-4 h-4" /> العيوب</div>
                                  <ul className="space-y-1.5">
                                    {phone.cons.map((c, idx) => (
                                      <li key={idx} className="text-[11px] text-slate-300 font-bold flex items-start gap-2">
                                        <AlertCircle className="w-3 h-3 text-red-500/60 shrink-0 mt-0.5" />
                                        <span>{c}</span>
                                      </li>
                                    ))}
                                  </ul>
                               </div>
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-slate-700/50 flex-wrap gap-y-3">
                                <div className="flex gap-1.5 sm:gap-2">
                                  <button onClick={() => shareContent(phone, 'fb')} className="p-1.5 sm:p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-blue-400 hover:bg-blue-500/10 transition-colors"><Facebook className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                  <button onClick={() => shareContent(phone, 'insta')} className="p-1.5 sm:p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-pink-400 hover:bg-pink-500/10 transition-colors"><Instagram className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                  <button onClick={() => shareContent(phone, 'tg')} className="p-1.5 sm:p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-sky-400 hover:bg-sky-500/10 transition-colors"><Send className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                  <button onClick={() => shareContent(phone, 'copy')} className="p-1.5 sm:p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-2xl text-slate-200 hover:bg-slate-700 transition-colors"><Copy className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                </div>
                                <a href={phone.official_specs_link} target="_blank" className="text-[10px] text-sky-400 font-black px-4 sm:px-6 py-2.5 sm:py-3 border border-sky-500/30 rounded-[1.5rem] flex items-center gap-2.5 hover:bg-sky-500/10 transition-all shadow-xl shadow-sky-500/5">المواصفات <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></a>
                            </div>
                         </div>
                       )) : (
                        <div className="py-20 text-center opacity-40">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[11px] font-black">لا توجد هواتف موثقة صادرة في {new Date().getFullYear()}.</p>
                        </div>
                       )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-sky-400 mb-1"><Search className="w-4 h-4" /><h3 className="text-[11px] font-black uppercase tracking-widest">مقارنة فنية شاملة</h3></div>
                        <input type="text" placeholder="اسم الهاتف الأول" value={phone1} onChange={(e) => setPhone1(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <input type="text" placeholder="اسم الهاتف الثاني" value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-sky-500/50 font-bold" />
                        <button onClick={handleComparePhones} disabled={loading || !phone1 || !phone2} className="w-full bg-sky-500 text-white font-black py-4 rounded-xl text-[10px] shadow-lg shadow-sky-500/20 active:scale-95 transition-all">بدء المقارنة الذكية</button>
                      </div>
                      {comparisonResult && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                          <div className="overflow-x-auto h-[300px]">
                            <table className="w-full text-right text-[10px]">
                              <thead className="bg-slate-900/80 sticky top-0 z-20"><tr><th className="p-4 text-sky-400 border-b border-slate-700 font-black">المميزات</th><th className="p-4 border-b border-slate-700 font-black text-center">{phone1}</th><th className="p-4 border-b border-slate-700 font-black text-center">{phone2}</th></tr></thead>
                              <tbody className="divide-y divide-slate-700/30">
                                {comparisonResult.specs.map((s, i) => (
                                  <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-black text-slate-300 border-l border-slate-700/30">{s.feature}</td>
                                    <td className="p-4 text-slate-400 font-bold text-center">{s.phone1}</td>
                                    <td className="p-4 text-slate-400 font-bold text-center">{s.phone2}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-6 bg-emerald-500/10 border-t border-slate-700/50">
                            <p className="text-[11px] text-emerald-400 font-black mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> الخيار الأفضل: {comparisonResult.betterPhone}</p>
                            <p className="text-[10px] text-slate-300 leading-relaxed font-bold whitespace-pre-line">{comparisonResult.verdict}</p>
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

        <footer className="mt-10 pt-8 border-t border-slate-800/50 text-center">
           <SocialLinks links={socialLinks} />
           <div className="mt-8 pb-4">
             <a href={footerData.url} target="_blank" className="group inline-flex flex-col items-center">
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-60">تطوير وبرمجة</span>
               <span className="text-[12px] font-black text-slate-300 group-hover:text-sky-400 transition-colors tracking-tighter">{footerData.text}</span>
             </a>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
