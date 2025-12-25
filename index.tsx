
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
  Filter,
  Users,
  Layers,
  CircleAlert
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
// 📊 评分维度与题目 (严格 20 道题)
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

  static async getDbSchema() {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}`, { 
        method: "GET", headers: this.getHeaders() 
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.properties;
    } catch { return null; }
  }
  
  static async syncRecord(record: any) {
    try {
      const schema = await this.getDbSchema();
      if (!schema) throw new Error("Could not reach Notion database schema.");

      const schemaKeys = Object.keys(schema);
      const findActualKey = (candidates: string[]) => {
        let match = candidates.find(c => schemaKeys.includes(c));
        if (match) return match;
        match = candidates.find(c => {
          const normC = c.trim().toLowerCase();
          return schemaKeys.find(sk => sk.trim().toLowerCase() === normC);
        });
        return match ? schemaKeys.find(sk => sk.trim().toLowerCase() === match!.trim().toLowerCase()) : null;
      };

      const nameKey = findActualKey(["Name", "姓名"]);
      const sidKey = findActualKey(["StudentID", "学号"]);
      const classKey = findActualKey(["Class", "班级"]);
      const preTotalKey = findActualKey(["PreScore", "学前总分"]);
      const postTotalKey = findActualKey(["PostScore", "期末总分"]);

      const properties: any = {};
      if (nameKey) properties[nameKey] = { "title": [{ "text": { "content": record.name || "Unknown" } }] };
      if (sidKey) properties[sidKey] = { "rich_text": [{ "text": { "content": record.studentId || "-" } }] };
      if (classKey) {
        if (schema[classKey].type === "multi_select") {
            properties[classKey] = { "multi_select": record.className ? record.className.split(/[,，]/).map((s: string) => ({ name: s.trim() })).filter((o: any) => o.name) : [] };
        } else {
            properties[classKey] = { "rich_text": [{ "text": { "content": record.className || "" } }] };
        }
      }
      if (preTotalKey) properties[preTotalKey] = { "number": Number(record.preScore) || 0 };
      if (postTotalKey) properties[postTotalKey] = { "number": Number(record.postScore) || 0 };

      const subScoreMap = [
        { cands: ["Pre_Content", "学前内容"], val: record.preScores[0] },
        { cands: ["Pre_Delivery", "学前表现"], val: record.preScores[1] },
        { cands: ["Pre_Language", "学前语言"], val: record.preScores[2] },
        { cands: ["Pre_Logic", "学前逻辑"], val: record.preScores[3] },
        { cands: ["Post_Content", "期末内容"], val: record.postScores[0] },
        { cands: ["Post_Delivery", "期末表现"], val: record.postScores[1] },
        { cands: ["Post_Language", "期末语言"], val: record.postScores[2] },
        { cands: ["Post_Logic", "期末逻辑"], val: record.postScores[3] }
      ];

      subScoreMap.forEach(item => {
        const k = findActualKey(item.cands);
        if (k) properties[k] = { "number": Number(item.val) || 0 };
      });

      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST", headers: this.getHeaders(),
        body: JSON.stringify({ parent: { database_id: DEFAULT_CONFIG.dbId }, properties })
      });

      return res.ok ? { success: true } : { success: false, message: "Sync failed" };
    } catch (e: any) { 
      return { success: false, message: e.message || "Network Error" }; 
    }
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
        const findVal = (cands: string[], type: string) => {
          const key = Object.keys(p).find(k => cands.map(c => c.toLowerCase()).includes(k.toLowerCase().trim()));
          if (!key) return null;
          const prop = p[key];
          if (type === 'title') return prop.title?.[0]?.plain_text;
          if (type === 'rich_text') return prop.rich_text?.[0]?.plain_text;
          if (type === 'number') return prop.number;
          if (type === 'multi_select') return prop.multi_select?.map((m:any) => m.name).join(', ');
          return null;
        };

        return {
          id: page.id,
          name: findVal(["Name", "姓名"], 'title') || '未命名',
          studentId: findVal(["StudentID", "学号"], 'rich_text') || '-',
          className: findVal(["Class", "班级"], 'multi_select') || findVal(["Class", "班级"], 'rich_text') || '未分类',
          preScore: findVal(["PreScore", "学前总分"], 'number') || 0,
          postScore: findVal(["PostScore", "期末总分"], 'number') || 0,
          preSubScores: [
            p.Pre_Content?.number || p["学前内容"]?.number || 0,
            p.Pre_Delivery?.number || p["学前表现"]?.number || 0,
            p.Pre_Language?.number || p["学前语言"]?.number || 0,
            p.Pre_Logic?.number || p["学前逻辑"]?.number || 0
          ],
          postSubScores: [
            p.Post_Content?.number || p["期末内容"]?.number || 0,
            p.Post_Delivery?.number || p["期末表现"]?.number || 0,
            p.Post_Language?.number || p["期末语言"]?.number || 0,
            p.Post_Logic?.number || p["期末逻辑"]?.number || 0
          ]
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
// 🎨 雷达图 (双色动态对比)
// ============================================================
const RadarChart: React.FC<{ preScores: number[], postScores: number[], size?: number }> = ({ preScores, postScores, size = 200 }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / CATEGORIES.length;

  const getPoints = (data: number[]) => data.map((val, i) => {
    const maxScore = CATEGORIES[i].questionsCount * 4 || 1;
    const r = (Math.min(val, maxScore) / maxScore) * radius; 
    return { 
      x: center + r * Math.cos(i * angleStep - Math.PI / 2), 
      y: center + r * Math.sin(i * angleStep - Math.PI / 2)
    };
  });

  const prePoints = getPoints(preScores);
  const postPoints = getPoints(postScores);

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
        ))}
        {CATEGORIES.map((cat, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <polygon 
          points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} 
          fill="rgba(148, 163, 184, 0.05)" 
          stroke="#94A3B8" 
          strokeWidth="1.5" 
          strokeDasharray="4 3" 
        />
        <polygon 
          points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} 
          fill="rgba(99, 102, 241, 0.15)" 
          stroke="#6366F1" 
          strokeWidth="2.5" 
          className="drop-shadow-sm"
        />
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 28) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 28) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text 
              key={i} 
              x={x} 
              y={y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="text-[10px] font-black fill-slate-900 uppercase italic tracking-tight"
            >
              {cat.name}
            </text>
          );
        })}
      </svg>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-slate-400 border border-dashed border-slate-400"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase italic">Pre-Test</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-indigo-500"></div>
          <span className="text-[10px] font-bold text-indigo-500 uppercase italic">Post-Test</span>
        </div>
      </div>
    </div>
  );
};

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
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  
  const [teacherViewMode, setTeacherViewMode] = useState<'all' | 'class'>('class');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All Classes');

  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('tapeps_profile') || '{"name":"","studentId":"","className":""}'));
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_pre_ratings') || '{}'));
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_post_ratings') || '{}'));
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);

  const preDoneCount = useMemo(() => Object.keys(preRatings).length, [preRatings]);
  const postDoneCount = useMemo(() => Object.keys(postRatings).length, [postRatings]);
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

  const preTotal = useMemo(() => preScoresArr.reduce((a, b) => a + b, 0), [preScoresArr]);
  const postTotal = useMemo(() => postScoresArr.reduce((a, b) => a + b, 0), [postScoresArr]);

  const navigateTo = (tab: 'pre' | 'post' | 'compare') => {
    // 逻辑校验：进入下一阶段必须完成上一阶段的所有题目
    if (tab === 'post') {
      if (!isPreComplete) {
        alert(`请先完成学前测的全部题目（还剩 ${TOTAL_QUESTIONS - preDoneCount} 题）`);
        return;
      }
    } else if (tab === 'compare') {
      if (!isPreComplete) {
        alert(`请先完成学前测的全部题目`);
        return;
      }
      if (!isPostComplete) {
        alert(`请先完成期末测的全部题目（还剩 ${TOTAL_QUESTIONS - postDoneCount} 题）`);
        return;
      }
    }
    
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => { 
    setIsFetching(true); 
    const data = await NotionService.fetchRecords(); 
    setRecords(data); 
    if(data.length > 0) setExpandedClasses(new Set(data.map(r => r.className?.split(',')[0] || '未分类')));
    setIsFetching(false); 
  };

  useEffect(() => { if(isTeacherAuth && view === 'teacher') handleRefresh(); }, [isTeacherAuth, view]);

  const allAvailableClasses = useMemo(() => {
    const classes = new Set<string>();
    records.forEach(r => {
      const cls = r.className?.split(/[,，]/)[0].trim() || '未分类';
      classes.add(cls);
    });
    return Array.from(classes).sort();
  }, [records]);

  const recordsByView = useMemo(() => {
    const s = search.toLowerCase();
    let filtered = records.filter(r => (r.name||"").toLowerCase().includes(s) || (r.studentId||"").toLowerCase().includes(s));
    
    if (selectedClassFilter !== 'All Classes') {
      filtered = filtered.filter(r => (r.className?.split(/[,，]/)[0].trim() || '未分类') === selectedClassFilter);
    }

    if (teacherViewMode === 'all') {
      return { '全局列表': filtered };
    } else {
      const groups: Record<string, any[]> = {};
      filtered.forEach(r => { 
        const cls = r.className?.split(/[,，]/)[0].trim() || '未分类'; 
        if(!groups[cls]) groups[cls] = []; groups[cls].push(r); 
      });
      return groups;
    }
  }, [records, search, teacherViewMode, selectedClassFilter]);

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-slate-950 font-sans pb-10 select-none">
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm">
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
              <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest text-slate-400"><User size={12}/> 考生资料 Profile</div>
              <div className="grid grid-cols-3 gap-3">
                {['name', 'studentId', 'className'].map((k, i) => (
                  <input key={k} value={profile[k]} onChange={e => setProfile({...profile, [k]: e.target.value})} className="w-full bg-slate-50 px-3 py-3 rounded-xl border border-slate-200 text-xs font-bold focus:border-slate-950 outline-none transition-all" placeholder={['姓名', '学号', '班级'][i]}/>
                ))}
              </div>
            </div>

            <div className="flex bg-slate-200 p-0.5 rounded-full border border-slate-300 mx-auto w-fit shadow-inner">
              {[{id:'pre', l:'学前测'}, {id:'post', l:'期末测'}, {id:'compare', l:'分析报告'}].map(t => (
                <button key={t.id} onClick={() => navigateTo(t.id as any)} className={`px-10 py-2.5 rounded-full text-[12px] font-black transition-all flex items-center gap-1.5 ${activeTab === t.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                  {t.id !== 'pre' && !((t.id === 'post' && isPreComplete) || (t.id === 'compare' && isPreComplete && isPostComplete)) && <Lock size={10} className="opacity-40"/>}
                  {t.l}
                </button>
              ))}
            </div>

            <div className="space-y-4 pb-24">
              {activeTab !== 'compare' ? (
                <>
                  <div className={`flex items-center justify-between px-6 py-4 rounded-3xl text-white shadow-xl shadow-slate-200 transition-all ${((activeTab === 'pre' && isPreComplete) || (activeTab === 'post' && isPostComplete)) ? 'bg-emerald-600' : 'bg-slate-950'}`}>
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
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 italic">{cat.name} Dimension</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                            const qIdx = offset + i + 1;
                            const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                            return (
                              <div key={qIdx} className="p-5 space-y-4">
                                <p className="text-[14px] font-black text-slate-950 italic leading-snug">{qIdx}. {q}</p>
                                <div className="flex gap-2">
                                  {(['A','B','C','D','E'] as Rating[]).map(r => (
                                    <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                      className={`flex-1 h-12 rounded-2xl font-black text-lg transition-all border ${current === r ? 'bg-slate-950 text-white border-slate-950 shadow-xl scale-105' : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-50'}`}>{r}</button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-6 pb-12">
                    {activeTab === 'pre' ? (
                      <button 
                        onClick={() => navigateTo('post')} 
                        className={`w-full py-6 rounded-[32px] font-black text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] border-2 border-dashed ${isPreComplete ? 'bg-slate-50 text-slate-950 border-slate-950 hover:bg-slate-100' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
                      >
                        {isPreComplete ? '完成学前测，进入期末测' : `请先完成学前测 (剩 ${TOTAL_QUESTIONS - preDoneCount} 题)`}
                        {isPreComplete ? <ArrowRight size={24}/> : <Lock size={20}/>}
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigateTo('compare')} 
                        className={`w-full py-6 rounded-[32px] font-black text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] border-2 border-dashed ${isPostComplete ? 'bg-slate-50 text-slate-950 border-slate-950 hover:bg-slate-100' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
                      >
                        {isPostComplete ? '全部完成，查看分析报告' : `请先完成期末测 (剩 ${TOTAL_QUESTIONS - postDoneCount} 题)`}
                        {isPostComplete ? <TrendingUp size={24}/> : <Lock size={20}/>}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-white rounded-[48px] p-10 border border-slate-200 shadow-sm text-center space-y-8">
                    <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={280} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[9px] font-black uppercase opacity-40 mb-1 italic">PRE TOTAL</p>
                        <p className="text-4xl font-black italic">{preTotal}</p>
                      </div>
                      <div className="bg-slate-950 p-6 rounded-3xl text-white shadow-2xl">
                        <p className="text-[9px] font-black uppercase opacity-60 mb-1 italic">POST TOTAL</p>
                        <p className="text-4xl font-black italic">{postTotal}</p>
                      </div>
                    </div>

                    <div className="text-left space-y-3 pt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap size={14} className="text-indigo-500 fill-indigo-500"/>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Dimension Analysis</span>
                      </div>
                      {CATEGORIES.map((cat, i) => {
                        const pre = preScoresArr[i];
                        const post = postScoresArr[i];
                        const gain = post - pre;
                        const max = cat.questionsCount * 4;
                        return (
                          <div key={cat.name} className="flex items-center justify-between bg-slate-50 px-5 py-4 rounded-2xl border border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase italic tracking-tight mb-1">{cat.name}</span>
                              <div className="flex items-center gap-3">
                                <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                    style={{ width: `${(post / max) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{post}/{max}</span>
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
                  </div>

                  <button onClick={async () => {
                    if(!profile.name || !profile.studentId) { alert("请务必填写姓名和学号"); return; }
                    setSubmitting(true);
                    const res = await NotionService.syncRecord({ 
                      ...profile, 
                      preScore: preTotal, 
                      postScore: postTotal, 
                      preScores: preScoresArr, 
                      postScores: postScoresArr 
                    });
                    if(res.success) { setSynced(true); setTimeout(() => setSynced(false), 5000); } else alert(`同步失败: ${res.message || "未知原因"}`);
                    setSubmitting(false);
                  }} disabled={submitting || synced} className={`w-full py-5 rounded-[28px] font-black text-base flex items-center justify-center gap-3 border border-slate-950 transition-all active:scale-95 ${synced ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-950 text-white hover:bg-black shadow-2xl shadow-slate-200'}`}>
                    {submitting ? <Loader2 size={20} className="animate-spin"/> : synced ? <><CheckCircle2 size={20}/> 云端已归档</> : <><Save size={20}/> 立即同步至 Notion</>}
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
                <div className="flex items-center gap-2 px-1">
                   <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full">
                      <button onClick={() => setTeacherViewMode('class')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[10px] text-[10px] font-black uppercase transition-all ${teacherViewMode === 'class' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                        <Layers size={14}/> 按班级分类
                      </button>
                      <button onClick={() => setTeacherViewMode('all')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[10px] text-[10px] font-black uppercase transition-all ${teacherViewMode === 'all' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                        <Users size={14}/> 全局列表
                      </button>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 shadow-sm rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
                    <input type="text" placeholder="搜索姓名/学号..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-transparent text-[11px] font-black outline-none transition-all"/>
                  </div>
                  
                  <div className="relative">
                    <select 
                      value={selectedClassFilter} 
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="appearance-none bg-slate-950 text-white pl-4 pr-10 py-3 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer shadow-lg active:scale-95 transition-all"
                    >
                      <option value="All Classes">All Classes</option>
                      {allAvailableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {(Object.entries(recordsByView) as [string, any[]][]).sort().map(([title, group]) => (
                <div key={title} className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                  <div 
                    onClick={() => teacherViewMode === 'class' && setExpandedClasses(p => { const n = new Set(p); n.has(title) ? n.delete(title) : n.add(title); return n; })} 
                    className={`px-6 py-3 flex items-center justify-between border-b border-slate-100 transition-all ${teacherViewMode === 'class' ? 'bg-slate-50 cursor-pointer hover:bg-slate-100' : 'bg-slate-50/50'}`}
                  >
                    <div className="flex items-center gap-2 font-black text-[11px] uppercase italic tracking-widest text-slate-500">
                      {teacherViewMode === 'class' && (expandedClasses.has(title) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
                      {title} <span className="opacity-30">({group.length})</span>
                    </div>
                  </div>
                  {(teacherViewMode === 'all' || expandedClasses.has(title)) && (
                    <div className="divide-y divide-slate-50">
                      {group.map(r => (
                        <div key={r.id} onClick={() => setDetail(r)} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xs italic text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all">{r.name.charAt(0)}</div>
                            <div>
                              <h5 className="font-black text-[14px] leading-none mb-1.5">{r.name}</h5>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter">{r.studentId}</p>
                                {teacherViewMode === 'all' && (
                                  <>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <p className="text-[9px] text-indigo-400 font-black uppercase italic tracking-tighter">{r.className?.split(',')[0]}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-5">
                            <div>
                               <p className="text-2xl font-black italic leading-none">{r.postScore}</p>
                               <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Score</p>
                            </div>
                            <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-950 transition-all"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {records.length === 0 && <div className="p-24 text-center text-slate-200 font-black text-[14px] uppercase tracking-widest italic border-4 border-dashed border-slate-100 rounded-[48px]">Notion Vault Empty</div>}
              {records.length > 0 && Object.keys(recordsByView).length === 0 && (
                <div className="p-16 text-center text-slate-400 font-black text-[11px] uppercase tracking-widest italic">
                  No records matching filters
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-950 p-8 space-y-8 animate-in zoom-in-95">
            <button onClick={() => setDetail(null)} className="absolute top-6 right-6 text-slate-300 hover:text-black transition-colors"><X size={24}/></button>
            <div className="flex items-center gap-5 border-b border-slate-50 pb-6">
              <div className="w-16 h-16 bg-slate-950 text-white rounded-[20px] flex items-center justify-center font-black text-3xl italic shadow-2xl shadow-slate-300">{detail.name.charAt(0)}</div>
              <div>
                <h3 className="font-black text-2xl leading-none mb-1.5">{detail.name}</h3>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest italic">{detail.studentId} • {detail.className}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100"><p className="text-[8px] font-black uppercase mb-1 opacity-40">PRE</p><p className="text-2xl font-black italic">{detail.preScore}</p></div>
              <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100 text-emerald-900"><p className="text-[8px] font-black uppercase mb-1 opacity-60">POST</p><p className="text-2xl font-black italic">{detail.postScore}</p></div>
              <div className="bg-slate-950 p-4 rounded-2xl text-center text-white"><p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">GAIN</p><p className="text-2xl font-black italic">{(detail.postScore-detail.preScore >= 0 ? '+' : '')}{detail.postScore-detail.preScore}</p></div>
            </div>
            <div className="text-center">
              <RadarChart preScores={detail.preSubScores} postScores={detail.postSubScores} size={240} />
            </div>
            <button onClick={() => { if(confirm("确认永久删除该云端记录？")) NotionService.deleteRecord(detail.id).then(() => { setDetail(null); handleRefresh(); }); }} className="w-full py-3.5 text-red-500 font-black text-[10px] uppercase border border-red-50 rounded-2xl bg-red-50/50 hover:bg-red-50 transition-all tracking-widest">Destroy Cloud Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
