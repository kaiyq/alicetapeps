
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  TrendingUp, 
  RefreshCw, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  Search, 
  ChevronRight, 
  ChevronDown,
  X, 
  Save, 
  User, 
  LogOut,
  ArrowRight,
  LayoutDashboard,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
  Sparkles,
  Layers,
  Users
} from 'lucide-react';

// ============================================================
// 🎯 核心配置
// ============================================================
const DEFAULT_CONFIG = {
  apiKey: "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", 
  dbId: "2d36f36bb31880cbbb70c43247b18de1", 
  proxyUrl: "https://alicetapeps.icu" 
};

const TEACHER_PASSWORD = "0209";

// ============================================================
// 📊 评分维度与题目
// ============================================================
type Rating = 'A' | 'B' | 'C' | 'D' | 'E';
const RATING_MAP: Record<Rating, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 };

const CATEGORIES = [
  { name: 'Content', color: '#6366F1', questionsCount: 4 },
  { name: 'Delivery', color: '#10B981', questionsCount: 7 }, 
  { name: 'Language', color: '#F59E0B', questionsCount: 5 },
  { name: 'Logic', color: '#EA580C', questionsCount: 4 }
];

const QUESTIONS = [
  "Beginning, body and ending included?", 
  "Attention getter? (Questions, stories or statistics?)", 
  "Clear opinions?", 
  "Impressive ending?", 
  "Fluctuating tone? Comforting tone?", 
  "Proper pace? Proper volume? Proper pitch?", 
  "Proper stresses? Proper pauses?", 
  "Clear pronunciation? Any pronouncing mistakes?", 
  "Vivid body language? Open gestures?", 
  "Nervous movements?", 
  "Vivid facial expressions? Eye Contact? Smile?",
  "Fluency?", 
  "Accuracy and economy? Any grammar mistakes?", 
  "Vividness and visualization?", 
  "Any filler words?", 
  "How many complete and right sentences? (A:80-100%, B:60-80%, C:40-60%, D:20-40%, E:0-20%)",
  "Clear and ordered structure?", 
  "Sufficient supportive material?", 
  "Valid evidence?", 
  "Coherence?"
];

const TOTAL_QUESTIONS = 20;

// ============================================================
// 🚀 Notion 服务
// ============================================================
class NotionService {
  static getHeaders() { 
    return { 
      "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, 
      "Content-Type": "application/json", 
      "Notion-Version": "2022-06-28" 
    }; 
  }
  
  static getBaseUrl() { 
    return `${DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '')}/v1/`; 
  }

  static async syncRecord(record: any) {
    try {
      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST", headers: this.getHeaders(),
        body: JSON.stringify({ 
          parent: { database_id: DEFAULT_CONFIG.dbId }, 
          properties: {
            "Name": { "title": [{ "text": { "content": record.name || "Unknown" } }] },
            "StudentID": { "rich_text": [{ "text": { "content": record.studentId || "-" } }] },
            "Class": { "rich_text": [{ "text": { "content": record.className || "" } }] },
            "PreScore": { "number": Number(record.preScore) || 0 },
            "PostScore": { "number": Number(record.postScore) || 0 },
            "Pre_Content": { "number": Number(record.preScores[0]) || 0 },
            "Pre_Delivery": { "number": Number(record.preScores[1]) || 0 },
            "Pre_Language": { "number": Number(record.preScores[2]) || 0 },
            "Pre_Logic": { "number": Number(record.preScores[3]) || 0 },
            "Post_Content": { "number": Number(record.postScores[0]) || 0 },
            "Post_Delivery": { "number": Number(record.postScores[1]) || 0 },
            "Post_Language": { "number": Number(record.postScores[2]) || 0 },
            "Post_Logic": { "number": Number(record.postScores[3]) || 0 }
          }
        })
      });
      return res.ok ? { success: true } : { success: false, message: "Sync failed" };
    } catch (e: any) { return { success: false, message: e.message }; }
  }

  static async fetchRecords(): Promise<any[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}/query`, { 
        method: "POST", headers: this.getHeaders() 
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results.map((page: any) => {
        const p = page.properties;
        const getVal = (k: string) => {
          const prop = p[k];
          if (!prop) return 0;
          if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
          if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
          if (prop.type === 'number') return prop.number || 0;
          if (prop.type === 'multi_select') return prop.multi_select?.map((m: any) => m.name).join(', ') || '';
          return 0;
        };
        return {
          id: page.id,
          name: getVal("Name") || '未命名',
          studentId: getVal("StudentID") || '-',
          className: getVal("Class") || '未分类',
          preScore: getVal("PreScore") || 0,
          postScore: getVal("PostScore") || 0,
          preSubScores: [getVal("Pre_Content"), getVal("Pre_Delivery"), getVal("Pre_Language"), getVal("Pre_Logic")],
          postSubScores: [getVal("Post_Content"), getVal("Post_Delivery"), getVal("Post_Language"), getVal("Post_Logic")]
        };
      });
    } catch { return []; }
  }

  static async deleteRecord(pageId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}pages/${pageId}`, { 
        method: "PATCH", headers: this.getHeaders(), body: JSON.stringify({ archived: true }) 
      });
      return res.ok;
    } catch { return false; }
  }
}

// ============================================================
// 🎨 雷达图 (带交互分值与图例)
// ============================================================
const RadarChart: React.FC<{ preScores: number[], postScores: number[], size?: number }> = ({ preScores, postScores, size = 200 }) => {
  const center = size / 2;
  const radius = size * 0.32;
  const angleStep = (Math.PI * 2) / CATEGORIES.length;

  const getPoints = (data: number[]) => data.map((val, i) => {
    const maxScore = CATEGORIES[i].questionsCount * 4 || 1;
    const r = (Math.min(val, maxScore) / maxScore) * radius; 
    return { 
      x: center + r * Math.cos(i * angleStep - Math.PI / 2), 
      y: center + r * Math.sin(i * angleStep - Math.PI / 2),
      val
    };
  });

  const prePoints = getPoints(preScores);
  const postPoints = getPoints(postScores);

  return (
    <div className="relative inline-block select-none">
      {/* 图例 */}
      <div className="absolute -top-6 left-0 right-0 flex justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t border-dashed border-slate-300"></div>
          <span className="text-[9px] font-black uppercase text-slate-400">学前 (Pre)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-500"></div>
          <span className="text-[9px] font-black uppercase text-indigo-500">期末 (Post)</span>
        </div>
      </div>

      <svg width={size} height={size} className="mx-auto overflow-visible mt-2">
        {/* 背景环 */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
        ))}
        {CATEGORIES.map((cat, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        
        {/* 学前测数据面 (灰色虚线) */}
        <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(148, 163, 184, 0.05)" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" className="transition-all duration-700" />
        
        {/* 期末测数据面 (紫色实线) */}
        <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(99, 102, 241, 0.15)" stroke="#6366F1" strokeWidth="2.5" className="transition-all duration-700 drop-shadow-lg" />

        {/* 动态分值点与文字 (仅针对期末) */}
        {postPoints.map((p, i) => (
          <g key={`post-${i}`} className="transition-all duration-700">
            <circle cx={p.x} cy={p.y} r="4" fill="#6366F1" stroke="white" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-black fill-indigo-600 drop-shadow-sm italic">{p.val}</text>
          </g>
        ))}

        {/* 维度文字 */}
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 32) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 32) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black fill-slate-400 uppercase italic tracking-tighter">{cat.name}</text>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================
// 📊 维度提升明细组件
// ============================================================
const ImprovementPanel: React.FC<{ pre: number[], post: number[] }> = ({ pre, post }) => (
  <div className="space-y-3 pt-4 text-left">
    <div className="flex items-center gap-2 mb-4">
      <Zap size={14} className="text-indigo-500 fill-indigo-500"/>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Core Improvement / 维度提升明细</span>
    </div>
    {CATEGORIES.map((cat, i) => {
      const preVal = pre[i];
      const postVal = post[i];
      const gain = postVal - preVal;
      const max = cat.questionsCount * 4;
      return (
        <div key={cat.name} className="flex items-center justify-between bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[11px] font-black uppercase italic block mb-1">{cat.name}</span>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 rounded-full transition-all duration-1000" style={{ width: `${(preVal/max)*100}%` }}></div>
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 -mt-1.5" style={{ width: `${(postVal/max)*100}%` }}></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">{preVal} → {postVal}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 font-black italic ${gain > 0 ? 'text-emerald-500' : gain < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
            {gain > 0 ? <ArrowUpRight size={14}/> : gain < 0 ? <ArrowDownRight size={14}/> : <Minus size={14}/>}
            <span className="text-xl">{gain > 0 ? `+${gain}` : gain}</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ============================================================
// 📱 主程序
// ============================================================
const App: React.FC = () => {
  const [view, setView] = useState<'student' | 'teacher'>(() => (localStorage.getItem('tapeps_auth') ? 'teacher' : 'student'));
  const [activeTab, setActiveTab] = useState<'pre' | 'post' | 'compare'>('pre');
  const [isTeacherAuth, setIsTeacherAuth] = useState(() => localStorage.getItem('tapeps_auth') === 'true');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdIn, setPwdIn] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  const [teacherViewMode, setTeacherViewMode] = useState<'all' | 'class'>('class');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All Classes');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('tapeps_profile') || '{"name":"","studentId":"","className":""}'));
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_pre_ratings') || '{}'));
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_post_ratings') || '{}'));
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleRefresh = async () => {
    setIsFetching(true);
    const data = await NotionService.fetchRecords();
    setRecords(data);
    const classes = new Set(data.map(r => (r.className || '未分类').split(',')[0].trim()));
    setExpandedClasses(classes);
    setIsFetching(false);
  };

  useEffect(() => {
    if (view === 'teacher') handleRefresh();
  }, [view]);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);

  const resetAssessment = () => {
    if(confirm("确定要重置当前测评吗？所有已填写内容将被永久清空。")) {
      setProfile({name:"", studentId:"", className:""});
      setPreRatings({});
      setPostRatings({});
      setActiveTab('pre');
      setSynced(false);
      window.scrollTo(0, 0);
    }
  };

  const preDoneCount = Object.keys(preRatings).length;
  const postDoneCount = Object.keys(postRatings).length;
  const isPreComplete = preDoneCount === TOTAL_QUESTIONS;
  const isPostComplete = postDoneCount === TOTAL_QUESTIONS;

  const preScoresArr = useMemo(() => CATEGORIES.map((cat, idx) => {
    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
    let s = 0; for(let i=1; i<=cat.questionsCount; i++) s += RATING_MAP[preRatings[offset + i]] || 0;
    return s;
  }), [preRatings]);

  const postScoresArr = useMemo(() => CATEGORIES.map((cat, idx) => {
    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
    let s = 0; for(let i=1; i<=cat.questionsCount; i++) s += RATING_MAP[postRatings[offset + i]] || 0;
    return s;
  }), [postRatings]);

  const preTotal = preScoresArr.reduce((a, b) => a + b, 0);
  const postTotal = postScoresArr.reduce((a, b) => a + b, 0);

  const allAvailableClasses = useMemo(() => {
    const classes = new Set<string>();
    records.forEach(r => {
      const cls = (r.className || '未分类').split(/[,，]/)[0].trim();
      classes.add(cls);
    });
    return Array.from(classes).sort();
  }, [records]);

  const processedRecords = useMemo<Record<string, any[]>>(() => {
    const s = search.toLowerCase();
    let filtered = records.filter(r => 
      r.name.toLowerCase().includes(s) || 
      r.studentId.toLowerCase().includes(s) || 
      r.className.toLowerCase().includes(s)
    );
    
    if (selectedClassFilter !== 'All Classes') {
      filtered = filtered.filter(r => (r.className || '未分类').split(/[,，]/)[0].trim() === selectedClassFilter);
    }

    if (teacherViewMode === 'all') {
      return { 'Global List 全局列表': filtered };
    } else {
      const groups: Record<string, any[]> = {};
      filtered.forEach(r => {
        const cls = (r.className || '未分类').split(/[,，]/)[0].trim();
        if(!groups[cls]) groups[cls] = [];
        groups[cls].push(r);
      });
      return groups;
    }
  }, [records, search, teacherViewMode, selectedClassFilter]);

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-slate-950 font-sans pb-10 select-none">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1.5 rounded-xl text-white shadow-lg"><TrendingUp size={18}/></div>
          <span className="font-black text-xl italic tracking-tighter uppercase">Tapeps</span>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button onClick={() => setView('student')} className={`px-5 py-1.5 rounded-full text-[11px] font-black transition-all ${view === 'student' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>测评入口</button>
          <button onClick={() => isTeacherAuth ? setView('teacher') : setShowPwd(true)} className={`px-5 py-1.5 rounded-full text-[11px] font-black transition-all flex items-center gap-1 ${view === 'teacher' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Lock size={10}/> 教师管理</button>
        </div>
      </nav>

      {showPwd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-[320px] shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="font-black text-center mb-6 text-[10px] tracking-widest uppercase opacity-40 italic">Admin Login</h3>
            <input type="password" autoFocus value={pwdIn} onChange={e => setPwdIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && (pwdIn === TEACHER_PASSWORD ? (setIsTeacherAuth(true), localStorage.setItem('tapeps_auth','true'), setShowPwd(false), setView('teacher')) : alert("密码错误"))} className="w-full text-center text-3xl py-4 bg-slate-50 rounded-2xl mb-6 border border-slate-200 outline-none font-mono focus:border-slate-950 transition-all" placeholder="••••"/>
            <button onClick={() => setShowPwd(false)} className="w-full py-3 text-[11px] font-black uppercase text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-4 mt-6">
        {view === 'student' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest text-slate-400"><User size={12}/> Profile</div>
                <button onClick={resetAssessment} className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"><RotateCcw size={10}/> 重置测评</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['name', 'studentId', 'className'].map((k, i) => (
                  <input key={k} value={profile[k]} onChange={e => setProfile({...profile, [k]: e.target.value})} className="w-full bg-slate-50 px-3 py-3 rounded-xl border border-slate-200 text-xs font-bold focus:border-slate-950 outline-none transition-all" placeholder={['姓名', '学号', '班级'][i]}/>
                ))}
              </div>
            </div>

            <div className="flex bg-slate-200 p-0.5 rounded-full border border-slate-300 mx-auto w-fit shadow-inner">
              {[{id:'pre', l:'学前测'}, {id:'post', l:'期末测'}, {id:'compare', l:'分析报告'}].map(t => (
                <button key={t.id} onClick={() => {
                  if(t.id === 'post' && !isPreComplete) return alert(`请先完成学前测全部题目 (还剩 ${TOTAL_QUESTIONS - preDoneCount} 题)`);
                  if(t.id === 'compare' && (!isPreComplete || !isPostComplete)) return alert("请完成全部测试后再查看报告");
                  setActiveTab(t.id as any);
                }} className={`px-10 py-2.5 rounded-full text-[12px] font-black transition-all flex items-center gap-1.5 ${activeTab === t.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                  {t.l}
                </button>
              ))}
            </div>

            <div className="pb-24 space-y-6">
              {activeTab !== 'compare' ? (
                <>
                  <div className={`flex items-center justify-between px-6 py-4 rounded-[28px] text-white shadow-xl transition-all ${((activeTab === 'pre' && isPreComplete) || (activeTab === 'post' && isPostComplete)) ? 'bg-emerald-600' : 'bg-slate-950'}`}>
                     <span className="text-[10px] font-black uppercase opacity-60 tracking-widest italic">Progress</span>
                     <span className="text-sm font-black italic flex items-center gap-2">
                        {(activeTab === 'pre' ? preDoneCount : postDoneCount)} / {TOTAL_QUESTIONS}
                        {((activeTab === 'pre' && isPreComplete) || (activeTab === 'post' && isPostComplete)) && <CheckCircle2 size={16}/>}
                     </span>
                  </div>
                  {CATEGORIES.map((cat, idx) => {
                    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                    return (
                      <div key={cat.name} className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: cat.color}}></div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 italic">{cat.name}</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                            const qIdx = offset + i + 1;
                            const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                            return (
                              <div key={qIdx} className="p-5 space-y-4">
                                <p className="text-[14px] font-bold text-slate-900 leading-snug">{qIdx}. {q}</p>
                                <div className="flex gap-2">
                                  {(['A','B','C','D','E'] as Rating[]).map(r => (
                                    <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                      className={`flex-1 h-12 rounded-2xl font-black text-lg transition-all border ${current === r ? 'bg-slate-950 text-white border-slate-950 shadow-xl scale-105' : 'bg-white text-slate-300 border-slate-200'}`}>{r}</button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-6">
                    {activeTab === 'pre' ? (
                      <button onClick={() => isPreComplete ? setActiveTab('post') : alert("请完成学前测全部题目")} className={`w-full py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all ${isPreComplete ? 'bg-slate-950 text-white shadow-2xl' : 'bg-slate-100 text-slate-300'}`}>进入期末测 <ArrowRight size={20}/></button>
                    ) : (
                      <button onClick={() => isPostComplete ? setActiveTab('compare') : alert("请完成期末测全部题目")} className={`w-full py-6 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all ${isPostComplete ? 'bg-slate-950 text-white shadow-2xl' : 'bg-slate-100 text-slate-300'}`}>生成分析报告 <Sparkles size={20}/></button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm text-center space-y-8">
                    <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={280} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                        <p className="text-[9px] font-black uppercase opacity-40 mb-1 italic">PRE TOTAL / 学前总分</p>
                        <p className="text-4xl font-black italic">{preTotal}</p>
                      </div>
                      <div className="bg-slate-950 p-6 rounded-[28px] text-white shadow-2xl">
                        <p className="text-[9px] font-black uppercase opacity-60 mb-1 italic">POST TOTAL / 期末总分</p>
                        <p className="text-4xl font-black italic">{postTotal}</p>
                      </div>
                    </div>

                    {/* 补全：提升明细面板 */}
                    <ImprovementPanel pre={preScoresArr} post={postScoresArr} />
                  </div>

                  <button onClick={async () => {
                    if(!profile.name || !profile.studentId) return alert("请补全考生资料");
                    setSubmitting(true);
                    const res = await NotionService.syncRecord({ ...profile, preScore: preTotal, postScore: postTotal, preScores: preScoresArr, postScores: postScoresArr });
                    if(res.success) setSynced(true);
                    else alert("同步失败");
                    setSubmitting(false);
                  }} disabled={submitting || synced} className={`w-full py-5 rounded-[28px] font-black text-base flex items-center justify-center gap-3 border transition-all active:scale-95 ${synced ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-950 text-white border-slate-950 shadow-2xl'}`}>
                    {submitting ? <Loader2 size={20} className="animate-spin"/> : synced ? <><CheckCircle2 size={20}/> 云端已归档</> : <><Save size={20}/> 同步至 Notion</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-24 animate-in fade-in duration-300">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black italic uppercase flex items-center gap-2"><LayoutDashboard size={22}/> Data Vault</h2>
                <div className="flex gap-3">
                  <button onClick={handleRefresh} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-950 transition-all"><RefreshCw size={18} className={isFetching ? 'animate-spin' : ''}/></button>
                  <button onClick={() => { localStorage.removeItem('tapeps_auth'); setIsTeacherAuth(false); setView('student'); }} className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600"><LogOut size={18}/></button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button onClick={() => setTeacherViewMode('class')} className={`flex-1 py-2 rounded-[10px] text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${teacherViewMode === 'class' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Layers size={14}/> 按班级分类</button>
                  <button onClick={() => setTeacherViewMode('all')} className={`flex-1 py-2 rounded-[10px] text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${teacherViewMode === 'all' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Users size={14}/> 全局列表</button>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input type="text" placeholder="搜索姓名/学号..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:border-slate-950 transition-all"/>
                  </div>
                  <div className="relative">
                    <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="appearance-none bg-slate-950 text-white pl-4 pr-10 py-3 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer">
                      <option value="All Classes">All Classes</option>
                      {allAvailableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Fix: Added explicit type cast to Object.entries to resolve 'unknown' type errors for group.length and group.map */}
              {(Object.entries(processedRecords) as [string, any[]][]).sort().map(([title, group]) => (
                <div key={title} className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => teacherViewMode === 'class' && setExpandedClasses(p => { const n = new Set(p); n.has(title) ? n.delete(title) : n.add(title); return n; })}
                    className={`px-6 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-100 transition-all ${teacherViewMode === 'class' ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-2 font-black text-[11px] uppercase italic text-slate-500">
                      {teacherViewMode === 'class' && (expandedClasses.has(title) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
                      {title} <span className="opacity-30">({group.length})</span>
                    </div>
                  </div>
                  {(teacherViewMode === 'all' || expandedClasses.has(title)) && (
                    <div className="divide-y divide-slate-50">
                      {group.map(r => (
                        <div key={r.id} onClick={() => setDetail(r)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all">{r.name.charAt(0)}</div>
                            <div>
                              <h5 className="font-black text-[14px] leading-none mb-1">{r.name}</h5>
                              <p className="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter">{r.studentId} {teacherViewMode === 'all' && `• ${r.className}`}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                             <div>
                                <p className="text-2xl font-black italic leading-none">{r.postScore}</p>
                                <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Score</p>
                             </div>
                             <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-950"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {records.length === 0 && <div className="p-20 text-center text-slate-200 font-black uppercase italic border-4 border-dashed border-slate-100 rounded-[40px]">No Data in Vault</div>}
            </div>
          </div>
        )}
      </main>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-950 p-8 space-y-8 animate-in zoom-in-95">
            <button onClick={() => setDetail(null)} className="absolute top-6 right-6 text-slate-300 hover:text-black"><X size={24}/></button>
            <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
              <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-3xl italic">{detail.name.charAt(0)}</div>
              <div>
                <h3 className="font-black text-2xl leading-none mb-1.5">{detail.name}</h3>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest italic">{detail.studentId} • {detail.className}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl text-center"><p className="text-[8px] font-black uppercase opacity-40 mb-1">PRE</p><p className="text-2xl font-black italic">{detail.preScore}</p></div>
              <div className="bg-indigo-50 p-4 rounded-2xl text-center text-indigo-600"><p className="text-[8px] font-black uppercase opacity-60 mb-1">POST</p><p className="text-2xl font-black italic">{detail.postScore}</p></div>
              <div className="bg-slate-950 p-4 rounded-2xl text-center text-white"><p className="text-[8px] font-black text-slate-500 uppercase">GAIN</p><p className="text-2xl font-black italic">{detail.postScore-detail.preScore}</p></div>
            </div>

            <div className="text-center">
               <RadarChart preScores={detail.preSubScores} postScores={detail.postSubScores} size={240} />
               <div className="mt-8 border-t border-slate-50 pt-4">
                 <ImprovementPanel pre={detail.preSubScores} post={detail.postSubScores} />
               </div>
            </div>

            <button onClick={() => { if(confirm("确认删除？")) NotionService.deleteRecord(detail.id).then(() => { setDetail(null); handleRefresh(); }); }} className="w-full py-4 text-rose-500 font-black text-[11px] uppercase border border-rose-100 bg-rose-50/50 rounded-2xl hover:bg-rose-50 tracking-widest transition-all">Delete Cloud Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
