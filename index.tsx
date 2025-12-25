
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  TrendingUp,
  RefreshCw,
  Cloud,
  Lock,
  Unlock,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LayoutDashboard,
  ChevronRight,
  Award,
  Zap,
  // Fix: Added missing Loader2 import
  Loader2
} from 'lucide-react';

// ============================================================
// 🎯 核心配置
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
const SCORE_TO_RATING = (score: number): Rating => {
  if (score >= 3.5) return 'A';
  if (score >= 2.5) return 'B';
  if (score >= 1.5) return 'C';
  if (score >= 0.5) return 'D';
  return 'E';
};

const CATEGORIES = [
  { name: 'Content', color: '#3B82F6', questions: ["Beginning, body and ending included?", "Attention getter?", "Clear opinions?", "Impressive ending?"]},
  { name: 'Delivery', color: '#10B981', questions: ["Voice: Fluctuating tone?", "Voice: Proper pace/volume?", "Voice: Proper stresses?", "Voice: Clear pronunciation?", "Body Language: Vivid language?", "Body Language: Facial expressions?"]},
  { name: 'Language', color: '#F59E0B', questions: ["Fluency?", "Accuracy?", "Vividness?", "Filler words?", "Sentence quality?"]},
  { name: 'Logic', color: '#F97316', questions: ["Structure?", "Supportive material?", "Evidence?", "Logical fallacy?", "Coherence?"]}
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
    <svg width={size} height={size} className="mx-auto overflow-visible select-none">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* 坐标圆环 */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
      ))}
      {/* 轴线 */}
      {labels.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#F1F5F9" />;
      })}
      {/* 背景多边形 */}
      <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 2" />
      <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="3" strokeLinejoin="round" className="transition-all duration-1000" filter="url(#glow)" />
      {/* 交互维度标签 */}
      {labels.map((label, i) => {
        const x = center + (radius + 45) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 45) * Math.sin(i * angleStep - Math.PI / 2);
        const isActive = activeIdx === i;
        return (
          <g key={i} onClick={() => onSelectCategory(i)} className="cursor-pointer group">
            <text x={x} y={y} textAnchor="middle" className={`text-[13px] font-black transition-all duration-300 ${isActive ? 'fill-blue-600' : 'fill-slate-400 group-hover:fill-slate-600'}`} style={{ transform: isActive ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'center', transformBox: 'fill-box' }}>{label}</text>
            <circle cx={x} cy={y} r="40" fill="transparent" />
          </g>
        );
      })}
      {/* 数据高亮圆点 */}
      {postPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={activeIdx === i ? 9 : 5} fill={activeIdx === i ? "#2563EB" : "#3B82F6"} className="transition-all duration-300 cursor-pointer shadow-lg" onClick={() => onSelectCategory(i)} />
      ))}
    </svg>
  );
};

// ============================================================
// 🚀 数据接口层
// ============================================================
class NotionService {
  static getBaseUrl() { return `${DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '')}/v1/`; }

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
        headers: { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
        body: JSON.stringify(payload)
      });
      return { success: res.ok };
    } catch { return { success: false }; }
  }

  static async fetchRecords(): Promise<any[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ sorts: [{ timestamp: "last_edited_time", direction: "descending" }] })
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
          postScore: p.PostScore?.number || 0
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
  
  const [profile, setProfile] = useState({ name: '', studentId: '', className: '' });
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>({});
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>({});
  const [records, setRecords] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // 计算分数逻辑
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

  const handleTabChange = (tab: 'pre' | 'post' | 'compare') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleSubmit = async () => {
    if(!profile.name || !profile.studentId) return alert("请先填写个人信息");
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
      setTimeout(() => setSyncSuccess(false), 5000);
      alert("✅ 成长档案同步成功！");
    } else alert("同步失败，请检查 alicetapeps.icu 状态。");
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 pb-24 font-sans">
      {/* 顶级导航 */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100"><TrendingUp size={22} /></div>
          <h1 className="text-xl font-black tracking-tighter">TAPEPS <span className="text-blue-500 opacity-40">System</span></h1>
        </div>
        <div className="flex bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/50 transition-all">
          <button onClick={() => setView('student')} className={`px-5 py-2.5 rounded-xl text-[12px] font-black transition-all ${view === 'student' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>自测中心</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-5 py-2.5 rounded-xl text-[12px] font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
            {isTeacherAuthenticated ? <Unlock size={14}/> : <Lock size={14}/>} 教学看板
          </button>
        </div>
      </nav>

      {/* 密码弹窗 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[48px] p-12 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8"><Lock size={36}/></div>
            <h3 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">管理端身份确认</h3>
            <input type="password" autoFocus maxLength={4} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} placeholder="••••" className="w-full text-center text-4xl tracking-[0.5em] py-5 bg-slate-50 border-none rounded-3xl font-black mb-8 focus:ring-2 focus:ring-blue-100 transition-all" />
            <button onClick={() => handleVerifyPassword()} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors">验证进入</button>
            <button onClick={() => setShowPasswordPrompt(false)} className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600">取消访问</button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 pt-10">
        {view === 'student' ? (
          <div className="space-y-10 animate-in fade-in duration-700">
            {/* 个人信息卡片 */}
            <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
               {['姓名', '学号', '班级'].map((label, i) => (
                  <div key={i} className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
                    <input placeholder={`输入${label}`} value={i===0?profile.name : i===1?profile.studentId : profile.className} onChange={e => {
                        const v = e.target.value;
                        if(i===0) setProfile({...profile, name:v});
                        else if(i===1) setProfile({...profile, studentId:v});
                        else setProfile({...profile, className:v});
                      }} className="w-full bg-slate-50 p-5 rounded-3xl border-none font-bold text-sm focus:ring-2 focus:ring-blue-100 transition-all" />
                  </div>
                ))}
            </div>

            {/* 流程导航 */}
            <div className="flex bg-slate-200/30 p-2 rounded-[32px] max-w-2xl mx-auto backdrop-blur-sm border border-slate-100">
              {[{id: 'pre', label: '1. 学前自测'}, {id: 'post', label: '2. 期末评价'}, {id: 'compare', label: '3. 成长看板'}].map(t => (
                <button key={t.id} onClick={() => handleTabChange(t.id as any)} className={`flex-1 py-4 rounded-[26px] text-[13px] font-black transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-xl scale-[1.03]' : 'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
              ))}
            </div>

            {/* 核心填报区 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-16 pb-24">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
                  return (
                    <section key={cat.name} className="animate-in slide-in-from-bottom-12 duration-700">
                      <div className="flex items-center gap-5 mb-8"><div className="w-3 h-12 rounded-full shadow-lg" style={{backgroundColor: cat.color}}></div><h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{cat.name}</h3></div>
                      <div className="bg-white rounded-[56px] border border-slate-100 p-12 space-y-16 shadow-sm">
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const currentRating = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-6">
                              <p className="font-bold text-slate-700 text-xl flex gap-5 items-start leading-snug"><span className="shrink-0 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[14px] font-black text-slate-300 border border-slate-100">{qIdx}</span>{q}</p>
                              <div className="flex gap-4 pl-14 overflow-x-auto pb-6 scrollbar-hide">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} className={`w-16 h-16 rounded-3xl border-2 font-black text-xl transition-all shrink-0 ${currentRating === r ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-100 scale-110' : 'border-slate-50 bg-white text-slate-300 hover:border-slate-200 active:scale-95'}`}>{r}</button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              /* 数据分析看板 */
              <div className="space-y-12 pb-32 animate-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[60px] p-16 shadow-2xl shadow-slate-200/30 border border-slate-100">
                  <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4"><Sparkles size={12}/> Analysis & Insights</div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">学期能力数字画像</h3>
                    <div className="flex items-center justify-center gap-10 mt-8">
                       <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest"><div className="w-5 h-0.5 bg-slate-300 border-dashed border-t border-slate-300"></div> Pre-Test</div>
                       <div className="flex items-center gap-3 text-[11px] font-bold text-blue-500 uppercase tracking-widest"><div className="w-5 h-2 bg-blue-500 rounded-full"></div> Post-Test</div>
                    </div>
                  </div>
                  
                  <RadarChart pre={preScores} post={postScores} onSelectCategory={setActiveCategory} activeIdx={activeCategory} />
                  
                  {activeCategory !== null && (
                    <div className="mt-14 p-12 rounded-[48px] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-12 duration-500">
                       <div className="flex items-center justify-between mb-12">
                         <div className="flex items-center gap-5">
                           <div className="w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-2xl" style={{backgroundColor: CATEGORIES[activeCategory].color}}><Target size={32}/></div>
                           <div>
                             <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{CATEGORIES[activeCategory].name}</h4>
                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Growth Matrix</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="flex items-center gap-3 justify-end text-blue-600">
                             <TrendingUp size={24}/>
                             <span className="text-4xl font-black">+{postScores[activeCategory] - preScores[activeCategory]}</span>
                           </div>
                           <p className="text-[11px] font-bold text-slate-300 uppercase mt-2">Score Progress</p>
                         </div>
                       </div>

                       {/* 进步对比列表 */}
                       <div className="grid grid-cols-1 gap-5">
                          {CATEGORIES[activeCategory].questions.map((q, i) => {
                            const qIdx = CATEGORIES.slice(0, activeCategory).reduce((a,b)=>a+b.questions.length, 0) + i + 1;
                            const s1 = RATING_MAP[preRatings[qIdx]] || 0;
                            const s2 = RATING_MAP[postRatings[qIdx]] || 0;
                            const r1 = SCORE_TO_RATING(s1);
                            const r2 = SCORE_TO_RATING(s2);
                            const improved = s2 > s1;

                            return (
                              <div key={i} className="flex items-center justify-between p-7 bg-white rounded-[36px] border border-slate-100 group hover:border-blue-300 hover:shadow-2xl transition-all duration-300">
                                <div className="space-y-1 max-w-[55%]">
                                  <span className="text-[15px] font-bold text-slate-600 leading-snug block">{q}</span>
                                  <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-black uppercase tracking-widest ${improved ? 'text-green-500' : 'text-slate-300'}`}>
                                       {improved ? 'Significant Improvement' : 'Steady Progress'}
                                     </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-8">
                                  <div className="text-center group-hover:scale-90 transition-transform">
                                    <span className="text-[9px] font-black text-slate-300 uppercase block mb-1">Pre</span>
                                    <span className="text-xl font-black text-slate-300">{r1}</span>
                                  </div>
                                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full animate-pulse"><Zap size={16}/></div>
                                  <div className="text-center group-hover:scale-125 transition-transform duration-500">
                                    <span className="text-[9px] font-black text-blue-300 uppercase block mb-1">Post</span>
                                    <span className="text-3xl font-black text-blue-600 tracking-tight">{r2}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="relative group">
                  <div className={`absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[55px] blur opacity-25 group-hover:opacity-50 transition duration-1000 ${syncSuccess ? 'animate-pulse' : ''}`}></div>
                  <button onClick={handleSubmit} disabled={isSubmitting} className={`relative w-full py-10 rounded-[50px] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-6 ${isSubmitting ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95'}`}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={32}/> : (syncSuccess ? <CheckCircle2 size={32} className="text-green-400"/> : <Cloud size={32}/>)} 
                    {syncSuccess ? "已保存至 Notion 数据库" : "同步成长数据报告"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 管理端面板 */
          <div className="space-y-10 pb-40 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">评估历史档案</h2>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg"></div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">已同步来自 Notion 的 {records.length} 条记录</p>
                </div>
              </div>
              <button onClick={loadRecords} className="p-5 bg-white border border-slate-100 rounded-[30px] text-slate-400 hover:text-blue-600 shadow-sm active:scale-90 transition-all"><RefreshCw size={26} className={isFetching ? 'animate-spin' : ''}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {records.length === 0 ? (
                <div className="col-span-full py-40 text-center bg-white rounded-[60px] border-2 border-dashed border-slate-100 flex flex-col items-center">
                  <LayoutDashboard size={48} className="text-slate-100 mb-6"/>
                  <p className="text-slate-300 font-bold text-xl">暂无任何评估记录提交</p>
                </div>
              ) : records.map(r => (
                <div key={r.id} className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-400 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer">
                   <div className="flex items-center gap-7">
                      <div className="w-22 h-22 bg-slate-50 rounded-[32px] flex items-center justify-center font-black text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all text-3xl shadow-inner">{r.name.charAt(0)}</div>
                      <div className="space-y-1">
                        <h4 className="font-black text-2xl tracking-tight text-slate-800">{r.name}</h4>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{r.className} | {r.studentId}</p>
                      </div>
                   </div>
                   <div className="text-right flex flex-col items-end">
                      <div className="text-4xl font-black text-blue-600 tracking-tighter">{r.postScore}</div>
                      <div className="text-[10px] font-black text-slate-200 uppercase tracking-widest mt-1 bg-slate-50 px-3 py-1 rounded-full">Score Post</div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
