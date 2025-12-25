
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  TrendingUp,
  RefreshCw,
  Lock,
  Database,
  CheckCircle2,
  Loader2,
  BarChart3,
  Search,
  Filter,
  Trash2,
  Download,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  X,
  PieChart,
  LayoutGrid
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
  { name: 'Content', color: '#3B82F6', questionsCount: 4 },
  { name: 'Delivery', color: '#10B981', questionsCount: 6 },
  { name: 'Language', color: '#F59E0B', questionsCount: 5 },
  { name: 'Logic', color: '#F97316', questionsCount: 5 }
];

const QUESTIONS = [
  // Content
  "Beginning, body and ending included?", 
  "Attention getter? (Questions, stories or statistics?)", 
  "Clear opinions?", 
  "Impressive ending?",
  // Delivery
  "Voice: Fluctuating tone? Comforting tone?", 
  "Voice: Proper pace? Proper volume? Proper pitch?", 
  "Voice: Proper stresses? Proper pauses?", 
  "Voice: Clear pronunciation? Any pronouncing mistakes?",
  "Body Language: Vivid body language? Open gestures? Nervous movements?",
  "Body Language: Vivid facial expressions? Eye Contact? Smile?",
  // Language
  "Fluency?", 
  "Accuracy and economy? Any grammar mistakes?", 
  "Vividness and visualization?", 
  "Any filler words?",
  "How many complete and right sentences? (A: 80-100%, B: 60-80%, C: 40-60%, D: 20-40%, E: 0-20%)",
  // Logic
  "Clear and ordered structure?", 
  "Sufficient supportive material?", 
  "Valid evidence?", 
  "Any logical fallacies?",
  "Coherence?"
];

// ============================================================
// 🎨 双色对比雷达图 (更适合手机端查看)
// ============================================================
const RadarChart: React.FC<{ preScores: number[], postScores: number[], size?: number }> = ({ preScores, postScores, size = 280 }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / CATEGORIES.length;

  const getPoints = (data: number[]) => data.map((val, i) => {
    const maxScore = CATEGORIES[i].questionsCount * 4 || 1;
    const r = (Math.min(val, maxScore) / maxScore) * radius; 
    return { x: center + r * Math.cos(i * angleStep - Math.PI / 2), y: center + r * Math.sin(i * angleStep - Math.PI / 2) };
  });

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {/* 背景网格 */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#F1F5F9" strokeWidth="1" />
        ))}
        {CATEGORIES.map((_, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#F1F5F9" />
        ))}
        
        {/* 学前数据 - 靛蓝色 PRE */}
        <polygon 
          points={getPoints(preScores).map(p => `${p.x},${p.y}`).join(' ')} 
          fill="rgba(99, 102, 241, 0.1)" 
          stroke="#6366F1" 
          strokeWidth="2" 
          strokeDasharray="4 2" 
          className="transition-all duration-700"
        />
        
        {/* 期末数据 - 翠绿色 POST */}
        <polygon 
          points={getPoints(postScores).map(p => `${p.x},${p.y}`).join(' ')} 
          fill="rgba(16, 185, 129, 0.15)" 
          stroke="#10B981" 
          strokeWidth="3" 
          className="transition-all duration-700"
        />
        
        {/* 顶点标签 */}
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 28) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 28) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" className="text-[10px] font-black fill-slate-400 uppercase tracking-tighter">{cat.name}</text>
          );
        })}
      </svg>
      
      {/* 底部图例 */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-dashed bg-indigo-50"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase">Pre (学前)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase">Post (期末)</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 🚀 Notion 服务
// ============================================================
class NotionService {
  static getBaseUrl() { return `${DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '')}/v1/`; }
  
  static async syncRecord(record: any) {
    try {
      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
        body: JSON.stringify({
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
        })
      });
      return { success: res.ok };
    } catch { return { success: false }; }
  }

  static async fetchRecords(): Promise<any[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${DEFAULT_CONFIG.dbId}/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results.map((page: any) => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || 'Unknown',
        studentId: page.properties.StudentID?.rich_text?.[0]?.plain_text || '-',
        className: page.properties.Class?.select?.name || '-',
        preScore: page.properties.PreScore?.number || 0,
        postScore: page.properties.PostScore?.number || 0,
        preSubScores: [
          page.properties.Pre_Content?.number || 0,
          page.properties.Pre_Delivery?.number || 0,
          page.properties.Pre_Language?.number || 0,
          page.properties.Pre_Logic?.number || 0
        ],
        postSubScores: [
          page.properties.Post_Content?.number || 0,
          page.properties.Post_Delivery?.number || 0,
          page.properties.Post_Language?.number || 0,
          page.properties.Post_Logic?.number || 0
        ]
      }));
    } catch { return []; }
  }

  static async deleteRecord(pageId: string) {
    try {
      await fetch(`${this.getBaseUrl()}pages/${pageId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true })
      });
      return true;
    } catch { return false; }
  }
}

// ============================================================
// 🏠 App
// ============================================================
const App: React.FC = () => {
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const [activeTab, setActiveTab] = useState<'pre' | 'post' | 'compare'>('pre');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // 核心数据
  const [records, setRecords] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailStudent, setDetailStudent] = useState<any | null>(null);

  // 学生个人状态
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('tapeps_profile') || '{"name":"","studentId":"","className":""}'));
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_pre_ratings') || '{}'));
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>(() => JSON.parse(localStorage.getItem('tapeps_post_ratings') || '{}'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => localStorage.setItem('tapeps_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('tapeps_pre_ratings', JSON.stringify(preRatings)), [preRatings]);
  useEffect(() => localStorage.setItem('tapeps_post_ratings', JSON.stringify(postRatings)), [postRatings]);

  const calculateScoresArr = (ratings: Record<number, Rating>) => {
    return CATEGORIES.map((cat, idx) => {
      let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
      let score = 0;
      for(let i=1; i<=cat.questionsCount; i++) score += RATING_MAP[ratings[offset + i]] || 0;
      return score;
    });
  };
  const preScoresArr = useMemo(() => calculateScoresArr(preRatings), [preRatings]);
  const postScoresArr = useMemo(() => calculateScoresArr(postRatings), [postRatings]);

  const classes = useMemo(() => ['All', ...Array.from(new Set(records.map(r => r.className)))], [records]);
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.studentId.includes(searchQuery);
      const matchClass = selectedClass === 'All' || r.className === selectedClass;
      return matchSearch && matchClass;
    });
  }, [records, searchQuery, selectedClass]);

  const handleVerifyPassword = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setIsTeacherAuthenticated(true);
      setShowPasswordPrompt(false);
      setView('teacher');
      loadRecords();
    } else alert("密码错误");
  };

  const loadRecords = async () => {
    setIsFetching(true);
    setRecords(await NotionService.fetchRecords());
    setIsFetching(false);
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) return;
    setIsFetching(true);
    for (const id of Array.from(selectedIds)) {
      await NotionService.deleteRecord(id);
    }
    await loadRecords();
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const header = "Name,ID,Class,PreTotal,PostTotal,Progress\n";
    const rows = filteredRecords.map(r => `${r.name},${r.studentId},${r.className},${r.preScore},${r.postScore},${r.postScore - r.preScore}`).join('\n');
    const blob = new Blob(["\uFEFF" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TAPEPS_Export_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const handleSubmit = async () => {
    if(!profile.name || !profile.studentId) return alert("请确保填写了完整姓名和学号。");
    setIsSubmitting(true);
    const res = await NotionService.syncRecord({
      ...profile,
      preScore: preScoresArr.reduce((a,b)=>a+b,0),
      postScore: postScoresArr.reduce((a,b)=>a+b,0),
      preScores: preScoresArr,
      postScores: postScoresArr
    });
    setIsSubmitting(false);
    if(res.success) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } else alert("同步失败！");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 pb-12 font-sans selection:bg-indigo-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-xl shadow-black/10"><TrendingUp size={16}/></div>
          <span className="font-black text-lg tracking-tighter italic uppercase">Tapeps</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('student')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'student' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>学生</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>
            <Lock size={12}/> 教师
          </button>
        </div>
      </nav>

      {/* 详情模态框 (适配手机全屏) */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-2xl h-[92vh] sm:h-auto overflow-y-auto shadow-2xl relative scrollbar-hide">
              <button onClick={() => setDetailStudent(null)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all z-10"><X size={20}/></button>
              
              <div className="p-8 sm:p-12 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4 sm:pt-0">
                  <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-[28px] flex items-center justify-center text-indigo-600 text-3xl font-black italic shadow-inner uppercase">{detailStudent.name.charAt(0)}</div>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black tracking-tight leading-none">{detailStudent.name}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">{detailStudent.className} · ID: {detailStudent.studentId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                   <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-3xl text-center">
                      <p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-tighter">PRE (学前)</p>
                      <p className="text-3xl font-black italic text-indigo-600">{detailStudent.preScore}</p>
                   </div>
                   <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl text-center">
                      <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 tracking-tighter">POST (期末)</p>
                      <p className="text-3xl font-black italic text-emerald-600">{detailStudent.postScore}</p>
                   </div>
                   <div className="bg-slate-900 p-5 rounded-3xl text-center text-white shadow-xl shadow-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">GAIN (进步)</p>
                      <div className="flex items-center justify-center gap-1">
                        <ArrowUpRight size={18} className={detailStudent.postScore >= detailStudent.preScore ? 'text-emerald-400' : 'text-rose-400'}/>
                        <p className="text-3xl font-black italic">{Math.abs(detailStudent.postScore - detailStudent.preScore)}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50/80 rounded-[40px] p-8 sm:p-10 flex flex-col items-center gap-10">
                   <div className="w-full space-y-8">
                      <h4 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400"><PieChart size={16}/> Growth Dimension</h4>
                      <div className="space-y-6">
                        {CATEGORIES.map((cat, i) => {
                          const preS = detailStudent.preSubScores[i];
                          const postS = detailStudent.postSubScores[i];
                          const max = cat.questionsCount * 4;
                          return (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter">
                                <span>{cat.name}</span>
                                <span className="text-slate-400">{preS} → <span className="text-emerald-600">{postS}</span> / {max}</span>
                              </div>
                              <div className="h-3 bg-white border border-slate-100 rounded-full overflow-hidden relative">
                                <div className="absolute inset-y-0 left-0 bg-indigo-500/20" style={{ width: `${(preS/max)*100}%`, zIndex: 1 }}></div>
                                <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out" style={{ width: `${(postS/max)*100}%`, position: 'relative', zIndex: 2 }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>
                   <div className="bg-white rounded-[48px] p-6 shadow-xl shadow-slate-100 border border-slate-100">
                     <RadarChart preScores={detailStudent.preSubScores} postScores={detailStudent.postSubScores} size={240} />
                   </div>
                </div>
                <div className="h-4 sm:hidden"></div>
              </div>
           </div>
        </div>
      )}

      {/* 密码弹窗 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-center font-black text-2xl mb-8 uppercase italic tracking-tighter">Admin Login</h3>
            <input type="password" autoFocus maxLength={4} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} className="w-full text-center text-4xl py-6 bg-slate-50 rounded-3xl mb-8 outline-none border-2 border-transparent focus:border-black transition-all font-black" />
            <button onClick={handleVerifyPassword} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Verify</button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 md:pt-12">
        {view === 'student' ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
             {/* 信息采集 (适配手机) */}
             <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: '姓名 (Name)', key: 'name', ph: 'Full Name' },
                { label: '学号 (ID)', key: 'studentId', ph: 'Student ID' },
                { label: '班级 (Class)', key: 'className', ph: 'Class Name' }
              ].map(f => (
                <div key={f.key} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{f.label}</label>
                  <input 
                    value={profile[f.key as keyof typeof profile]} 
                    onChange={e => setProfile({...profile, [f.key]: e.target.value})} 
                    placeholder={f.ph} 
                    className="w-full bg-slate-50 p-4 rounded-xl border border-transparent focus:bg-white focus:border-indigo-500 transition-all text-sm font-bold outline-none" 
                  />
                </div>
              ))}
            </div>
            
            <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm mx-auto shadow-inner">
              {[
                {id: 'pre', label: 'PRE (学前)'}, 
                {id: 'post', label: 'POST (期末)'}, 
                {id: 'compare', label: 'RESULT (对比)'}
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeTab === t.id ? 'bg-white shadow-md text-black' : 'text-slate-400 hover:text-slate-600'}`}>{t.label}</button>
              ))}
            </div>

            {activeTab !== 'compare' ? (
              <div className="space-y-12 pb-24">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                  return (
                    <div key={cat.name} className="space-y-5">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-1.5 h-4 rounded-full" style={{backgroundColor: cat.color}}></div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">{cat.name}</h3>
                      </div>
                      <div className="bg-white rounded-[40px] border border-slate-100 p-8 sm:p-10 space-y-12 shadow-sm">
                        {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                          const qIdx = offset + i + 1;
                          const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-6">
                              <p className="font-bold text-slate-700 text-sm leading-relaxed"><span className="text-slate-300 font-black mr-2 italic">{qIdx}.</span>{q}</p>
                              <div className="flex gap-2 sm:gap-3">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button 
                                    key={r} 
                                    onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                    className={`flex-1 py-4 sm:py-5 rounded-2xl font-black text-sm transition-all active:scale-90 ${current === r ? 'bg-black text-white scale-105 shadow-xl shadow-black/20' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
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
              <div className="space-y-8 pb-24">
                <div className="bg-white rounded-[56px] p-8 sm:p-12 border border-slate-100 shadow-xl text-center">
                  <h3 className="text-3xl font-black mb-10 italic uppercase tracking-tighter">Dual Contrast View</h3>
                  <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={280} />
                </div>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || syncSuccess} 
                  className={`w-full py-8 rounded-[36px] font-black text-xl transition-all flex items-center justify-center gap-4 ${syncSuccess ? 'bg-emerald-500 text-white' : 'bg-black text-white hover:scale-[0.98] shadow-2xl shadow-black/10'}`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin"/> : syncSuccess ? <CheckCircle2/> : <Database/>}
                  {syncSuccess ? "SYNCED TO NOTION" : "SYNC TO CLOUD"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* 教师端面板 (适配手机) */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 px-2">
              <div className="space-y-1">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter italic uppercase leading-none">Management</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] ml-1">Teaching Progress Analytics</p>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                  <input 
                    type="text" 
                    placeholder="Search name/ID..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold w-full sm:w-56 focus:w-full sm:focus:w-72 transition-all outline-none focus:border-indigo-500 shadow-sm" 
                  />
                </div>
                <div className="flex bg-white p-1 border border-slate-100 rounded-2xl shadow-sm">
                   <div className="px-3 flex items-center gap-2 text-slate-300"><Filter size={14}/></div>
                   <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent text-xs font-black py-2 pr-4 outline-none min-w-[100px]">
                     {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
                   </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportCSV} className="flex-1 sm:flex-none p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-black transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase"><Download size={14}/> CSV</button>
                  <button onClick={loadRecords} disabled={isFetching} className="p-3 bg-black text-white rounded-2xl shadow-lg hover:scale-110 active:rotate-180 transition-all"><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''}/></button>
                </div>
              </div>
            </div>

            {/* 批量操作工具条 */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between bg-slate-900 text-white w-[90%] max-w-lg px-8 py-5 rounded-[32px] shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-12 duration-500 border border-white/10">
                <div className="flex items-center gap-4 font-black text-xs italic">
                  <span className="bg-indigo-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-[10px] not-italic shadow-lg shadow-indigo-500/30">{selectedIds.size}</span>
                  <span className="tracking-widest uppercase">Records Selected</span>
                </div>
                <div className="flex gap-5">
                  <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Cancel</button>
                  <button onClick={handleBatchDelete} className="bg-rose-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-500 transition-all"><Trash2 size={12}/> Delete</button>
                </div>
              </div>
            )}

            {/* 数据表格 (适配手机左右滑动) */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto scrollbar-hide">
                 <table className="w-full text-left border-collapse min-w-[640px]">
                   <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-50">
                       <th className="px-8 py-6 w-12 text-center">
                         <input 
                            type="checkbox" 
                            checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0} 
                            onChange={e => {
                               if (e.target.checked) setSelectedIds(new Set(filteredRecords.map(r => r.id)));
                               else setSelectedIds(new Set());
                            }} 
                            className="w-5 h-5 rounded-md accent-black cursor-pointer" 
                          />
                       </th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Class</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pre (学前)</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Post (期末)</th>
                       <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gain</th>
                       <th className="px-8 py-6 text-right">View</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {isFetching ? (
                        <tr><td colSpan={7} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" size={40}/></td></tr>
                     ) : filteredRecords.length === 0 ? (
                        <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-black italic uppercase tracking-widest">No Student Data Found</td></tr>
                     ) : (
                        filteredRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setDetailStudent(r)}>
                            <td className="px-8 py-6 text-center" onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(r.id)} 
                                onChange={() => {
                                  const newIds = new Set(selectedIds);
                                  if (newIds.has(r.id)) newIds.delete(r.id); else newIds.add(r.id);
                                  setSelectedIds(newIds);
                                }} 
                                className="w-5 h-5 rounded-md accent-black cursor-pointer" 
                              />
                            </td>
                            <td className="px-6 py-6">
                              <span className="font-black text-base group-hover:text-indigo-600 transition-colors">{r.name}</span>
                            </td>
                            <td className="px-6 py-6">
                              <div className="text-[10px] font-black text-slate-400 leading-tight">#{r.studentId}</div>
                              <div className="text-[9px] font-bold text-indigo-500 uppercase">{r.className}</div>
                            </td>
                            <td className="px-6 py-6 font-bold text-slate-400 text-sm text-center">{r.preScore}</td>
                            <td className="px-6 py-6 font-black text-sm italic text-center text-emerald-600">{r.postScore}</td>
                            <td className="px-6 py-6 text-center">
                               <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${r.postScore >= r.preScore ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                 {r.postScore >= r.preScore ? '+' : ''}{r.postScore - r.preScore}
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="w-10 h-10 bg-slate-50 rounded-full inline-flex items-center justify-center text-slate-300 group-hover:bg-black group-hover:text-white transition-all shadow-sm"><ChevronRight size={18}/></div>
                            </td>
                          </tr>
                        ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
