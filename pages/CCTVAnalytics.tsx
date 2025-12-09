
import React, { useState, useEffect, useRef } from 'react';
import { User, CCTVAnalysisResult } from '../types';
import { analyzeStaffMovement } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Video, Activity, AlertTriangle, Users, Clock, CheckCircle2, PlayCircle, Loader2, Box, Sparkles, Plus, X, Layers, Settings, Eye, GitMerge, DollarSign, TrendingDown, Save, Camera, Wifi, Cloud, Shield, Download, Monitor, ExternalLink } from 'lucide-react';

interface CCTVAnalyticsProps { user: User; onUserUpdate?: (user: User) => void; }

const DEFAULT_KITCHEN_ZONES = [
    { id: 'storage', label: 'Storage/Fridge', top: '5%', left: '5%', width: '20%', height: '40%', color: 'border-blue-500', role: 'Commis' },
    { id: 'prep', label: 'Prep Station', top: '5%', left: '30%', width: '30%', height: '40%', color: 'border-yellow-500', role: 'Sous Chef' },
    { id: 'cook', label: 'Cooking Line', top: '55%', left: '30%', width: '30%', height: '40%', color: 'border-red-500', role: 'Head Chef' },
    { id: 'assembly', label: 'Assembly/Pass', top: '30%', left: '65%', width: '30%', height: '40%', color: 'border-emerald-500', role: 'Expeditor' },
    { id: 'dish', label: 'Dishwashing', top: '55%', left: '5%', width: '20%', height: '40%', color: 'border-slate-500', role: 'Steward' }
];

export const CCTVAnalytics: React.FC<CCTVAnalyticsProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'setup'>('live');
    const [result, setResult] = useState<CCTVAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Zone State
    const [zones, setZones] = useState<any[]>(DEFAULT_KITCHEN_ZONES);
    const [isSavingZones, setIsSavingZones] = useState(false);
    const [newZone, setNewZone] = useState({ label: '', role: '', color: 'border-blue-500' });

    // Camera State - Defaulting to Cloud/External for BistroSight
    const [showCameraModal, setShowCameraModal] = useState(false);
    
    // External App URL
    const BISTRO_SIGHT_URL = "https://bistrosight-867764076046.us-west1.run.app/";

    useEffect(() => {
        const storedZones = storageService.getKitchenZones(user.id);
        if (storedZones && storedZones.length > 0) setZones(storedZones);
    }, [user.id]);

    const handleAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            // Simulate sending a frame to Gemini for analysis (Mocking the connection to the external app's data stream)
            const data = await analyzeStaffMovement(
                "Analyzing live feed from BistroSight Operations Center.", 
                zones.map(z => z.label)
            );
            setResult(data);

            // Auto-generate Tasks from Deviations
            if (data.sop_deviations && data.sop_deviations.length > 0) {
                data.sop_deviations.forEach(dev => {
                    if (dev.confidence > 0.7) { // Only high confidence
                         storageService.addTask(
                             user.id, 
                             `⚠️ Review SOP Deviation (${dev.deviation_type}) at ${dev.step_id || 'Kitchen'}`, 
                             ['Urgent', 'Kitchen']
                         );
                    }
                });
            }
            
            // Auto-generate Task from Recommendations if high priority
            if (data.recommendations) {
                data.recommendations.filter(r => r.priority === 'high').forEach(rec => {
                    storageService.addTask(user.id, `Action Item: ${rec.text}`, ['Admin']);
                });
            }

        } finally { setIsAnalyzing(false); }
    };

    const handleSaveZones = () => {
        setIsSavingZones(true);
        storageService.saveKitchenZones(user.id, zones);
        setTimeout(() => { setIsSavingZones(false); setActiveTab('live'); }, 800);
    };

    const handleAddZone = () => {
        if (!newZone.label) return;
        setZones([...zones, { 
            id: newZone.label.toLowerCase().replace(/\s/g, '_'), 
            ...newZone, 
            top: '25%', left: '25%', width: '20%', height: '20%' 
        }]);
        setNewZone({ label: '', role: '', color: 'border-blue-500' });
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-emerald-600" /> Operations Center
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Powered by BistroSight Live Intelligence</p>
                </div>
                <div className="flex gap-2">
                    <a 
                        href={BISTRO_SIGHT_URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ExternalLink size={14}/> Open Full Screen
                    </a>
                    <button onClick={() => setActiveTab('live')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'live' ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {activeTab === 'live' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                        Live Feed
                    </button>
                    <button onClick={() => setActiveTab('setup')} className={`px-3 py-2 rounded-lg text-xs font-bold flex gap-1 items-center transition-colors ${activeTab === 'setup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Settings size={14}/> Zone Config
                    </button>
                </div>
            </div>

            {activeTab === 'setup' ? (
                // Setup View 
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold dark:text-white">Configure Zones</h2>
                        <button onClick={handleSaveZones} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg flex gap-2 hover:bg-emerald-700 transition-colors">
                            {isSavingZones ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Layout
                        </button>
                    </div>
                    <div className="flex gap-6 h-full">
                        <div className="w-1/3 space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Add New Zone</h3>
                                <input placeholder="Zone Name (e.g. Grill Station)" value={newZone.label} onChange={e => setNewZone({...newZone, label: e.target.value})} className="w-full p-2 border rounded mb-2 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" />
                                <input placeholder="Assigned Role (e.g. Line Cook)" value={newZone.role} onChange={e => setNewZone({...newZone, role: e.target.value})} className="w-full p-2 border rounded mb-2 dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" />
                                <button onClick={handleAddZone} className="w-full py-2 bg-slate-900 dark:bg-slate-700 text-white rounded font-bold text-sm hover:opacity-90">Add Zone</button>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {zones.map(z => (
                                    <div key={z.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded shadow-sm">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{z.label}</span>
                                        <button onClick={() => setZones(zones.filter(x => x.id !== z.id))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 bg-black/90 rounded-xl relative flex items-center justify-center border border-slate-700 overflow-hidden">
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                            {zones.map(z => (
                                <div key={z.id} className={`absolute border-2 border-dashed ${z.color} bg-white/5 flex items-center justify-center cursor-move hover:bg-white/10 transition-colors group`} style={{top:z.top, left:z.left, width:z.width, height:z.height}}>
                                    <span className="bg-black/70 text-white text-[10px] px-1 rounded shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform">{z.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                // Live Monitor with External Iframe
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 bg-black rounded-xl relative flex items-center justify-center overflow-hidden group shadow-lg border border-slate-800">
                            {/* External Application Embed */}
                            <iframe 
                                src={BISTRO_SIGHT_URL}
                                className="w-full h-full border-0 bg-slate-900"
                                title="BistroSight Operations Center"
                                allow="camera; microphone; geolocation"
                            />
                            
                            {/* Overlay Controls (Still allow manual trigger of local AI checks on top) */}
                            {!isAnalyzing && (
                                <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={handleAnalysis} className="px-4 py-2 bg-emerald-600/90 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2 backdrop-blur-md text-xs">
                                        <PlayCircle size={16} /> Sync AI Insights
                                    </button>
                                </div>
                            )}
                            
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
                                    <Loader2 className="animate-spin text-emerald-500 mb-2" size={48} />
                                    <p className="text-white font-bold text-sm tracking-wide animate-pulse">SYNCING DATA...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: AI Insights (Correlated Data) */}
                    <div className="w-full lg:w-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                        <div className="p-4 border-b dark:border-slate-800 font-bold dark:text-white flex justify-between items-center">
                            <span>Operations Insights</span>
                            {result && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Synced</span>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {result ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 leading-relaxed">
                                        <span className="font-bold block mb-1 text-slate-800 dark:text-white">AI Summary:</span>
                                        {result.summary_report}
                                    </div>
                                    
                                    {result.sop_deviations.length > 0 ? (
                                        result.sop_deviations.map((dev, i) => (
                                            <div key={i} className="p-3 border border-red-100 bg-red-50 rounded-lg animate-scale-in">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                                                        <AlertTriangle size={12}/> {dev.deviation_type}
                                                    </span>
                                                    <span className="text-[10px] text-red-500 font-mono">{(dev.confidence * 100).toFixed(0)}% Conf.</span>
                                                </div>
                                                <p className="text-xs text-slate-600">{dev.explanation}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center bg-emerald-50 rounded-lg border border-emerald-100">
                                            <CheckCircle2 className="mx-auto text-emerald-500 mb-1" size={20}/>
                                            <p className="text-xs text-emerald-700 font-bold">All SOPs compliant</p>
                                        </div>
                                    )}

                                    {result.performance_scores && (
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                                                <p className="text-[10px] text-slate-500 uppercase">Efficiency</p>
                                                <p className="text-lg font-bold text-emerald-600">{result.performance_scores.kitchen_efficiency}%</p>
                                            </div>
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-center">
                                                <p className="text-[10px] text-slate-500 uppercase">Congestion</p>
                                                <p className="text-lg font-bold text-orange-500">{result.performance_scores.congestion_score}%</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-4">
                                    <Activity size={32} className="mx-auto mb-2 opacity-50"/>
                                    <p className="text-sm">Waiting for synchronization...</p>
                                    <p className="text-xs opacity-70 mt-1 max-w-[200px] text-center">Click 'Sync AI Insights' to fetch latest analytics from BistroSight.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
