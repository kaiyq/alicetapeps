
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
  ExternalLink
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
  
  // 持久化
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
      alert(`同步失败: ${res.message}\n请检查数据库 ID 和 API Key 是否正确配置。`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-slate-900 pb-20 selection:bg-blue-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white"><TrendingUp size={18}/></div>
          <span className="font-black tracking-tight text-lg">TAPEPS</span>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button onClick={() => setView('student')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'student' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>学生入口</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {isTeacherAuthenticated ? <Unlock size={12}/> : <Lock size={12}/>} 管理端
          </button>
        </div>
      </nav>

      {/* 密码验证 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/10 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-center font-black text-slate-800 mb-6">管理端访问代码</h3>
            <input 
              type="password" 
              autoFocus 
              maxLength={4} 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} 
              className="w-full text-center text-2xl py-3 bg-slate-100 rounded-xl mb-6 outline-none border-2 border-transparent focus:border-blue-500 transition-all font-black tracking-widest" 
            />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowPasswordPrompt(false)} className="py-3 bg-slate-50 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={() => handleVerifyPassword()} className="py-3 bg-black text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors">登录</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 pt-10">
        {view === 'student' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 用户基本信息 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 opacity-10 group-focus-within:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-2 mb-8 text-slate-400">
                 <User size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Digital Learning Profile</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: '姓名', key: 'name', ph: '输入姓名' },
                   { label: '学号', key: 'studentId', ph: '输入学号' },
                   { label: '班级', key: 'className', ph: '班级名称' }
                 ].map(f => (
                   <div key={f.key} className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">{f.label}</label>
                     <input 
                       value={profile[f.key as keyof typeof profile]} 
                       onChange={e => setProfile({...profile, [f.key]: e.target.value})} 
                       placeholder={f.ph} 
                       className="w-full bg-slate-50 p-4 rounded-xl border border-transparent focus:bg-white focus:border-slate-200 transition-all text-sm font-bold outline-none placeholder:text-slate-300" 
                     />
                   </div>
                 ))}
               </div>
            </div>

            {/* 标签页导航 */}
            <div className="flex bg-slate-200/40 p-1.5 rounded-2xl max-w-md mx-auto border border-slate-200/20">
              {[
                {id: 'pre', label: '阶段前', icon: <Target size={14}/>}, 
                {id: 'post', label: '阶段后', icon: <Award size={14}/>}, 
                {id: 'compare', label: '成长看板', icon: <LayoutDashboard size={14}/>}
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id as any)} 
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? 'bg-white shadow-md text-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* 评估题目内容 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-12 pb-32">
                <div className="flex justify-between items-end px-2">
                   <div>
                     <h2 className="text-2xl font-black tracking-tight">{activeTab === 'pre' ? '初始基准评估' : '学习成果评估'}</h2>
                     <p className="text-xs text-slate-400 mt-1">请根据真实感受进行五级评分 (A最高, E最低)</p>
                   </div>
                   <button onClick={handleReset} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                </div>

                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questions.length, 0);
                  return (
                    <div key={cat.name} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-5 ml-2">
                        <div className="w-1.5 h-5 rounded-full" style={{backgroundColor: cat.color}}></div>
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">{cat.name}</h3>
                      </div>
                      <div className="bg-white rounded-[32px] border border-slate-200/50 p-8 space-y-12 shadow-sm">
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const currentRating = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-5">
                              <p className="font-bold text-slate-800 text-[15px] leading-relaxed flex gap-4">
                                <span className="shrink-0 text-slate-200 font-black">{qIdx < 10 ? `0${qIdx}` : qIdx}</span>
                                {q}
                              </p>
                              <div className="flex gap-2.5">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button 
                                    key={r} 
                                    onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                    className={`flex-1 py-4 rounded-2xl border-2 font-black text-xs transition-all ${
                                      currentRating === r 
                                      ? 'bg-black border-black text-white shadow-lg scale-105' 
                                      : 'border-slate-50 bg-slate-50 text-slate-300 hover:border-slate-200'
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
                <div className="bg-white rounded-[48px] p-10 sm:p-14 border border-slate-200/60 shadow-xl relative overflow-hidden">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black tracking-tight text-slate-900">核心能力评估图</h3>
                    <p className="text-[10px] font-black text-slate-300 mt-3 uppercase tracking-[0.3em]">Growth Radar Portrait</p>
                  </div>
                  
                  <RadarChart pre={preScores} post={postScores} onSelectCategory={setActiveCategory} activeIdx={activeCategory} />
                  
                  {activeCategory !== null && (
                    <div className="mt-14 p-8 rounded-[40px] bg-slate-50 border border-slate-100 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                       <div className="flex items-center justify-between mb-8">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{backgroundColor: CATEGORIES[activeCategory].color}}><Target size={20}/></div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">{CATEGORIES[activeCategory].name}</h4>
                              <p className="text-[10px] font-bold text-slate-400">维度深度分析</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-blue-600 bg-blue-100/50 px-4 py-1.5 rounded-full border border-blue-100">提升 +{postScores[activeCategory] - preScores[activeCategory]} 分</span>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                          {CATEGORIES[activeCategory].questions.map((q, i) => {
                            const qIdx = CATEGORIES.slice(0, activeCategory).reduce((a,b)=>a+b.questions.length, 0) + i + 1;
                            const r1 = preRatings[qIdx] || '-';
                            const r2 = postRatings[qIdx] || '-';
                            return (
                              <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                                <span className="text-[13px] font-bold text-slate-500 truncate mr-6">{q}</span>
                                <div className="flex items-center gap-5 shrink-0">
                                  <div className="text-center">
                                    <span className="block text-[8px] font-black text-slate-200 uppercase">Pre</span>
                                    <span className="text-sm font-black text-slate-300">{r1}</span>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-200"/>
                                  <div className="text-center">
                                    <span className="block text-[8px] font-black text-blue-200 uppercase">Post</span>
                                    <span className="text-lg font-black text-blue-600">{r2}</span>
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
                    className={`w-full py-7 rounded-[36px] font-black text-lg transition-all flex items-center justify-center gap-4 shadow-2xl ${
                      syncSuccess 
                        ? 'bg-green-500 text-white shadow-green-100' 
                        : isSubmitting 
                          ? 'bg-slate-200 text-slate-400' 
                          : 'bg-black text-white hover:bg-slate-900 active:scale-95'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : syncSuccess ? <CheckCircle2 size={24}/> : <Database size={24}/>}
                    {syncSuccess ? "已成功归档到 Notion" : isSubmitting ? "正在写入云端数据..." : "确认并同步至 Notion"}
                  </button>
                  {syncSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest animate-bounce mt-2">
                       <CheckCircle2 size={12}/> Awesome! Data is safe in the cloud.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 管理员视图 */
          <div className="space-y-8 pb-40 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">学生档案库</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                  <Database size={12}/> 共计 {records.length} 条已同步记录
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={loadRecords} 
                  className={`p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-black hover:border-black transition-all shadow-sm ${isFetching ? 'opacity-50' : ''}`}
                >
                  <RefreshCw size={22} className={isFetching ? 'animate-spin' : ''}/>
                </button>
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-black transition-colors" size={20}/>
              <input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="搜索姓名或学号..." 
                className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-[28px] outline-none focus:ring-4 focus:ring-slate-100 transition-all text-sm font-bold shadow-sm" 
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              {isFetching && records.length === 0 ? (
                 [1,2,3,4].map(i => <div key={i} className="h-28 bg-white border border-slate-100 rounded-[32px] animate-pulse"></div>)
              ) : filteredRecords.length === 0 ? (
                <div className="py-24 text-center text-slate-300 font-bold border-2 border-dashed border-slate-200 rounded-[48px] flex flex-col items-center">
                  <div className="bg-slate-50 p-6 rounded-full mb-4"><Search size={32}/></div>
                  <p>未发现匹配的记录</p>
                </div>
              ) : filteredRecords.map(r => (
                <div key={r.id} className="bg-white p-7 rounded-[36px] border border-slate-200/60 shadow-sm flex items-center justify-between group hover:shadow-xl hover:border-blue-100 transition-all cursor-default">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center font-black text-slate-300 group-hover:bg-black group-hover:text-white transition-all text-2xl">{r.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-xl text-slate-800">{r.name}</h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                          {r.className} <span className="opacity-30">|</span> {r.studentId}
                        </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{r.postScore}</div>
                        <div className="text-[9px] font-black text-slate-200 uppercase tracking-widest">Final Points</div>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-200 group-hover:text-blue-500 group-hover:border-blue-100 transition-all">
                        <ChevronRight size={20}/>
                      </div>
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
