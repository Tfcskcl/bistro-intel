import React, { useState } from 'react';
import { generateSOP } from '../services/geminiService';
import { SOP, User, PlanType } from '../types';
import { FileText, Loader2, CheckSquare, AlertTriangle, PlayCircle, Lock, Save, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface SOPStudioProps {
    user: User;
}

export const SOPStudio: React.FC<SOPStudioProps> = ({ user }) => {
  const [topic, setTopic] = useState('');
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'generator' | 'saved'>('generator');
  const [savedSOPs, setSavedSOPs] = useState<SOP[]>(storageService.getSavedSOPs());
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (user.plan === PlanType.FREE) {
      return (
          <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                  <Lock size={32} className="text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Pro Feature Locked</h2>
              <p className="text-slate-500 mt-2 max-w-md text-center">Standard Operating Procedure (SOP) generation is available on the Pro plan and above.</p>
              <button className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Upgrade to Pro</button>
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setSop(null);
    try {
      const result = await generateSOP(topic);
      setSop(result);
    } catch (err) {
      alert("Failed to generate SOP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
      if (sop) {
          storageService.saveSOP(sop);
          setSavedSOPs(storageService.getSavedSOPs());
          setSaveStatus("Saved to library");
          setTimeout(() => setSaveStatus(null), 2000);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       {/* Top Bar */}
       <div className="flex justify-center gap-2 mb-6">
            <button 
                onClick={() => setViewMode('generator')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'generator' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
                SOP Generator
            </button>
            <button 
                onClick={() => setViewMode('saved')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'saved' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            >
                Saved SOPs ({savedSOPs.length})
            </button>
      </div>

      {viewMode === 'saved' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {savedSOPs.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                      <FileText size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No SOPs saved yet. Create one to standardise your ops!</p>
                  </div>
              ) : (
                  savedSOPs.map((s, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all shadow-sm group">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="font-bold text-slate-800 text-lg">{s.title}</h3>
                              <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-emerald-600 transition-colors">
                                  <FileText size={20} />
                              </div>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{s.scope}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>{s.stepwise_procedure.length} Steps</span>
                              <span>•</span>
                              <span>{s.critical_control_points.length} CCPs</span>
                          </div>
                          <button 
                             onClick={() => {
                                 setSop(s);
                                 setViewMode('generator');
                             }}
                             className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                          >
                              View Full Document
                          </button>
                      </div>
                  ))
              )}
          </div>
      ) : (
        <>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">SOP Generator Studio</h2>
                <p className="text-slate-500 mb-6">Create standardized operational procedures for any process in seconds.</p>
                
                <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl mx-auto">
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Cold chain storage for smoothie bowls, Opening checklist..."
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <button 
                    type="submit" 
                    disabled={loading || !topic}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <PlayCircle size={20} />}
                    Generate
                </button>
                </form>
            </div>

            {sop && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                    <span className="text-xs font-mono text-slate-400 block mb-1">ID: {sop.sop_id}</span>
                    <h1 className="text-2xl font-bold text-slate-800">{sop.title}</h1>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-50 px-4 py-2 rounded-lg font-bold shadow-sm transition-all"
                        >
                            <Save size={18} /> {saveStatus || 'Save to Library'}
                        </button>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-emerald-600" /> Procedure
                        </h3>
                        <div className="space-y-4">
                        {sop.stepwise_procedure.map((step, idx) => (
                            <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {step.step_no}
                            </div>
                            <div>
                                <p className="text-slate-700 font-medium">{step.action}</p>
                                <div className="flex gap-4 mt-2 text-xs text-slate-500 uppercase tracking-wide">
                                <span>Role: {step.responsible_role}</span>
                                {step.time_limit && <span>Time: {step.time_limit}</span>}
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" /> Critical Control Points (CCP)
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                        {sop.critical_control_points.map((ccp, i) => (
                            <li key={i}>{ccp}</li>
                        ))}
                        </ul>
                    </section>
                    </div>

                    <div className="space-y-8">
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                        <h3 className="font-bold text-emerald-900 mb-3">Materials & Equipment</h3>
                        <ul className="space-y-2">
                        {sop.materials_equipment.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-emerald-800">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            {item}
                            </li>
                        ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckSquare size={18} className="text-blue-600" /> Monitoring Checklist
                        </h3>
                        <div className="space-y-2">
                        {sop.monitoring_checklist.map((item, i) => (
                            <label key={i} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className="text-sm text-slate-600">{item}</span>
                            </label>
                        ))}
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};