
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  UserCircle, 
  Loader2, 
  TrendingUp,
  Settings,
  X,
  RefreshCw,
  Wifi,
  Cloud,
  Search,
  Filter,
  Download,
  Trash2,
  Maximize2,
  Hash,
  School,
  Lock,
  Unlock,
  ArrowRight,
  AlertCircle,
  Database,
  ExternalLink,
  BookOpen,
  Server,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';

// ============================================================
// 🎯 云端配置中心 - 必须在这里填入你的真实信息！
// ============================================================
const CONFIG = {
  // 1. Notion 机器人 Token
  apiKey: "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", 
  // 2. Notion 数据库 ID
  dbId: "2d36f36bb31880cbbb70c43247b18de1", 
  // 3. ⚠️ 必须要换成你 Cloudflare 上的真实地址！
  // 这里的中文必须删掉，换成类似 https://xxx.xxx.workers.dev 的链接
  proxyUrl: "https://你的worker名字.你的子名.workers.dev/" 
};

const TEACHER_PASSWORD = "0209";

/**
 * 💡 配置有效性检查
 */
const isConfigValid = () => {
  return CONFIG.proxyUrl && 
         CONFIG.proxyUrl.startsWith("http") && 
         !CONFIG.proxyUrl.includes("你的worker名字");
};

// --- 核心业务逻辑 ---

type Rating = 'A' | 'B' | 'C' | 'D' | 'E';
const RATING_MAP: Record<Rating, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'E': 0 };

interface StudentRecord {
  id: string;
  name: string;
  studentId: string;
  className: string;
  preScore: number;
  postScore: number;
  preScores: number[]; 
  postScores: number[]; 
  lastUpdated?: string;
}

const CATEGORIES = [
  { name: 'Content', color: '#3B82F6', count: 4, questions: ["Beginning, body and ending included?", "Attention getter?", "Clear opinions?", "Impressive ending?"]},
  { name: 'Delivery', color: '#10B981', count: 6, questions: ["Voice: Fluctuating tone?", "Voice: Proper pace/volume?", "Voice: Proper stresses?", "Voice: Clear pronunciation?", "Body Language: Vivid language?", "Body Language: Facial expressions?"]},
  { name: 'Language', color: '#F59E0B', count: 5, questions: ["Fluency?", "Accuracy?", "Vividness?", "Filler words?", "Sentence quality?"]},
  { name: 'Logic', color: '#F97316', count: 5, questions: ["Structure?", "Supportive material?", "Evidence?", "Logical fallacy?", "Coherence?"]}
];

const RadarChart: React.FC<{ pre: number[], post: number[], size?: number }> = ({ pre, post, size = 300 }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const labels = CATEGORIES.map(c => c.name);
  const angleStep = (Math.PI * 2) / labels.length;

  const getPath = (data: number[], color: string, fill: string) => {
    const points = data.map((val, i) => {
      const maxOfCat = CATEGORIES[i].count * 4;
      const r = (Math.min(val, maxOfCat) / maxOfCat) * radius; 
      const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
    return <polygon points={points} fill={fill} stroke={color} strokeWidth="3" strokeLinejoin="round" className="transition-all duration-700" />;
  };

  return (
    <svg width={size} height={size} className="mx-auto overflow-visible">
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 2" />
      ))}
      {labels.map((_, i) => {
        const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#E2E8F0" />;
      })}
      {labels.map((label, i) => {
        const x = center + (radius + 25) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + (radius + 25) * Math.sin(i * angleStep - Math.PI / 2);
        return <text key={i} x={x} y={y} textAnchor="middle" className="text-[10px] font-black fill-slate-400 uppercase tracking-widest">{label}</text>;
      })}
      {getPath(pre, '#CBD5E1', 'rgba(148, 163, 184, 0.15)')}
      {getPath(post, '#3B82F6', 'rgba(59, 130, 246, 0.25)')}
    </svg>
  );
};

class NotionService {
  static getBaseUrl() {
    let url = CONFIG.proxyUrl.trim();
    if (!url.endsWith('/')) url += '/';
    return `${url}v1/`;
  }

  static async fetchDatabaseInfo() {
    try {
      const finalUrl = `${this.getBaseUrl()}databases/${CONFIG.dbId}`;
      console.log("正在尝试访问:", finalUrl);
      
      const response = await fetch(finalUrl, {
        method: "GET",
        headers: { 
            "Authorization": `Bearer ${CONFIG.apiKey}`, 
            "Notion-Version": "2022-06-28",
            "Accept": "application/json"
        }
      });
      if (!response.ok) {
          const err = await response.text();
          throw new Error(`Notion 拒绝访问 (状态码: ${response.status})`);
      }
      return await response.json();
    } catch (e: any) { 
        if (e.name === 'TypeError') {
            throw new Error("网络请求失败 (Failed to fetch)。原因可能是：1. URL 填写错误；2. Cloudflare Worker 未部署；3. 您的网络环境无法访问 .workers.dev 域名。");
        }
        throw e;
    }
  }

  static async syncRecord(record: any) {
    if (!isConfigValid()) {
      return { success: false, error: "Cloudflare Worker 地址配置无效，请修改 index.tsx" };
    }
    try {
      const dbInfo = await this.fetchDatabaseInfo();
      const props = dbInfo.properties;
      const findKey = (name: string) => Object.keys(props).find(k => k.trim().toLowerCase() === name.toLowerCase());

      const payload: any = {
        parent: { database_id: CONFIG.dbId },
        properties: {
          [findKey("Name") || "Name"]: { "title": [{ "text": { "content": record.name } }] },
          [findKey("StudentID") || "StudentID"]: { "rich_text": [{ "text": { "content": record.studentId } }] },
          [findKey("PreScore") || "PreScore"]: { "number": record.preScore },
          [findKey("PostScore") || "PostScore"]: { "number": record.postScore },
          [findKey("Pre_Content") || "Pre_Content"]: { "number": record.preScores[0] },
          [findKey("Pre_Delivery") || "Pre_Delivery"]: { "number": record.preScores[1] },
          [findKey("Pre_Language") || "Pre_Language"]: { "number": record.preScores[2] },
          [findKey("Pre_Logic") || "Pre_Logic"]: { "number": record.preScores[3] },
          [findKey("Post_Content") || "Post_Content"]: { "number": record.postScores[0] },
          [findKey("Post_Delivery") || "Post_Delivery"]: { "number": record.postScores[1] },
          [findKey("Post_Language") || "Post_Language"]: { "number": record.postScores[2] },
          [findKey("Post_Logic") || "Post_Logic"]: { "number": record.postScores[3] },
        }
      };

      const classKey = findKey("Class") || "Class";
      if (props[classKey]?.type === 'select') {
        payload.properties[classKey] = { "select": { "name": record.className } };
      } else {
        payload.properties[classKey] = { "rich_text": [{ "text": { "content": record.className } }] };
      }

      const res = await fetch(`${this.getBaseUrl()}pages`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${CONFIG.apiKey}`, 
            "Content-Type": "application/json", 
            "Notion-Version": "2022-06-28" 
        },
        body: JSON.stringify(payload)
      });
      return res.ok ? { success: true } : { success: false, error: `写入失败: ${res.status}` };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  static async fetchRemoteRecords(): Promise<StudentRecord[]> {
    if (!isConfigValid()) return [];
    try {
      const res = await fetch(`${this.getBaseUrl()}databases/${CONFIG.dbId}/query`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${CONFIG.apiKey}`, 
            "Notion-Version": "2022-06-28", 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({ sorts: [{ timestamp: "last_edited_time", direction: "descending" }] })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results.map((page: any) => {
        const p = page.properties;
        const getV = (name: string) => {
          const key = Object.keys(p).find(k => k.trim().toLowerCase() === name.toLowerCase());
          return key ? p[key] : null;
        };
        return {
          id: page.id,
          name: getV("Name")?.title?.[0]?.plain_text || '未知',
          studentId: getV("StudentID")?.rich_text?.[0]?.plain_text || '-',
          className: getV("Class")?.rich_text?.[0]?.plain_text || getV("Class")?.select?.name || '-',
          preScore: getV("PreScore")?.number || 0,
          postScore: getV("PostScore")?.number || 0,
          preScores: [
            getV("Pre_Content")?.number || 0,
            getV("Pre_Delivery")?.number || 0,
            getV("Pre_Language")?.number || 0,
            getV("Pre_Logic")?.number || 0
          ],
          postScores: [
            getV("Post_Content")?.number || 0,
            getV("Post_Delivery")?.number || 0,
            getV("Post_Language")?.number || 0,
            getV("Post_Logic")?.number || 0
          ],
          lastUpdated: page.last_edited_time
        };
      });
    } catch (e) { return []; }
  }

  static async deleteRecord(pageId: string) {
    try {
      const res = await fetch(`${this.getBaseUrl()}pages/${pageId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${CONFIG.apiKey}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
        body: JSON.stringify({ archived: true })
      });
      return res.ok;
    } catch (e) { return false; }
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const [activeTab, setActiveTab] = useState<'pre' | 'post' | 'compare'>('pre');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [profile, setProfile] = useState({ name: '', studentId: '', className: '' });
  const [preRatings, setPreRatings] = useState<Record<number, Rating>>({});
  const [postRatings, setPostRatings] = useState<Record<number, Rating>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => { 
    if(view === 'teacher' && isTeacherAuthenticated) loadRecords(); 
  }, [view, isTeacherAuthenticated]);

  const handleSwitchToTeacher = () => {
    if (isTeacherAuthenticated) setView('teacher');
    else {
      setShowPasswordPrompt(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === TEACHER_PASSWORD) {
      setIsTeacherAuthenticated(true);
      setShowPasswordPrompt(false);
      setView('teacher');
    } else {
      setPasswordError(true);
    }
  };

  const loadRecords = async () => {
    setIsFetching(true);
    const cloudData = await NotionService.fetchRemoteRecords();
    setRecords(cloudData);
    setIsFetching(false);
  };

  const deleteStudent = async (id: string) => {
    if(!confirm("确定归档此条数据吗？")) return;
    const ok = await NotionService.deleteRecord(id);
    if(ok) { setSelectedStudent(null); loadRecords(); }
  };

  const exportCSV = () => {
    const headers = ["姓名,学号,班级,学前总分,期末总分,学前_Content,学前_Delivery,学前_Language,学前_Logic,期末_Content,期末_Delivery,期末_Language,期末_Logic,更新时间"];
    const rows = filteredRecords.map(r => `${r.name},${r.studentId},${r.className},${r.preScore},${r.postScore},${r.preScores.join(',')},${r.postScores.join(',')},${r.lastUpdated ? new Date(r.lastUpdated).toLocaleString() : '-'}`);
    const csv = headers.concat(rows).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Data_Export_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const getCategoryScores = (ratings: Record<number, Rating>) => {
    return CATEGORIES.map((cat, idx) => {
      let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.count, 0);
      let score = 0;
      for(let i=1; i<=cat.count; i++) score += RATING_MAP[ratings[offset + i]] || 0;
      return score;
    });
  };

  const preScores = useMemo(() => getCategoryScores(preRatings), [preRatings]);
  const postScores = useMemo(() => getCategoryScores(postRatings), [postRatings]);
  
  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!profile.name.trim()) errors.push('name');
    if (!profile.studentId.trim()) errors.push('studentId');
    if (!profile.className.trim()) errors.push('className');
    if (errors.length > 0) { setValidationErrors(errors); return; }

    setIsSubmitting(true);
    const result = await NotionService.syncRecord({
      ...profile,
      preScore: preScores.reduce((a, b) => a + b, 0),
      postScore: postScores.reduce((a, b) => a + b, 0),
      preScores,
      postScores
    });
    setIsSubmitting(false);
    if (result.success) alert("✅ 同步成功！数据已存入云端。");
    else alert(`❌ 失败: ${result.error}`);
  };

  const classes = useMemo(() => ['All', ...Array.from(new Set(records.map(r => r.className)))], [records]);
  const filteredRecords = useMemo(() => records.filter(r => (r.name.includes(searchQuery) || r.studentId.includes(searchQuery)) && (classFilter === 'All' || r.className === classFilter)), [records, searchQuery, classFilter]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1F2937] font-sans antialiased">
      {/* 顶部全局配置警告 */}
      {!isConfigValid() && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 sticky top-0 z-[60]">
          <AlertTriangle size={14} /> 警告：Cloudflare Worker 地址尚未配置正确，同步功能暂时禁用！
        </div>
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-sm p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6"><Lock size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">教师访问鉴权</h3>
            <p className="text-slate-400 text-xs font-bold mb-8 uppercase tracking-widest">请输入 4 位内部授权码</p>
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <input type="password" autoFocus maxLength={4} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="••••" className={`w-full text-center text-3xl tracking-[1em] py-4 bg-slate-50 border-none rounded-2xl font-black focus:ring-2 focus:ring-blue-100 ${passwordError ? 'ring-2 ring-red-100 animate-shake' : ''}`} />
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all">进入面板</button>
              <button type="button" onClick={() => setShowPasswordPrompt(false)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase text-center block mx-auto">返回</button>
            </form>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-2xl uppercase border border-blue-100">{selectedStudent.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black">{selectedStudent.name}</h3>
                  <div className="flex gap-3 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <span className="bg-slate-50 px-2 py-1 rounded-md">ID: {selectedStudent.studentId}</span>
                    <span className="bg-blue-50 text-blue-400 px-2 py-1 rounded-md">{selectedStudent.className}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-3 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-slate-50 rounded-[32px] p-6 text-center border border-slate-100">
                  <RadarChart pre={selectedStudent.preScores} post={selectedStudent.postScores} size={240} />
                </div>
                <div className="space-y-6 flex flex-col justify-center">
                  <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">能力整体跨度</p>
                    <p className="text-3xl font-black text-green-700">+{selectedStudent.postScore - selectedStudent.preScore} pts</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     {CATEGORIES.map((c, i) => (
                       <div key={i} className="p-3 bg-white border border-slate-100 rounded-2xl text-center">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{c.name}</p>
                         <p className="text-sm font-black text-slate-700">+{selectedStudent.postScores[i] - selectedStudent.preScores[i]}</p>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => deleteStudent(selectedStudent.id)} className="flex-1 py-4 bg-white text-red-500 rounded-2xl font-black text-xs border border-red-50 hover:bg-red-50 transition-all">归档记录</button>
              <button onClick={() => setSelectedStudent(null)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">返回列表</button>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><TrendingUp size={24} /></div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900">TAPEPS <span className="text-blue-500 opacity-50 italic">Edu</span></h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setView('student')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${view === 'student' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>自测反馈</button>
          <button onClick={handleSwitchToTeacher} className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'teacher' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
            {isTeacherAuthenticated ? <Unlock size={14}/> : <Lock size={14}/>} 教学管理
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 pt-8 pb-32">
        {view === 'student' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800"><UserCircle className="text-blue-500"/> 学生基础信息</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {['name', 'studentId', 'className'].map((field) => (
                  <div key={field} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{field === 'name' ? '姓名' : field === 'studentId' ? '学号' : '班级'}</p>
                    <input 
                      placeholder="必填项" 
                      value={(profile as any)[field]} 
                      onChange={e => setProfile({...profile, [field]: e.target.value})} 
                      className={`w-full bg-slate-50 border-none rounded-2xl px-5 py-4 font-bold transition-all focus:ring-2 focus:ring-blue-100 ${validationErrors.includes(field) ? 'ring-2 ring-red-100 bg-red-50/20' : ''}`} 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              {['pre', 'post', 'compare'].map(t => (
                <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}>
                  {t === 'pre' ? '学前初始测' : t === 'post' ? '学期末测验' : '分析与同步'}
                </button>
              ))}
            </div>

            {activeTab !== 'compare' ? (
              <div className="space-y-12">
                {CATEGORIES.map((cat, idx) => {
                  let offset = CATEGORIES.slice(0, idx).reduce((a, b) => a + b.count, 0);
                  return (
                    <div key={cat.name} className="animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-5 pl-2">
                        <div className="w-2.5 h-6 rounded-full" style={{backgroundColor: cat.color}}></div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{cat.name}</h3>
                      </div>
                      <div className="bg-white rounded-[48px] border border-slate-100 p-8 space-y-12 shadow-sm">
                        {cat.questions.map((q, i) => {
                          const qIdx = offset + i + 1;
                          const ratings = activeTab === 'pre' ? preRatings : postRatings;
                          return (
                            <div key={qIdx} className="space-y-5">
                              <p className="font-bold text-slate-700 text-sm flex gap-4"><span className="shrink-0 w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border">{qIdx}</span>{q}</p>
                              <div className="flex gap-2.5 pl-10 overflow-x-auto pb-2 scrollbar-hide">
                                {(['A', 'B', 'C', 'D', 'E'] as Rating[]).map(r => (
                                  <button key={r} onClick={() => activeTab === 'pre' ? setPreRatings({...preRatings, [qIdx]: r}) : setPostRatings({...postRatings, [qIdx]: r})} className={`w-10 h-10 rounded-full border-2 font-black text-sm transition-all flex items-center justify-center shrink-0 ${ratings[qIdx] === r ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'border-slate-50 bg-white text-slate-300 hover:border-slate-200'}`}>
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
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                 <div className="bg-white rounded-[56px] p-12 shadow-sm border border-slate-100 text-center">
                    <h3 className="text-2xl font-black mb-10 text-slate-900">反馈成长分析</h3>
                    <RadarChart pre={preScores} post={postScores} />
                 </div>
                 <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !isConfigValid()} 
                  className={`w-full py-7 rounded-[40px] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 ${!isConfigValid() ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
                 >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Cloud />} {isConfigValid() ? '立即同步至 Notion' : '配置后方可同步'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">云端反馈看板</h2>
                <div className="flex items-center gap-2 mt-1.5 text-green-500 text-[10px] font-black uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-current animate-pulse"></div> 同步中...</div>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-black text-xs shadow-sm hover:text-blue-600"><Download size={16}/> 导出 CSV</button>
                <button onClick={loadRecords} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm hover:text-blue-600"><RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 shadow-sm hover:text-blue-600"><Settings size={18} /></button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input type="text" placeholder="搜索姓名或学号..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex gap-2">
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm min-w-[140px]">
                  {classes.map(c => <option key={c} value={c}>{c === 'All' ? '全部班级' : c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFetching ? (
                <div className="col-span-full py-24 text-center text-slate-400 font-black uppercase tracking-widest animate-pulse">正在获取云端数据...</div>
              ) : filteredRecords.map(r => (
                <div key={r.id} onClick={() => setSelectedStudent(r)} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all text-lg">{r.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-slate-900 group-hover:text-blue-600">{r.name}</h4>
                        <p className="text-[9px] font-black text-slate-300 uppercase">{r.className}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Server className="text-blue-500" size={24}/> 部署与连通性检查</h3>
               <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <div className="space-y-6">
               <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Wifi size={12}/> 当前生效的 Proxy URL</p>
                  <code className="block break-all bg-white p-3 rounded-xl border text-xs text-blue-600 font-mono">
                    {CONFIG.proxyUrl}
                  </code>
               </div>

               {!isConfigValid() ? (
                 <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-xs leading-relaxed animate-pulse">
                   <AlertCircle className="shrink-0" size={16} />
                   <div>
                     <p className="font-black mb-1 underline">配置错误</p>
                     <p>URL 依然包含中文占位符。请修改 <b>index.tsx</b> 第 42 行。</p>
                   </div>
                 </div>
               ) : (
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-600 text-xs leading-relaxed">
                   <Info className="shrink-0" size={16} />
                   <div>
                     <p className="font-black mb-1">连通性提示</p>
                     <p>若下方自检报 <b>Failed to fetch</b>，且 URL 确定无误，通常是因为您的网络环境无法直接连接到 Cloudflare 的 <i>.workers.dev</i> 域名。</p>
                   </div>
                 </div>
               )}

               <button onClick={async () => {
                 setDebugLog(["[1/3] 正在启动握手测试...", `[2/3] 目标 URL: ${NotionService.getBaseUrl()}`]);
                 try {
                   await NotionService.fetchDatabaseInfo();
                   setDebugLog(prev => [...prev, "[3/3] ✅ 握手成功！数据同步链路通畅。"]);
                 } catch(e: any) {
                   setDebugLog(prev => [...prev, `[3/3] ❌ 错误: ${e.message}`]);
                 }
               }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">执行连接自检</button>
               
               <div className="bg-slate-900 rounded-2xl p-5 font-mono text-[10px] text-green-400 min-h-[120px] overflow-y-auto">
                 {debugLog.map((l, i) => <div key={i} className="mb-1 leading-relaxed">$ {l}</div>)}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
