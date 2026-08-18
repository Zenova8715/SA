import { type ComponentType, type Dispatch, type FormEvent, type ReactNode, type SetStateAction, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ADMIN_EMAIL, assertFirebaseConfigured, auth, createInitialWorkspace, db, syncUserProfile } from '@/lib/firebase';
import {
  Activity, AlarmClock, ArrowRight, ArrowUpRight, BarChart3, Bell, BookMarked, BookOpen, BrainCircuit, Database,
  CalendarDays, CalendarRange, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Circle, CircleCheck, Clock3, Flame, GraduationCap, LayoutDashboard, ListChecks, LockKeyhole,
  LogOut, Menu, Moon, MoreHorizontal, NotebookPen, Pencil, Play, Plus, RefreshCw, RotateCcw, Save,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Target, TimerReset, Trash2, TrendingUp,
  Trophy, UserRound, Users, X, Zap, type LucideProps,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Icon = ComponentType<LucideProps>;
type TaskStatus = 'not-started' | 'in-progress' | 'completed';
type Priority = 'High' | 'Medium' | 'Low';
type Subject = 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics';

type Task = {
  id: string; title: string; subject: Subject; chapter: string; date: string; time: string;
  duration: number; priority: Priority; status: TaskStatus; notes?: string;
};
type Journal = { id: string; date: string; mood: string; title: string; body: string; };
type MockTest = { id: string; title: string; exam: string; date: string; score: number; total: number; accuracy: number; };
type Mistake = { id: string; subject: Subject; question: string; chapter: string; note: string; resolved: boolean; };
type RevisionItem = { id: string; title: string; subject: Subject; chapter: string; due: string; level: 'Due today' | 'Tomorrow' | 'This week'; };
type Goal = { exam: string; year: string; college: string; targetRank: string; dailyHours: string; };
type Profile = { name: string; preparation: string; };
type TimetableSlot = { id: string; day: string; start: string; end: string; title: string; subject: Subject; };
type StudyaceData = {
  uid?: string;
  email?: string;
  displayName?: string;
  tasks?: Task[];
  journals?: Journal[];
  mocks?: MockTest[];
  mistakes?: Mistake[];
  revision?: RevisionItem[];
  slots?: TimetableSlot[];
  goal?: Goal;
  profile?: Profile;
  updatedAt?: unknown;
};

const today = '2026-08-14';
const subjects: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];
const subjectTone: Record<Subject, string> = {
  Physics: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  Chemistry: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Biology: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Mathematics: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
};

const seedTasks: Task[] = [
  { id: 't1', title: 'Current Electricity — Kirchhoff’s Laws', subject: 'Physics', chapter: 'Current Electricity', date: today, time: '07:00', duration: 90, priority: 'High', status: 'completed', notes: 'Solve 20 mixed PYQs.' },
  { id: 't2', title: 'Human Physiology — Digestive System', subject: 'Biology', chapter: 'Human Physiology', date: today, time: '09:00', duration: 75, priority: 'High', status: 'completed' },
  { id: 't3', title: 'Reactions of Aldehydes & Ketones', subject: 'Chemistry', chapter: 'Organic Chemistry', date: today, time: '11:00', duration: 60, priority: 'Medium', status: 'in-progress', notes: 'Review named reactions first.' },
  { id: 't4', title: 'Mendelian Inheritance — Practice Set', subject: 'Biology', chapter: 'Genetics', date: today, time: '14:00', duration: 45, priority: 'High', status: 'not-started' },
  { id: 't5', title: 'Magnetic Field — Biot–Savart Law', subject: 'Physics', chapter: 'Magnetism', date: today, time: '15:00', duration: 60, priority: 'Medium', status: 'not-started' },
  { id: 't6', title: 'Nernst Equation & Cell Potential', subject: 'Chemistry', chapter: 'Electrochemistry', date: today, time: '16:30', duration: 90, priority: 'High', status: 'not-started' },
  { id: 't7', title: 'DNA Replication — Detailed Notes', subject: 'Biology', chapter: 'Genetics', date: today, time: '18:30', duration: 60, priority: 'Medium', status: 'not-started' },
  { id: 't8', title: 'Photoelectric Effect — PYQs', subject: 'Physics', chapter: 'Modern Physics', date: today, time: '20:00', duration: 30, priority: 'Low', status: 'not-started' },
];
const seedJournals: Journal[] = [
  { id: 'j1', date: '2026-08-13', mood: 'Steady', title: 'A quiet win', body: 'Finished the electrostatics revision without checking my phone. The hard chapters are becoming familiar.' },
  { id: 'j2', date: '2026-08-11', mood: 'Energised', title: 'Momentum is real', body: 'A strong mock in the morning made the evening study block feel lighter.' },
];
const seedMocks: MockTest[] = [
  { id: 'm1', title: 'NEET Full Syllabus — Set 04', exam: 'NEET', date: '2026-08-12', score: 642, total: 720, accuracy: 87 },
  { id: 'm2', title: 'JEE Main Physics — Mechanics', exam: 'JEE', date: '2026-08-08', score: 74, total: 100, accuracy: 81 },
  { id: 'm3', title: 'Biology NCERT Sprint', exam: 'NEET', date: '2026-08-02', score: 168, total: 200, accuracy: 91 },
];
const seedMistakes: Mistake[] = [
  { id: 'x1', subject: 'Chemistry', question: 'Forgot the sign convention in cell potential.', chapter: 'Electrochemistry', note: 'Ecell = Ecathode − Eanode. Revisit concentration cell example.', resolved: false },
  { id: 'x2', subject: 'Physics', question: 'Used distance instead of displacement in a velocity graph.', chapter: 'Kinematics', note: 'Read the axis labels before choosing the formula.', resolved: false },
  { id: 'x3', subject: 'Biology', question: 'Confused incomplete dominance with codominance.', chapter: 'Genetics', note: 'Make a two-column comparison from NCERT examples.', resolved: true },
  { id: 'x4', subject: 'Mathematics', question: 'Dropped the negative root while solving a quadratic.', chapter: 'Algebra', note: 'Substitute both roots back into the original equation.', resolved: false },
];
const seedRevision: RevisionItem[] = [
  { id: 'r1', title: 'Electrochemistry formula sheet', subject: 'Chemistry', chapter: 'Electrochemistry', due: 'Today', level: 'Due today' },
  { id: 'r2', title: 'Plant Kingdom flashcards', subject: 'Biology', chapter: 'Plant Kingdom', due: 'Today', level: 'Due today' },
  { id: 'r3', title: 'Ray Optics derivations', subject: 'Physics', chapter: 'Optics', due: 'Tomorrow', level: 'Tomorrow' },
  { id: 'r4', title: 'Limits & continuity errors', subject: 'Mathematics', chapter: 'Calculus', due: '17 Aug', level: 'This week' },
];
const seedSlots: TimetableSlot[] = [
  { id: 's1', day: 'Mon', start: '06:30', end: '08:00', title: 'Physics deep work', subject: 'Physics' },
  { id: 's2', day: 'Mon', start: '18:30', end: '20:00', title: 'Biology NCERT pass', subject: 'Biology' },
  { id: 's3', day: 'Tue', start: '07:00', end: '08:30', title: 'Organic chemistry', subject: 'Chemistry' },
  { id: 's4', day: 'Wed', start: '16:00', end: '17:30', title: 'Maths problem set', subject: 'Mathematics' },
  { id: 's5', day: 'Thu', start: '06:30', end: '08:00', title: 'Physics numericals', subject: 'Physics' },
  { id: 's6', day: 'Fri', start: '18:00', end: '19:30', title: 'Mock analysis', subject: 'Chemistry' },
];

function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo storage is optional */ } }, [key, value]);
  return [value, setValue] as const;
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message || 'Something went wrong.');
  }
  return 'Something went wrong. Please try again.';
}

type AppState = {
  tasks: Task[]; setTasks: Dispatch<SetStateAction<Task[]>>;
  journals: Journal[]; setJournals: Dispatch<SetStateAction<Journal[]>>;
  mocks: MockTest[]; setMocks: Dispatch<SetStateAction<MockTest[]>>;
  mistakes: Mistake[]; setMistakes: Dispatch<SetStateAction<Mistake[]>>;
  revision: RevisionItem[]; setRevision: Dispatch<SetStateAction<RevisionItem[]>>;
  slots: TimetableSlot[]; setSlots: Dispatch<SetStateAction<TimetableSlot[]>>;
  goal: Goal; setGoal: Dispatch<SetStateAction<Goal>>;
  profile: Profile; setProfile: Dispatch<SetStateAction<Profile>>;
  theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void;
  toggleTask: (id: string) => void;
};
const AppContext = createContext<AppState | null>(null);
function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('StudyAce context is missing');
  return context;
}

function cn(...parts: Array<string | false | undefined>) { return parts.filter(Boolean).join(' '); }
function IconBadge({ icon: Icon, tone = 'violet' }: { icon: Icon; tone?: 'violet' | 'gold' | 'mint' | 'sky' | 'coral' }) {
  const tones = { violet: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300', gold: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', mint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300', coral: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' };
  return <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tones[tone])}><Icon size={17} /></span>;
}
function Button({ children, variant = 'primary', className, onClick, type = 'button', disabled = false, 'data-testid': testId }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; className?: string; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; 'data-testid'?: string }) {
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-105',
    secondary: 'bg-card border border-border text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:brightness-105',
  };
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId} className={cn('focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)}>{children}</button>;
}
function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return <section className={cn('rounded-2xl border border-card-border bg-card p-5 card-shadow', className)}>{title && <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-semibold tracking-tight">{title}</h2>{action}</div>}{children}</section>;
}
function ProgressBar({ value, color = 'bg-primary', className = '' }: { value: number; color?: string; className?: string }) {
  return <div className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}><div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}
function SubjectTag({ subject }: { subject: Subject }) { return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold', subjectTone[subject])}>{subject}</span>; }
function EmptyState({ icon: Icon, title, body, action }: { icon: Icon; title: string; body: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center"><IconBadge icon={Icon} /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

const navGroups = [
  { label: 'STUDY SPACE', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: ListChecks },
    { href: '/timetable', label: 'Timetable', icon: Clock3 },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/focus', label: 'Focus timer', icon: AlarmClock },
  ] },
  { label: 'UNDERSTAND', items: [
    { href: '/progress', label: 'Progress', icon: BarChart3 },
    { href: '/mocks', label: 'Mock tests', icon: BookOpen },
    { href: '/mistakes', label: 'Mistake book', icon: BrainCircuit, count: 3 },
    { href: '/revision', label: 'Revision', icon: RotateCcw, count: 2 },
  ] },
  { label: 'YOUR NORTH STAR', items: [
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/journal', label: 'Journal', icon: NotebookPen },
  ] },
];

function Logo() {
  return <div className="flex items-center gap-2.5"><div className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-sm"><GraduationCap size={18} strokeWidth={2.5} /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" /></div><span className="font-[Manrope] text-lg font-extrabold tracking-tight">Study<span className="text-primary dark:text-accent">Ace</span></span></div>;
}
function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme, profile } = useApp();
  const avatarLetter = profile.name.trim().charAt(0).toUpperCase() || 'A';
  return <aside className={cn(mobile ? 'fixed inset-y-0 left-0 z-40 w-[285px] shadow-2xl' : 'hidden lg:flex lg:w-[256px] lg:flex-col', 'border-r border-sidebar-border bg-sidebar text-sidebar-foreground')}>
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center justify-between border-b border-sidebar-border px-6"><Logo />{mobile ? <Button variant="ghost" onClick={onClose} className="h-9 w-9 p-0 text-sidebar-foreground" data-testid="button-close-menu"><X size={18} /></Button> : <span className="grid h-6 w-6 place-items-center rounded-md text-sidebar-foreground/50"><ChevronLeft size={15} /></span>}</div>
      <div className="soft-scroll flex-1 overflow-y-auto px-3 py-6">
        {navGroups.map(group => <div key={group.label} className="mb-6"><p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-sidebar-foreground/45">{group.label}</p><nav className="space-y-1">{group.items.map(item => <Link key={item.href} href={item.href} onClick={onClose} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`} className={cn('focus-ring group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', location === item.href ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground')}><span className="flex items-center gap-3"><item.icon size={17} strokeWidth={location === item.href ? 2.4 : 1.9} /><span>{item.label}</span></span>{item.count && <span className={cn('font-mono text-[10px]', location === item.href ? 'text-accent' : 'text-sidebar-foreground/45')}>{item.count}</span>}</Link>)}</nav></div>)}
      </div>
      <div className="border-t border-sidebar-border p-4">
         <div className="mb-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3" data-testid="card-sidebar-profile"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{avatarLetter}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile.name}</p><p className="text-[11px] text-sidebar-foreground/55">{profile.preparation}</p></div><Bell size={15} className="text-sidebar-foreground/50" /></div>
        <Link href="/settings" onClick={onClose} data-testid="link-nav-settings" className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Settings2 size={16} /> Settings</Link>
        <button onClick={() => { void signOut(auth); localStorage.removeItem('studyace-auth'); setLocation('/login'); }} data-testid="button-logout" className="focus-ring mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut size={16} /> Log out</button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} data-testid="button-theme-sidebar" className="mt-3 flex items-center gap-2 px-3 text-[11px] text-sidebar-foreground/45 hover:text-sidebar-foreground">{theme === 'light' ? <Moon size={13} /> : <Sun size={13} />} {theme === 'light' ? 'Switch to dark' : 'Switch to light'}</button>
      </div>
    </div>
  </aside>;
}
function Topbar({ onMenu }: { onMenu: () => void }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const title = navGroups.flatMap(group => group.items).find(item => item.href === location)?.label || 'Dashboard';
  return <header className="relative flex h-[76px] items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-7"><div className="flex items-center gap-3"><button onClick={onMenu} className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden" data-testid="button-open-menu"><Menu size={19} /></button><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">StudyAce / {title}</p><p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">Friday, 14 August 2026</p></div></div><div className="flex items-center gap-2"><div className="relative"><button onClick={() => setNotificationsOpen(value => !value)} aria-expanded={notificationsOpen} className="focus-ring relative grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted" data-testid="button-notifications"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" /></button>{notificationsOpen && <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-border bg-card p-4 text-left card-shadow" data-testid="panel-notifications"><div className="flex items-center justify-between"><p className="text-sm font-bold">Your next nudges</p><button onClick={() => setNotificationsOpen(false)} className="focus-ring rounded-lg p-1 text-muted-foreground hover:bg-muted" data-testid="button-close-notifications"><X size={14} /></button></div><p className="mt-1 text-xs leading-5 text-muted-foreground">A small review now keeps tomorrow lighter.</p><button onClick={() => { setNotificationsOpen(false); setLocation('/revision'); }} className="mt-3 flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left text-xs font-semibold text-secondary-foreground hover:brightness-95" data-testid="button-notification-revision"><RotateCcw size={15} /> 2 revision items due today</button><button onClick={() => { setNotificationsOpen(false); setLocation('/tasks'); }} className="mt-2 flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left text-xs font-semibold hover:bg-muted/70" data-testid="button-notification-tasks"><ListChecks size={15} /> 6 tasks still on today's plan</button></div>}</div><button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="focus-ring grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted" data-testid="button-theme-topbar">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>;
}
function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [location] = useLocation();
  if (location === '/login' || location === '/welcome' || location === '/admin') return <>{children}</>;
  return <div className="app-noise min-h-[100dvh] bg-background"><div className="flex min-h-[100dvh]"><Sidebar />{menu && <><div onClick={() => setMenu(false)} className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" /><Sidebar mobile onClose={() => setMenu(false)} /></>}<div className="min-w-0 flex-1"><Topbar onMenu={() => setMenu(true)} /><main className="soft-scroll min-h-[calc(100dvh-76px)] overflow-y-auto px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">{children}</main></div></div><BottomNav /></div>;
}
function BottomNav() {
  const [location] = useLocation();
  const items = [{ href: '/', label: 'Home', icon: LayoutDashboard }, { href: '/tasks', label: 'Tasks', icon: ListChecks }, { href: '/focus', label: 'Focus', icon: AlarmClock }, { href: '/progress', label: 'Progress', icon: BarChart3 }, { href: '/goals', label: 'Goals', icon: Target }];
  return <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[70px] items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-xl lg:hidden">{items.map(item => <Link key={item.href} href={item.href} data-testid={`link-bottom-${item.label.toLowerCase()}`} className={cn('focus-ring flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold', location === item.href ? 'text-primary' : 'text-muted-foreground')}><item.icon size={19} /><span>{item.label}</span></Link>)}</nav>;
}

function PageHeading({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-primary">{eyebrow || 'Your preparation space'}</p><h1 className="font-[Manrope] text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>{body && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{body}</p>}</div>{action}</div>;
}
function StatCard({ icon: Icon, label, value, helper, tone, progress }: { icon: Icon; label: string; value: string; helper: string; tone: 'violet' | 'gold' | 'mint' | 'sky' | 'coral'; progress?: number }) {
  return <Card className="min-w-0"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-3 font-[Manrope] text-3xl font-extrabold tracking-tight">{value}</p></div><IconBadge icon={Icon} tone={tone} /></div><p className="mt-2 text-xs text-muted-foreground">{helper}</p>{progress !== undefined && <ProgressBar value={progress} className="mt-3" />}</Card>;
}
function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className={cn('group flex items-center gap-3 border-b border-border/70 py-3.5 last:border-0', task.status === 'completed' && 'opacity-60')} data-testid={`row-task-${task.id}`}><button onClick={onToggle} className="focus-ring shrink-0 text-muted-foreground" data-testid={`button-toggle-task-${task.id}`}>{task.status === 'completed' ? <CircleCheck size={21} className="text-emerald-500" /> : task.status === 'in-progress' ? <span className="grid h-[21px] w-[21px] place-items-center rounded-full border-2 border-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /></span> : <Circle size={21} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><SubjectTag subject={task.subject} /><span className={cn('truncate text-sm font-semibold', task.status === 'completed' && 'line-through')}>{task.title}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={12} /> {task.time} · {task.duration} min · {task.chapter}</p></div><span className={cn('hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex', task.priority === 'High' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>{task.priority}</span><div className="flex opacity-0 transition-opacity group-hover:opacity-100"><button onClick={onEdit} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" data-testid={`button-edit-task-${task.id}`}><Pencil size={14} /></button><button onClick={onDelete} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" data-testid={`button-delete-task-${task.id}`}><Trash2 size={14} /></button></div></div>;
}

function DashboardPage() {
  const { tasks, setTasks, toggleTask } = useApp();
  const [modal, setModal] = useState<Task | 'new' | null>(null);
  const done = tasks.filter(t => t.date === today && t.status === 'completed').length;
  const todayTasks = tasks.filter(t => t.date === today);
  const hours = todayTasks.reduce((sum, t) => sum + t.duration, 0) / 60;
  const updateTask = (task: Task) => { setTasks(prev => prev.some(t => t.id === task.id) ? prev.map(t => t.id === task.id ? task : t) : [...prev, task]); setModal(null); };
  return <div className="mx-auto max-w-[1440px] stagger"><PageHeading eyebrow="Friday · 14 August 2026" title="Good morning, Arjun." body="A clear plan turns a long syllabus into one good next step." action={<Button onClick={() => setModal('new')} data-testid="button-add-task-dashboard"><Plus size={16} /> Add task</Button>} />
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]"><Card className="overflow-hidden border-0 bg-sidebar p-0 text-sidebar-foreground"><div className="relative h-full min-h-[192px] overflow-hidden p-6 sm:p-7"><div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-accent/15" /><div className="absolute bottom-[-70px] right-16 h-44 w-44 rounded-full border-[22px] border-primary/20" /><div className="relative"><div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground/65"><Target size={14} className="text-accent" /> NEET 2027 <span className="rounded-full bg-sidebar-accent px-2 py-1 text-[10px]">May 03, 2027</span></div><div className="mt-5 flex items-end gap-3"><span className="font-[Manrope] text-5xl font-extrabold tracking-tighter text-accent">262</span><div className="pb-1 text-xs leading-5 text-sidebar-foreground/60">days remaining<br /><span className="text-sidebar-foreground">Target rank &lt;100</span></div></div><ProgressBar value={28} color="bg-accent" className="mt-5 bg-sidebar-accent" /><p className="mt-2 text-[11px] text-sidebar-foreground/55">28% of your preparation year elapsed · 103 days studied</p></div></div></Card><StatCard icon={Target} label="Daily goal" value={`${Math.round(done / Math.max(1, todayTasks.length) * 100)}%`} helper={`${hours.toFixed(1)}h planned · ${todayTasks.length - done} tasks left`} tone="violet" progress={done / Math.max(1, todayTasks.length) * 100} /><StatCard icon={Flame} label="Study streak" value="12 days" helper="5 of 7 days this week" tone="gold" progress={72} /></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={CheckCircle2} label="Tasks today" value={`${done} / ${todayTasks.length}`} helper={`${Math.round(done / Math.max(1, todayTasks.length) * 100)}% complete · keep going`} tone="mint" progress={done / Math.max(1, todayTasks.length) * 100} /><StatCard icon={Bell} label="Needs attention" value="2" helper="Overdue items · review before bed" tone="coral" /><Card className="sm:col-span-2" title="This week · subject hours" action={<Link href="/progress" className="text-xs font-semibold text-primary">See progress <ArrowUpRight size={13} className="inline" /></Link>}><div className="flex h-[88px] items-end gap-3 sm:gap-5">{[['Physics', 65, 'bg-sky-500'], ['Chemistry', 47, 'bg-emerald-500'], ['Biology', 78, 'bg-amber-500'], ['Mathematics', 56, 'bg-violet-500']].map(([name, value, color]) => <div className="flex flex-1 flex-col items-center gap-2" key={name as string}><div className={cn('w-full max-w-12 rounded-t-lg transition-all hover:opacity-80', color as string)} style={{ height: `${Number(value) * .72}px` }} /><span className="text-[10px] text-muted-foreground">{name}</span></div>)}</div></Card></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]"><Card title="Today's tasks" action={<Link href="/tasks" className="text-xs font-semibold text-primary">View all <ArrowRight size={13} className="inline" /></Link>}><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{done} of {todayTasks.length} completed</span><span>·</span><span>{todayTasks.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.duration, 0)} min left</span></div>{todayTasks.length ? todayTasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onEdit={() => setModal(task)} onDelete={() => setTasks(prev => prev.filter(t => t.id !== task.id))} />) : <EmptyState icon={ListChecks} title="A clean slate" body="Add your first task and give the day a shape." action={<Button onClick={() => setModal('new')}><Plus size={15} /> Add task</Button>} />}</Card><Card title="Today's schedule" action={<Link href="/timetable" className="text-xs font-semibold text-primary">Open timetable <ArrowRight size={13} className="inline" /></Link>}><div className="space-y-0">{todayTasks.slice(0, 5).map(task => <div key={task.id} className="flex gap-3 border-b border-border/70 py-3 last:border-0"><div className="w-14 shrink-0 font-mono text-[10px] text-muted-foreground">{task.time}</div><div className="border-l-2 border-primary/40 pl-3"><p className="text-sm font-semibold">{task.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{task.duration} min · {task.subject}</p></div></div>)}</div></Card></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]"><Card title="Focus pulse"><div className="flex items-center gap-4"><div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: 'conic-gradient(hsl(var(--primary)) 72%, hsl(var(--muted)) 0)' }}><div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-card font-mono text-sm font-bold">5.7h</div></div><div><p className="font-semibold">You are ahead of your weekly average.</p><p className="mt-1 text-xs text-muted-foreground">+42 min compared to last Friday.</p><Link href="/focus" className="mt-2 inline-block text-xs font-bold text-primary">Start a session <ArrowRight size={12} className="inline" /></Link></div></div></Card><Card title="Revision queue"><div className="flex items-center gap-4"><IconBadge icon={RotateCcw} tone="mint" /><div><p className="font-[Manrope] text-2xl font-extrabold">4 chapters</p><p className="text-xs text-muted-foreground">Ready when you are · 38 cards</p></div><Link href="/revision" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowRight size={16} /></Link></div></Card><Card title="Dream college"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"><Trophy size={19} /></div><div><p className="font-semibold">AIIMS New Delhi</p><p className="text-xs text-muted-foreground">Target rank &lt;100 · 262 days</p></div><Link href="/goals" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><ArrowRight size={16} /></Link></div></Card></div>
    {modal && <TaskModal task={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={updateTask} />}
  </div>;
}

function TaskModal({ task, onClose, onSave }: { task: Task | null; onClose: () => void; onSave: (task: Task) => void }) {
  const [form, setForm] = useState<Task>(task || { id: `t${Date.now()}`, title: '', subject: 'Physics', chapter: '', date: today, time: '07:00', duration: 60, priority: 'Medium', status: 'not-started', notes: '' });
  const set = (key: keyof Task, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));
  return <Modal title={task ? 'Edit task' : 'Add a task'} onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (form.title.trim()) onSave(form); }} className="space-y-4"><Field label="Task name"><input autoFocus required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Solve mechanics PYQs" data-testid="input-task-title" className="field" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Subject"><select value={form.subject} onChange={e => set('subject', e.target.value)} data-testid="select-task-subject" className="field">{subjects.map(s => <option key={s}>{s}</option>)}</select></Field><Field label="Chapter"><input required value={form.chapter} onChange={e => set('chapter', e.target.value)} placeholder="Chapter or topic" data-testid="input-task-chapter" className="field" /></Field><Field label="Date"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} data-testid="input-task-date" className="field" /></Field><Field label="Start time"><input type="time" value={form.time} onChange={e => set('time', e.target.value)} data-testid="input-task-time" className="field" /></Field><Field label="Duration (minutes)"><input type="number" min="10" step="5" value={form.duration} onChange={e => set('duration', Number(e.target.value))} data-testid="input-task-duration" className="field" /></Field><Field label="Priority"><select value={form.priority} onChange={e => set('priority', e.target.value)} data-testid="select-task-priority" className="field">{(['High', 'Medium', 'Low'] as Priority[]).map(p => <option key={p}>{p}</option>)}</select></Field></div><Field label="Notes"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional context for future you" data-testid="input-task-notes" className="field min-h-20 resize-none" /></Field><div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-save-task"><Save size={15} /> Save task</Button></div></form></Modal>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-[Manrope] text-xl font-extrabold">{title}</h2><button onClick={onClose} className="focus-ring grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted" data-testid="button-close-modal"><X size={18} /></button></div>{children}</div></div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }

function TasksPage() {
  const { tasks, setTasks, toggleTask } = useApp();
  const [modal, setModal] = useState<Task | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');
  const visible = tasks.filter(t => (t.title + t.chapter + t.subject).toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || t.status === filter));
  const save = (task: Task) => { setTasks(prev => prev.some(t => t.id === task.id) ? prev.map(t => t.id === task.id ? task : t) : [...prev, task]); setModal(null); };
  return <div className="mx-auto max-w-[1440px] stagger"><PageHeading eyebrow="Plan the work" title="Tasks" body="Turn the syllabus into visible, finishable moves." action={<Button onClick={() => setModal('new')} data-testid="button-add-task"><Plus size={16} /> Add task</Button>} /><Card className="p-0 overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, chapters, topics" data-testid="input-search-tasks" className="field pl-9" /></div><div className="flex items-center gap-2 overflow-x-auto">{(['All', 'not-started', 'in-progress', 'completed'] as const).map(item => <button key={item} onClick={() => setFilter(item)} data-testid={`button-filter-${item}`} className={cn('whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold', filter === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{item === 'All' ? 'All status' : item === 'not-started' ? 'Not started' : item === 'in-progress' ? 'In progress' : 'Completed'}</button>)}</div></div><div className="hidden grid-cols-[1fr_1.6fr_1fr_.7fr_.5fr_auto] gap-4 border-b border-border bg-muted/35 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid"><span>Status</span><span>Subject / topic</span><span>Chapter</span><span>Time</span><span>Duration</span><span /></div><div className="divide-y divide-border/70">{visible.map(task => <div key={task.id} className="group grid gap-3 px-4 py-4 md:grid-cols-[1fr_1.6fr_1fr_.7fr_.5fr_auto] md:items-center md:px-5" data-testid={`table-row-task-${task.id}`}><button onClick={() => toggleTask(task.id)} className="focus-ring absolute ml-0 mt-0 md:relative" data-testid={`button-check-task-${task.id}`}>{task.status === 'completed' ? <CircleCheck size={19} className="text-emerald-500" /> : <Circle size={19} className="text-muted-foreground" />}</button><div className="pl-8 md:pl-0"><SubjectTag subject={task.subject} /><p className={cn('mt-1 text-sm font-semibold', task.status === 'completed' && 'line-through opacity-60')}>{task.title}</p><p className="mt-1 text-xs text-muted-foreground md:hidden">{task.chapter} · {task.time} · {task.duration} min</p></div><span className="hidden text-sm text-muted-foreground md:block">{task.chapter}</span><span className="hidden font-mono text-xs text-muted-foreground md:block">{task.time}</span><span className="hidden text-sm text-muted-foreground md:block">{task.duration}m</span><div className="flex gap-1 md:justify-end"><button onClick={() => setModal(task)} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" data-testid={`button-edit-table-task-${task.id}`}><Pencil size={14} /></button><button onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" data-testid={`button-delete-table-task-${task.id}`}><Trash2 size={14} /></button></div></div>)}{!visible.length && <div className="p-6"><EmptyState icon={Search} title="No tasks found" body="Try a different search or add a new task to your plan." action={<Button onClick={() => setModal('new')}><Plus size={15} /> Add task</Button>} /></div>}</div></Card>{modal && <TaskModal task={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={save} />}</div>;
}

function TimetablePage() {
  const { slots, setSlots } = useApp();
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [modal, setModal] = useState(false);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const selected = slots.filter(s => s.day === selectedDay);
  return <div className="mx-auto max-w-[1200px] stagger"><PageHeading eyebrow="A repeatable rhythm" title="Timetable" body="Protect the hours that make your goal feel inevitable." action={<Button onClick={() => setModal(true)} data-testid="button-add-slot"><Plus size={16} /> Add study block</Button>} /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{days.map(day => <button key={day} onClick={() => setSelectedDay(day)} data-testid={`button-day-${day}`} className={cn('min-w-[72px] rounded-xl border px-4 py-3 text-sm font-semibold transition', selectedDay === day ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted')}><span className="block text-[10px] uppercase opacity-70">{day === 'Mon' ? 'Aug 10' : day === 'Tue' ? '11' : day === 'Wed' ? '12' : day === 'Thu' ? '13' : day === 'Fri' ? '14' : day === 'Sat' ? '15' : '16'}</span>{day}</button>)}</div><div className="grid gap-4 lg:grid-cols-[1fr_300px]"><Card title={`${selectedDay} schedule`} action={<span className="text-xs text-muted-foreground">{selected.length} blocks</span>}><div className="space-y-3">{selected.map(slot => <div key={slot.id} className="group flex gap-4 rounded-xl border border-border/80 bg-muted/25 p-4"><div className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">{slot.start}<br /><span className="text-[10px] opacity-60">{slot.end}</span></div><div className="min-w-0 flex-1 border-l-2 border-primary/60 pl-4"><div className="flex items-center gap-2"><SubjectTag subject={slot.subject} /><span className="text-xs text-muted-foreground">90 min</span></div><p className="mt-1 font-semibold">{slot.title}</p><button onClick={() => setSlots(prev => prev.filter(item => item.id !== slot.id))} className="mt-2 text-[11px] font-semibold text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" data-testid={`button-delete-slot-${slot.id}`}><Trash2 size={12} className="mr-1 inline" /> Remove block</button></div></div>)}{!selected.length && <EmptyState icon={CalendarRange} title="No study blocks yet" body="A blank day can become your best day. Add one focused block." action={<Button onClick={() => setModal(true)}><Plus size={15} /> Add block</Button>} />}</div></Card><Card title="Week at a glance"><div className="space-y-3">{days.map(day => <button key={day} onClick={() => setSelectedDay(day)} className="flex w-full items-center gap-3 text-left" data-testid={`button-glance-${day}`}><span className="w-8 text-xs font-semibold text-muted-foreground">{day}</span><div className="flex flex-1 gap-1.5">{Array.from({ length: Math.min(5, slots.filter(s => s.day === day).length || 1) }).map((_, i) => <span key={i} className={cn('h-2 flex-1 rounded-full', slots.some(s => s.day === day) ? 'bg-primary/70' : 'bg-muted')} />)}</div><span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{slots.filter(s => s.day === day).length}</span></button>)}</div><div className="mt-6 rounded-xl bg-sidebar p-4 text-sidebar-foreground"><p className="text-xs font-semibold text-accent">Rhythm note</p><p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">Schedule hard topics when your energy is highest. Your calendar is a promise, not a punishment.</p></div></Card></div>{modal && <SlotModal onClose={() => setModal(false)} onSave={slot => { setSlots(prev => [...prev, slot]); setModal(false); }} />}</div>;
}
function SlotModal({ onClose, onSave }: { onClose: () => void; onSave: (slot: TimetableSlot) => void }) {
  const [form, setForm] = useState({ day: 'Mon', start: '07:00', end: '08:00', title: '', subject: 'Physics' as Subject });
  return <Modal title="Add study block" onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (form.title.trim()) onSave({ ...form, id: `s${Date.now()}` }); }} className="space-y-4"><Field label="Day"><select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} className="field" data-testid="select-slot-day">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <option key={d}>{d}</option>)}</select></Field><Field label="Block name"><input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Biology NCERT pass" className="field" data-testid="input-slot-title" /></Field><div className="grid grid-cols-3 gap-3"><Field label="Subject"><select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value as Subject })} className="field" data-testid="select-slot-subject">{subjects.map(s => <option key={s}>{s}</option>)}</select></Field><Field label="Starts"><input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="field" data-testid="input-slot-start" /></Field><Field label="Ends"><input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="field" data-testid="input-slot-end" /></Field></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-save-slot"><Save size={15} /> Save block</Button></div></form></Modal>;
}

function CalendarPage() {
  const { tasks } = useApp();
  const [selected, setSelected] = useState(today);
  const [monthOffset, setMonthOffset] = useState(0);
  const visibleMonth = new Date(2026, 7 + monthOffset, 1);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthName = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = (visibleMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const moveMonth = (direction: number) => {
    const nextOffset = monthOffset + direction;
    setMonthOffset(nextOffset);
    const nextMonth = new Date(2026, 7 + nextOffset, 1);
    setSelected(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`);
  };
  return <div className="mx-auto max-w-[1200px] stagger"><PageHeading eyebrow="See the whole month" title="Calendar" body="Zoom out without losing the next step." action={<div className="flex items-center gap-2"><Button variant="secondary" onClick={() => moveMonth(-1)} data-testid="button-calendar-prev"><ChevronLeft size={16} /></Button><Button variant="secondary" onClick={() => moveMonth(1)} data-testid="button-calendar-next"><ChevronRight size={16} /></Button></div>} /><div className="grid gap-4 lg:grid-cols-[1fr_300px]"><Card className="overflow-hidden p-0"><div className="flex items-center justify-between border-b border-border p-5"><div><p className="text-xs font-semibold text-muted-foreground">MONTH VIEW</p><h2 className="mt-1 font-[Manrope] text-xl font-extrabold">{monthName}</h2></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">12 day streak</span></div><div className="grid grid-cols-7 border-b border-border bg-muted/25 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="py-3">{d}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} className="min-h-24 border-b border-r border-border/60 bg-muted/10" />)}{dates.map(day => { const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const dayTasks = tasks.filter(t => t.date === date); return <button key={day} onClick={() => setSelected(date)} data-testid={`button-calendar-day-${day}`} className={cn('min-h-24 border-b border-r border-border/60 p-2 text-left transition hover:bg-primary/5', selected === date && 'bg-primary/10 ring-2 ring-inset ring-primary')}><span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', date === today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{day}</span><div className="mt-2 space-y-1">{dayTasks.slice(0, 2).map(task => <div key={task.id} className={cn('truncate rounded px-1.5 py-1 text-[9px] font-semibold', subjectTone[task.subject])}>{task.title}</div>)}</div></button>; })}</div></Card><Card title="Selected day"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{selected === today ? 'Today' : selected}</p><div className="mt-4 space-y-3">{tasks.filter(t => t.date === selected).map(task => <div key={task.id} className="border-l-2 border-primary pl-3"><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.time} · {task.duration} min</p></div>)}{!tasks.some(t => t.date === selected) && <p className="text-sm leading-6 text-muted-foreground">Nothing planned here yet. Leave room for rest, or add this day from Tasks.</p>}</div></Card></div></div>;
}

function FocusPage() {
  const [seconds, setSeconds] = useState(25 * 60); const [running, setRunning] = useState(false); const [mode, setMode] = useState('Deep focus'); const [custom, setCustom] = useState('45');
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds(value => { if (value <= 1) { setRunning(false); return 0; } return value - 1; }), 1000); return () => window.clearInterval(timer); }, [running]);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0'); const secs = String(seconds % 60).padStart(2, '0');
  const choose = (min: number, label: string) => { setSeconds(min * 60); setMode(label); setRunning(false); };
  return <div className="mx-auto max-w-[1100px] stagger"><PageHeading eyebrow="One thing at a time" title="Focus timer" body="Put your attention somewhere safe for the next few minutes." action={<Link href="/tasks" className="text-sm font-semibold text-primary">Choose a task <ArrowRight size={14} className="inline" /></Link>} /><div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]"><Card className="relative flex min-h-[480px] flex-col items-center justify-center overflow-hidden bg-sidebar text-center text-sidebar-foreground"><div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sidebar-accent" /><div className="absolute left-1/2 top-1/2 h-[315px] w-[315px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sidebar-accent/70" /><div className="relative"><p className="text-xs font-semibold uppercase tracking-[.2em] text-accent">{mode}</p><p className="mt-6 font-mono text-7xl font-bold tracking-tighter text-sidebar-foreground sm:text-8xl">{minutes}:{secs}</p><p className="mt-4 text-sm text-sidebar-foreground/55">{running ? 'Your only job is to stay with the page.' : 'Ready for a clean, quiet block?'}</p><div className="mt-8 flex items-center justify-center gap-3"><Button onClick={() => setRunning(!running)} variant="primary" className="min-w-32 bg-accent text-accent-foreground" data-testid="button-toggle-timer">{running ? <><span className="grid h-5 w-5 place-items-center rounded-full border-2 border-current"><span className="h-2 w-0.5 bg-current" /><span className="ml-0.5 h-2 w-0.5 bg-current" /></span> Pause</> : <><Play size={16} fill="currentColor" /> Start focus</>}</Button><Button onClick={() => { setSeconds(25 * 60); setRunning(false); }} variant="ghost" className="h-10 w-10 p-0 text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-reset-timer"><TimerReset size={17} /></Button></div></div></Card><Card title="Choose a rhythm"><div className="space-y-2">{[['25', 'Quick start', 'A focused sprint'], ['45', 'Deep focus', 'The daily workhorse'], ['60', 'Long session', 'For a hard chapter']].map(([value, label, caption]) => <button key={value} onClick={() => choose(Number(value), label)} data-testid={`button-preset-${value}`} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-muted', mode === label && seconds === Number(value) * 60 ? 'border-primary bg-primary/5' : 'border-border')}><span className="grid h-9 w-9 place-items-center rounded-lg bg-muted font-mono text-xs font-bold">{value}m</span><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted-foreground">{caption}</span></span>{mode === label && seconds === Number(value) * 60 && <Check size={16} className="text-primary" />}</button>)}</div><div className="mt-5 border-t border-border pt-5"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Custom timer</p><div className="flex gap-2"><input type="number" min="1" max="180" value={custom} onChange={e => setCustom(e.target.value)} className="field" data-testid="input-custom-minutes" /><Button onClick={() => choose(Number(custom) || 45, 'Custom focus')} data-testid="button-set-custom">Set minutes</Button></div></div><div className="mt-6 rounded-xl bg-secondary p-4 text-secondary-foreground"><div className="flex items-center gap-2 text-sm font-bold"><Zap size={15} /> Today's focus</div><p className="mt-1 text-xs leading-5 opacity-75">2 sessions complete · 1h 40m studied</p><ProgressBar value={62} color="bg-emerald-500" className="mt-3 bg-emerald-950/10" /></div></Card></div></div>;
}

function ProgressPage() {
  const [range, setRange] = useState<'Last 7 days' | 'Last 14 days' | 'Last 30 days'>('Last 14 days');
  const [rangeOpen, setRangeOpen] = useState(false);
  const hours = range === 'Last 7 days' ? [2.4, 3.1, 1.8, 0.2, 4.1, 3.5, 2.8] : range === 'Last 30 days' ? [1.8, 2.4, 3.1, 2.2, 3.6, 4.4, 3.1, 4.7, 3.9, 2.8, 3.8, 2.2, 3.6, 4.4, 3.1, 4.7, 3.9, 2.6, 3.4, 4.1, 2.9, 3.8, 4.2, 3.5, 2.7, 4.5, 3.6, 4.1, 3.3, 3.9] : [2.4, 3.1, 1.8, 0.2, 4.1, 3.5, 2.8, 3.8, 2.2, 3.6, 4.4, 3.1, 4.7, 3.9];
  const average = (hours.reduce((sum, value) => sum + value, 0) / hours.length).toFixed(1);
  return <div className="mx-auto max-w-[1200px] stagger"><PageHeading eyebrow="Proof, not pressure" title="Progress" body="Notice the pattern. Adjust the plan. Keep moving." action={<div className="relative"><Button variant="secondary" onClick={() => setRangeOpen(value => !value)} aria-expanded={rangeOpen} data-testid="button-progress-range"><CalendarRange size={15} /> {range} <ChevronDown size={14} /></Button>{rangeOpen && <div className="absolute right-0 top-12 z-10 w-40 rounded-xl border border-border bg-card p-1 card-shadow" data-testid="menu-progress-range">{(['Last 7 days', 'Last 14 days', 'Last 30 days'] as const).map(option => <button key={option} onClick={() => { setRange(option); setRangeOpen(false); }} className={cn('w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-muted', range === option && 'bg-primary/10 text-primary')} data-testid={`button-progress-${option.replaceAll(' ', '-').toLowerCase()}`}>{option}</button>)}</div>}</div>} /><div className="grid gap-4 sm:grid-cols-3"><StatCard icon={Clock3} label="Avg daily" value={`${average}h`} helper="+0.4h vs last week" tone="violet" /><StatCard icon={Trophy} label="Best day" value="4.7h" helper="Wednesday, 12 Aug" tone="gold" /><StatCard icon={Flame} label="Current streak" value="12 days" helper="Longest streak: 21 days" tone="coral" /></div><Card className="mt-4" title={`Study hours — ${range.toLowerCase()}`} action={<div className="flex gap-2 text-[10px] font-semibold"><span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">Physics</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Chemistry</span></div>}><div className="relative mt-6 h-64"><div className="absolute inset-x-0 top-0 flex justify-between border-b border-dashed border-border pb-1 text-[10px] text-muted-foreground"><span>5h</span><span>4h</span><span>3h</span><span>2h</span><span>1h</span><span>0h</span></div><div className="absolute inset-x-0 bottom-6 top-7 flex items-end gap-1.5 sm:gap-3">{hours.map((value, i) => <div key={i} className="group relative flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-primary/75 transition-all duration-500 hover:bg-primary" style={{ height: `${value / 5 * 100}%` }} /><span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-sidebar px-1.5 py-1 font-mono text-[9px] text-sidebar-foreground group-hover:block">{value}h</span></div>)}</div><div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-muted-foreground"><span>{range === 'Last 7 days' ? '08 Aug' : range === 'Last 30 days' ? '16 Jul' : '31 Jul'}</span><span>{range === 'Last 7 days' ? '14 Aug' : range === 'Last 30 days' ? '31 Jul' : '14 Aug'}</span></div></div><div className="mt-5 grid grid-cols-3 border-t border-border pt-5 text-center"><div><p className="font-mono text-lg font-bold">7.2h</p><p className="text-[11px] text-muted-foreground">Avg daily this week</p></div><div><p className="font-mono text-lg font-bold">9.5h</p><p className="text-[11px] text-muted-foreground">Best day</p></div><div><p className="font-mono text-lg font-bold">0h</p><p className="text-[11px] text-muted-foreground">Low day · 03 Aug</p></div></div></Card><Card className="mt-4" title="Study consistency" action={<span className="text-xs text-muted-foreground">Last 12 weeks · 12 day current streak</span>}><div className="flex flex-wrap gap-1.5">{Array.from({ length: 84 }, (_, i) => <span key={i} title={`${(i % 5) + 1} sessions`} className={cn('h-3 w-3 rounded-[3px]', i % 13 === 0 ? 'bg-muted' : i % 7 < 2 ? 'bg-primary/35' : i % 5 < 3 ? 'bg-primary/65' : 'bg-primary')} />)}</div><div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">{[['12 days', 'Current streak'], ['21 days', 'Longest streak'], ['148h', 'Total this month'], ['82%', 'Consistency rate']].map(([value, label]) => <div key={label} className="text-center"><p className="font-[Manrope] text-xl font-extrabold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>)}</div></Card></div>;
}

function MocksPage() {
  const { mocks, setMocks } = useApp(); const [modal, setModal] = useState(false);
  return <div className="mx-auto max-w-[1200px] stagger"><PageHeading eyebrow="Measure what matters" title="Mock tests" body="Use each paper as feedback, not a verdict." action={<Button onClick={() => setModal(true)} data-testid="button-add-mock"><Plus size={16} /> Log a mock</Button>} /><div className="grid gap-4 sm:grid-cols-3"><StatCard icon={BookOpen} label="Tests logged" value={String(mocks.length)} helper="+1 this week" tone="violet" /><StatCard icon={TrendingUp} label="Average score" value="625" helper="86.8% of total marks" tone="mint" /><StatCard icon={Target} label="Best accuracy" value="91%" helper="Biology NCERT Sprint" tone="gold" /></div><Card className="mt-4 p-0 overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold">Recent performance</h2><p className="mt-1 text-xs text-muted-foreground">Your latest papers, in one honest view.</p></div><div className="divide-y divide-border/70">{mocks.map(mock => <div key={mock.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center" data-testid={`row-mock-${mock.id}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"><BookOpen size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{mock.exam}</span><p className="truncate text-sm font-semibold">{mock.title}</p></div><p className="mt-1 text-xs text-muted-foreground">{mock.date} · {mock.accuracy}% accuracy</p></div><div className="w-full sm:w-44"><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Score</span><span className="font-mono font-bold">{mock.score}/{mock.total}</span></div><ProgressBar value={mock.score / mock.total * 100} /></div><button onClick={() => setMocks(prev => prev.filter(item => item.id !== mock.id))} className="focus-ring grid h-8 w-8 place-items-center self-end rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-destructive sm:ml-3 sm:self-auto" data-testid={`button-delete-mock-${mock.id}`}><Trash2 size={14} /></button></div>)}</div></Card>{modal && <MockModal onClose={() => setModal(false)} onSave={mock => { setMocks(prev => [mock, ...prev]); setModal(false); }} />}</div>;
}
function MockModal({ onClose, onSave }: { onClose: () => void; onSave: (mock: MockTest) => void }) {
  const [form, setForm] = useState({ title: '', exam: 'NEET', date: today, score: '', total: '720', accuracy: '' });
  return <Modal title="Log a mock test" onClose={onClose}><form onSubmit={e => { e.preventDefault(); const score = Number(form.score); const total = Number(form.total); if (form.title && score >= 0 && total > 0) onSave({ id: `m${Date.now()}`, title: form.title, exam: form.exam, date: form.date, score, total, accuracy: Number(form.accuracy) || Math.round(score / total * 100) }); }} className="space-y-4"><Field label="Test name"><input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. NEET Full Syllabus — Set 05" className="field" data-testid="input-mock-title" /></Field><div className="grid grid-cols-2 gap-4"><Field label="Exam"><select value={form.exam} onChange={e => setForm({ ...form, exam: e.target.value })} className="field" data-testid="select-mock-exam"><option>NEET</option><option>JEE</option></select></Field><Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="field" data-testid="input-mock-date" /></Field><Field label="Score"><input required type="number" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} className="field" data-testid="input-mock-score" /></Field><Field label="Total marks"><input required type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} className="field" data-testid="input-mock-total" /></Field></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-save-mock"><Save size={15} /> Save result</Button></div></form></Modal>;
}

function MistakesPage() {
  const { mistakes, setMistakes } = useApp(); const [subject, setSubject] = useState<'All' | Subject>('All'); const [modal, setModal] = useState(false);
  const shown = mistakes.filter(m => subject === 'All' || m.subject === subject);
  return <div className="mx-auto max-w-[1200px] stagger"><PageHeading eyebrow="Learn from the miss" title="Mistake book" body="Capture the reason, fix the pattern, move on." action={<Button onClick={() => setModal(true)} data-testid="button-add-mistake"><Plus size={16} /> Add mistake</Button>} /><div className="mb-4 flex flex-wrap gap-2">{(['All', ...subjects] as const).map(s => <button onClick={() => setSubject(s)} key={s} data-testid={`button-mistake-filter-${s}`} className={cn('rounded-lg px-3 py-2 text-xs font-bold', subject === s ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>{s}</button>)}</div><div className="grid gap-4 lg:grid-cols-2">{shown.map(mistake => <Card key={mistake.id} className={cn('group', mistake.resolved && 'opacity-70')}><div className="flex items-start gap-3"><button onClick={() => setMistakes(prev => prev.map(item => item.id === mistake.id ? { ...item, resolved: !item.resolved } : item))} className="focus-ring mt-0.5 text-muted-foreground" data-testid={`button-resolve-mistake-${mistake.id}`}>{mistake.resolved ? <CircleCheck size={21} className="text-emerald-500" /> : <Circle size={21} />}</button><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><SubjectTag subject={mistake.subject} /><button onClick={() => setMistakes(prev => prev.filter(item => item.id !== mistake.id))} className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive" data-testid={`button-delete-mistake-${mistake.id}`}><Trash2 size={14} /></button></div><p className={cn('mt-3 text-sm font-semibold', mistake.resolved && 'line-through')}>{mistake.question}</p><p className="mt-1 text-xs font-medium text-primary">{mistake.chapter}</p><div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground"><span className="font-bold text-foreground">Next time: </span>{mistake.note}</div></div></div></Card>)}{!shown.length && <EmptyState icon={BrainCircuit} title="No mistakes here" body="That is a good sign. When a question teaches you something, save it here." />}</div>{modal && <MistakeModal onClose={() => setModal(false)} onSave={m => { setMistakes(prev => [m, ...prev]); setModal(false); }} />}</div>;
}
function MistakeModal({ onClose, onSave }: { onClose: () => void; onSave: (mistake: Mistake) => void }) {
  const [form, setForm] = useState({ subject: 'Physics' as Subject, chapter: '', question: '', note: '' });
  return <Modal title="Add a mistake" onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (form.question && form.chapter && form.note) onSave({ ...form, id: `x${Date.now()}`, resolved: false }); }} className="space-y-4"><Field label="Subject"><select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value as Subject })} className="field" data-testid="select-mistake-subject">{subjects.map(s => <option key={s}>{s}</option>)}</select></Field><Field label="What went wrong?"><textarea required autoFocus value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Describe the error in one sentence" className="field min-h-20 resize-none" data-testid="input-mistake-question" /></Field><Field label="Chapter"><input required value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })} className="field" data-testid="input-mistake-chapter" /></Field><Field label="Your correction"><textarea required value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="What will you do differently?" className="field min-h-20 resize-none" data-testid="input-mistake-note" /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="button-save-mistake"><Save size={15} /> Save mistake</Button></div></form></Modal>;
}

function RevisionPage() {
  const { revision, setRevision } = useApp(); const [filter, setFilter] = useState('All'); const [reviewing, setReviewing] = useState(false);
  const shown = revision.filter(r => filter === 'All' || r.level === filter);
  return <div className="mx-auto max-w-[1100px] stagger"><PageHeading eyebrow="Memory, maintained" title="Revision queue" body="Small returns, spaced well, build durable recall." action={<Button variant="secondary" onClick={() => { setFilter('Due today'); setReviewing(true); }} data-testid="button-start-revision"><Play size={15} /> {reviewing ? 'Reviewing due items' : 'Start review'}</Button>} /><div className="grid gap-4 sm:grid-cols-3"><StatCard icon={RotateCcw} label="Due today" value={String(revision.filter(r => r.level === 'Due today').length)} helper="Make this your first win" tone="coral" /><StatCard icon={BookMarked} label="This week" value={String(revision.length)} helper="38 cards across 4 chapters" tone="violet" /><StatCard icon={CheckCircle2} label="Recall rate" value="84%" helper="+6% this month" tone="mint" /></div><Card className="mt-4 p-0 overflow-hidden"><div className="flex gap-2 overflow-x-auto border-b border-border p-4">{['All', 'Due today', 'Tomorrow', 'This week'].map(f => <button key={f} onClick={() => { setFilter(f); setReviewing(false); }} className={cn('whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold', filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')} data-testid={`button-revision-filter-${f}`}>{f}</button>)}</div><div className="divide-y divide-border/70">{shown.map(item => <div key={item.id} className="flex items-center gap-3 p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><BookMarked size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><SubjectTag subject={item.subject} /><p className="truncate text-sm font-semibold">{item.title}</p></div><p className="mt-1 text-xs text-muted-foreground">{item.chapter} · {item.due}</p></div><span className={cn('hidden rounded-full px-2 py-1 text-[10px] font-bold sm:inline-flex', item.level === 'Due today' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-muted text-muted-foreground')}>{item.level}</span><Button variant="secondary" className="px-2.5 text-xs" onClick={() => setRevision(prev => prev.filter(r => r.id !== item.id))} data-testid={`button-complete-revision-${item.id}`}><Check size={14} /> Done</Button></div>)}{!shown.length && <div className="p-6"><EmptyState icon={RotateCcw} title="Queue cleared" body="You have no revision items in this view. Enjoy the clean slate." /></div>}</div></Card></div>;
}

function GoalsPage() {
  const { goal, setGoal } = useApp(); const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(goal);
  const save = () => { setGoal(draft); setEditing(false); };
  return <div className="mx-auto max-w-[1100px] stagger"><PageHeading eyebrow="Keep the why visible" title="Goals & dream board" body="A destination gives today's effort somewhere to land." action={<Button onClick={() => setEditing(true)} variant="secondary" data-testid="button-edit-goal"><Pencil size={15} /> Edit goal</Button>} /><div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]"><Card className="relative overflow-hidden bg-sidebar text-sidebar-foreground"><div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border-[24px] border-accent/10" /><div className="relative"><div className="flex items-center gap-2 text-xs font-semibold text-accent"><Trophy size={15} /> DREAM COLLEGE</div><h2 className="mt-7 font-[Manrope] text-4xl font-extrabold tracking-tight">{goal.college}</h2><p className="mt-2 text-sm text-sidebar-foreground/60">{goal.exam} · {goal.year} · target rank {goal.targetRank}</p><div className="mt-10 grid grid-cols-2 gap-3"><div className="rounded-xl bg-sidebar-accent p-4"><p className="font-mono text-2xl font-bold text-accent">262</p><p className="mt-1 text-[11px] text-sidebar-foreground/55">days remaining</p></div><div className="rounded-xl bg-sidebar-accent p-4"><p className="font-mono text-2xl font-bold text-accent">{goal.dailyHours}h</p><p className="mt-1 text-[11px] text-sidebar-foreground/55">daily target</p></div></div><div className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground/60"><LockKeyhole size={14} className="text-accent" /> Your plan is personal to you.</div></div></Card><Card title="Your preparation promise"><div className="space-y-5"><div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Syllabus coverage</span><span className="font-mono text-xs text-muted-foreground">42%</span></div><ProgressBar value={42} /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Mock score target</span><span className="font-mono text-xs text-muted-foreground">86%</span></div><ProgressBar value={86} color="bg-emerald-500" /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Consistency</span><span className="font-mono text-xs text-muted-foreground">82%</span></div><ProgressBar value={82} color="bg-amber-500" /></div></div><div className="mt-7 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4"><p className="text-sm font-semibold">“The future is built in ordinary hours.”</p><p className="mt-1 text-xs text-muted-foreground">A note from your steadier self.</p></div></Card></div>{editing && <Modal title="Edit your goal" onClose={() => setEditing(false)}><div className="space-y-4"><Field label="Exam"><select value={draft.exam} onChange={e => setDraft({ ...draft, exam: e.target.value })} className="field" data-testid="select-goal-exam"><option>NEET</option><option>JEE Main</option></select></Field><Field label="Dream college"><input value={draft.college} onChange={e => setDraft({ ...draft, college: e.target.value })} className="field" data-testid="input-goal-college" /></Field><div className="grid grid-cols-2 gap-4"><Field label="Target year"><input value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })} className="field" data-testid="input-goal-year" /></Field><Field label="Target rank"><input value={draft.targetRank} onChange={e => setDraft({ ...draft, targetRank: e.target.value })} className="field" data-testid="input-goal-rank" /></Field></div><Field label="Daily study hours"><input value={draft.dailyHours} onChange={e => setDraft({ ...draft, dailyHours: e.target.value })} className="field" data-testid="input-goal-hours" /></Field><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={save} data-testid="button-save-goal"><Save size={15} /> Save goal</Button></div></div></Modal>}</div>;
}

function JournalPage() {
  const { journals, setJournals } = useApp(); const [form, setForm] = useState({ title: '', mood: 'Steady', body: '' }); const [saved, setSaved] = useState(false);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.body.trim()) return; setJournals(prev => [{ ...form, id: `j${Date.now()}`, date: today }, ...prev]); setForm({ title: '', mood: 'Steady', body: '' }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return <div className="mx-auto max-w-[1100px] stagger"><PageHeading eyebrow="A place to be honest" title="Journal" body="Name what worked. Notice what you need. Return tomorrow." /><div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]"><Card title="Today's reflection"><form onSubmit={submit} className="space-y-4"><Field label="How are you feeling?"><div className="flex flex-wrap gap-2">{['Steady', 'Energised', 'Tired', 'Proud', 'Overwhelmed'].map(mood => <button type="button" key={mood} onClick={() => setForm({ ...form, mood })} className={cn('rounded-full border px-3 py-2 text-xs font-semibold', form.mood === mood ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')} data-testid={`button-mood-${mood}`}>{mood}</button>)}</div></Field><Field label="A title for today"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="A quiet win" className="field" data-testid="input-journal-title" /></Field><Field label="What is on your mind?"><textarea required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Write without editing yourself..." className="field min-h-40 resize-none leading-6" data-testid="input-journal-body" /></Field><div className="flex items-center justify-between"><span className={cn('text-xs font-semibold text-emerald-600 transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>Saved to your journal</span><Button type="submit" data-testid="button-save-journal"><Save size={15} /> Save reflection</Button></div></form></Card><Card title="Past reflections" action={<span className="text-xs text-muted-foreground">{journals.length} entries</span>}><div className="space-y-4">{journals.map(entry => <article key={entry.id} className="rounded-xl border border-border/80 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-widest text-primary">{entry.date}</span><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{entry.mood}</span></div><h3 className="mt-3 font-semibold">{entry.title || 'Untitled reflection'}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.body}</p><button onClick={() => setJournals(prev => prev.filter(item => item.id !== entry.id))} className="mt-3 text-xs font-semibold text-muted-foreground hover:text-destructive" data-testid={`button-delete-journal-${entry.id}`}><Trash2 size={12} className="mr-1 inline" /> Delete</button></article>)}{!journals.length && <EmptyState icon={NotebookPen} title="Your journal is waiting" body="The first entry does not need to be profound. It just needs to be yours." />}</div></Card></div></div>;
}

function SettingsPage() {
  const { theme, setTheme, profile, setProfile } = useApp(); const [saved, setSaved] = useState(false); const [notifications, setNotifications] = usePersistedState('studyace-notifications', true); const [draft, setDraft] = useState(profile);
  const save = () => { setProfile(draft); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  return <div className="mx-auto max-w-[900px] stagger"><PageHeading eyebrow="Make it yours" title="Settings" body="Tune the space so it supports the way you study." /><div className="space-y-4"><Card title="Appearance"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Interface theme</p><p className="mt-1 text-xs text-muted-foreground">Choose a softer light canvas or a low-glare dark room.</p></div><div className="flex gap-2"><button onClick={() => setTheme('light')} className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold', theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')} data-testid="button-theme-light"><Sun size={16} /> Light</button><button onClick={() => setTheme('dark')} className={cn('flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold', theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')} data-testid="button-theme-dark"><Moon size={16} /> Dark</button></div></div></Card><Card title="Study preferences"><div className="divide-y divide-border/70"><div className="flex items-center justify-between gap-4 py-4 first:pt-0"><div className="flex items-center gap-3"><IconBadge icon={Bell} tone="gold" /><div><p className="text-sm font-semibold">Gentle reminders</p><p className="mt-1 text-xs text-muted-foreground">Keep task and revision nudges on this device.</p></div></div><button onClick={() => setNotifications(!notifications)} aria-pressed={notifications} className={cn('relative h-6 w-11 rounded-full transition', notifications ? 'bg-primary' : 'bg-muted')} data-testid="switch-notifications"><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-card shadow transition', notifications ? 'left-6' : 'left-1')} /></button></div><div className="flex items-center gap-3 py-4 last:pb-0"><IconBadge icon={SlidersHorizontal} tone="sky" /><div><p className="text-sm font-semibold">Default focus length</p><p className="mt-1 text-xs text-muted-foreground">25 minutes · You can change this any time in Focus.</p></div></div></div></Card><Card title="Profile"><div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="field" data-testid="input-profile-name" /></Field><Field label="Preparation"><select value={draft.preparation} onChange={e => setDraft({ ...draft, preparation: e.target.value })} className="field" data-testid="select-profile-exam"><option>NEET 2027</option><option>JEE Main 2027</option></select></Field></div></Card><div className="flex items-center justify-between"><span className={cn('text-xs font-semibold text-emerald-600 transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>Preferences saved</span><Button onClick={save} disabled={!draft.name.trim()} data-testid="button-save-settings"><Save size={15} /> Save settings</Button></div></div></div>;
}

function LoginPage() {
  const [, setLocation] = useLocation(); const [mode, setMode] = useState<'login' | 'signup'>('login'); const [email, setEmail] = useState('arjun@example.com'); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const enter = (e: React.FormEvent) => { e.preventDefault(); localStorage.setItem('studyace-auth', 'demo'); setLocation('/'); };
  return <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[1.08fr_.92fr]"><div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 top-20 h-72 w-72 rounded-full border-[38px] border-primary/20" /><div className="absolute bottom-10 right-16 h-52 w-52 rounded-full border-[26px] border-accent/10" /><Logo /><div className="relative max-w-xl"><p className="mb-5 text-sm font-semibold tracking-wide text-accent">THE STUDY SPACE FOR SERIOUS ASPIRANTS</p><h1 className="font-[Manrope] text-5xl font-extrabold leading-[1.05] tracking-tight">Plan today.<br />Study better.<br /><span className="text-accent">Reach your dream.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-sidebar-foreground/65">One calm place to plan your day, study deeply, and see the work behind your dream college.</p><div className="mt-10 grid max-w-lg grid-cols-2 gap-3">{[['Smart daily planner', 'Shape your next session', LayoutDashboard], ['Deep analytics', 'See what is working', BarChart3], ['Streak system', 'Keep the chain alive', Flame], ['Dream board', 'Keep your why in sight', Trophy]].map(([title, body, Icon]) => <div key={title as string} className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4"><IconBadge icon={Icon as Icon} tone="gold" /><p className="mt-3 text-sm font-semibold">{title as string}</p><p className="mt-1 text-xs text-sidebar-foreground/50">{body as string}</p></div>)}</div></div><div className="relative flex items-center gap-3 text-sm text-sidebar-foreground/60"><span className="font-mono text-3xl font-bold text-accent">262</span> days until your next chapter begins.</div></div><div className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><Logo /></div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Welcome back</p><h2 className="mt-3 font-[Manrope] text-3xl font-extrabold tracking-tight">{mode === 'login' ? 'Sign in to your study space.' : 'Create your study space.'}</h2><p className="mt-2 text-sm text-muted-foreground">Your plan is waiting exactly where you left it.</p><div className="mt-7 flex rounded-xl bg-muted p-1"><button onClick={() => setMode('login')} className={cn('flex-1 rounded-lg py-2.5 text-sm font-bold', mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')} data-testid="button-login-tab">Log in</button><button onClick={() => setMode('signup')} className={cn('flex-1 rounded-lg py-2.5 text-sm font-bold', mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')} data-testid="button-signup-tab">Sign up</button></div><form onSubmit={enter} className="mt-7 space-y-4"><Field label="Email address"><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="field" data-testid="input-login-email" /></Field><Field label="Password"><div className="relative"><input required minLength={4} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="field pr-10" data-testid="input-login-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="focus-ring absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground" data-testid="button-toggle-password">{showPassword ? <Sun size={15} /> : <LockKeyhole size={15} />}</button></div></Field><div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="accent-primary" data-testid="checkbox-remember" /> Remember me</label><button type="button" className="font-bold text-primary" data-testid="button-forgot-password">Forgot password?</button></div><Button type="submit" className="w-full py-3" data-testid="button-sign-in">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></Button></form><div className="relative my-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" /> Demo mode <span className="h-px flex-1 bg-border" /></div><button onClick={() => { localStorage.setItem('studyace-auth', 'demo'); setLocation('/'); }} className="focus-ring flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left hover:bg-muted" data-testid="button-enter-demo"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">A</span><span><span className="block text-sm font-semibold">Arjun Sharma</span><span className="block text-xs text-muted-foreground">NEET 2027 · demo account</span></span></span><ArrowRight size={16} className="text-primary" /></button><p className="mt-8 text-center text-xs text-muted-foreground">No backend needed · your demo data stays in this browser.</p></div></div></div>;
}

function FirebaseLoginPage({ redirectTo, adminOnly = false }: { redirectTo?: string; adminOnly?: boolean } = {}) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      assertFirebaseConfigured();
      let signedInUser: User;
      if (mode === 'signup') {
        if (adminOnly) throw new Error('Admin access only allows an existing administrator account.');
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(credential.user, true);
        await createInitialWorkspace(credential.user);
        signedInUser = credential.user;
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(credential.user);
        signedInUser = credential.user;
      }
      if (adminOnly && signedInUser.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        throw new Error('This account is not the configured StudyAce administrator.');
      }
      localStorage.setItem('studyace-auth', 'firebase');
      setLocation(redirectTo || (signedInUser.email?.toLowerCase() === ADMIN_EMAIL ? '/admin' : '/'));
    } catch (authError) {
      setError(errorMessage(authError).replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const initializeAdmin = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/bootstrap', { method: 'POST' });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || 'Admin initialization failed.');
      setMessage(body.message || 'Admin account is ready. Sign in with the configured password.');
    } catch (bootstrapError) {
      setError(errorMessage(bootstrapError));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    try {
      assertFirebaseConfigured();
      await sendPasswordResetEmail(auth, email.trim());
      setMessage('Password reset email sent.');
      setError('');
    } catch (resetError) {
      setError(errorMessage(resetError).replace('Firebase: ', ''));
    }
  };

  return <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[1.08fr_.92fr]">
    <div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border-[38px] border-primary/20" />
      <div className="absolute bottom-10 right-16 h-52 w-52 rounded-full border-[26px] border-accent/10" />
      <Logo />
      <div className="relative max-w-xl">
        <p className="mb-5 text-sm font-semibold tracking-wide text-accent">THE STUDY SPACE FOR SERIOUS ASPIRANTS</p>
        <h1 className="font-[Manrope] text-5xl font-extrabold leading-[1.05] tracking-tight">Plan today.<br />Study better.<br /><span className="text-accent">Reach your dream.</span></h1>
        <p className="mt-6 max-w-md text-base leading-7 text-sidebar-foreground/65">One calm place to plan your day, study deeply, and see the work behind your dream college.</p>
      </div>
      <div className="relative flex items-center gap-3 text-sm text-sidebar-foreground/60"><span className="font-mono text-3xl font-bold text-accent">262</span> days until your next chapter begins.</div>
    </div>
    <div className="flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{adminOnly ? 'Administrator access' : 'Firebase protected'}</p>
        <h2 className="mt-3 font-[Manrope] text-3xl font-extrabold tracking-tight">{adminOnly ? 'Sign in to the admin area.' : mode === 'login' ? 'Sign in to your study space.' : 'Create your study space.'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{adminOnly ? 'Use the configured administrator email and password.' : 'Your plan is synced to your Firebase account.'}</p>
        {!adminOnly && <div className="mt-7 flex rounded-xl bg-muted p-1">
          <button onClick={() => setMode('login')} className={cn('flex-1 rounded-lg py-2.5 text-sm font-bold', mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')} data-testid="button-login-tab">Log in</button>
          <button onClick={() => setMode('signup')} className={cn('flex-1 rounded-lg py-2.5 text-sm font-bold', mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')} data-testid="button-signup-tab">Sign up</button>
        </div>}
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Email address"><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="field" data-testid="input-login-email" /></Field>
          <Field label="Password"><input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="field" data-testid="input-login-password" /></Field>
          <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" className="accent-primary" data-testid="checkbox-remember" /> Remember me</label><button type="button" onClick={() => void resetPassword()} className="font-bold text-primary" data-testid="button-forgot-password">Forgot password?</button></div>
          <Button type="submit" disabled={busy} className="w-full py-3" data-testid="button-sign-in">{busy ? 'Connecting…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></Button>
        </form>
        {(adminOnly || isAdminEmail) && <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16} className="text-primary" /> Admin account</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Use this once to initialize the configured admin account without exposing its password to the browser.</p>
          <Button variant="secondary" disabled={busy} onClick={() => void initializeAdmin()} className="mt-3 w-full" data-testid="button-initialize-admin">Initialize admin account</Button>
        </div>}
        {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        {!adminOnly && <>
          <div className="relative my-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" /> Demo mode <span className="h-px flex-1 bg-border" /></div>
          <button onClick={() => { localStorage.setItem('studyace-auth', 'demo'); setLocation('/'); }} className="focus-ring flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left hover:bg-muted" data-testid="button-enter-demo"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">A</span><span><span className="block text-sm font-semibold">Arjun Sharma</span><span className="block text-xs text-muted-foreground">NEET 2027 · demo account</span></span></span><ArrowRight size={16} className="text-primary" /></button>
          <p className="mt-8 text-center text-xs text-muted-foreground">Firebase Auth and Firestore are enabled. Demo mode stays available for previews.</p>
        </>}
      </div>
    </div>
  </div>;
}

function WelcomePage() { const [, setLocation] = useLocation(); return <div className="grid min-h-[100dvh] place-items-center bg-sidebar p-6 text-sidebar-foreground"><div className="max-w-md text-center"><div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground"><GraduationCap size={32} /></div><h1 className="font-[Manrope] text-4xl font-extrabold">StudyAce</h1><p className="mt-4 text-base leading-7 text-sidebar-foreground/65">A quieter way to prepare for the exam that changes everything.</p><Button onClick={() => setLocation('/login')} className="mt-8" data-testid="button-open-login">Enter StudyAce <ArrowRight size={16} /></Button></div></div>; }

function LoginRoute() { return <FirebaseLoginPage />; }

function NotFound() { return <div className="mx-auto max-w-xl py-20 text-center"><IconBadge icon={Search} /><h1 className="mt-5 font-[Manrope] text-3xl font-extrabold">That page is off the syllabus.</h1><p className="mt-2 text-sm text-muted-foreground">The route you are looking for does not exist.</p><Link href="/" className="mt-6 inline-flex text-sm font-bold text-primary">Back to dashboard <ArrowRight size={14} className="ml-1" /></Link></div>; }

function AdminPage() {
  const [, setLocation] = useLocation();
  const { tasks, journals, mocks, mistakes, revision, slots } = useApp();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(Boolean(auth.currentUser));
  const [workspaces, setWorkspaces] = useState<StudyaceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);
  useEffect(() => {
    if (user && user.email?.toLowerCase() !== ADMIN_EMAIL) void signOut(auth);
  }, [user?.uid, user?.email]);

  const refresh = async () => {
    if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return;
    setLoading(true);
    setError('');
    try {
      const snapshot = await getDocs(collection(db, 'studyaceData'));
      setWorkspaces(snapshot.docs.map(item => ({ uid: item.id, ...item.data() }) as StudyaceData));
    } catch (refreshError) {
      setError(`Could not load Firestore workspaces: ${errorMessage(refreshError)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email?.toLowerCase() === ADMIN_EMAIL) void refresh();
  }, [user?.uid]);

  if (!authReady) return <div className="grid min-h-[100dvh] place-items-center bg-sidebar text-sidebar-foreground"><RefreshCw className="animate-spin text-accent" /></div>;
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return <FirebaseLoginPage redirectTo="/admin" adminOnly />;

  const totalTasks = workspaces.reduce((sum, item) => sum + (item.tasks?.length || 0), tasks.length);
  const totalJournals = workspaces.reduce((sum, item) => sum + (item.journals?.length || 0), journals.length);
  const totalMocks = workspaces.reduce((sum, item) => sum + (item.mocks?.length || 0), mocks.length);
  const recentTasks = (workspaces.find(item => item.uid === user.uid)?.tasks || tasks).slice(0, 7);

  return <div className="min-h-[100dvh] bg-sidebar p-4 text-sidebar-foreground sm:p-7 lg:p-10">
    <div className="mx-auto max-w-[1480px]">
      <header className="flex flex-col justify-between gap-5 border-b border-sidebar-border pb-7 sm:flex-row sm:items-end">
        <div><div className="flex items-center gap-3"><Logo /><span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">Admin</span></div><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-accent">Private control room</p><h1 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight sm:text-4xl">StudyAce overview</h1><p className="mt-2 max-w-2xl text-sm text-sidebar-foreground/60">Monitor synced study workspaces, activity, and content from one quiet place.</p></div>
        <div className="flex gap-2"><Button variant="ghost" onClick={() => setLocation('/')} className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">Open app <ArrowRight size={15} /></Button><Button variant="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</Button><Button onClick={() => { void signOut(auth); setLocation('/login'); }}><LogOut size={15} /> Sign out</Button></div>
      </header>
      {error && <p className="mt-5 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/55">Synced users</p><IconBadge icon={Users} tone="gold" /></div><p className="mt-4 font-mono text-3xl font-bold">{Math.max(1, workspaces.length)}</p><p className="mt-2 text-xs text-sidebar-foreground/50">Firestore study workspaces</p></div>
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/55">Tasks tracked</p><IconBadge icon={ListChecks} tone="mint" /></div><p className="mt-4 font-mono text-3xl font-bold">{totalTasks}</p><p className="mt-2 text-xs text-sidebar-foreground/50">Across available workspaces</p></div>
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/55">Mock tests</p><IconBadge icon={BookOpen} tone="violet" /></div><p className="mt-4 font-mono text-3xl font-bold">{totalMocks}</p><p className="mt-2 text-xs text-sidebar-foreground/50">Results saved to Firestore</p></div>
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/55">Journal entries</p><IconBadge icon={NotebookPen} tone="sky" /></div><p className="mt-4 font-mono text-3xl font-bold">{totalJournals}</p><p className="mt-2 text-xs text-sidebar-foreground/50">Private reflections</p></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.95fr]">
        <section className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Current workspace</h2><p className="mt-1 text-xs text-sidebar-foreground/50">{user.email}</p></div><IconBadge icon={Activity} tone="mint" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Tasks', tasks.length], ['Mistakes', mistakes.length], ['Revision', revision.length], ['Timetable', slots.length]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-sidebar p-4"><p className="font-mono text-xl font-bold text-accent">{value as number}</p><p className="mt-1 text-xs text-sidebar-foreground/50">{label as string}</p></div>)}</div>
        </section>
        <section className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="flex items-center gap-3"><IconBadge icon={Database} tone="violet" /><div><h2 className="font-semibold">Data collections</h2><p className="mt-1 text-xs text-sidebar-foreground/50">Firestore document groups available to admin.</p></div></div><div className="mt-5 space-y-2 text-sm">{[['studyaceData', `${Math.max(1, workspaces.length)} workspaces`], ['tasks', `${totalTasks} records`], ['journals', `${totalJournals} records`], ['mock tests', `${totalMocks} records`]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-sidebar-border/70 py-2 last:border-0"><span className="text-sidebar-foreground/70">{label}</span><span className="font-mono text-xs text-accent">{value}</span></div>)}</div></section>
      </div>
      <section className="mt-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Recent tasks</h2><p className="mt-1 text-xs text-sidebar-foreground/50">A quick view of the active admin workspace.</p></div><ListChecks size={18} className="text-accent" /></div>{recentTasks.length ? <div className="divide-y divide-sidebar-border/70">{recentTasks.map(task => <div key={task.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"><SubjectTag subject={task.subject} /><span className="flex-1 text-sm font-semibold">{task.title}</span><span className="text-xs text-sidebar-foreground/50">{task.date} · {task.status}</span></div>)}</div> : <p className="py-4 text-sm text-sidebar-foreground/55">No task activity yet.</p>}</section>
      <section className="mt-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-5"><div className="mb-4 flex items-center gap-3"><IconBadge icon={Users} tone="gold" /><div><h2 className="font-semibold">Synced user workspaces</h2><p className="mt-1 text-xs text-sidebar-foreground/50">Each row is backed by a Firestore document and protected by the included rules.</p></div></div>{workspaces.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-sidebar-foreground/45"><tr><th className="pb-3">User</th><th className="pb-3">Tasks</th><th className="pb-3">Mocks</th><th className="pb-3">Journal</th><th className="pb-3">Updated</th></tr></thead><tbody className="divide-y divide-sidebar-border/70">{workspaces.map(item => <tr key={item.uid}><td className="py-3"><p className="font-semibold">{item.email || 'Unknown account'}</p><p className="mt-1 text-[11px] text-sidebar-foreground/45">{item.uid}</p></td><td className="py-3 font-mono text-accent">{item.tasks?.length || 0}</td><td className="py-3 font-mono text-accent">{item.mocks?.length || 0}</td><td className="py-3 font-mono text-accent">{item.journals?.length || 0}</td><td className="py-3 text-xs text-sidebar-foreground/55">{item.updatedAt ? 'Synced' : 'Pending'}</td></tr>)}</tbody></table></div> : <p className="py-4 text-sm text-sidebar-foreground/55">No Firestore workspace documents have synced yet. Sign in as a student and make one change to create the first record.</p>}</section>
    </div>
  </div>;
}

function Router() {
  return <Shell><Switch><Route path="/" component={DashboardPage} /><Route path="/tasks" component={TasksPage} /><Route path="/timetable" component={TimetablePage} /><Route path="/calendar" component={CalendarPage} /><Route path="/focus" component={FocusPage} /><Route path="/progress" component={ProgressPage} /><Route path="/mocks" component={MocksPage} /><Route path="/mistakes" component={MistakesPage} /><Route path="/revision" component={RevisionPage} /><Route path="/goals" component={GoalsPage} /><Route path="/journal" component={JournalPage} /><Route path="/settings" component={SettingsPage} /><Route path="/login" component={LoginRoute} /><Route path="/admin" component={AdminPage} /><Route path="/welcome" component={WelcomePage} /><Route component={NotFound} /></Switch></Shell>;
}

function App() {
  const [tasks, setTasks] = usePersistedState<Task[]>('studyace-tasks', seedTasks);
  const [journals, setJournals] = usePersistedState<Journal[]>('studyace-journals', seedJournals);
  const [mocks, setMocks] = usePersistedState<MockTest[]>('studyace-mocks', seedMocks);
  const [mistakes, setMistakes] = usePersistedState<Mistake[]>('studyace-mistakes', seedMistakes);
  const [revision, setRevision] = usePersistedState<RevisionItem[]>('studyace-revision', seedRevision);
  const [slots, setSlots] = usePersistedState<TimetableSlot[]>('studyace-slots', seedSlots);
  const [goal, setGoal] = usePersistedState<Goal>('studyace-goal', { exam: 'NEET', year: '2027', college: 'AIIMS New Delhi', targetRank: '<100', dailyHours: '8' });
  const [profile, setProfile] = usePersistedState<Profile>('studyace-profile', { name: 'Arjun Sharma', preparation: 'NEET 2027' });
  const [theme, setThemeState] = usePersistedState<'light' | 'dark'>('studyace-theme', 'light');
  const setTheme = (next: 'light' | 'dark') => setThemeState(next);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [firebaseDataReady, setFirebaseDataReady] = useState(!auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setFirebaseUser(nextUser);
    setFirebaseDataReady(!nextUser);
  }), []);
  useEffect(() => {
    if (!firebaseUser) {
      setFirebaseDataReady(true);
      return;
    }
    void syncUserProfile(firebaseUser).catch(() => {
      // The auth flow reports configuration and Firestore errors to the user.
    });
    let active = true;
    setFirebaseDataReady(false);
    void getDoc(doc(db, 'studyaceData', firebaseUser.uid)).then(snapshot => {
      if (!active) return;
      const remote = snapshot.exists() ? snapshot.data() as StudyaceData : null;
      if (remote?.tasks) setTasks(remote.tasks);
      if (remote?.journals) setJournals(remote.journals);
      if (remote?.mocks) setMocks(remote.mocks);
      if (remote?.mistakes) setMistakes(remote.mistakes);
      if (remote?.revision) setRevision(remote.revision);
      if (remote?.slots) setSlots(remote.slots);
      if (remote?.goal) setGoal(remote.goal);
       if (remote?.profile) setProfile(remote.profile);
      if (!remote) {
        void setDoc(doc(db, 'studyaceData', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'StudyAce student',
          tasks,
          journals,
          mocks,
          mistakes,
          revision,
          slots,
          goal,
           profile,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    }).catch(() => {
      // The app remains usable offline; Firestore retries on the next change.
    }).finally(() => {
      if (active) setFirebaseDataReady(true);
    });
    return () => { active = false; };
  }, [firebaseUser?.uid]);
  useEffect(() => {
    if (!firebaseUser || !firebaseDataReady) return;
    const timer = window.setTimeout(() => {
      void setDoc(doc(db, 'studyaceData', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || 'StudyAce student',
        tasks,
        journals,
        mocks,
        mistakes,
        revision,
        slots,
        goal,
         profile,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [firebaseUser?.uid, firebaseDataReady, tasks, journals, mocks, mistakes, revision, slots, goal, profile]);
  const toggleTask = (id: string) => setTasks(prev => prev.map(task => task.id === id ? { ...task, status: task.status === 'completed' ? 'not-started' : 'completed' } : task));
  const state = useMemo(() => ({ tasks, setTasks, journals, setJournals, mocks, setMocks, mistakes, setMistakes, revision, setRevision, slots, setSlots, goal, setGoal, profile, setProfile, theme, setTheme, toggleTask }), [tasks, journals, mocks, mistakes, revision, slots, goal, profile, theme]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><AppContext.Provider value={state}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></AppContext.Provider></TooltipProvider></QueryClientProvider>;
}

const queryClient = new QueryClient();
export default function AppWithBoundary() { return <ErrorBoundary><App /></ErrorBoundary>; }