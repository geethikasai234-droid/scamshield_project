import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  FileText,
  History,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Paperclip,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from 'lucide-react';

type InputMode = 'paste' | 'url';
type ScanState = 'idle' | 'analysing' | 'result' | 'error';
type RiskLevel = 'low' | 'medium' | 'high';

type Signal = {
  title: string;
  detail: string;
  level: 'concern' | 'watch' | 'positive';
  evidence?: string;
};

type Scan = {
  id: string;
  title: string;
  source: string;
  score: number;
  level: RiskLevel;
  date: string;
  signals: number;
};

const samplePosting = `Operations Coordinator
Brightpath Solutions · Remote

We're looking for a highly organized Operations Coordinator to join our growing team. You'll support project scheduling, vendor communication, and internal operations across a distributed team.

Compensation: $68,000–$76,000 + benefits
To apply, send your resume and a brief introduction to hiring@brightpath-solutions.co. Our team will review applications and reach out within 5 business days.

Please note: We will never ask for payment, bank details, or equipment purchases during the hiring process.`;

const sampleSignals: Signal[] = [
  {
    title: 'Company email matches the domain',
    detail: 'The contact address uses brightpath-solutions.co, consistent with the company name in the posting.',
    level: 'positive',
    evidence: 'hiring@brightpath-solutions.co',
  },
  {
    title: 'Compensation is specific and plausible',
    detail: 'A defined range is a healthier signal than unusually high, vague, or commission-only promises.',
    level: 'positive',
    evidence: '$68,000–$76,000 + benefits',
  },
  {
    title: 'No upfront payment request',
    detail: 'The posting explicitly says candidates will not be asked to pay or purchase equipment.',
    level: 'positive',
    evidence: '“We will never ask for payment…”',
  },
  {
    title: 'Remote role: verify the company independently',
    detail: 'Remote roles are common targets for impersonation. Check the company website and recruiter profile before replying.',
    level: 'watch',
    evidence: 'Remote',
  },
];

const sampleScan: Scan = {
  id: 'sample',
  title: 'Operations Coordinator',
  source: 'Brightpath Solutions',
  score: 24,
  level: 'low',
  date: 'Just now',
  signals: 4,
};

function classify(score: number): RiskLevel {
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function titleFromText(text: string, fallback: string) {
  const first = text.split('\n').map((line) => line.trim()).find(Boolean);
  return first && first.length < 72 ? first : fallback;
}

function inspectPosting(text: string, source: string): { scan: Scan; signals: Signal[] } {
  const lower = text.toLowerCase();
  const signals: Signal[] = [];
  let score = 18;

  const payment = /(pay|payment|fee|cost|purchase|buy).{0,50}(equipment|training|registration|access|software|starter|deposit)/i.test(text)
    || /(equipment|training|registration|access).{0,50}(pay|payment|fee|cost|purchase|buy)/i.test(text);
  const urgency = /(immediately|urgent|today|within \d+ hours|act now|asap|start tomorrow)/i.test(lower);
  const personal = /(bank account|social security|ssn|passport|driver.?s license|crypto|gift card|routing number)/i.test(lower);
  const chatOnly = /(telegram|whatsapp|signal app|text me|google hangout|wire)/i.test(lower);
  const unrealistic = /(\$ ?[0-9]{2,3},?000|\$ ?[0-9]{3,4}\s*(per|\/)\s*(day|week|hour))/i.test(text);
  const clearPay = /(never ask|do not ask|won't ask|will not ask).{0,60}(payment|money|purchase|bank)/i.test(lower);
  const emailMatch = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);

  if (payment && !clearPay) {
    score += 34;
    signals.push({ title: 'Upfront payment or purchase language', detail: 'Legitimate employers do not require candidates to pay for access, training, or equipment before starting.', level: 'concern', evidence: 'Payment or purchase terms detected' });
  }
  if (personal) {
    score += 30;
    signals.push({ title: 'Requests sensitive personal information', detail: 'Do not share identity or banking details before independently verifying the employer and reaching a formal offer stage.', level: 'concern', evidence: 'Identity or banking terms detected' });
  }
  if (urgency) {
    score += 16;
    signals.push({ title: 'Pressure to act quickly', detail: 'Urgency can be used to keep you from checking the employer, role, or contact details.', level: 'concern', evidence: 'Urgency language detected' });
  }
  if (chatOnly) {
    score += 18;
    signals.push({ title: 'Conversation moves off normal hiring channels', detail: 'Recruiters who insist on encrypted chat or wire transfers are harder to verify.', level: 'watch', evidence: 'Chat app or wire language detected' });
  }
  if (unrealistic) {
    score += 12;
    signals.push({ title: 'Compensation may be unusually high', detail: 'Compare the range with similar roles in your market before sharing more information.', level: 'watch', evidence: 'High compensation language detected' });
  }
  if (emailMatch) {
    score -= 6;
    signals.push({ title: 'A contact email is present', detail: 'An email address helps with verification, but it is not proof that the sender represents the company.', level: 'positive', evidence: 'Email address found' });
  }
  if (clearPay) {
    score -= 8;
    signals.push({ title: 'Posting sets a clear no-payment boundary', detail: 'That is a useful positive signal. Keep following the same rule if the conversation moves elsewhere.', level: 'positive', evidence: 'No-payment statement found' });
  }
  if (!signals.length) {
    signals.push({ title: 'No obvious scam phrases found', detail: 'A clean scan is a helpful starting point, not a guarantee. Verify the company and recruiter independently.', level: 'positive' });
  }

  score = Math.min(96, Math.max(4, score));
  const level = classify(score);
  return {
    scan: {
      id: `${Date.now()}`,
      title: titleFromText(text, source || 'Untitled job posting'),
      source: source || 'Pasted job posting',
      score,
      level,
      date: 'Just now',
      signals: signals.length,
    },
    signals,
  };
}

function RiskPill({ level }: { level: RiskLevel }) {
  const styles = {
    low: 'bg-[#d9eee4] text-[#17634f]',
    medium: 'bg-[#fff0d4] text-[#8d5b15]',
    high: 'bg-[#f9ddd9] text-[#a63d35]',
  };
  const labels = { low: 'Low risk', medium: 'Needs a closer look', high: 'High risk' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${styles[level]}`} data-testid={`status-risk-${level}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{labels[level]}</span>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-scamshield">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#e5a45b] text-[#173f43] shadow-[inset_0_-2px_0_rgba(22,63,67,.12)]">
        <ShieldCheck size={20} strokeWidth={2.5} />
        <span className="absolute bottom-[8px] right-[7px] h-1.5 w-1.5 rounded-full bg-[#f8e7c6]" />
      </div>
      {!compact && <span className="display text-[17px] font-bold tracking-[-.06em] text-[#173f43]">ScamShield</span>}
    </div>
  );
}

function ScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const color = level === 'low' ? '#17735e' : level === 'medium' ? '#c27a24' : '#b6493e';
  const label = level === 'low' ? 'Low concern' : level === 'medium' ? 'Worth verifying' : 'Pause before replying';
  return (
    <div className="flex flex-col items-center justify-center" data-testid="display-risk-score">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r="78" fill="none" stroke="#e8e5db" strokeWidth="14" strokeLinecap="round" strokeDasharray="368 490" />
          <circle cx="100" cy="100" r="78" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.max(8, score * 3.68)} 490`} className="animate-scan" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="display text-[46px] font-bold leading-none tracking-[-.08em]" style={{ color }}>{score}</span>
          <span className="mt-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#6e7c79]">out of 100</span>
        </div>
      </div>
      <div className="mt-[-12px] text-center">
        <p className="display text-sm font-bold text-[#173f43]">{label}</p>
        <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-[#71817e]">This score is a signal, not a verdict.</p>
      </div>
    </div>
  );
}

function SignalRow({ signal, index }: { signal: Signal; index: number }) {
  const isConcern = signal.level === 'concern';
  const isWatch = signal.level === 'watch';
  const icon = isConcern ? <TriangleAlert size={17} /> : isWatch ? <CircleHelp size={17} /> : <Check size={17} />;
  const color = isConcern ? 'text-[#b6493e] bg-[#f9e7e3]' : isWatch ? 'text-[#b07123] bg-[#fff1d7]' : 'text-[#23765d] bg-[#e0f0e8]';
  return (
    <div className="animate-rise flex gap-3 border-b border-[#e9e6dc] py-4 last:border-0" style={{ animationDelay: `${index * 55}ms` }} data-testid={`signal-row-${index}`}>
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#20484b]" data-testid={`text-signal-title-${index}`}>{signal.title}</h3>
          {signal.level === 'positive' && <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#31806b]">Positive</span>}
          {signal.level === 'watch' && <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b07123]">Check this</span>}
          {signal.level === 'concern' && <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b6493e]">Concern</span>}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[#70807d]">{signal.detail}</p>
        {signal.evidence && <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#f5f1e8] px-2 py-1 text-[11px] text-[#6c7672]"><Search size={11} /> <span className="truncate">{signal.evidence}</span></div>}
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<'analyzer' | 'history'>('analyzer');
  const [mode, setMode] = useState<InputMode>('paste');
  const [input, setInput] = useState(samplePosting);
  const [source, setSource] = useState('Brightpath Solutions');
  const [fileName, setFileName] = useState('');
  const [scanState, setScanState] = useState<ScanState>('result');
  const [scan, setScan] = useState<Scan>(sampleScan);
  const [signals, setSignals] = useState<Signal[]>(sampleSignals);
  const [history, setHistory] = useState<Scan[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('scamshield-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('scamshield-history', JSON.stringify(history)); } catch { /* local state still works */ }
  }, [history]);

  const visibleHistory = useMemo(() => history, [history]);

  const runScan = () => {
    if (!input.trim()) {
      setScanState('error');
      return;
    }
    setScanState('analysing');
    window.setTimeout(() => {
      const output = inspectPosting(input, mode === 'url' ? input : source);
      setScan(output.scan);
      setSignals(output.signals);
      setHistory((current) => [output.scan, ...current.filter((item) => item.id !== output.scan.id)].slice(0, 12));
      setScanState('result');
    }, 820);
  };

  const resetToSample = () => {
    setMode('paste');
    setInput(samplePosting);
    setSource('Brightpath Solutions');
    setFileName('');
    setScan(sampleScan);
    setSignals(sampleSignals);
    setScanState('result');
  };

  const startFresh = () => {
    setInput('');
    setSource('');
    setFileName('');
    setScanState('idle');
    setSignals([]);
    setScan({ ...sampleScan, title: '', source: '', date: '' });
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('text/') && !/\.(txt|md|csv)$/i.test(file.name)) {
      setScanState('error');
      setFileName(file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setInput(String(reader.result || ''));
      setFileName(file.name);
      setMode('paste');
      setScanState('idle');
    };
    reader.onerror = () => setScanState('error');
    reader.readAsText(file);
  };

  const copySummary = async () => {
    const text = `ScamShield scan: ${scan.title || 'Job posting'} — ${scan.level} risk (${scan.score}/100). ${signals.map((signal) => signal.title).join('; ')}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard not available */ }
  };

  const guidance: Array<[string, string, string, typeof TriangleAlert]> = [
    ['01', 'Never pay to get paid', 'A real employer won’t ask for money, gift cards, or a “starter kit” to unlock work.', TriangleAlert],
    ['02', 'Verify out of band', 'Find the company yourself. Use the official website, not a link or number from the message.', Search],
    ['03', 'Trust the pause', 'You don’t owe anyone an instant answer. A legitimate opportunity can survive a careful check.', Clock3],
  ];

  return (
    <div className="noise min-h-[100dvh] bg-[#f6f3ea] text-[#173f43]">
      <header className="sticky top-0 z-40 border-b border-[#e4e0d5] bg-[#f6f3ea]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={22} /></button>
          <button onClick={() => { setView('analyzer'); setMobileNav(false); }} className="md:mr-10" data-testid="button-brand-home"><Logo /></button>
          <nav className={`${mobileNav ? 'absolute left-4 right-4 top-[66px] flex' : 'hidden'} items-center gap-1 rounded-2xl border border-[#dedbd0] bg-[#fbfaf5] p-2 shadow-lg md:static md:flex md:border-0 md:bg-transparent md:p-0 md:shadow-none`} data-testid="nav-main">
            <button onClick={() => { setView('analyzer'); setMobileNav(false); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === 'analyzer' ? 'bg-[#e6eee8] text-[#17634f]' : 'text-[#71817e] hover:text-[#173f43]'}`} data-testid="nav-analyzer"><Zap size={15} className="mr-2 inline-block" /> Analyze a posting</button>
            <button onClick={() => { setView('history'); setMobileNav(false); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${view === 'history' ? 'bg-[#e6eee8] text-[#17634f]' : 'text-[#71817e] hover:text-[#173f43]'}`} data-testid="nav-history"><History size={15} className="mr-2 inline-block" /> Saved scans {history.length > 0 && <span className="ml-1 rounded-full bg-[#e5a45b] px-1.5 py-0.5 text-[10px] text-[#173f43]">{history.length}</span>}</button>
          </nav>
          <div className="hidden items-center gap-2 text-xs text-[#6e7c79] sm:flex"><LockKeyhole size={14} className="text-[#31806b]" /> Runs privately in your browser</div>
          <div className="w-7 md:hidden" />
        </div>
      </header>

      {view === 'analyzer' ? (
        <main className="mx-auto max-w-[1320px] px-5 pb-16 pt-10 sm:px-8 lg:pt-16">
          <section className="mb-10 grid items-end gap-7 lg:grid-cols-[1fr_auto]">
            <div className="animate-rise">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7e3d9] bg-[#eaf2eb] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[#23765d]"><ShieldQuestion size={14} /> A calmer second opinion</div>
              <h1 className="display max-w-[750px] text-[clamp(2.35rem,5vw,4.65rem)] font-bold leading-[.98] text-[#173f43]">Before you reply,<br /><span className="text-[#b87532]">check the signal.</span></h1>
              <p className="mt-5 max-w-[590px] text-[16px] leading-relaxed text-[#667875]">Paste a job post, add a link, or upload a text file. ScamShield looks for the patterns worth pausing over — then tells you what to do next.</p>
            </div>
            <div className="animate-rise animate-rise-1 flex items-center gap-3 rounded-2xl border border-[#e1ddd2] bg-[#fbfaf5] px-4 py-3 text-sm text-[#5d706d] soft-shadow">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dceee5] text-[#23765d]"><LockKeyhole size={17} /></div>
              <div><p className="font-bold text-[#20484b]">Private by design</p><p className="text-xs">Your posting stays on this device.</p></div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)]">
            <section className="animate-rise animate-rise-1 overflow-hidden rounded-[22px] border border-[#dedbd0] bg-[#fbfaf5] soft-shadow" data-testid="card-analyzer-input">
              <div className="flex items-center justify-between border-b border-[#e7e3d8] px-5 py-4 sm:px-7">
                <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b9690]">Step 01</p><h2 className="display mt-1 text-xl font-bold">Bring the posting</h2></div>
                <button onClick={resetToSample} className="text-xs font-bold text-[#23765d] transition-colors hover:text-[#b87532]" data-testid="button-load-sample">Load sample</button>
              </div>
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex gap-1 rounded-xl bg-[#f0eee5] p-1" role="tablist" data-testid="tabs-input-mode">
                  <button onClick={() => setMode('paste')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${mode === 'paste' ? 'bg-[#fbfaf5] text-[#173f43] shadow-sm' : 'text-[#84918d]'}`} data-testid="tab-paste"><FileText size={16} /> Paste text</button>
                  <button onClick={() => setMode('url')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${mode === 'url' ? 'bg-[#fbfaf5] text-[#173f43] shadow-sm' : 'text-[#84918d]'}`} data-testid="tab-url"><Link2 size={16} /> Enter URL</button>
                </div>
                {mode === 'paste' ? (
                  <div>
                    <label htmlFor="posting-text" className="mb-2 block text-xs font-bold uppercase tracking-[.11em] text-[#60726e]">Job posting text</label>
                    <textarea id="posting-text" value={input} onChange={(event) => { setInput(event.target.value); setScanState('idle'); }} placeholder="Paste the full job description here…" className="min-h-[276px] w-full resize-y rounded-xl border border-[#ddd9cd] bg-[#fdfcf8] px-4 py-3 text-[14px] leading-relaxed text-[#294f50] outline-none transition-all placeholder:text-[#a3aaa3] focus:border-[#5ca08b] focus:ring-4 focus:ring-[#dceee5]" data-testid="input-posting-text" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#58716c] transition-colors hover:text-[#23765d]" data-testid="label-upload-posting"><Upload size={15} /> Upload a text file<input type="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} data-testid="input-upload-posting" /></label>
                      {fileName && <span className="inline-flex max-w-[210px] items-center gap-1.5 truncate text-xs text-[#8a9691]"><Paperclip size={13} /> {fileName}<button onClick={() => { setFileName(''); }} aria-label="Remove uploaded file" data-testid="button-remove-file"><X size={13} /></button></span>}
                      <span className="text-xs text-[#a0a8a3]">{input.length.toLocaleString()} characters</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6">
                    <label htmlFor="posting-url" className="mb-2 block text-xs font-bold uppercase tracking-[.11em] text-[#60726e]">Posting URL</label>
                    <div className="relative"><Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a09b]" size={18} /><input id="posting-url" value={input} onChange={(event) => { setInput(event.target.value); setScanState('idle'); }} placeholder="https://jobs.example.com/role" className="w-full rounded-xl border border-[#ddd9cd] bg-[#fdfcf8] py-4 pl-11 pr-4 text-sm text-[#294f50] outline-none transition-all placeholder:text-[#a3aaa3] focus:border-[#5ca08b] focus:ring-4 focus:ring-[#dceee5]" data-testid="input-posting-url" /></div>
                    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#7d8a86]"><CircleHelp size={14} className="mt-0.5 shrink-0 text-[#b87532]" /> URL analysis is a prototype flow. Paste the page text for the most useful signal check.</p>
                  </div>
                )}
                {scanState === 'error' && <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#efc4bf] bg-[#fff3f1] px-3 py-2.5 text-xs font-medium text-[#a63d35]" data-testid="status-analysis-error"><AlertCircle size={16} className="mt-0.5 shrink-0" /> Add a posting or upload a text-based file before running a scan.</div>}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={runScan} disabled={scanState === 'analysing'} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17634f] px-5 py-3.5 text-sm font-bold text-[#fffaf0] shadow-[0_7px_0_#10493c] transition-all hover:-translate-y-0.5 hover:bg-[#1b705a] active:translate-y-0.5 active:shadow-[0_3px_0_#10493c] disabled:cursor-wait disabled:opacity-75" data-testid="button-run-analysis">{scanState === 'analysing' ? <><LoaderCircle size={17} className="animate-spin" /> Checking the signal…</> : <><Sparkles size={17} /> Check this posting <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}</button>
                  <button onClick={startFresh} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8d5ca] px-5 py-3.5 text-sm font-bold text-[#61736f] transition-colors hover:bg-[#f1eee5] hover:text-[#173f43]" data-testid="button-start-fresh"><RotateCcw size={15} /> Start fresh</button>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-[#e7e3d8] px-5 py-3.5 text-[11px] text-[#8b9690] sm:px-7"><LockKeyhole size={13} className="text-[#31806b]" /> Nothing is uploaded or sent to a server.</div>
            </section>

            <section className="animate-rise animate-rise-2 min-h-[590px] overflow-hidden rounded-[22px] border border-[#dedbd0] bg-[#fbfaf5] soft-shadow" data-testid="card-analysis-result">
              <div className="flex items-center justify-between border-b border-[#e7e3d8] px-5 py-4 sm:px-7">
                <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b9690]">Step 02</p><h2 className="display mt-1 text-xl font-bold">Make the call</h2></div>
                {scanState === 'result' && <button onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#71817e] transition-colors hover:bg-[#f0eee5] hover:text-[#23765d]" data-testid="button-copy-summary">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy summary'}</button>}
              </div>
              {scanState === 'analysing' ? (
                <div className="grid place-items-center px-7 py-20" data-testid="status-analysis-loading"><div className="w-full max-w-[330px] space-y-4"><div className="mx-auto h-28 w-28 animate-pulse-soft rounded-full bg-[#e6eee8]" /><div className="h-4 animate-pulse-soft rounded-full bg-[#ebe8df]" /><div className="mx-auto h-3 w-3/4 animate-pulse-soft rounded-full bg-[#ebe8df]" /><div className="space-y-2 pt-5"><div className="h-12 animate-pulse-soft rounded-xl bg-[#f0eee5]" /><div className="h-12 animate-pulse-soft rounded-xl bg-[#f0eee5]" /></div><p className="pt-2 text-center text-xs font-bold text-[#6e7c79]">Reading the details, not making assumptions…</p></div></div>
              ) : scanState === 'idle' ? (
                <div className="grid-paper flex min-h-[510px] flex-col items-center justify-center px-8 text-center" data-testid="status-analysis-empty"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e6eee8] text-[#23765d]"><ShieldQuestion size={32} strokeWidth={1.5} /></div><h3 className="display text-xl font-bold">Your second opinion starts here</h3><p className="mt-2 max-w-[290px] text-sm leading-relaxed text-[#71817e]">Add a posting on the left. We’ll explain what looks ordinary, what deserves a check, and what to do next.</p></div>
              ) : (
                <div className="p-5 sm:p-7" data-testid="result-content">
                  <div className="grid gap-5 rounded-2xl bg-[#f1f3eb] px-4 py-5 sm:grid-cols-[190px_1fr] sm:items-center sm:px-5">
                    <ScoreGauge score={scan.score} level={scan.level} />
                    <div className="sm:border-l sm:border-[#dce2d8] sm:pl-5">
                      <div className="flex flex-wrap items-center gap-2"><RiskPill level={scan.level} /><span className="text-xs text-[#7d8c87]">Scan complete</span></div>
                      <h3 className="display mt-3 line-clamp-2 text-xl font-bold text-[#173f43]" data-testid="text-result-title">{scan.title}</h3>
                      <p className="mt-1 text-sm text-[#73817d]" data-testid="text-result-source">{scan.source}</p>
                      <p className="mt-4 text-[13px] leading-relaxed text-[#60716d]">{scan.level === 'low' ? 'Nothing here looks immediately dangerous. Keep your usual checks in place before sharing personal information.' : scan.level === 'medium' ? 'A few details deserve a pause. Verify the employer through a separate channel before continuing.' : 'Pause here. Do not send money or sensitive information until the employer is independently verified.'}</p>
                    </div>
                  </div>
                  <div className="mt-7 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8b9690]">What stood out</p><p className="mt-1 text-sm text-[#71817e]">{signals.length} signals found in this posting</p></div><span className="text-xs text-[#9aa39d]">{scan.date}</span></div>
                  <div className="mt-2">{signals.map((signal, index) => <SignalRow signal={signal} index={index} key={`${signal.title}-${index}`} />)}</div>
                </div>
              )}
            </section>
          </div>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            {guidance.map(([number, title, body, IconComponent], index) => {
              return <div className="animate-rise rounded-2xl border border-[#e2ded3] bg-[#f9f7f0] p-5" style={{ animationDelay: `${index * 80 + 280}ms` }} key={String(number)} data-testid={`card-guidance-${number}`}><div className="flex items-start justify-between"><span className="display text-sm font-bold text-[#b87532]">{number}</span><IconComponent size={18} className="text-[#8da099]" /></div><h3 className="mt-7 text-sm font-bold text-[#20484b]">{title}</h3><p className="mt-2 text-[13px] leading-relaxed text-[#7b8883]">{body}</p></div>;
            })}
          </section>
          <p className="mt-8 text-center text-xs text-[#929b96]">ScamShield flags patterns, not people. Always use your judgment and verify independently.</p>
        </main>
      ) : (
        <main className="mx-auto max-w-[1080px] px-5 pb-16 pt-10 sm:px-8 lg:pt-16">
          <div className="animate-rise mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><div className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#31806b]"><Bookmark size={14} /> Your private archive</div><h1 className="display text-4xl font-bold tracking-[-.06em] text-[#173f43] sm:text-5xl" data-testid="heading-saved-scans">Saved scans</h1><p className="mt-3 text-sm text-[#71817e]">A local record of the checks you’ve made on this device.</p></div>
            <button onClick={() => { setView('analyzer'); startFresh(); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17634f] px-4 py-3 text-sm font-bold text-[#fffaf0] transition-all hover:-translate-y-0.5 hover:bg-[#1b705a]" data-testid="button-new-scan"><Sparkles size={16} /> New scan</button>
          </div>
          {visibleHistory.length === 0 ? (
            <div className="grid-paper animate-rise-1 rounded-[22px] border border-[#dedbd0] px-6 py-20 text-center" data-testid="status-history-empty"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e6eee8] text-[#23765d]"><History size={29} strokeWidth={1.5} /></div><h2 className="display text-xl font-bold">Your checks will live here</h2><p className="mx-auto mt-2 max-w-[340px] text-sm leading-relaxed text-[#71817e]">Run a scan and it will appear here automatically. History is stored only in this browser.</p><button onClick={() => { setView('analyzer'); startFresh(); }} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#c9d9cf] bg-[#fbfaf5] px-4 py-2.5 text-sm font-bold text-[#23765d] hover:bg-[#eaf2eb]" data-testid="button-empty-new-scan">Analyze a posting <ArrowRight size={15} /></button></div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-[#dedbd0] bg-[#fbfaf5] soft-shadow" data-testid="card-history-list">
              <div className="hidden grid-cols-[1fr_150px_150px_44px] gap-4 border-b border-[#e7e3d8] bg-[#f5f2e9] px-6 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b9690] sm:grid"><span>Posting</span><span>Assessment</span><span>Checked</span><span /></div>
              {visibleHistory.map((item, index) => <div key={item.id} className="border-b border-[#e7e3d8] last:border-0" data-testid={`row-scan-${item.id}`}><button className="grid w-full grid-cols-[1fr_auto] gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f5f2e9] sm:grid-cols-[1fr_150px_150px_44px] sm:items-center sm:px-6" onClick={() => setExpanded(expanded === item.id ? null : item.id)} data-testid={`button-expand-scan-${item.id}`}><div className="min-w-0"><div className="flex items-center gap-2"><FileText size={16} className="shrink-0 text-[#8ba097]" /><p className="truncate text-sm font-bold text-[#20484b]">{item.title}</p></div><p className="mt-1 pl-6 text-xs text-[#87938e]">{item.source}</p></div><div className="hidden sm:block"><RiskPill level={item.level} /></div><div className="hidden text-xs text-[#89948f] sm:block">{item.date}</div><ChevronDown size={17} className={`justify-self-end text-[#89948f] transition-transform ${expanded === item.id ? 'rotate-180' : ''}`} /></button>{expanded === item.id && <div className="flex flex-wrap items-center gap-4 bg-[#f5f2e9] px-5 pb-4 pl-12 text-xs text-[#6f7d78] sm:hidden"><RiskPill level={item.level} /><span>Score {item.score}/100</span><span>{item.signals} signals</span></div>}</div>)}
            </div>
          )}
          <div className="mt-6 flex items-center gap-2 text-xs text-[#8b9690]"><LockKeyhole size={14} className="text-[#31806b]" /> Stored locally. Clearing browser data removes your scan history.</div>
        </main>
      )}
    </div>
  );
}

export default App;