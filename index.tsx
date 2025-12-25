
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
  X, 
  Save, 
  User, 
  ArrowRight,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Users,
  AlertCircle,
  FileText,
  LogOut,
  Zap,
  CheckSquare,
  Square
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
// 📊 评价体系逻辑
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
  /* Content (4) */
  "Beginning, body and ending included?", "Attention getter?", "Clear opinions?", "Impressive ending?", 
  /* Delivery (7) */
  "Voice: Fluctuating tone?", "Voice: Proper pace/volume?", "Voice: Proper stresses/pauses?", 
  "Voice: Clear pronunciation?", "Body: Natural gestures?", "Body: Nervous movements?", "Body: Eye Contact/Smile?",
  /* Language (5) */
  "Fluency?", "Accuracy & Economy?", "Vividness?", "Minimal filler words?", "Full sentences? (A:80-100%)",
  /* Logic (4) */
  "Ordered structure?", "Supportive material?", "Valid evidence?", "Logical Coherence?"
];

// ============================================================
// 🚀 Notion 服务 (适配多选)
// ============================================================
class NotionService {
  static getHeaders() { return { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" }; }
  static getBaseUrl() { return `${DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '')}/v1/`; }
  
  static async syncRecord(record: any) {
    try {
      // 适配多选字段：Notion 要求 multi_select 为对象数组
      const classNames = record.className.split(/[,，]/).map((s: string) => ({ name: s.trim() })).filter((o: any) => o.name);
      
      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST", headers: this.getHeaders(),
        body: JSON.stringify({
          parent: { database_id: DEFAULT_CONFIG.dbId },
          properties: {
            "Name": { "title": [{ "text": { "content": record.name || "Unknown" } }] },
            "StudentID": { "rich_text": [{ "text": { "content": record.studentId || "-" } }] },
            "Class": { "multi_select": classNames },
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
      return { success: res.ok };
    } catch { return { success: false }; }
  }

  static async fetchRecords(): Promise<any[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}/query`, { method: "POST", headers: this.getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results.map((page: any) => {
        const p = page.properties;
        const name = p.Name?.title?.[0]?.plain_text || p["姓名"]?.title?.[0]?.plain_text || '无名';
        const sid = p.StudentID?.rich_text?.[0]?.plain_text || p["学号"]?.rich_text?.[0]?.plain_text || '-';
        
        // 适配多选读取
        const classProp = p.Class || p["班级"];
        const cls = classProp?.multi_select?.map((m: any) => m.name).join(', ') || '未分类';

        return {
          id: page.id,
          name, studentId: sid, className: cls,
          preScore: p.PreScore?.number || 0,
          postScore: p.PostScore?.number || 0,
          preSubScores: [p.Pre_Content?.number || 0, p.Pre_Delivery?.number || 0, p.Pre_Language?.number || 0, p.Pre_Logic?.number || 0],
          postSubScores: [p.Post_Content?.number || 0, p.Post_Delivery?.number || 0, p.Post_Language?.number || 0, p.Post_Logic?.number || 0]
        };
      });
    } catch { return []; }
  }

  static async deleteRecord(pageId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}pages/${pageId}`, { method: "PATCH", headers: this.getHeaders(), body: JSON.stringify({ archived: true }) });
      return res.ok;
    } catch { return false; }
  }
}

// ============================================================
// 🎨 雷达图 (5层网格精细版)
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
    <svg width={size} height={size} className="mx-auto overflow-visible">
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray={scale === 1 ? "" : "3 2"} />
      ))}
      {CATEGORIES.map((cat, i) => (
        <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#E2E8F0" strokeWidth="1" />
      ))}
      <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 2" />
      <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="rgba(16, 185, 129, 0.15)" stroke="#059669" strokeWidth="2.5" />
      {CATEGORIES.map((cat, i) => {
        const x = center + (radius + 22) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 22) * Math.sin(i * angleStep - Math.PI / 2);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black fill-slate-900 uppercase italic tracking-tighter">{cat.name}</text>;
      })}
    </svg>
  );
};

// ============================================================
// 🏠 App
// ============================================================
const App: React.FC = () => {
  const [view, setView] = useState<'student' | 'teacher'>(() => (localStorage.getItem('tapeps_auth') ? 'teacher' : 'student'));
  const [activeTab, setActiveTab] = useState<'pre' | 'post' | 'compare'>('pre');
  const [isTeacherAuth, setIsTeacherAuth] = useState(() => localStorage.getItem('tapeps_auth') === 'true');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdIn, setPwdIn] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<any | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('tapeps_profile') || '{"name":"","studentId":"","className":""}'));
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_pre_ratings') || '{}'));
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_post_ratings') || '{}'));
  const [submitting, setSubmitting] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);

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

  const diagnosticReports = useMemo(() => {
    return CATEGORIES.map((cat, i) => {
      const score = postScoresArr[i];
      const max = cat.questionsCount * 4;
      const ratio = score / max;
      let advice = "";
      if(ratio >= 0.85) advice = "维度表现完美。具备极强的感染力与说服力。";
      else if(ratio >= 0.6) advice = "基础稳固，但在细节打磨（如眼神或逻辑深度）上仍有提升空间。";
      else advice = "该领域相对薄弱，建议针对性进行模块化强化练习。";
      return { ...cat, score, progress: postScoresArr[i] - preScoresArr[i], advice };
    });
  }, [postScoresArr, preScoresArr]);

  const handleRefresh = async () => { 
    setIsFetching(true); 
    const data = await NotionService.fetchRecords(); 
    setRecords(data); 
    if(data.length > 0) setExpandedClasses(new Set(data.map(r => r.className?.split(',')[0] || '未分类')));
    setIsFetching(false); 
  };

  useEffect(() => { if(isTeacherAuth && view === 'teacher') handleRefresh(); }, [isTeacherAuth, view]);

  const recordsByClass = useMemo<Record<string, any[]>>(() => {
    const s = search.toLowerCase();
    const filtered = records.filter(r => (r.name||"").toLowerCase().includes(s) || (r.studentId||"").toLowerCase().includes(s) || (r.className||"").toLowerCase().includes(s));
    const groups: Record<string, any[]> = {};
    filtered.forEach(r => { 
      const cls = r.className?.split(/[,，]/)[0].trim() || '未分类'; 
      if(!groups[cls]) groups[cls] = []; groups[cls].push(r); 
    });
    return groups;
  }, [records, search]);

  const exportCSV = () => {
    const headers = ["姓名", "学号", "班级", "学前分", "期末分", "Content", "Delivery", "Language", "Logic"];
    const rows = records.map(r => [r.name, r.studentId, r.className, r.preScore, r.postScore, ...r.postSubScores]);
    const csvContent = "\ufeff" + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `TAPEPS_Export_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleBatchDelete = async () => {
    if(!confirm(`确认删除选中的 ${selectedIds.size} 条数据？`)) return;
    setIsFetching(true);
    for(let id of selectedIds) await NotionService.deleteRecord(id);
    setSelectedIds(new Set());
    handleRefresh();
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-slate-950 font-sans pb-10">
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-1.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-950 p-1 rounded-lg text-white"><TrendingUp size={16}/></div>
          <span className="font-black text-lg italic tracking-tighter uppercase">Tapeps</span>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button onClick={() => setView('student')} className={`px-4 py-1 rounded-full text-[10px] font-black transition-all ${view === 'student' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>测评</button>
          <button onClick={() => isTeacherAuth ? setView('teacher') : setShowPwd(true)} className={`px-4 py-1 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${view === 'teacher' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}><Lock size={10}/> 后台</button>
        </div>
      </nav>

      {showPwd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] shadow-2xl border border-slate-200">
            <h3 className="font-black text-center mb-4 text-[9px] tracking-widest uppercase opacity-40">Identity Verify</h3>
            <input type="password" autoFocus value={pwdIn} onChange={e => setPwdIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && (pwdIn === TEACHER_PASSWORD ? (setIsTeacherAuth(true), localStorage.setItem('tapeps_auth','true'), setShowPwd(false), setView('teacher')) : alert("密码错误"))} className="w-full text-center text-2xl py-3 bg-slate-50 rounded-xl mb-4 border border-slate-200 outline-none font-mono" placeholder="••••"/>
            <button onClick={() => setShowPwd(false)} className="w-full py-2.5 text-[10px] font-black uppercase text-slate-400">Cancel</button>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-3 mt-4">
        {view === 'student' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-2">
              <User size={12} className="text-slate-400"/>
              {['name', 'studentId', 'className'].map((k, i) => (
                <input key={k} value={profile[k]} onChange={e => setProfile({...profile, [k]: e.target.value})} className="flex-1 bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-200 text-[11px] font-black focus:border-slate-950 outline-none" placeholder={['姓名', '学号', '班级'][i]}/>
              ))}
            </div>

            <div className="flex bg-slate-200 p-0.5 rounded-full border border-slate-300 mx-auto w-fit shadow-inner">
              {[{id:'pre', l:'学前测'}, {id:'post', l:'期末测'}, {id:'compare', l:'报告'}].map(t => (
                <button key={t.id} onClick={() => {
                  if(activeTab === 'pre' && t.id !== 'pre' && Object.keys(preRatings).length < 20) { alert("请先完成 20 道题目"); return; }
                  setActiveTab(t.id as any);
                }} className={`px-8 py-1.5 rounded-full text-[10px] font-black transition-all ${activeTab === t.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{t.l}</button>
              ))}
            </div>

            <div className="space-y-3 pb-20">
              {activeTab !== 'compare' ? (
                <>
                  <div className="flex items-center justify-between px-4 bg-slate-950 py-2.5 rounded-xl text-white shadow-xl">
                     <span className="text-[9px] font-black uppercase opacity-60 italic tracking-widest">Progress</span>
                     <span className="text-xs font-black italic">{(activeTab === 'pre' ? Object.keys(preRatings).length : Object.keys(postRatings).length)} / 20 已填</span>
                  </div>
                  {CATEGORIES.map((cat, idx) => {
                    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                    return (
                      <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: cat.color}}></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{cat.name} Dimension</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                            const qIdx = offset + i + 1;
                            const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                            return (
                              <div key={qIdx} className="p-3.5 space-y-3">
                                <p className="text-[13px] font-black text-slate-950 italic leading-tight">{qIdx}. {q}</p>
                                <div className="flex gap-1.5">
                                  {(['A','B','C','D','E'] as Rating[]).map(r => (
                                    <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                      className={`flex-1 h-10 rounded-xl font-black text-sm transition-all border ${current === r ? 'bg-slate-950 text-white border-slate-950 shadow-lg scale-105' : 'bg-white text-slate-300 border-slate-200'}`}>{r}</button>
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
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-8">
                    <RadarChart preScores={preScoresArr} postScores={postScoresArr} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                        <p className="text-[9px] font-black uppercase opacity-40 mb-1 italic">PRE TOTAL</p>
                        <p className="text-3xl font-black italic">{preScoresArr.reduce((a,b)=>a+b,0)}</p>
                      </div>
                      <div className="bg-emerald-950 p-4 rounded-2xl text-white shadow-xl shadow-emerald-200">
                        <p className="text-[9px] font-black uppercase opacity-60 mb-1 italic">POST TOTAL</p>
                        <p className="text-3xl font-black italic">{postScoresArr.reduce((a,b)=>a+b,0)}</p>
                      </div>
                    </div>
                    {/* 自动化诊断报告 */}
                    <div className="bg-slate-50 p-6 rounded-3xl space-y-5 text-left border border-slate-100">
                       <h4 className="flex items-center gap-2 font-black text-xs uppercase italic border-b border-slate-200 pb-2"><Zap size={14} className="text-amber-500"/>维度诊断报告 Diagnostic Analysis</h4>
                       <div className="space-y-4">
                          {diagnosticReports.map(dim => (
                            <div key={dim.name} className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase italic" style={{color: dim.color}}>{dim.name}</span>
                                <span className="text-[9px] font-black text-slate-400 italic">成长: +{dim.progress}</span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">{dim.advice}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                  <button onClick={async () => {
                    if(!profile.name || !profile.studentId) { alert("基本资料未填全"); return; }
                    setSubmitting(true);
                    const res = await NotionService.syncRecord({ ...profile, preScore: preScoresArr.reduce((a,b)=>a+b,0), postScore: postScoresArr.reduce((a,b)=>a+b,0), preScores: preScoresArr, postScores: postScoresArr });
                    if(res.success) { setSynced(true); setTimeout(() => setSynced(false), 3000); } else alert("同步失败");
                    setSubmitting(false);
                  }} disabled={submitting || synced} className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-slate-950 transition-all ${synced ? 'bg-emerald-700 text-white shadow-emerald-100' : 'bg-slate-950 text-white shadow-xl hover:scale-[1.01]'}`}>
                    {submitting ? <Loader2 size={16} className="animate-spin"/> : synced ? <><CheckCircle2 size={16}/> 已成功归档至云端</> : <><Save size={16}/> 同步数据至 Notion</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black italic uppercase flex items-center gap-2"><LayoutDashboard size={18}/> Console</h2>
              <div className="flex gap-2">
                {selectedIds.size > 0 && <button onClick={handleBatchDelete} className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all"><Trash2 size={14}/></button>}
                <button onClick={exportCSV} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-950 transition-all"><Download size={14}/></button>
                <button onClick={handleRefresh} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-950 transition-all"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/></button>
                <button onClick={() => { localStorage.removeItem('tapeps_auth'); setIsTeacherAuth(false); setView('student'); }} className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 hover:bg-red-100 transition-all"><LogOut size={14}/></button>
              </div>
            </div>

            <div className="relative shadow-sm rounded-xl overflow-hidden border border-slate-200">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
              <input type="text" placeholder="多维搜索：学生 / 学号 / 班级" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white text-[11px] font-black outline-none"/>
            </div>
            
            <div className="space-y-3">
              {(Object.entries(recordsByClass) as [string, any[]][]).sort().map(([cls, group]) => (
                <div key={cls} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                  <div onClick={() => setExpandedClasses(p => { const n = new Set(p); n.has(cls) ? n.delete(cls) : n.add(cls); return n; })} className="px-4 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-100 cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-2 font-black text-[10px] uppercase italic tracking-widest text-slate-400">
                      {expandedClasses.has(cls) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {cls} <span className="opacity-50">({group.length})</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm(`确认清空 ${cls} 的所有数据？`)) group.forEach(r => NotionService.deleteRecord(r.id).then(handleRefresh)); }} className="text-[9px] font-black text-red-500 uppercase">Clear All</button>
                  </div>
                  {expandedClasses.has(cls) && (
                    <div className="divide-y divide-slate-50">
                      {group.map(r => (
                        <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedIds(p => { const n = new Set(p); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} className="text-slate-200 hover:text-slate-900 transition-all">
                               {selectedIds.has(r.id) ? <CheckSquare size={16} className="text-slate-950"/> : <Square size={16}/>}
                            </button>
                            <div onClick={() => setDetail(r)} className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] italic text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all">{r.name.charAt(0)}</div>
                              <div>
                                <h5 className="font-black text-[13px] leading-none mb-1">{r.name}</h5>
                                <p className="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter">{r.studentId}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[7px] text-slate-300 font-black mb-0.5 uppercase tracking-tighter italic">Post Total</p>
                              <p className="text-xl font-black italic leading-none">{r.postScore}</p>
                            </div>
                            <ChevronRight onClick={() => setDetail(r)} size={16} className="text-slate-200 group-hover:text-slate-900"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {records.length === 0 && <div className="p-16 text-center text-slate-200 font-black text-[10px] uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-3xl">Cloud Database Empty</div>}
            </div>
          </div>
        )}
      </main>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl relative border border-slate-950 p-8 space-y-8 animate-in zoom-in-95">
            <button onClick={() => setDetail(null)} className="absolute top-6 right-6 text-slate-300 hover:text-black"><X size={24}/></button>
            <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
              <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-2xl shadow-slate-200">{detail.name.charAt(0)}</div>
              <div>
                <h3 className="font-black text-2xl leading-none mb-1.5">{detail.name}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">{detail.studentId} • {detail.className}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100"><p className="text-[8px] font-black uppercase mb-1 opacity-40 italic">PRE</p><p className="text-xl font-black italic">{detail.preScore}</p></div>
              <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100 text-emerald-900"><p className="text-[8px] font-black uppercase mb-1 opacity-60 italic">POST</p><p className="text-xl font-black italic">{detail.postScore}</p></div>
              <div className="bg-slate-950 p-3 rounded-xl text-center text-white"><p className="text-[8px] font-black text-slate-500 uppercase mb-1 italic">GAIN</p><p className="text-xl font-black italic">{(detail.postScore-detail.preScore >= 0 ? '+' : '')}{detail.postScore-detail.preScore}</p></div>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100"><RadarChart preScores={detail.preSubScores} postScores={detail.postSubScores} /></div>
            <div className="grid grid-cols-2 gap-2">
               {CATEGORIES.map((cat, i) => (
                 <div key={cat.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <span className="text-slate-400 font-black text-[9px] uppercase italic">{cat.name}</span>
                   <span className="text-slate-950 italic text-lg font-black">{detail.postSubScores[i]}</span>
                 </div>
               ))}
            </div>
            <button onClick={() => { if(confirm("确认删除？")) NotionService.deleteRecord(detail.id).then(() => { setDetail(null); handleRefresh(); }); }} className="w-full py-2.5 text-red-500 font-black text-[9px] uppercase border border-red-50 rounded-xl bg-red-50/30">Delete Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
