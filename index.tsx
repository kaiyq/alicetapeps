
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  TrendingUp,
  RefreshCw,
  Lock,
  CheckCircle2,
  Loader2,
  X,
  Save,
  User,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
  Sparkles,
  Layers,
  ClipboardCheck,
  Info,
  Bug,
  Zap,
  Search,
  ChevronDown
} from 'lucide-react';

// ============================================================
// 🎯 核心配置 (Core Configuration)
// ============================================================
const DEFAULT_CONFIG = {
  apiKey: import.meta.env.VITE_NOTION_API_KEY ?? "", 
  dbId: "2d36f36bb31880cbbb70c43247b18de1", 
  proxyUrl: "https://alicetapeps.icu" 
};

const TEACHER_PASSWORD = "0209";

// ============================================================
// 📊 维度与题目配置 (Dimensions & Questions)
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
  "How many complete and right sentences?",
  "Clear and ordered structure?", 
  "Sufficient supportive material?", 
  "Valid evidence?", 
  "Coherence?"
];

const TOTAL_QUESTIONS = 20;

// ============================================================
// 🚀 Notion 服务逻辑 (Notion Service)
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

  /**
   * 同步记录到 Notion
   * 已移除 Improvement 字段以匹配用户数据库结构
   */
  static async syncRecord(record: any) {
    try {
      const classTags = (record.className || "")
        .split(/[,，]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s !== "")
        .map((name: string) => ({ name }));

      const payload = { 
        parent: { database_id: DEFAULT_CONFIG.dbId }, 
        properties: {
          "Name": { "title": [{ "text": { "content": String(record.name || "Anonymous") } }] },
          "StudentID": { "rich_text": [{ "text": { "content": String(record.studentId || "-") } }] },
          "Class": { "multi_select": classTags },
          "PreScore": { "number": Number(record.preScore) || 0 },
          "PostScore": { "number": Number(record.postScore) || 0 },
          // 8个维度分字段
          "Pre_Content": { "number": Number(record.preScores[0]) || 0 },
          "Pre_Delivery": { "number": Number(record.preScores[1]) || 0 },
          "Pre_Language": { "number": Number(record.preScores[2]) || 0 },
          "Pre_Logic": { "number": Number(record.preScores[3]) || 0 },
          "Post_Content": { "number": Number(record.postScores[0]) || 0 },
          "Post_Delivery": { "number": Number(record.postScores[1]) || 0 },
          "Post_Language": { "number": Number(record.postScores[2]) || 0 },
          "Post_Logic": { "number": Number(record.postScores[3]) || 0 }
        }
      };

      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST", 
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok) {
        return { success: true };
      } else {
        console.error("Notion API Error:", data);
        let msg = data.message || "同步失败";
        // 针对 400 错误的详细引导
        if (res.status === 400) {
          msg = `配置错误(400): 请检查 Notion 数据库属性名称是否完全正确（无 Improvement 字段）。`;
        }
        return { success: false, message: msg };
      }
    } catch (e: any) { 
      return { success: false, message: "网络异常: " + e.message }; 
    }
  }

  /**
   * 获取所有记录并组装维度数据
   */
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
          if (!prop) return null;
          if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
          if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
          if (prop.type === 'number') return prop.number ?? 0;
          if (prop.type === 'multi_select') return prop.multi_select?.map((v: any) => v.name).join(', ') || '';
          return null;
        };
        return {
          id: page.id,
          name: getVal("Name") || 'Unnamed',
          studentId: getVal("StudentID") || '-',
          className: getVal("Class") || 'None',
          preScore: getVal("PreScore") ?? 0,
          postScore: getVal("PostScore") ?? 0,
          preSubScores: [
            getVal("Pre_Content") ?? 0, 
            getVal("Pre_Delivery") ?? 0, 
            getVal("Pre_Language") ?? 0, 
            getVal("Pre_Logic") ?? 0
          ],
          postSubScores: [
            getVal("Post_Content") ?? 0, 
            getVal("Post_Delivery") ?? 0, 
            getVal("Post_Language") ?? 0, 
            getVal("Post_Logic") ?? 0
          ],
          createdTime: page.created_time
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
// 🎨 雷达图与分析面板 (UI Components)
// ============================================================
const RadarChart: React.FC<{ preScores: number[], postScores: number[], size?: number }> = ({ preScores, postScores, size = 300 }) => {
  const center = size / 2;
  const radius = size * 0.35;
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
    <div className="relative inline-block select-none group">
      <div className="absolute -top-10 left-0 right-0 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-slate-200 rounded-full border border-dashed border-slate-400"></div>
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pre / 学前</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-indigo-500 rounded-full shadow-sm"></div>
          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Post / 期末</span>
        </div>
      </div>

      <svg width={size} height={size} className="mx-auto overflow-visible mt-4">
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
        ))}
        {CATEGORIES.map((cat, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(148, 163, 184, 0.03)" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" />
        <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(99, 102, 241, 0.1)" stroke="#6366F1" strokeWidth="3" className="drop-shadow-xl" />
        {postPoints.map((p, i) => (
          <g key={`post-${i}`}>
            <circle cx={p.x} cy={p.y} r="5" fill="#6366F1" stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 14} textAnchor="middle" className="text-[11px] font-black fill-indigo-600 italic">{p.val}</text>
          </g>
        ))}
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 40) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 40) * Math.sin(i * angleStep - Math.PI / 2);
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-slate-500 uppercase italic">{cat.name}</text>
        })}
      </svg>
    </div>
  );
};

const ImprovementPanel: React.FC<{ pre: number[], post: number[] }> = ({ pre, post }) => (
  <div className="space-y-4 pt-6 text-left">
    <div className="flex items-center gap-2 mb-2 px-1">
      <Sparkles size={16} className="text-indigo-500 fill-indigo-500"/>
      <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Dimension Analysis / 维度分析</span>
    </div>
    <div className="grid gap-3">
      {CATEGORIES.map((cat, i) => {
        const preVal = pre[i];
        const postVal = post[i];
        const gain = postVal - preVal;
        const max = cat.questionsCount * 4;
        const percent = (postVal / max) * 100;
        return (
          <div key={cat.name} className="relative bg-white p-5 rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: cat.color }}></div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-black uppercase italic text-slate-800">{cat.name}</span>
                  <span className="text-[10px] font-bold text-slate-300">{postVal}/{max}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
              <div className={`ml-6 flex flex-col items-center justify-center font-black italic rounded-2xl p-3 min-w-[60px] ${gain > 0 ? 'bg-emerald-50 text-emerald-600' : gain < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                {gain > 0 ? <ArrowUpRight size={16}/> : gain < 0 ? <ArrowDownRight size={16}/> : <Minus size={16}/>}
                <span className="text-xl leading-none mt-1">{gain > 0 ? `+${gain}` : gain}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ============================================================
// 📱 主应用入口 (Main Application)
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
  const [lastError, setLastError] = useState<string | null>(null);
  
  const [teacherViewMode, setTeacherViewMode] = useState<'all' | 'class'>('class');
  const [selectedClass, setSelectedClass] = useState('');

  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('tapeps_profile') || '{"name":"","studentId":"","className":""}'));
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_pre_ratings') || '{}'));
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_post_ratings') || '{}'));
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(() => localStorage.getItem('tapeps_synced') === 'true');

  const handleRefresh = useCallback(async () => {
    setIsFetching(true);
    const data = await NotionService.fetchRecords();
    setRecords(data);
    setIsFetching(false);
  }, []);

  useEffect(() => {
    if (view === 'teacher') handleRefresh();
  }, [view, handleRefresh]);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);
  useEffect(() => localStorage.setItem('tapeps_synced', String(synced)), [synced]);

  const resetAssessment = () => {
    if(confirm("确定要重置吗？本地数据将被清空。")) {
      setProfile({name:"", studentId:"", className:""});
      setPreRatings({});
      setPostRatings({});
      setActiveTab('pre');
      setSynced(false);
      setLastError(null);
      localStorage.removeItem('tapeps_synced');
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

  const allClasses = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      (r.className || '').split(/[,，]/).forEach((c: string) => {
        const t = c.trim();
        if (t) set.add(t);
      });
    });
    return Array.from(set).sort();
  }, [records]);

  const processedRecords = useMemo(() => {
    const s = search.toLowerCase();
    let filtered = records.filter(r => {
      const matchesSearch = !s ||
        r.name.toLowerCase().includes(s) ||
        r.studentId.toLowerCase().includes(s) ||
        r.className.toLowerCase().includes(s);
      const matchesClass = !selectedClass ||
        (r.className || '').split(/[,，]/).map((c: string) => c.trim()).includes(selectedClass);
      return matchesSearch && matchesClass;
    });
    if (teacherViewMode === 'all') return { 'Vault List': filtered };
    const groups: Record<string, any[]> = {};
    filtered.forEach(r => {
      const cls = (r.className || 'None').split(/[,，]/)[0].trim();
      if(!groups[cls]) groups[cls] = [];
      groups[cls].push(r);
    });
    return groups;
  }, [records, search, selectedClass, teacherViewMode]);

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 font-sans pb-20 select-none">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-200"><TrendingUp size={20}/></div>
          <div>
            <span className="font-black text-2xl italic tracking-tighter uppercase leading-none block">TAPEPS</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Student Evaluation</span>
          </div>
        </div>
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
          <button onClick={() => setView('student')} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all ${view === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Portal</button>
          <button onClick={() => isTeacherAuth ? setView('teacher') : setShowPwd(true)} className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Lock size={12}/> Admin</button>
        </div>
      </nav>

      {showPwd && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-[360px] shadow-2xl text-center animate-in">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Lock size={32}/></div>
            <h3 className="font-black mb-1 text-xl tracking-tight">Access Control</h3>
            <input type="password" autoFocus value={pwdIn} onChange={e => setPwdIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && (pwdIn === TEACHER_PASSWORD ? (setIsTeacherAuth(true), localStorage.setItem('tapeps_auth','true'), setShowPwd(false), setView('teacher')) : alert("Password Error"))} className="w-full text-center text-3xl py-5 bg-slate-50 rounded-3xl mb-8 border-2 border-slate-100 outline-none font-mono focus:border-indigo-600 transition-all placeholder:text-slate-200" placeholder="••••"/>
            <button onClick={() => (pwdIn === TEACHER_PASSWORD ? (setIsTeacherAuth(true), localStorage.setItem('tapeps_auth','true'), setShowPwd(false), setView('teacher')) : alert("Password Error"))} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">Confirm Identity</button>
            <button onClick={() => setShowPwd(false)} className="w-full mt-4 py-2 text-[10px] font-black uppercase text-slate-400">Back</button>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-5 mt-8">
        {view === 'student' ? (
          <div className="space-y-8 pb-12 animate-in">
            {/* 用户档案卡片 */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><User size={20}/></div>
                  <div>
                    <h4 className="font-black text-[13px] uppercase tracking-wide mb-1 leading-none">Profile</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase italic">Identifier</p>
                  </div>
                </div>
                <button onClick={resetAssessment} className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-4 py-2 rounded-2xl"><RotateCcw size={12}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-slate-50 px-4 py-4 rounded-2xl border-2 border-slate-50 text-[13px] font-bold outline-none focus:border-indigo-600/20" placeholder="Name / 姓名"/>
                <input value={profile.studentId} onChange={e => setProfile({...profile, studentId: e.target.value})} className="w-full bg-slate-50 px-4 py-4 rounded-2xl border-2 border-slate-50 text-[13px] font-bold outline-none focus:border-indigo-600/20" placeholder="ID / 学号"/>
                <input value={profile.className} onChange={e => setProfile({...profile, className: e.target.value})} className="w-full bg-slate-50 px-4 py-4 rounded-2xl border-2 border-slate-50 text-[13px] font-bold outline-none focus:border-indigo-600/20" placeholder="Class / 班级"/>
              </div>
            </div>

            {/* 导航标签 */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-[24px] border border-slate-200/50 mx-auto w-fit shadow-inner">
              {[ {id:'pre', l:'Pre-Test'}, {id:'post', l:'Post-Test'}, {id:'compare', l:'Report'} ].map(t => (
                <button key={t.id} onClick={() => {
                  if(t.id === 'post' && !isPreComplete) return alert(`Please finish Pre-Test first.`);
                  if(t.id === 'compare' && (!isPreComplete || !isPostComplete)) return alert("Please complete both tests.");
                  setActiveTab(t.id as any);
                  window.scrollTo(0, 0);
                }} className={`px-8 py-3 rounded-2xl text-[12px] font-black transition-all ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}>{t.l}</button>
              ))}
            </div>

            {/* 测试内容 */}
            <div className="space-y-8">
              {activeTab !== 'compare' ? (
                <>
                  <div className={`flex items-center justify-between px-8 py-5 rounded-[32px] text-white transition-all ${((activeTab === 'pre' && isPreComplete) || (activeTab === 'post' && isPostComplete)) ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                     <div>
                       <span className="text-[10px] font-black uppercase opacity-60 tracking-widest block mb-1">Process</span>
                       <span className="text-2xl font-black italic">{(activeTab === 'pre' ? preDoneCount : postDoneCount)} <span className="text-xs opacity-50">/ {TOTAL_QUESTIONS}</span></span>
                     </div>
                     <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        {((activeTab === 'pre' && isPreComplete) || (activeTab === 'post' && isPostComplete)) ? <CheckCircle2 size={24}/> : <Zap size={24} className="animate-pulse"/>}
                     </div>
                  </div>

                  {CATEGORIES.map((cat, idx) => {
                    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                    return (
                      <div key={cat.name} className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl">
                        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 font-black text-[12px] uppercase tracking-widest">{cat.name}</div>
                        <div className="divide-y divide-slate-50">
                          {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                            const qIdx = offset + i + 1;
                            const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                            return (
                              <div key={qIdx} className="p-8 space-y-6">
                                <p className="text-[16px] font-bold text-slate-900 leading-snug">{qIdx}. {q}</p>
                                <div className="flex gap-2">
                                  {(['A','B','C','D','E'] as Rating[]).map(r => (
                                    <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                      className={`flex-1 h-14 rounded-2xl font-black text-xl transition-all border-2 flex items-center justify-center ${current === r ? 'bg-indigo-600 text-white border-indigo-600 scale-[1.03]' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>{r}</button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="space-y-8 animate-in">
                  <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-2xl text-center space-y-12">
                    <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={320} />
                    <ImprovementPanel pre={preScoresArr} post={postScoresArr} />
                  </div>

                  <div className="space-y-4">
                    {lastError && (
                      <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px]">
                        <div className="flex items-center gap-3 text-rose-600 mb-2 font-black text-sm uppercase italic"><Bug size={18}/> Error Insight</div>
                        <p className="text-[11px] text-rose-500 font-bold">{lastError}</p>
                        <div className="mt-4 pt-4 border-t border-rose-100 text-[10px] text-rose-400 italic">
                            确保 Notion 数据库中已有 13 个正确命名的字段。本版本不再同步 "Improvement" 字段。
                        </div>
                      </div>
                    )}

                    <button onClick={async () => {
                      if(!profile.name || !profile.studentId) return alert("Please fill Profile first.");
                      setSubmitting(true);
                      setLastError(null);
                      const res = await NotionService.syncRecord({ 
                        ...profile, 
                        preScore: preTotal, 
                        postScore: postTotal, 
                        preScores: preScoresArr, 
                        postScores: postScoresArr 
                      });
                      if(res.success) {
                        setSynced(true);
                        alert("Data successfully archived to Cloud!");
                      } else {
                        setLastError(res.message);
                      }
                      setSubmitting(false);
                    }} disabled={submitting || synced} className={`w-full py-6 rounded-[32px] font-black text-lg flex items-center justify-center gap-3 transition-all ${synced ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white shadow-2xl hover:bg-slate-800'}`}>
                      {submitting ? <Loader2 size={24} className="animate-spin opacity-50"/> : synced ? <ClipboardCheck size={24}/> : <Save size={24}/>}
                      {submitting ? "Processing..." : synced ? "Archive Completed" : "Final Cloud Archive"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-20 animate-in">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-2xl font-black italic uppercase tracking-tight">Records Vault</h2>
               <div className="flex gap-2">
                 <button onClick={handleRefresh} className="p-4 bg-white rounded-2xl shadow-sm hover:bg-slate-50 transition-all"><RefreshCw size={20} className={isFetching ? 'animate-spin' : ''}/></button>
                 <button onClick={() => { localStorage.removeItem('tapeps_auth'); setIsTeacherAuth(false); setView('student'); }} className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><LogOut size={20}/></button>
               </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name / ID..."
                  className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-[13px] font-bold outline-none focus:border-indigo-300 transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="appearance-none pl-4 pr-9 py-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm text-[13px] font-bold outline-none focus:border-indigo-300 transition-all text-slate-700 cursor-pointer min-w-[120px]"
                >
                  <option value="">All Classes</option>
                  {allClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              </div>
            </div>
            <div className="space-y-6">
              {Object.entries(processedRecords).sort().map(([title, group]) => (
                <div key={title} className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                   <div className="px-8 py-5 bg-slate-50/50 font-black text-[11px] uppercase tracking-widest italic border-b border-slate-100 flex items-center gap-2">
                      <Layers size={14} className="text-indigo-400"/> {title} ({group.length})
                   </div>
                   <div className="divide-y divide-slate-50">
                      {group.map(r => (
                        <div key={r.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer" onClick={() => setDetail(r)}>
                           <div>
                              <h5 className="font-black text-[15px] leading-tight">{r.name}</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{r.studentId}</p>
                           </div>
                           <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-600 text-right min-w-[60px]">
                              <p className="text-xl font-black italic leading-none">{r.postScore}</p>
                              <p className="text-[8px] font-black opacity-40 uppercase mt-1">Total</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {detail && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-[56px] w-full max-w-lg shadow-2xl relative p-10 space-y-8 my-auto animate-in">
            <button onClick={() => setDetail(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={24}/></button>
            <div className="flex items-center gap-6 border-b border-slate-50 pb-8">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-3xl italic shadow-xl shadow-indigo-100">{detail.name.charAt(0)}</div>
              <div>
                <h3 className="font-black text-2xl leading-none mb-1">{detail.name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">{detail.studentId}</p>
                <div className="flex gap-1 mt-2">
                    {(detail.className || "").split(/[,，]/).map((tag: string, i: number) => (
                        <span key={i} className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-400 px-2 py-0.5 rounded-md">{tag.trim()}</span>
                    ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-[32px] text-center border border-slate-100"><p className="text-[10px] font-black uppercase text-slate-400 mb-1">PRE</p><p className="text-3xl font-black italic">{detail.preScore}</p></div>
              <div className="bg-indigo-50 p-6 rounded-[32px] text-center text-indigo-600 border border-indigo-100"><p className="text-[10px] font-black uppercase text-indigo-400 mb-1">POST</p><p className="text-3xl font-black italic">{detail.postScore}</p></div>
            </div>
            <div className="flex justify-center py-4">
              <RadarChart preScores={detail.preSubScores} postScores={detail.postSubScores} size={280} />
            </div>
            <button onClick={() => { if(confirm("Permanently delete from Cloud?")) NotionService.deleteRecord(detail.id).then(() => { setDetail(null); handleRefresh(); }); }} className="w-full py-5 text-rose-500 font-black text-[12px] uppercase border-2 border-rose-50 rounded-[28px] hover:bg-rose-50 transition-all">Destroy Data Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
// env var build trigger 2026年03月 2日 17:54:22
// build trigger 2026年03月 2日 22:52:04
