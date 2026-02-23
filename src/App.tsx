/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Focus, 
  Plus, 
  Search, 
  Bell, 
  Settings,
  BrainCircuit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit3,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isTomorrow, parseISO, addDays } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { parseTaskWithAI, getProductivityInsights } from './services/geminiService';
import { Task, Category, cn } from './lib/utils';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left",
      active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const TaskCard = ({ task, onToggle, onDelete }: { task: Task, onToggle: (id: number) => void, onDelete: (id: number) => void }) => {
  const priorityColors = {
    1: "bg-emerald-100 text-emerald-700",
    2: "bg-amber-100 text-amber-700",
    3: "bg-rose-100 text-rose-700"
  };

  const priorityLabels = {
    1: "Low",
    2: "Medium",
    3: "High"
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-start gap-4",
        task.completed && "opacity-60 grayscale-[0.5]"
      )}
    >
      <button 
        onClick={() => onToggle(task.id)}
        className={cn(
          "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          task.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 hover:border-indigo-400"
        )}
      >
        {task.completed && <CheckCircle2 size={16} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={cn("font-semibold text-slate-800 truncate", task.completed && "line-through")}>
            {task.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {task.stress_detected && (
              <div className="text-rose-500" title="Stress detected in task description">
                <BrainCircuit size={16} />
              </div>
            )}
            <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full", priorityColors[task.priority as keyof typeof priorityColors])}>
              {priorityLabels[task.priority as keyof typeof priorityLabels]}
            </span>
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{format(parseISO(task.due_date), 'MMM d, h:mm a')}</span>
            </div>
          )}
          {task.category_name && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.category_color }} />
              <span>{task.category_name}</span>
            </div>
          )}
          <div className="flex gap-1">
            {task.tags.map(tag => (
              <span key={tag} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-opacity"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insight, setInsight] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchAnalytics();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
    
    // Get AI insight after tasks are loaded
    if (data.length > 0) {
      const insightText = await getProductivityInsights(data);
      setInsight(insightText);
    }
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const fetchAnalytics = async () => {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    setAnalytics(data);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setIsProcessing(true);
    try {
      const parsed = await parseTaskWithAI(aiInput);
      
      // Default category to "Personal" if not found
      const categoryId = categories.find(c => c.name === 'Personal')?.id || 1;

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, category_id: categoryId })
      });

      setAiInput('');
      fetchTasks();
      fetchAnalytics();
    } catch (error) {
      console.error("AI Parsing failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTask = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed })
    });
    fetchTasks();
    fetchAnalytics();
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
    fetchAnalytics();
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* AI Insight Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-indigo-200" size={24} />
            <span className="text-indigo-100 font-semibold tracking-wider uppercase text-xs">AI Productivity Insight</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {insight || "Analyzing your productivity flow..."}
          </h2>
          <p className="text-indigo-100 opacity-80">
            Based on your recent activity, we've optimized your schedule to reduce stress.
          </p>
        </div>
        <BrainCircuit className="absolute right-[-20px] bottom-[-20px] text-white/10 w-64 h-64" />
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              +{analytics?.completionRate.toFixed(0)}%
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Completed Tasks</h3>
          <p className="text-3xl font-bold text-slate-800">{analytics?.completedTasks} / {analytics?.totalTasks}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Clock size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Pending Today</h3>
          <p className="text-3xl font-bold text-slate-800">
            {tasks.filter(t => !t.completed && t.due_date && isToday(parseISO(t.due_date))).length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">High Priority</h3>
          <p className="text-3xl font-bold text-slate-800">
            {tasks.filter(t => !t.completed && t.priority === 3).length}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Upcoming Tasks</h2>
            <button onClick={() => setActiveTab('tasks')} className="text-indigo-600 text-sm font-semibold hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {tasks.filter(t => !t.completed).slice(0, 5).map(task => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
            ))}
            {tasks.filter(t => !t.completed).length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400">All caught up! Time for a break?</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Productivity Flow</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.categoryStats || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {analytics?.categoryStats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {analytics?.categoryStats.map((cat: any, i: number) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 4] }} />
                  <span className="text-xs text-slate-500">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">My Tasks</h2>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <button className="px-4 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-600 rounded-lg">All</button>
          <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg">Today</button>
          <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg">Important</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">Productivity Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Weekly Completion Rate</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: 'Mon', tasks: 4 },
                { name: 'Tue', tasks: 7 },
                { name: 'Wed', tasks: 5 },
                { name: 'Thu', tasks: 8 },
                { name: 'Fri', tasks: 12 },
                { name: 'Sat', tasks: 6 },
                { name: 'Sun', tasks: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Task Distribution by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.categoryStats || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {analytics?.categoryStats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFocusMode = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-slate-800">Focus Mode</h2>
        <p className="text-slate-500">Silence the noise. Focus on what matters.</p>
      </div>

      <div className="relative">
        <div className="w-64 h-64 rounded-full border-8 border-indigo-50 flex items-center justify-center">
          <div className="text-6xl font-bold text-indigo-600">25:00</div>
        </div>
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-2 border-indigo-200 opacity-50"
        />
      </div>

      <div className="flex gap-4">
        <button className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
          Start Session
        </button>
        <button className="px-8 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-colors">
          Settings
        </button>
      </div>

      <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-500" />
          AI Focus Suggestion
        </h3>
        <p className="text-slate-600 text-sm">
          Based on your stress levels, we recommend a 25-minute focus session followed by a 5-minute mindful breathing break.
        </p>
      </div>
    </div>
  );

  const renderCalendar = () => (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-8 self-start">Calendar View</h2>
      <div className="w-full max-w-md">
        <Calendar 
          className="!w-full !border-none !font-sans rounded-2xl p-4 shadow-inner bg-slate-50"
          tileClassName={({ date }) => {
            const hasTask = tasks.some(t => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
            return hasTask ? "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-indigo-600 after:rounded-full" : "";
          }}
        />
      </div>
      <div className="mt-8 w-full space-y-4">
        <h3 className="font-bold text-slate-700">Tasks for selected date</h3>
        <p className="text-slate-400 text-sm italic">Select a date to see scheduled tasks.</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 hidden lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <BrainCircuit size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MindFlow AI</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={ListTodo} label="My Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          <SidebarItem icon={CalendarIcon} label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <SidebarItem icon={BarChart3} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <SidebarItem icon={Focus} label="Focus Mode" active={activeTab === 'focus'} onClick={() => setActiveTab('focus')} />
        </nav>

        <div className="bg-indigo-50 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
            <Sparkles size={16} />
            <span>AI Assistant</span>
          </div>
          <p className="text-xs text-indigo-900/60 leading-relaxed">
            Try typing: "Finish the quarterly report by tomorrow at 2pm, it's very important"
          </p>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <SidebarItem icon={Settings} label="Settings" active={false} onClick={() => {}} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex-1 max-w-2xl">
            <form onSubmit={handleAiSubmit} className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {isProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><BrainCircuit size={20} /></motion.div> : <Sparkles size={20} />}
              </div>
              <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="What's on your mind? (AI will parse it...)"
                className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-sm">Enter</kbd>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4 ml-8">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Bell size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://picsum.photos/seed/user/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'tasks' && renderTasks()}
              {activeTab === 'analytics' && renderAnalytics()}
              {activeTab === 'focus' && renderFocusMode()}
              {activeTab === 'calendar' && renderCalendar()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-30">
        <button onClick={() => setActiveTab('dashboard')} className={cn("p-2 rounded-xl", activeTab === 'dashboard' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}><LayoutDashboard size={24} /></button>
        <button onClick={() => setActiveTab('tasks')} className={cn("p-2 rounded-xl", activeTab === 'tasks' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}><ListTodo size={24} /></button>
        <button className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 -mt-10"><Plus size={24} /></button>
        <button onClick={() => setActiveTab('analytics')} className={cn("p-2 rounded-xl", activeTab === 'analytics' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}><BarChart3 size={24} /></button>
        <button onClick={() => setActiveTab('focus')} className={cn("p-2 rounded-xl", activeTab === 'focus' ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}><Focus size={24} /></button>
      </div>
    </div>
  );
}
