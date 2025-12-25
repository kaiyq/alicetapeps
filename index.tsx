
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  UserCircle, 
  Loader2, 
  TrendingUp,
  Settings,
  X,
  RefreshCw,
  Cloud,
  Lock,
  Unlock,
  Target,
  ChevronRight,
  Server,
  Download,
  Copy,
  LayoutDashboard,
  CheckCircle2,
  Zap,
  BarChart3,
  ArrowRight
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
// 📊 评价指标与逻辑
// ============================================================
type Rating = 'A' | 'B' | 'C' | 'D' | 'E';
const RATING_MAP: Record<Rating, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 };

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
}> = ({ pre, post, size = 300, onSelectCategory, activeIdx }) => {
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
      {/* 背景圆环 */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 2" />
      ))}
      {/* 轴线 */}
      {labels.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#E2E8F0" />;
      })}
      {/* 交互式标签 */}
      {labels.map((label, i) => {
        const x = center + (radius + 35) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 35) * Math.sin(i * angleStep - Math.PI / 2);
        const isActive = activeIdx === i;
        return (
          <g key={i} onClick={() => onSelectCategory(i)} className="cursor-pointer group">
            <text x={x} y={y} textAnchor="middle" className={`text-[12px] font-black transition-all duration-300 ${isActive ? 'fill-blue-600' : 'fill-slate-400 group-hover:fill-slate-600'}`} style={{ transform: isActive ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'center', transformBox: 'fill-box' }}>{label}</text>
            <circle cx={x} cy={y} r="30" fill="transparent" />
          </g>
        );
      })}
      {/* 数据多边形 */}
      <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(148, 163, 184, 0.05)" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 2" />
      <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="3" strokeLinejoin="round" className="transition-all duration-1000" />
      {/* 数据点 */}
      {postPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={activeIdx === i ? 7 : 4} fill={activeIdx === i ? "#2563EB" : "#3B82F6"} className="transition-all duration-300 cursor-pointer shadow-lg" onClick={() => onSelectCategory(i)} />
      ))}
    </svg>
  );
};

// ============================================================
// 🚀 网络服务
// ============================================================
class NotionService {
  static getBaseUrl() { return `${DEFAULT_CONFIG.proxyUrl}v1/`; }

  static async syncRecord(record: any) {
    try {
      const payload = {
        parent: { database_id: DEFAULT_CONFIG.dbId },
        properties: {
          "Name": { "title": [{ "text": { "content": record.name } }] },
          "StudentID": { "rich_text": [{ "text": { "content": record.studentId } }] },
          "Class": { "select": { "name": record.className } },
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
// 🏠 主程序
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

  // 计算分数
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
      loadData();
    } else alert("密码错误");
  };

  const loadData = async () => {
    setIsFetching(true);
    const data = await NotionService.fetchRecords();
    setRecords(data);
    setIsFetching(false);
  };

  const handleSubmit = async () => {
    if(!profile.name) return alert("请填写姓名");
    setIsSubmitting(true);
    const res = await NotionService.syncRecord({
      ...profile,
      preScore: preScores.reduce((a,b)=>a+b,0),
      postScore: postScores.reduce((a,b)=>a+b,0),
      preScores,
      postScores
    });
    setIsSubmitting(false);
    if(res.success) alert("✅ 同步成功！");
    else alert("同步失败，请检查网络或配置。");
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC] text-slate-900 pb-20">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><TrendingUp size={22} /></div>
          <h1 className="text-xl font-black tracking-tighter">TAPEPS <span className="text-blue-500 opacity-50">Edu</span></h1>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setView('student')} className={`px-5 py-2.5 rounded-xl text-[12px] font-black transition-all ${view === 'student' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>自测中心</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-5 py-2.5 rounded-xl text-[12px] font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {isTeacherAuthenticated ? <Unlock size={14}/> : <Lock size={14}/>} 教学看板
          </button>
        </div>
      </nav>

      {/* 密码弹窗 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8">管理员认证</h3>
            <input type="password" autoFocus value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} placeholder="输入密码" className="w-full text-center text-3xl py-4 bg-slate-50 border-none rounded-3xl font-black mb-6" />
            <button onClick={() => handleVerifyPassword()} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase">进入系统</button>
            <button onClick={() => setShowPasswordPrompt(false)} className="mt-4 text-xs font-bold text-slate-400">取消</button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 pt-8">
        {view === 'student' ? (
          <div className="space-y-8 animate-in fade-in">
            {/* 个人信息卡片 */}
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
               {['姓名', '学号', '班级'].map((label, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label>
                    <input placeholder={`输入${label}`} value={i===0?profile.name : i===1?profile.studentId : profile.className} onChange={e => {
                        const v = e.target.value;
                        if(i===0) setProfile({...profile, name:v});
                        else if(i===1) setProfile({...profile, studentId:v});
                        else setProfile({...profile, className:v});
                      }} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-blue-100 transition-all" />
                  </div>
                ))}
            </div>

            {/* 流程导航 */}
            <div className="flex bg-slate-200/50 p-2 rounded-[30px]">
              {[{id: 'pre', label: '1. 学前自测'}, {id: 'post', label: '2. 期末评价'}, {id: 'compare', label: '3. 成长看板'}].map(t => (
                <button key={t.id} onClick={() => handleTabChange(t.id as any)} className={`flex-1 py-4 rounded-[22px] text-[12px] font-black transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-lg scale-[1.03]' : 'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
              ))}
            </div>

            {/* 评分主体 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-12 pb-20">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
                  return (
                    <section key={cat.name} className="animate-in slide-in-from-bottom-6 duration-500">
                      <div className="flex items-center gap-4 mb-6"><div className="w-2.5 h-10 rounded-full" style={{backgroundColor: cat.color}}></div><h3 className="text-3xl font-black text-slate-800 tracking-tight">{cat.name}</h3></div>
                      <div className="bg-white rounded-[48px] border border-slate-100 p-10 space-y-12 shadow-sm">
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const currentRating = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-5">
                              <p className="font-bold text-slate-700 text-lg flex gap-4 items-start"><span className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[12px] font-black text-slate-300 border border-slate-100">{qIdx}</span>{q}</p>
                              <div className="flex gap-3 pl-12 overflow-x-auto pb-4 scrollbar-hide">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} className={`w-14 h-14 rounded-2xl border-2 font-black text-lg transition-all shrink-0 ${currentRating === r ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-110' : 'border-slate-100 bg-white text-slate-300 hover:border-slate-200'}`}>{r}</button>
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
              <div className="space-y-8 pb-20 animate-in zoom-in-95">
                <div className="bg-white rounded-[50px] p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">智能成长画像</h3>
                    <div className="flex items-center justify-center gap-6 mt-4">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><div className="w-3 h-0.5 bg-slate-300 border-dashed border-t border-slate-300"></div> 学前水平</div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest"><div className="w-3 h-1 bg-blue-500"></div> 学后水平</div>
                    </div>
                  </div>
                  
                  <RadarChart pre={preScores} post={postScores} onSelectCategory={setActiveCategory} activeIdx={activeCategory} />
                  
                  {activeCategory !== null && (
                    <div className="mt-12 p-10 rounded-[40px] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-6">
                       <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl" style={{backgroundColor: CATEGORIES[activeCategory].color}}><Target size={28}/></div>
                           <div>
                             <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{CATEGORIES[activeCategory].name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">维度详情分析</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="flex items-center gap-2 justify-end text-blue-600">
                             <TrendingUp size={20}/>
                             <span className="text-3xl font-black">+{postScores[activeCategory] - preScores[activeCategory]}</span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Total Growth</p>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-3">
                          {CATEGORIES[activeCategory].questions.map((q, i) => {
                            const qIdx = CATEGORIES.slice(0, activeCategory).reduce((a,b)=>a+b.questions.length, 0) + i + 1;
                            const s1 = RATING_MAP[preRatings[qIdx]] || 0;
                            const s2 = RATING_MAP[postRatings[qIdx]] || 0;
                            return (
                              <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
                                <span className="text-sm font-bold text-slate-600 max-w-[65%] leading-tight">{q}</span>
                                <div className="flex items-center gap-4">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-300 uppercase">Pre</span>
                                    <span className="text-sm font-black text-slate-400">{s1}</span>
                                  </div>
                                  <ArrowRight size={14} className="text-blue-200"/>
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-blue-300 uppercase">Post</span>
                                    <span className="text-lg font-black text-blue-600">{s2}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  )}
                </div>
                
                <button onClick={handleSubmit} disabled={isSubmitting} className={`w-full py-8 rounded-[40px] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-5 ${isSubmitting ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95'}`}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <Cloud size={24}/>} 
                  同步成长记录到 Notion
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 管理看板 */
          <div className="space-y-8 pb-32 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">教学全景看板</h2>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">已同步最新数据</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={loadData} className="p-4 bg-white border border-slate-100 rounded-[22px] text-slate-400 hover:text-blue-600 shadow-sm transition-all"><RefreshCw size={20} className={isFetching ? 'animate-spin' : ''}/></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white rounded-[50px] border-2 border-dashed border-slate-100 text-slate-300 font-bold">目前还没有学生提交数据</div>
              ) : records.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center font-black text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all text-2xl">{r.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-xl tracking-tight text-slate-800">{r.name}</h4>
                        <p className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest">{r.className} | {r.studentId}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-3xl font-black text-blue-600">{r.postScore}</div>
                      <div className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">Post Score</div>
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
