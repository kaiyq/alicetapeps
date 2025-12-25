
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  TrendingUp,
  RefreshCw,
  Lock,
  Unlock,
  Target,
  Search,
  CheckCircle2,
  LayoutDashboard,
  ChevronRight,
  Award,
  Loader2,
  AlertCircle,
  Database,
  Trash2,
  User,
  ExternalLink,
  BarChart3,
  HelpCircle,
  Info,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';

// ============================================================
// 🎯 核心配置 (建议在管理端动态配置)
// ============================================================
const DEFAULT_CONFIG = {
  apiKey: "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", 
  dbId: "2d36f36bb31880cbbb70c43247b18de1", 
  proxyUrl: "https://alicetapeps.icu/" 
};

const TEACHER_PASSWORD = "0209";

// ============================================================
// 📊 评价体系逻辑
// ============================================================
type Rating = 'A' | 'B' | 'C' | 'D' | 'E';
const RATING_MAP: Record<Rating, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 };

const CATEGORIES = [
  { name: 'Content', color: '#3B82F6', description: '演讲内容完整性、观点清晰度与逻辑结构。', questions: ["Beginning, body and ending included?", "Attention getter?", "Clear opinions?", "Impressive ending?"]},
  { name: 'Delivery', color: '#10B981', description: '声音表现力（语音语调）与肢体语言。', questions: ["Voice: Fluctuating tone?", "Voice: Proper pace/volume?", "Voice: Proper stresses?", "Voice: Clear pronunciation?", "Body Language: Vivid language?", "Body Language: Facial expressions?"]},
  { name: 'Language', color: '#F59E0B', description: '语言流利度、准确性及表达的多样性。', questions: ["Fluency?", "Accuracy?", "Vividness?", "Filler words?", "Sentence quality?"]},
  { name: 'Logic', color: '#F97316', description: '论证逻辑、结构连贯性及批判性思维。', questions: ["Structure?", "Supportive material?", "Evidence?", "Logical fallacy?", "Coherence?"]}
];

// ============================================================
// 🎨 可交互雷达图
// ============================================================
const RadarChart: React.FC<{ 
  pre: number[], 
  post: number[], 
  size?: number,
  onSelectCategory: (idx: number) => void,
  activeIdx: number | null
}> = ({ pre, post, size = 320, onSelectCategory, activeIdx }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const labels = CATEGORIES.map(c => c.name);
  const angleStep = (Math.PI * 2) / labels.length;

  const getPoints = (data: number[]) => {
    return data.map((val, i) => {
      const maxOfCat = CATEGORIES[i].questions.length * 4;
      const r = (Math.min(val, maxOfCat) / (maxOfCat || 1)) * radius; 
      const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
      return { x, y };
    });
  };

  const prePoints = getPoints(pre);
  const postPoints = getPoints(post);

  return (
    <svg width={size} height={size} className="mx-auto overflow-visible select-none drop-shadow-lg">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
      ))}
      {labels.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#F1F5F9" strokeWidth="1" />;
      })}
      <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 2" className="transition-all duration-700 opacity-60" />
      <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.1)" stroke="#3B82F6" strokeWidth="3" strokeLinejoin="round" className="transition-all duration-1000" filter="url(#glow)" />
      
      {labels.map((label, i) => {
        const x = center + (radius + 60) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 60) * Math.sin(i * angleStep - Math.PI / 2);
        const isActive = activeIdx === i;
        return (
          <g key={i} onClick={() => onSelectCategory(i)} className="cursor-pointer group">
            <rect x={x - 40} y={y - 15} width="80" height="30" rx="15" fill={isActive ? "#3B82F6" : "white"} className={`transition-all duration-300 shadow-sm ${isActive ? '' : 'stroke-slate-200'}`} />
            <text x={x} y={y + 5} textAnchor="middle" className={`text-[12px] font-black tracking-tight transition-all duration-300 ${isActive ? 'fill-white' : 'fill-slate-400'}`}>{label}</text>
          </g>
        );
      })}
      {postPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={activeIdx === i ? 7 : 4} fill={activeIdx === i ? "#2563EB" : "#3B82F6"} className="transition-all duration-300" />
      ))}
    </svg>
  );
};

// ============================================================
// 🚀 数据接口层
// ============================================================
class NotionService {
  static getBaseUrl() { 
    return `${DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '')}/v1/`; 
  }

  static async checkConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, 
          "Notion-Version": "2022-06-28" 
        }
      });
      return res.ok;
    } catch { return false; }
  }

  static async syncRecord(record: any) {
    try {
      const payload = {
        parent: { database_id: DEFAULT_CONFIG.dbId },
        properties: {
          "Name": { "title": [{ "text": { "content": record.name } }] },
          "StudentID": { "rich_text": [{ "text": { "content": record.studentId } }] },
          "Class": { "select": { "name": record.className || '未分类' } },
          "PreScore": { "number": record.preScore },
          "PostScore": { "number": record.postScore },
          "Pre_Content": { "number": record.preScores[0] },
          "Pre_Delivery": { "number": record.preScores[1] },
          "Pre_Language": { "number": record.preScores[2] },
          "Pre_Logic": { "number": record.preScores[3] },
          "Post_Content": { "number": record.postScores[0] },
          "Post_Delivery": { "number": record.postScores[1] },
          "Post_Language": { "number": record.postScores[2] },
          "Post_Logic": { "number": record.postScores[3] }
        }
      };
      
      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, 
          "Content-Type": "application/json", 
          "Notion-Version": "2022-06-28" 
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errInfo = await res.json();
        throw new Error(errInfo.message || "API调用失败");
      }
      return { success: true };
    } catch (e: any) { 
      return { success: false, message: e.message || "同步服务不可用" }; 
    }
  }

  static async fetchRecords(): Promise<any[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}/query`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, 
          "Notion-Version": "2022-06-28", 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }] 
        })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results.map((page: any) => {
        const p = page.properties;
        return {
          id: page.id,
          name: p.Name?.title?.[0]?.plain_text || '匿名',
          studentId: p.StudentID?.rich_text?.[0]?.plain_text || '-',
          className: p.Class?.select?.name || '-',
          preScore: p.PreScore?.number || 0,
          postScore: p.PostScore?.number || 0,
          postScores: [
            p.Post_Content?.number || 0,
            p.Post_Delivery?.number || 0,
            p.Post_Language?.number || 0,
            p.Post_Logic?.number || 0
          ]
        };
      });
    } catch { return []; }
  }
}

// ============================================================
// 🏠 App 主容器
// ============================================================
const App: React.FC = () => {
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const [activeTab, setActiveTab] = useState<'pre' | 'post' | 'compare'>('pre');
  const [activeCategory, setActiveCategory] = useState<number | null>(0);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [notionOnline, setNotionOnline] = useState<boolean | null>(null);
  
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('tapeps_profile');
    return saved ? JSON.parse(saved) : { name: '', studentId: '', className: '' };
  });

  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => {
    const saved = localStorage.getItem('tapeps_pre_ratings');
    return saved ? JSON.parse(saved) : {};
  });

  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => {
    const saved = localStorage.getItem('tapeps_post_ratings');
    return saved ? JSON.parse(saved) : {};
  });

  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);

  // 定期检测 Notion 连接状态
  useEffect(() => {
    const check = async () => {
      const status = await NotionService.checkConnection();
      setNotionOnline(status);
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, []);

  const preScores = useMemo(() => {
    return CATEGORIES.map((cat, idx) => {
      let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
      let score = 0;
      for(let i=1; i<=cat.questions.length; i++) score += RATING_MAP[preRatings[offset + i]] || 0;
      return score;
    });
  }, [preRatings]);

  const postScores = useMemo(() => {
    return CATEGORIES.map((cat, idx) => {
      let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
      let score = 0;
      for(let i=1; i<=cat.questions.length; i++) score += RATING_MAP[postRatings[offset + i]] || 0;
      return score;
    });
  }, [postRatings]);

  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const avgPost = records.reduce((acc, r) => acc + r.postScore, 0) / records.length;
    const catAvgs = CATEGORIES.map((_, i) => {
      return records.reduce((acc, r) => acc + (r.postScores[i] || 0), 0) / records.length;
    });
    return { avgPost, catAvgs };
  }, [records]);

  const handleVerifyPassword = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === TEACHER_PASSWORD) {
      setIsTeacherAuthenticated(true);
      setShowPasswordPrompt(false);
      setView('teacher');
      loadRecords();
    } else alert("密码错误");
  };

  const loadRecords = async () => {
    setIsFetching(true);
    const data = await NotionService.fetchRecords();
    setRecords(data);
    setIsFetching(false);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.studentId.includes(searchQuery)
    );
  }, [records, searchQuery]);

  const handleReset = () => {
    if(confirm("确定清空本地填写的草稿吗？")) {
      setPreRatings({});
      setPostRatings({});
      localStorage.removeItem('tapeps_pre_ratings');
      localStorage.removeItem('tapeps_post_ratings');
    }
  };

  const handleSubmit = async () => {
    if(!profile.name || !profile.studentId) return alert("请先在顶部填写姓名和学号。");
    
    setIsSubmitting(true);
    const res = await NotionService.syncRecord({
      ...profile,
      preScore: preScores.reduce((a,b)=>a+b,0),
      postScore: postScores.reduce((a,b)=>a+b,0),
      preScores,
      postScores
    });
    setIsSubmitting(false);

    if(res.success) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } else {
      alert(`同步失败: ${res.message}\n请检查：\n1. 数据库 ID 是否正确\n2. Notion 机器人是否已加入页面\n3. 网络是否正常`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-slate-900 pb-20 selection:bg-blue-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg"><TrendingUp size={22}/></div>
          <div className="hidden sm:block">
            <h1 className="font-black tracking-tight text-xl leading-none">TAPEPS</h1>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1">
              {notionOnline === true ? <Wifi size={10} className="text-green-500"/> : notionOnline === false ? <WifiOff size={10} className="text-red-500"/> : <Loader2 size={10} className="animate-spin"/>}
              Cloud Sync: {notionOnline === true ? 'Online' : notionOnline === false ? 'Offline' : 'Checking...'}
            </p>
          </div>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button onClick={() => setView('student')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'student' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>学生入口</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-sm text-black' : 'text-slate-500 hover:text-slate-700'}`}>
            {isTeacherAuthenticated ? <Unlock size={12}/> : <Lock size={12}/>} 管理端
          </button>
        </div>
      </nav>

      {/* 密码验证 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400"><Lock size={32}/></div>
            <h3 className="text-center font-black text-2xl text-slate-800 mb-2">管理访问代码</h3>
            <p className="text-center text-xs text-slate-400 mb-8 font-bold uppercase tracking-widest">Enter access code to continue</p>
            <input 
              type="password" 
              autoFocus 
              maxLength={4} 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} 
              className="w-full text-center text-4xl py-5 bg-slate-50 rounded-2xl mb-8 outline-none border-2 border-transparent focus:border-black transition-all font-black tracking-[0.5em]" 
            />
            <div className="flex gap-4">
              <button onClick={() => setShowPasswordPrompt(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-sm text-slate-400 hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={() => handleVerifyPassword()} className="flex-2 py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-black/10">登录后台</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 pt-10">
        {view === 'student' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 用户基本信息 */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-2 h-full bg-black/5 group-focus-within:bg-black transition-all"></div>
               <div className="flex items-center gap-3 mb-8">
                 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><User size={16}/></div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Information</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: '姓名 Full Name', key: 'name', ph: '输入姓名' },
                   { label: '学号 ID Number', key: 'studentId', ph: '输入学号' },
                   { label: '班级 Class', key: 'className', ph: '班级名称' }
                 ].map(f => (
                   <div key={f.key} className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">{f.label}</label>
                     <input 
                       value={profile[f.key as keyof typeof profile]} 
                       onChange={e => setProfile({...profile, [f.key]: e.target.value})} 
                       placeholder={f.ph} 
                       className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:bg-white focus:border-slate-200 transition-all text-sm font-bold outline-none placeholder:text-slate-300" 
                     />
                   </div>
                 ))}
               </div>
            </div>

            {/* 标签页导航 */}
            <div className="flex bg-slate-200/40 p-2 rounded-[24px] max-w-md mx-auto border border-slate-200/20 backdrop-blur-sm shadow-inner">
              {[
                {id: 'pre', label: '阶段前', icon: <Target size={14}/>}, 
                {id: 'post', label: '阶段后', icon: <Award size={14}/>}, 
                {id: 'compare', label: '成长看板', icon: <LayoutDashboard size={14}/>}
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id as any)} 
                  className={`flex-1 py-4 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? 'bg-white shadow-xl text-black scale-[1.02]' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 评估题目内容 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-12 pb-32">
                <div className="flex justify-between items-center px-4">
                   <div className="space-y-1">
                     <h2 className="text-3xl font-black tracking-tight text-slate-900">{activeTab === 'pre' ? '初始基准评估' : '学习成果评估'}</h2>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Self-Evaluation Session</p>
                   </div>
                   <button onClick={handleReset} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 shadow-sm"><Trash2 size={20}/></button>
                </div>

                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
                  return (
                    <div key={cat.name} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-4 mb-6 ml-4">
                        <div className="w-2 h-6 rounded-full" style={{backgroundColor: cat.color}}></div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em]">{cat.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400">{cat.description}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-[40px] border border-slate-200/50 p-10 space-y-12 shadow-sm relative">
                        <div className="absolute top-0 right-10 -translate-y-1/2 bg-white px-4 py-2 rounded-full border border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-widest shadow-sm">Dimension Section</div>
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const currentRating = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-6">
                              <p className="font-bold text-slate-800 text-[16px] leading-relaxed flex gap-5">
                                <span className="shrink-0 text-slate-200 font-black text-2xl">{qIdx < 10 ? `0${qIdx}` : qIdx}</span>
                                {q}
                              </p>
                              <div className="flex gap-3">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button 
                                    key={r} 
                                    onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                    className={`flex-1 py-5 rounded-2xl border-2 font-black text-sm transition-all ${
                                      currentRating === r 
                                      ? 'bg-black border-black text-white shadow-2xl scale-105 -translate-y-1' 
                                      : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 数据可视化分析 */
              <div className="space-y-10 pb-32 animate-in fade-in duration-700">
                <div className="bg-white rounded-[56px] p-10 sm:p-16 border border-slate-200/60 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 flex">
                    {CATEGORIES.map(c => <div key={c.name} style={{flex: 1, backgroundColor: c.color}}></div>)}
                  </div>
                  <div className="text-center mb-14">
                    <h3 className="text-4xl font-black tracking-tight text-slate-900 italic">Evolution Report</h3>
                    <p className="text-[10px] font-black text-slate-300 mt-4 uppercase tracking-[0.4em]">Personal Growth Visualization</p>
                  </div>
                  
                  <RadarChart pre={preScores} post={postScores} onSelectCategory={setActiveCategory} activeIdx={activeCategory} />
                  
                  {activeCategory !== null && (
                    <div className="mt-16 p-10 rounded-[48px] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                       <div className="flex items-center justify-between mb-10">
                         <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-3" style={{backgroundColor: CATEGORIES[activeCategory].color}}><Target size={28}/></div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase text-lg tracking-widest leading-none">{CATEGORIES[activeCategory].name}</h4>
                              <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">Deep Insight Analytics</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-blue-600 bg-blue-100/50 px-5 py-2 rounded-full border border-blue-100 shadow-sm shadow-blue-50">Impact +{postScores[activeCategory] - preScores[activeCategory]}</span>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 gap-4">
                          {CATEGORIES[activeCategory].questions.map((q, i) => {
                            const qIdx = CATEGORIES.slice(0, activeCategory).reduce((a,b)=>a+b.questions.length, 0) + i + 1;
                            const r1 = preRatings[qIdx] || '-';
                            const r2 = postRatings[qIdx] || '-';
                            return (
                              <div key={i} className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm group hover:border-black transition-all">
                                <span className="text-[14px] font-black text-slate-600 truncate mr-8">{q}</span>
                                <div className="flex items-center gap-6 shrink-0">
                                  <div className="text-center">
                                    <span className="block text-[8px] font-black text-slate-300 uppercase">Pre</span>
                                    <span className="text-sm font-black text-slate-300">{r1}</span>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-200 group-hover:text-black transition-colors"/>
                                  <div className="text-center">
                                    <span className="block text-[8px] font-black text-blue-300 uppercase">Post</span>
                                    <span className="text-xl font-black text-blue-600">{r2}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || syncSuccess} 
                    className={`w-full py-8 rounded-[40px] font-black text-xl transition-all flex items-center justify-center gap-5 shadow-2xl relative overflow-hidden ${
                      syncSuccess 
                        ? 'bg-green-500 text-white shadow-green-200' 
                        : isSubmitting 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-black text-white hover:bg-slate-900 active:scale-95 group'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={28}/> : syncSuccess ? <CheckCircle2 size={28}/> : <Database size={28}/>}
                    {syncSuccess ? "ARCHIVED TO NOTION" : isSubmitting ? "SYNCING WITH CLOUD..." : "SUBMIT TO NOTION CLOUD"}
                    {!isSubmitting && !syncSuccess && <div className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight/></div>}
                  </button>
                  {syncSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest animate-bounce mt-4">
                       <Globe size={12}/> Connection Secure. Data Published Successfully.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 管理员视图 */
          <div className="space-y-8 pb-40 animate-in fade-in duration-500">
            {/* 统计看板卡片 */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black text-white rounded-[40px] p-8 shadow-2xl shadow-black/20 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex items-center gap-3 mb-6 opacity-50"><BarChart3 size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Global Performance Avg</span></div>
                  <div className="text-6xl font-black tracking-tighter italic">{stats.avgPost.toFixed(1)}</div>
                  <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Overall Success Rate</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-3 mb-6 text-slate-300"><Info size={18}/> <span className="text-[10px] font-black uppercase tracking-widest">Dimension distribution</span></div>
                   <div className="flex gap-4 h-24 items-end">
                     {stats.catAvgs.map((val, i) => (
                       <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                         <div className="w-full bg-slate-50 rounded-xl overflow-hidden h-full flex items-end">
                           <div className="w-full transition-all duration-1000 group-hover:brightness-110" style={{height: `${(val/24)*100}%`, backgroundColor: CATEGORIES[i].color}}></div>
                         </div>
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{CATEGORIES[i].name}</div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">Student Archives</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> 共计 {records.length} 条已同步记录
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={loadRecords} 
                  disabled={isFetching}
                  className={`px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-black hover:border-black transition-all shadow-sm flex items-center gap-3 font-black text-xs ${isFetching ? 'opacity-50' : ''}`}
                >
                  <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''}/>
                  REFRESH
                </button>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-black transition-colors" size={24}/>
              <input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="搜索姓名或学号..." 
                className="w-full pl-16 pr-8 py-6 bg-white border border-slate-200 rounded-[32px] outline-none focus:ring-8 focus:ring-slate-100 transition-all text-sm font-black shadow-sm placeholder:text-slate-200" 
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              {isFetching && records.length === 0 ? (
                 [1,2,3,4].map(i => <div key={i} className="h-32 bg-white border border-slate-50 rounded-[40px] animate-pulse shadow-sm"></div>)
              ) : filteredRecords.length === 0 ? (
                <div className="py-32 text-center text-slate-300 font-black border-4 border-dashed border-slate-100 rounded-[64px] flex flex-col items-center">
                  <div className="bg-slate-50 p-10 rounded-[40px] mb-6"><Search size={48} className="opacity-20"/></div>
                  <p className="uppercase tracking-[0.3em]">No records found in cloud</p>
                </div>
              ) : filteredRecords.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[48px] border border-slate-200/50 shadow-sm flex items-center justify-between group hover:shadow-2xl hover:border-black/5 hover:-translate-y-1 transition-all cursor-default">
                   <div className="flex items-center gap-8">
                      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center font-black text-slate-300 group-hover:bg-black group-hover:text-white transition-all text-3xl italic">{r.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-2xl text-slate-900 leading-none">{r.name}</h4>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3 flex items-center gap-3">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg">{r.className}</span>
                          <span className="opacity-20 text-slate-300">/</span>
                          <span className="tracking-tighter">{r.studentId}</span>
                        </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-10">
                      <div className="text-right">
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">{r.postScore}</div>
                        <div className="text-[10px] font-black text-slate-200 uppercase tracking-widest mt-1">Net Score</div>
                      </div>
                      <div className="w-12 h-12 rounded-[20px] border border-slate-100 flex items-center justify-center text-slate-200 group-hover:text-black group-hover:border-black transition-all">
                        <ChevronRight size={24}/>
                      </div>
                   </div>
                </div>
              ))}
            </div>
            
            <div className="bg-black/5 rounded-[40px] p-10 mt-12 border border-black/5 text-center">
               <Info className="mx-auto mb-4 text-slate-300" size={32}/>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Notion Database Integration System</p>
               <p className="text-xs text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">数据已通过加密隧道同步至 Notion。如需调整评估维度，请联系技术管理员更新数据库架构。系统版本：v2.1.0-Build250212</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
