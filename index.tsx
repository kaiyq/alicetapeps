
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  TrendingUp,
  RefreshCw,
  Lock,
  Database,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  ArrowUpRight,
  X,
  PieChart,
  AlertCircle,
  Save,
  Info,
  User
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
  { name: 'Content', color: '#6366F1', questionsCount: 4 },
  { name: 'Delivery', color: '#10B981', questionsCount: 6 },
  { name: 'Language', color: '#F59E0B', questionsCount: 5 },
  { name: 'Logic', color: '#F97316', questionsCount: 5 }
];

const QUESTIONS = [
  "Beginning, body and ending included?", 
  "Attention getter? (Questions, stories or statistics?)", 
  "Clear opinions?", 
  "Impressive ending?",
  "Voice: Fluctuating tone? Comforting tone?", 
  "Voice: Proper pace? Proper volume? Proper pitch?", 
  "Voice: Proper stresses? Proper pauses?", 
  "Voice: Clear pronunciation? Any pronouncing mistakes?",
  "Body Language: Vivid body language? Open gestures? Nervous movements?",
  "Body Language: Vivid facial expressions? Eye Contact? Smile?",
  "Fluency?", 
  "Accuracy and economy? Any grammar mistakes?", 
  "Vividness and visualization?", 
  "Any filler words?",
  "How many complete and right sentences?",
  "Clear and ordered structure?", 
  "Sufficient supportive material?", 
  "Valid evidence?", 
  "Any logical fallacies?",
  "Coherence?"
];

// ============================================================
// 🎨 视觉组件：雷达图
// ============================================================
const RadarChart: React.FC<{ preScores: number[], postScores: number[], size?: number }> = ({ preScores, postScores, size = 280 }) => {
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
        <defs>
          <radialGradient id="postGradient">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.1)" />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {CATEGORIES.map((_, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#CBD5E1" strokeWidth="1" />
        ))}
        <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="4 2" />
        <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="url(#postGradient)" stroke="#059669" strokeWidth="3" />
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 35) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 35) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" className="text-[11px] font-black fill-slate-700 uppercase">{cat.name}</text>
          );
        })}
      </svg>
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
        headers: { 
          "Authorization": `Bearer ${DEFAULT_CONFIG.apiKey}`, 
          "Content-Type": "application/json", 
          "Notion-Version": "2022-06-28" 
        },
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
  
  const [records, setRecords] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [detailStudent, setDetailStudent] = useState<any | null>(null);

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

  const completionRate = useMemo(() => {
    const total = QUESTIONS.length * 2;
    const answered = Object.keys(preRatings).length + Object.keys(postRatings).length;
    return Math.round((answered / total) * 100);
  }, [preRatings, postRatings]);

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

  const handleSubmit = async () => {
    if(!profile.name || !profile.studentId || !profile.className) {
      return alert("请填写完整的个人信息（姓名、学号、班级）。");
    }
    if(completionRate < 100) {
      if(!confirm(`尚有部分题目未填写，确定要同步到云端吗？`)) return;
    }
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
      setTimeout(() => setSyncSuccess(false), 5000);
    } else alert("同步失败，请重试。");
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-slate-900 pb-12 font-sans selection:bg-indigo-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><TrendingUp size={20}/></div>
          <div>
            <span className="font-black text-2xl tracking-tighter italic uppercase block leading-none text-slate-900">Tapeps</span>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">Cloud Database Console</span>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button onClick={() => setView('student')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${view === 'student' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>学生入口</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
            <Lock size={12}/> 教师控制台
          </button>
        </div>
      </nav>

      {/* 密码弹窗 */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-12 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowPasswordPrompt(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X size={24}/></button>
            <h3 className="text-center font-black text-2xl mb-10 uppercase italic tracking-tighter text-slate-900 underline decoration-slate-200 underline-offset-8">Admin Access</h3>
            <input 
              type="password" autoFocus value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()} 
              className="w-full text-center text-4xl py-6 bg-slate-50 rounded-3xl mb-10 outline-none border-4 border-slate-100 focus:border-slate-900 transition-all font-black tracking-[0.5em]" 
              placeholder="••••"
            />
            <button onClick={handleVerifyPassword} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Verify & Enter</button>
          </div>
        </div>
      )}

      {/* 教师端：详细数据模态框 (高对比度) */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
           <div className="bg-white rounded-t-[40px] sm:rounded-[40px] w-full max-w-2xl h-[92vh] sm:h-auto overflow-y-auto shadow-2xl relative border-t-8 border-slate-900">
              <button onClick={() => setDetailStudent(null)} className="absolute top-8 right-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all z-10 shadow-sm"><X size={24}/></button>
              <div className="p-8 sm:p-14 space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                  <div className="w-24 h-24 bg-slate-900 text-white rounded-[32px] flex items-center justify-center text-4xl font-black italic shadow-2xl">{detailStudent.name.charAt(0)}</div>
                  <div className="text-center sm:text-left space-y-2">
                    <h3 className="text-5xl font-black tracking-tighter leading-none text-slate-900 uppercase italic">{detailStudent.name}</h3>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-700 uppercase tracking-widest">ID: {detailStudent.studentId}</span>
                      <span className="bg-indigo-100 px-3 py-1 rounded-lg text-xs font-black text-indigo-700 uppercase tracking-widest">Class: {detailStudent.className}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl text-center">
                      <p className="text-[11px] font-black text-slate-500 uppercase mb-2 tracking-widest">Pre-Test</p>
                      <p className="text-4xl font-black italic text-slate-900 leading-none">{detailStudent.preScore}</p>
                   </div>
                   <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl text-center">
                      <p className="text-[11px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Post-Test</p>
                      <p className="text-4xl font-black italic text-emerald-700 leading-none">{detailStudent.postScore}</p>
                   </div>
                   <div className="bg-slate-900 p-6 rounded-3xl text-white text-center shadow-2xl">
                      <p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">Progress</p>
                      <p className="text-4xl font-black italic leading-none">{detailStudent.postScore - detailStudent.preScore >= 0 ? '+' : ''}{detailStudent.postScore - detailStudent.preScore}</p>
                   </div>
                </div>

                <div className="bg-slate-50 rounded-[48px] p-10 flex flex-col items-center gap-14 border-2 border-slate-200 shadow-inner">
                   <div className="w-full space-y-10">
                      <h4 className="font-black text-[13px] uppercase tracking-[0.4em] flex items-center gap-3 text-slate-900 border-b-2 border-slate-200 pb-4"><PieChart size={18}/> Dimension Data</h4>
                      <div className="grid grid-cols-1 gap-8">
                        {CATEGORIES.map((cat, i) => {
                          const preS = detailStudent.preSubScores[i];
                          const postS = detailStudent.postSubScores[i];
                          const max = cat.questionsCount * 4;
                          return (
                            <div key={i} className="space-y-4">
                              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-800">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>{cat.name}</span>
                                <span>{preS} <span className="text-slate-300 mx-1">→</span> <span className="text-emerald-600">{postS}</span> <span className="text-slate-400">/ {max}</span></span>
                              </div>
                              <div className="h-4 bg-white rounded-full overflow-hidden ring-2 ring-slate-200 relative p-1">
                                <div className="absolute inset-y-1 left-1 bg-slate-200/60 rounded-full" style={{ width: `calc(${(preS/max)*100}% - 8px)` }}></div>
                                <div className="h-full bg-emerald-500 rounded-full relative z-10 shadow-sm" style={{ width: `${(postS/max)*100}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>
                   <div className="bg-white rounded-[56px] p-8 shadow-2xl border-4 border-slate-50">
                     <RadarChart preScores={detailStudent.preSubScores} postScores={detailStudent.postSubScores} size={280} />
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-10">
        {view === 'student' ? (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
             {/* 学生输入 */}
             <div className="bg-white rounded-[36px] p-10 border-2 border-slate-200 shadow-lg space-y-10 relative overflow-hidden group">
              <h3 className="text-center font-black text-xs uppercase tracking-[0.4em] text-slate-900 border-b-2 border-slate-50 pb-6 flex items-center justify-center gap-3">
                <User size={18}/> Step 1: Identity Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: '姓名 (Name)', key: 'name', ph: '张三' },
                  { label: '学号 (ID)', key: 'studentId', ph: '20240001' },
                  { label: '班级 (Class)', key: 'className', ph: 'Grade 10-1' }
                ].map(f => (
                  <div key={f.key} className="space-y-3">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest ml-1">{f.label}</label>
                    <input 
                      value={profile[f.key as keyof typeof profile]} 
                      onChange={e => setProfile({...profile, [f.key]: e.target.value})} 
                      placeholder={f.ph} 
                      className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 focus:bg-white focus:border-slate-900 transition-all text-sm font-black outline-none shadow-inner text-slate-900 placeholder:text-slate-300" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 标签切换 */}
            <div className="flex bg-slate-200/50 p-2 rounded-3xl max-w-sm mx-auto shadow-inner sticky top-24 z-30 ring-1 ring-slate-200 backdrop-blur-md">
              {[
                {id: 'pre', label: 'PRE-TEST'}, 
                {id: 'post', label: 'POST-TEST'}, 
                {id: 'compare', label: 'CLOUD SYNC'}
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === t.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-900'}`}>{t.label}</button>
              ))}
            </div>

            {/* 问卷内容 */}
            {activeTab !== 'compare' ? (
              <div className="space-y-14 pb-24">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                  return (
                    <div key={cat.name} className="space-y-8">
                      <div className="flex items-center gap-5 px-4">
                        <div className="w-2 h-8 rounded-full shadow-sm" style={{backgroundColor: cat.color}}></div>
                        <h3 className="text-sm font-black uppercase tracking-[0.5em] text-slate-800">{cat.name} Dimension</h3>
                      </div>
                      <div className="bg-white rounded-[44px] border-2 border-slate-200 p-8 sm:p-14 space-y-16 shadow-xl">
                        {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                          const qIdx = offset + i + 1;
                          const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                          return (
                            <div key={qIdx} className="space-y-10 group">
                              <div className="flex gap-6">
                                <span className="text-slate-900 font-black text-3xl italic leading-none">{qIdx < 10 ? `0${qIdx}` : qIdx}</span>
                                <p className="font-black text-slate-800 text-lg leading-relaxed">{q}</p>
                              </div>
                              <div className="grid grid-cols-5 gap-4">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button 
                                    key={r} 
                                    onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                    className={`relative py-6 rounded-[24px] font-black text-lg transition-all active:scale-90 ${current === r ? 'bg-slate-900 text-white shadow-2xl -translate-y-2 ring-8 ring-slate-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 border-2 border-transparent'}`}
                                  >
                                    {r}
                                    {current === r && <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full border-4 border-white shadow-md"></div>}
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
              <div className="space-y-12 pb-32 animate-in slide-in-from-bottom-12 duration-500">
                <div className="bg-white rounded-[64px] p-12 sm:p-20 border-4 border-slate-900 shadow-2xl text-center space-y-14 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>
                   <div className="space-y-3">
                      <h3 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Self-Growth Report</h3>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Database Visualization Output</p>
                   </div>
                   <div className="flex justify-center bg-slate-50 rounded-[64px] py-16 border-2 border-slate-100 shadow-inner">
                      <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={320} />
                   </div>
                   <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
                      <div className="bg-white rounded-[32px] p-8 border-2 border-slate-100 shadow-lg">
                        <p className="text-[11px] font-black text-slate-400 mb-2 tracking-widest uppercase">Pre-Total</p>
                        <p className="text-4xl font-black italic text-slate-900 leading-none">{preScoresArr.reduce((a,b)=>a+b,0)}</p>
                      </div>
                      <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl scale-110">
                        <p className="text-[11px] font-black text-slate-400 mb-2 tracking-widest uppercase">Post-Total</p>
                        <p className="text-4xl font-black italic text-white leading-none">{postScoresArr.reduce((a,b)=>a+b,0)}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-indigo-950 rounded-[40px] p-10 flex items-start gap-8 shadow-2xl text-white">
                  <AlertCircle className="text-indigo-400 shrink-0 mt-1" size={32}/>
                  <div className="space-y-3">
                    <h4 className="text-lg font-black uppercase tracking-widest">Database Sync Protocol</h4>
                    <p className="text-sm font-bold text-indigo-100/70 leading-relaxed">点击下方按钮将评分数据加密同步至教师控制台。一旦同步成功，您的成长曲线将实时更新在教师端的数据库仪表盘中。</p>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit} disabled={isSubmitting || syncSuccess} 
                  className={`w-full py-10 rounded-[48px] font-black text-2xl transition-all flex items-center justify-center gap-6 relative overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ${syncSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:scale-[0.98] active:scale-95'}`}
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={32}/><span className="tracking-[0.2em] uppercase italic">Syncing to Cloud...</span></>
                  ) : syncSuccess ? (
                    <><CheckCircle2 size={32}/><span className="tracking-[0.2em] uppercase italic">Data Synced Successfully!</span></>
                  ) : (
                    <><Save size={32} className="group-hover:rotate-12 transition-transform"/><span className="tracking-[0.2em] uppercase italic">Commit to Cloud DB</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 教师端：高对比度列表页 */
          <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 px-4">
              <div className="space-y-4">
                <h2 className="text-7xl sm:text-9xl font-black tracking-tighter italic uppercase leading-none text-slate-900">Console</h2>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-lg animate-pulse">Live DB Monitoring</div>
                  <p className="text-slate-600 text-[11px] font-bold uppercase tracking-[0.2em]">Updated {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-5">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-900" size={20}/>
                  <input 
                    type="text" placeholder="Search by Name or Student ID..." value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-16 pr-8 py-5 bg-white border-4 border-slate-200 rounded-[28px] text-sm font-black w-full sm:w-80 focus:ring-8 focus:ring-slate-100 transition-all outline-none focus:border-slate-900 shadow-xl placeholder:text-slate-300 text-slate-900" 
                  />
                </div>
                <div className="flex bg-white p-2 border-4 border-slate-200 rounded-[28px] shadow-xl">
                   <div className="px-5 flex items-center gap-3 text-slate-900 border-r-2 border-slate-100"><Filter size={18}/></div>
                   <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent text-xs font-black py-2 pl-6 pr-10 outline-none appearance-none cursor-pointer text-slate-900 uppercase">
                     <option value="All">All Classes</option>
                     {Array.from(new Set(records.map(r => r.className))).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <button onClick={loadRecords} disabled={isFetching} className="p-5 bg-slate-900 text-white rounded-[28px] shadow-2xl hover:scale-110 active:scale-95 transition-all">
                  <RefreshCw size={24} className={isFetching ? 'animate-spin' : ''}/>
                </button>
              </div>
            </div>

            {/* 列表数据 (深度着色提升可见性) */}
            <div className="bg-white rounded-[56px] border-4 border-slate-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                     <tr className="bg-slate-900 text-[12px] font-black text-white uppercase tracking-widest">
                       <th className="px-12 py-8">Student Detail</th>
                       <th className="px-8 py-8 text-center">Pre Test</th>
                       <th className="px-8 py-8 text-center">Post Test</th>
                       <th className="px-8 py-8 text-center">Net Gain</th>
                       <th className="px-12 py-8 text-right italic">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y-4 divide-slate-50">
                     {isFetching ? (
                        <tr><td colSpan={5} className="py-48 text-center"><Loader2 className="animate-spin mx-auto text-slate-900" size={64}/></td></tr>
                     ) : filteredRecords.length === 0 ? (
                        <tr><td colSpan={5} className="py-64 text-center text-slate-300 font-black italic uppercase tracking-widest text-4xl">No Cloud Records Found</td></tr>
                     ) : (
                        filteredRecords.map(r => (
                          <tr key={r.id} className="hover:bg-indigo-50/50 transition-all group cursor-pointer" onClick={() => setDetailStudent(r)}>
                            <td className="px-12 py-10">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-12">{r.name.charAt(0)}</div>
                                <div className="space-y-1">
                                  <span className="font-black text-2xl text-slate-900 block tracking-tighter uppercase group-hover:text-indigo-700 transition-colors">{r.name}</span>
                                  <div className="flex gap-2">
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">ID: {r.studentId}</span>
                                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">{r.className}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-10 font-black text-2xl text-slate-600 text-center">{r.preScore}</td>
                            <td className="px-8 py-10 font-black text-3xl italic text-center text-slate-900">{r.postScore}</td>
                            <td className="px-8 py-10 text-center">
                               <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black shadow-sm ${r.postScore - r.preScore >= 0 ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200' : 'bg-rose-100 text-rose-800 ring-2 ring-rose-200'}`}>
                                 {r.postScore - r.preScore >= 0 ? <ArrowUpRight size={16}/> : null}
                                 {r.postScore - r.preScore}
                               </div>
                            </td>
                            <td className="px-12 py-10 text-right">
                              <div className="w-16 h-16 bg-slate-100 rounded-3xl inline-flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-md group-hover:scale-110 border-2 border-transparent group-hover:border-slate-800">
                                <ChevronRight size={28}/>
                              </div>
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
