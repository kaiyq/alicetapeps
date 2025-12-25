
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
          <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#64748B" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        {CATEGORIES.map((_, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="#64748B" strokeWidth="1" />
        ))}
        <polygon points={prePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0F172A" strokeWidth="2" strokeDasharray="4 2" />
        <polygon points={postPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="url(#postGradient)" stroke="#059669" strokeWidth="3" />
        {CATEGORIES.map((cat, i) => {
          const x = center + (radius + 45) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 45) * Math.sin(i * angleStep - Math.PI / 2);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" className="text-[12px] font-black fill-slate-950 uppercase">{cat.name}</text>
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
  static getBaseUrl() { 
    const base = DEFAULT_CONFIG.proxyUrl.replace(/\/$/, '');
    return `${base}/v1/`; 
  }
  
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
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-12 font-sans selection:bg-indigo-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white border-b-4 border-slate-950 px-4 md:px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-xl"><TrendingUp size={24}/></div>
          <div>
            <span className="font-black text-3xl tracking-tighter italic uppercase block leading-none text-slate-950">Tapeps</span>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em] mt-0.5">Cloud Database Platform</span>
          </div>
        </div>
        <div className="flex bg-slate-200 p-2 rounded-2xl border-4 border-slate-300">
          <button onClick={() => setView('student')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'student' ? 'bg-slate-950 text-white shadow-xl scale-110' : 'text-slate-700 hover:text-slate-950'}`}>学生入口</button>
          <button onClick={() => isTeacherAuthenticated ? setView('teacher') : setShowPasswordPrompt(true)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-slate-950 text-white shadow-xl scale-110' : 'text-slate-700 hover:text-slate-950'}`}>
            <Lock size={14}/> 教师管理
          </button>
        </div>
      </nav>

      {/* 教师端模态框 */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-0 sm:p-6">
           <div className="bg-white rounded-none sm:rounded-[60px] w-full max-w-3xl h-full sm:h-auto max-h-[95vh] overflow-y-auto shadow-2xl relative border-t-[16px] border-slate-950">
              <button onClick={() => setDetailStudent(null)} className="absolute top-10 right-10 w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all z-10 shadow-xl border-4 border-slate-950"><X size={32}/></button>
              <div className="p-10 sm:p-20 space-y-16">
                <div className="flex flex-col sm:flex-row sm:items-center gap-10">
                  <div className="w-32 h-32 bg-slate-950 text-white rounded-[40px] flex items-center justify-center text-6xl font-black italic shadow-2xl">{detailStudent.name.charAt(0)}</div>
                  <div className="text-center sm:text-left space-y-4">
                    <h3 className="text-7xl font-black tracking-tighter leading-none text-slate-950 uppercase italic">{detailStudent.name}</h3>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                      <span className="bg-slate-950 text-white px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest">Student ID: {detailStudent.studentId}</span>
                      <span className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest">Class: {detailStudent.className}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                   <div className="bg-slate-50 border-4 border-slate-200 p-8 rounded-[40px] text-center shadow-inner">
                      <p className="text-xs font-black text-slate-600 uppercase mb-3 tracking-[0.3em]">Pre-Test Score</p>
                      <p className="text-6xl font-black italic text-slate-950 leading-none">{detailStudent.preScore}</p>
                   </div>
                   <div className="bg-emerald-50 border-4 border-emerald-200 p-8 rounded-[40px] text-center shadow-inner">
                      <p className="text-xs font-black text-emerald-800 uppercase mb-3 tracking-[0.3em]">Post-Test Score</p>
                      <p className="text-6xl font-black italic text-emerald-950 leading-none">{detailStudent.postScore}</p>
                   </div>
                   <div className="bg-slate-950 p-8 rounded-[40px] text-white text-center shadow-2xl scale-105 border-4 border-slate-800">
                      <p className="text-xs font-black text-slate-400 uppercase mb-3 tracking-[0.3em]">Net Growth</p>
                      <p className="text-6xl font-black italic leading-none">{detailStudent.postScore - detailStudent.preScore >= 0 ? '+' : ''}{detailStudent.postScore - detailStudent.preScore}</p>
                   </div>
                </div>

                <div className="bg-slate-50 rounded-[64px] p-12 border-4 border-slate-200 flex flex-col items-center gap-16">
                   <div className="w-full space-y-12">
                      <h4 className="font-black text-sm uppercase tracking-[0.5em] flex items-center gap-4 text-slate-950 border-b-4 border-slate-950 pb-6"><PieChart size={24}/> Statistical Dimensions</h4>
                      <div className="grid grid-cols-1 gap-10">
                        {CATEGORIES.map((cat, i) => {
                          const preS = detailStudent.preSubScores[i];
                          const postS = detailStudent.postSubScores[i];
                          const max = cat.questionsCount * 4;
                          return (
                            <div key={i} className="space-y-5">
                              <div className="flex justify-between text-sm font-black uppercase tracking-widest text-slate-950">
                                <span className="flex items-center gap-3"><div className="w-4 h-4 rounded-full border-2 border-slate-950" style={{backgroundColor: cat.color}}></div>{cat.name}</span>
                                <span>{preS} <span className="text-slate-400 mx-2">➞</span> <span className="text-emerald-700 font-black underline decoration-2">{postS}</span> <span className="text-slate-900 ml-1">/ {max}</span></span>
                              </div>
                              <div className="h-7 bg-white rounded-full overflow-hidden ring-4 ring-slate-200 relative p-1.5 shadow-inner">
                                <div className="absolute inset-y-1.5 left-1.5 bg-slate-300 rounded-full opacity-60" style={{ width: `calc(${(preS/max)*100}% - 12px)` }}></div>
                                <div className="h-full bg-emerald-600 rounded-full relative z-10 shadow-lg border-r-4 border-white" style={{ width: `${(postS/max)*100}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>
                   <div className="bg-white rounded-[72px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border-8 border-slate-100 scale-110">
                     <RadarChart preScores={detailStudent.preSubScores} postScores={detailStudent.postSubScores} size={300} />
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* 主界面 */}
      <main className="max-w-7xl mx-auto px-6 pt-16">
        {view === 'student' ? (
          <div className="max-w-4xl mx-auto space-y-16">
            {/* 学生信息 */}
            <div className="bg-white rounded-[48px] p-12 border-8 border-slate-950 shadow-2xl space-y-12">
              <h3 className="text-center font-black text-sm uppercase tracking-[0.6em] text-slate-950 border-b-4 border-slate-100 pb-8 flex items-center justify-center gap-4">
                <User size={20}/> Member Profile Registration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: '姓名 (Full Name)', key: 'name', ph: 'Ex: Li Hua' },
                  { label: '学号 (Student ID)', key: 'studentId', ph: 'Ex: 202501' },
                  { label: '班级 (Class Group)', key: 'className', ph: 'Ex: Class A' }
                ].map(f => (
                  <div key={f.key} className="space-y-4">
                    <label className="text-[12px] font-black text-slate-950 uppercase tracking-widest ml-1">{f.label}</label>
                    <input 
                      value={profile[f.key as keyof typeof profile]} 
                      onChange={e => setProfile({...profile, [f.key]: e.target.value})} 
                      placeholder={f.ph} 
                      className="w-full bg-slate-100 p-6 rounded-3xl border-4 border-slate-200 focus:bg-white focus:border-slate-950 transition-all text-base font-black outline-none text-slate-950 placeholder:text-slate-400" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="space-y-12">
               <div className="flex bg-slate-200 p-3 rounded-[32px] max-w-lg mx-auto shadow-inner ring-4 ring-slate-300">
                {[
                  {id: 'pre', label: 'PRE-TEST'}, 
                  {id: 'post', label: 'POST-TEST'}, 
                  {id: 'compare', label: 'SYNC CLOUD'}
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-5 rounded-[24px] text-xs font-black transition-all ${activeTab === t.id ? 'bg-slate-950 text-white shadow-2xl scale-110' : 'text-slate-700 hover:text-slate-950'}`}>{t.label}</button>
                ))}
              </div>

              {activeTab !== 'compare' ? (
                <div className="space-y-20 pb-32">
                  {CATEGORIES.map((cat, idx) => {
                    let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.questionsCount, 0);
                    return (
                      <div key={cat.name} className="space-y-10">
                        <div className="flex items-center gap-6 px-4">
                          <div className="w-4 h-12 rounded-full shadow-md" style={{backgroundColor: cat.color}}></div>
                          <h3 className="text-xl font-black uppercase tracking-[0.6em] text-slate-950">{cat.name} System</h3>
                        </div>
                        <div className="bg-white rounded-[60px] border-8 border-slate-950 p-10 md:p-20 space-y-20 shadow-2xl relative overflow-hidden">
                          {QUESTIONS.slice(offset, offset + cat.questionsCount).map((q, i) => {
                            const qIdx = offset + i + 1;
                            const current = (activeTab === 'pre' ? preRatings : postRatings)[qIdx];
                            return (
                              <div key={qIdx} className="space-y-12 border-b-4 border-slate-50 pb-16 last:border-0">
                                <div className="flex gap-8">
                                  <span className="text-slate-950 font-black text-6xl italic leading-none opacity-20">{qIdx < 10 ? `0${qIdx}` : qIdx}</span>
                                  <p className="font-black text-slate-950 text-2xl leading-relaxed mt-2">{q}</p>
                                </div>
                                <div className="grid grid-cols-5 gap-4">
                                  {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                    <button 
                                      key={r} 
                                      onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} 
                                      className={`relative py-10 rounded-[36px] font-black text-4xl transition-all active:scale-90 ${current === r ? 'bg-slate-950 text-white shadow-2xl -translate-y-4 ring-[12px] ring-slate-100 scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-950 border-4 border-transparent'}`}
                                    >
                                      {r}
                                      {current === r && <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center"><CheckCircle2 size={20}/></div>}
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
                <div className="space-y-16 pb-32">
                   <div className="bg-white rounded-[80px] p-16 md:p-24 border-[12px] border-slate-950 shadow-2xl text-center space-y-16">
                      <div className="space-y-4">
                        <h3 className="text-7xl font-black italic uppercase tracking-tighter text-slate-950 leading-none">Growth Output</h3>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-[0.6em]">Real-time Database Visualization</p>
                      </div>
                      <div className="flex justify-center bg-slate-50 rounded-[80px] py-20 border-8 border-slate-100 shadow-inner scale-105">
                        <RadarChart preScores={preScoresArr} postScores={postScoresArr} size={360} />
                      </div>
                      <div className="grid grid-cols-2 gap-10 max-w-xl mx-auto">
                        <div className="bg-white rounded-[48px] p-10 border-8 border-slate-200 shadow-xl">
                          <p className="text-sm font-black text-slate-500 mb-4 tracking-widest uppercase">Pre-Test Total</p>
                          <p className="text-7xl font-black italic text-slate-950 leading-none">{preScoresArr.reduce((a,b)=>a+b,0)}</p>
                        </div>
                        <div className="bg-slate-950 rounded-[48px] p-10 shadow-2xl scale-110 border-4 border-slate-800">
                          <p className="text-sm font-black text-slate-400 mb-4 tracking-widest uppercase">Post-Test Total</p>
                          <p className="text-7xl font-black italic text-white leading-none">{postScoresArr.reduce((a,b)=>a+b,0)}</p>
                        </div>
                      </div>
                   </div>

                   <button 
                    onClick={handleSubmit} disabled={isSubmitting || syncSuccess} 
                    className={`w-full py-12 rounded-[60px] font-black text-4xl transition-all flex items-center justify-center gap-8 relative overflow-hidden group shadow-[0_60px_100px_-20px_rgba(0,0,0,0.5)] ${syncSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white hover:scale-[0.97] active:scale-95'}`}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={48}/><span className="tracking-[0.3em] uppercase italic">Syncing to Cloud...</span></>
                    ) : syncSuccess ? (
                      <><CheckCircle2 size={48}/><span className="tracking-[0.3em] uppercase italic">Records Synced!</span></>
                    ) : (
                      <><Save size={48} className="group-hover:rotate-12 transition-transform"/><span className="tracking-[0.3em] uppercase italic">Commit to Cloud Database</span></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 教师管理列表 */
          <div className="space-y-16 pb-32">
             <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 px-6">
              <div className="space-y-6">
                <h2 className="text-9xl sm:text-[13rem] font-black tracking-tighter italic uppercase leading-none text-slate-950">Vault</h2>
                <div className="flex items-center gap-6">
                  <div className="px-8 py-3 bg-slate-950 text-white rounded-2xl text-sm font-black uppercase tracking-[0.4em] shadow-2xl animate-pulse ring-8 ring-slate-100">Encrypted Cloud Storage</div>
                  <p className="text-slate-950 text-sm font-black uppercase tracking-[0.3em] italic">Updated: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-6 items-center">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-950" size={28}/>
                  <input 
                    type="text" placeholder="Search Identity..." value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-20 pr-10 py-8 bg-white border-8 border-slate-950 rounded-[40px] text-xl font-black w-full focus:ring-[16px] focus:ring-slate-100 transition-all outline-none shadow-2xl text-slate-950 placeholder:text-slate-300" 
                  />
                </div>
                <button onClick={loadRecords} disabled={isFetching} className="p-8 bg-slate-950 text-white rounded-[40px] shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-slate-800">
                  <RefreshCw size={36} className={isFetching ? 'animate-spin' : ''}/>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[80px] border-[12px] border-slate-950 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.3)] overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[1000px]">
                   <thead>
                     <tr className="bg-slate-950 text-[14px] font-black text-white uppercase tracking-[0.4em]">
                       <th className="px-16 py-12">Member Data</th>
                       <th className="px-10 py-12 text-center">Pre</th>
                       <th className="px-10 py-12 text-center">Post</th>
                       <th className="px-10 py-12 text-center">Gain</th>
                       <th className="px-16 py-12 text-right">Access</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y-8 divide-slate-50">
                     {isFetching ? (
                        <tr><td colSpan={5} className="py-80 text-center"><Loader2 className="animate-spin mx-auto text-slate-950" size={100}/></td></tr>
                     ) : filteredRecords.length === 0 ? (
                        <tr><td colSpan={5} className="py-96 text-center text-slate-950 font-black italic uppercase tracking-widest text-6xl opacity-10">No Records Found</td></tr>
                     ) : (
                        filteredRecords.map(r => (
                          <tr key={r.id} className="hover:bg-indigo-50 transition-all group cursor-pointer" onClick={() => setDetailStudent(r)}>
                            <td className="px-16 py-16">
                              <div className="flex items-center gap-10">
                                <div className="w-24 h-24 bg-slate-950 text-white rounded-3xl flex items-center justify-center font-black text-4xl shadow-2xl transition-all group-hover:rotate-12 group-hover:scale-110">{r.name.charAt(0)}</div>
                                <div className="space-y-4">
                                  {/* 这里确保名字极黑且巨大 */}
                                  <span className="font-black text-5xl text-slate-950 block tracking-tighter uppercase leading-none group-hover:text-indigo-900 transition-colors">{r.name}</span>
                                  <div className="flex gap-4">
                                    <span className="text-[14px] font-black bg-slate-950 text-white px-5 py-2 rounded-xl uppercase shadow-md">ID: {r.studentId}</span>
                                    <span className="text-[14px] font-black bg-indigo-700 text-white px-5 py-2 rounded-xl uppercase shadow-md">{r.className}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-16 font-black text-4xl text-slate-900 text-center">{r.preScore}</td>
                            <td className="px-10 py-16 font-black text-6xl italic text-center text-slate-950 bg-slate-50/80">{r.postScore}</td>
                            <td className="px-10 py-16 text-center">
                               <div className={`inline-flex items-center gap-4 px-10 py-6 rounded-[32px] text-2xl font-black shadow-2xl border-4 ${r.postScore - r.preScore >= 0 ? 'bg-emerald-100 text-emerald-950 border-emerald-400' : 'bg-rose-100 text-rose-950 border-rose-400'}`}>
                                 {r.postScore - r.preScore >= 0 ? <ArrowUpRight size={28}/> : null}
                                 {r.postScore - r.preScore}
                               </div>
                            </td>
                            <td className="px-16 py-16 text-right">
                              <div className="w-24 h-24 bg-slate-100 rounded-[40px] inline-flex items-center justify-center text-slate-950 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-2xl group-hover:scale-110 border-8 border-slate-950">
                                <ChevronRight size={48}/>
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
