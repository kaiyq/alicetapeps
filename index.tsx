
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
  Loader2,
  AlertCircle,
  Database,
  Send
} from 'lucide-react';

// ============================================================
// 🎯 核心配置 (请确保 Notion 数据库字段与此匹配)
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
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* 坐标圆环 */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray={scale === 1 ? "" : "4 4"} />
      ))}
      {/* 轴线 */}
      {labels.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
      })}
      {/* 背景多边形 (Pre) */}
      <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="5 3" className="transition-all duration-700" />
      {/* 前景多边形 (Post) */}
      <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="3" strokeLinejoin="round" className="transition-all duration-1000" filter="url(#glow)" />
      
      {/* 交互维度标签 */}
      {labels.map((label, i) => {
        const x = center + (radius + 50) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 50) * Math.sin(i * angleStep - Math.PI / 2);
        const isActive = activeIdx === i;
        return (
          <g key={i} onClick={() => onSelectCategory(i)} className="cursor-pointer group">
            <rect x={x - 35} y={y - 15} width="70" height="30" rx="15" fill={isActive ? "#3B82F6" : "transparent"} className="transition-all duration-300" />
            <text x={x} y={y + 5} textAnchor="middle" className={`text-[12px] font-black transition-all duration-300 ${isActive ? 'fill-white' : 'fill-slate-500 group-hover:fill-blue-600'}`}>{label}</text>
          </g>
        );
      })}
      {/* 数据高亮圆点 */}
      {postPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={activeIdx === i ? 8 : 5} fill={activeIdx === i ? "#2563EB" : "#3B82F6"} className="transition-all duration-300 cursor-pointer shadow-lg" onClick={() => onSelectCategory(i)} />
      ))}
    </svg>
  );
};

// ============================================================
// 🚀 数据接口层 (Notion Cloud Database)
// ============================================================
class NotionService {
  static getBaseUrl() { 
    const url = DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '');
    return `${url}/v1/`; 
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
        const errData = await res.json();
        return { success: false, message: errData.message || "Notion API Error" };
      }
      return { success: true };
    } catch (e) { 
      return { success: false, message: "无法连接到代理服务器，请检查网络。" }; 
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
    if(!profile.name || !profile.studentId) return alert("请在上方填写姓名和学号，这是同步档案的必要标识。");
    
    // 检查是否至少填了一个自测
    if (Object.keys(preRatings).length === 0 && Object.keys(postRatings).length === 0) {
      return alert("请先完成至少一项维度的评价。");
    }

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
    } else {
      alert(`❌ 同步失败: ${res.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 pb-24 font-sans selection:bg-blue-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">TAPEPS</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Feedback</p>
          </div>
        </div>
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
          <button onClick={() => setView('student')} className={`px-5 py-2 rounded-xl text-[12px] font-black transition-all ${view === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>自测入口</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-5 py-2 rounded-xl text-[12px] font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {isTeacherAuthenticated ? <Unlock size={14}/> : <Lock size={14}/>} 管理后台
          </button>
        </div>
      </nav>

      {/* 密码弹窗 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={28}/></div>
            <h3 className="text-xl font-black mb-6 text-slate-800 tracking-tight">教师端身份验证</h3>
            <input type="password" autoFocus maxLength={4} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} placeholder="••••" className="w-full text-center text-3xl tracking-[0.5em] py-4 bg-slate-50 border-none rounded-2xl font-black mb-6 focus:ring-2 focus:ring-blue-200 outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowPasswordPrompt(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">取消</button>
              <button onClick={() => handleVerifyPassword()} className="py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all">进入系统</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 pt-10">
        {view === 'student' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 个人信息卡片 */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                 { label: '姓名', key: 'name', placeholder: '张三' },
                 { label: '学号', key: 'studentId', placeholder: '2024001' },
                 { label: '班级', key: 'className', placeholder: '初二(3)班' }
               ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{field.label}</label>
                    <input 
                      placeholder={field.placeholder} 
                      value={profile[field.key as keyof typeof profile]} 
                      onChange={e => setProfile({...profile, [field.key]: e.target.value})} 
                      className="w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100 font-bold text-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-slate-300" 
                    />
                  </div>
                ))}
            </div>

            {/* 流程导航 */}
            <div className="flex bg-slate-200/40 p-1.5 rounded-3xl max-w-lg mx-auto border border-slate-200/30">
              {[
                {id: 'pre', label: '开课前', icon: <Target size={14}/>}, 
                {id: 'post', label: '结课后', icon: <Award size={14}/>}, 
                {id: 'compare', label: '成长报告', icon: <LayoutDashboard size={14}/>}
              ].map(t => (
                <button key={t.id} onClick={() => handleTabChange(t.id as any)} className={`flex-1 py-3.5 rounded-2xl text-[12px] font-black transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 填报区 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-12 pb-20">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
                  return (
                    <section key={cat.name} className="animate-in fade-in duration-500">
                      <div className="flex items-center gap-3 mb-6 px-4">
                        <div className="w-2 h-8 rounded-full" style={{backgroundColor: cat.color}}></div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{cat.name}</h3>
                      </div>
                      <div className="bg-white rounded-[40px] border border-slate-100 p-8 space-y-10 shadow-sm">
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const currentRating = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="group">
                              <p className="font-bold text-slate-700 text-lg flex gap-4 items-start leading-tight mb-5">
                                <span className="shrink-0 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[12px] font-black text-slate-300 border border-slate-100">{qIdx}</span>
                                {q}
                              </p>
                              <div className="flex gap-3 pl-12 overflow-x-auto pb-2 no-scrollbar">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button 
                                    key={r} 
                                    onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                    className={`w-14 h-14 rounded-2xl border-2 font-black text-lg transition-all shrink-0 ${currentRating === r ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'border-slate-50 bg-slate-50/50 text-slate-300 hover:border-slate-200'}`}
                                  >
                                    {r}
                                  </button>
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
              /* 分析看板 */
              <div className="space-y-8 pb-32">
                <div className="bg-white rounded-[48px] p-10 md:p-14 shadow-xl border border-slate-100">
                  <div className="text-center mb-10">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 italic">Digital Growth Portrait</span>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">能力成长雷达</h3>
                    <div className="flex items-center justify-center gap-8 mt-6">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-300"></div> 开课前
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                         <div className="w-4 h-1.5 bg-blue-500 rounded-full"></div> 结课后
                       </div>
                    </div>
                  </div>
                  
                  <RadarChart pre={preScores} post={postScores} onSelectCategory={setActiveCategory} activeIdx={activeCategory} />
                  
                  {activeCategory !== null && (
                    <div className="mt-10 p-8 rounded-[36px] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                       <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{backgroundColor: CATEGORIES[activeCategory].color}}><Target size={24}/></div>
                           <div>
                             <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{CATEGORIES[activeCategory].name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dimension Detail</p>
                           </div>
                         </div>
                         <div className="bg-blue-100/50 px-4 py-2 rounded-2xl flex items-center gap-2">
                           <TrendingUp size={16} className="text-blue-600"/>
                           <span className="text-lg font-black text-blue-600">+{postScores[activeCategory] - preScores[activeCategory]}</span>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 gap-4">
                          {CATEGORIES[activeCategory].questions.map((q, i) => {
                            const qIdx = CATEGORIES.slice(0, activeCategory).reduce((a,b)=>a+b.questions.length, 0) + i + 1;
                            const r1 = preRatings[qIdx] || 'E';
                            const r2 = postRatings[qIdx] || 'E';
                            return (
                              <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group transition-all duration-300">
                                <span className="text-[13px] font-bold text-slate-600 max-w-[60%] leading-snug">{q}</span>
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <span className="text-[8px] font-black text-slate-300 uppercase block">Pre</span>
                                    <span className="text-sm font-black text-slate-300">{r1}</span>
                                  </div>
                                  <ChevronRight size={12} className="text-slate-200"/>
                                  <div className="text-center">
                                    <span className="text-[8px] font-black text-blue-300 uppercase block">Post</span>
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
                
                {/* 同步按钮 */}
                <div className="relative pt-4">
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || syncSuccess} 
                    className={`w-full py-8 rounded-[36px] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4 ${
                      syncSuccess 
                        ? 'bg-green-500 text-white shadow-green-100 cursor-default' 
                        : isSubmitting 
                          ? 'bg-slate-200 text-slate-400' 
                          : 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : syncSuccess ? <CheckCircle2 size={24}/> : <Database size={24}/>} 
                    {syncSuccess ? "已成功同步至 Notion 云端" : isSubmitting ? "正在同步档案..." : "同步成长数据报告"}
                  </button>
                  {syncSuccess && (
                    <p className="text-center text-[11px] font-bold text-green-500 mt-4 animate-bounce uppercase tracking-widest">Success! Your progress is now on the cloud.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 管理端面板 */
          <div className="space-y-8 pb-40 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">评估历史档案</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                  <Database size={12}/> {records.length} Records in Notion
                </p>
              </div>
              <button onClick={loadRecords} className={`p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all ${isFetching ? 'opacity-50' : ''}`}>
                <RefreshCw size={20} className={isFetching ? 'animate-spin' : ''}/>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {records.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <LayoutDashboard size={28} className="text-slate-200"/>
                  </div>
                  <p className="text-slate-300 font-bold">{isFetching ? '正在努力加载...' : '暂无同步记录'}</p>
                </div>
              ) : records.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all text-xl">{r.name.charAt(0)}</div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-lg text-slate-800">{r.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.className} · {r.studentId}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-2xl font-black text-blue-600 tracking-tight">{r.postScore}</div>
                      <div className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Final Score</div>
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
