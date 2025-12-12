
import React, { useState, useRef } from 'react';
import { User, CCTVAnalysisResult } from '../types';
import { analyzeStaffMovement } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { 
    Eye, Upload, Activity, AlertTriangle, CheckCircle2, 
    ShieldAlert, Users, Clock, PlayCircle, Loader2, 
    Video, MousePointer2, Camera, UserX, Info, Wifi, X, Router, HelpCircle
} from 'lucide-react';

interface CCTVAnalyticsProps {
    user: User;
}

export const CCTVAnalytics: React.FC<CCTVAnalyticsProps> = ({ user }) => {
    const [image, setImage] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<CCTVAnalysisResult | null>(null);
    const [activeSkills, setActiveSkills] = useState({
        ppe: true,
        efficiency: true,
        heatmap: false,
        loitering: true,
        theft: true
    });
    const [error, setError] = useState<string | null>(null);
    
    // Connect Modal State
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [rtspInput, setRtspInput] = useState('');
    const [cameraName, setCameraName] = useState('');
    const [showEzvizHelp, setShowEzvizHelp] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setImage(ev.target.result as string);
                    setStreamUrl(null); // Clear stream if file uploaded
                }
            };
            reader.readAsDataURL(e.target.files[0]);
            setResult(null); 
        }
    };

    const handleConnectStream = () => {
        if (!rtspInput) return;
        // Simulate stream connection
        setStreamUrl(rtspInput);
        setImage("https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=1600&q=80"); // Mock live feed placeholder
        setResult(null);
        setShowConnectModal(false);
        setRtspInput('');
        setCameraName('');
    };

    const handleAnalyze = async () => {
        if (!image) return;
        
        setIsAnalyzing(true);
        setError(null);

        try {
            // Construct context based on active skills
            const prompt = `
                Analyze this kitchen surveillance frame.
                Active Monitoring Skills:
                ${activeSkills.ppe ? '- PPE Compliance (Masks, Gloves, Hats)' : ''}
                ${activeSkills.efficiency ? '- Staff Efficiency & Workflow' : ''}
                ${activeSkills.heatmap ? '- Motion Heatmap: Identify high-traffic zones and congestion points.' : ''}
                ${activeSkills.loitering ? '- Loitering Detection' : ''}
                ${activeSkills.theft ? '- Suspicious Activity / Theft' : ''}
                
                Identify staff, their roles, actions, and any SOP violations.
            `;

            // Mock zones for now, in real app fetched from settings
            const zones = ['Prep Area', 'Cooking Line', 'Dish Pit', 'Storage', 'Pass'];

            const analysis = await analyzeStaffMovement(prompt, zones, image);
            setResult(analysis);
            
            // Log for audit
            storageService.logActivity(user.id, user.name, 'CCTV', 'Ran AI Vision Analysis');

        } catch (e: any) {
            setError(e.message || "Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setImage(null);
        setStreamUrl(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-red-500" /> Operational Eye
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Real-time vision analytics for compliance and efficiency.</p>
                </div>
            </div>

            {/* RTSP Connection Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Router className="text-blue-500" /> Connect IP Camera
                            </h3>
                            <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Camera Name</label>
                                <input 
                                    value={cameraName}
                                    onChange={(e) => setCameraName(e.target.value)}
                                    placeholder="e.g. Hot Line Cam 1"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RTSP Stream URL</label>
                                <input 
                                    value={rtspInput}
                                    onChange={(e) => setRtspInput(e.target.value)}
                                    placeholder="rtsp://admin:code@192.168.1.x:554/..."
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* EZVIZ Help Section */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <button 
                                    onClick={() => setShowEzvizHelp(!showEzvizHelp)}
                                    className="flex justify-between items-center w-full text-left"
                                >
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                        <Info size={14} /> How to connect EZVIZ / Hikvision?
                                    </span>
                                    <span className="text-blue-500 text-xs">{showEzvizHelp ? 'Hide' : 'Show'}</span>
                                </button>
                                
                                {showEzvizHelp && (
                                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-2 border-t border-blue-200 dark:border-blue-800 pt-2">
                                        <p><strong className="text-blue-700 dark:text-blue-400">1. URL Format:</strong><br/> <code className="bg-white dark:bg-black px-1 rounded">rtsp://admin:CODE@IP:554/h264_stream</code></p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li><strong>CODE:</strong> 6-letter Verification Code found on the device label (bottom/back).</li>
                                            <li><strong>IP:</strong> Find in EZVIZ App &gt; Device Settings &gt; LAN Live View (or Network Settings).</li>
                                        </ul>
                                        <p><strong className="text-blue-700 dark:text-blue-400">2. Configuration Required:</strong></p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Open EZVIZ App &gt; Device Settings.</li>
                                            <li>Disable <strong>Image Encryption</strong> (highly recommended for stability).</li>
                                            <li>Ensure device and this dashboard are on the same network (LAN) for RTSP to work directly.</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleConnectStream}
                            disabled={!rtspInput}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Wifi size={18} /> Connect Stream
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                {/* Left Panel: Feed & Controls */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    {/* Video Feed Area */}
                    <div className="flex-1 bg-black rounded-xl overflow-hidden relative group border border-slate-800 shadow-2xl flex items-center justify-center">
                        {image ? (
                            <>
                                <img src={image} alt="Surveillance Feed" className="w-full h-full object-cover" />
                                {/* Overlay AI Bounding Boxes (Mock Visuals) */}
                                {result && !isAnalyzing && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Mocking some bounding boxes based on result data would go here */}
                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-emerald-400 text-xs font-mono border border-emerald-500/30 flex items-center gap-2 animate-pulse">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> LIVE ANALYSIS
                                        </div>
                                    </div>
                                )}
                                {streamUrl && (
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <div className="bg-red-600 px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full"></div> LIVE
                                        </div>
                                    </div>
                                )}
                                <button 
                                    onClick={handleClear}
                                    className="absolute top-4 left-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <UserX size={20} />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-4 items-center">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-center cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800 text-slate-500">
                                        <Video size={40} />
                                    </div>
                                    <p className="text-slate-400 font-bold">No Signal Input</p>
                                    <p className="text-slate-600 text-sm mt-1">Upload frame or connect stream</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowConnectModal(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <Wifi size={14} /> Connect Camera
                                    </button>
                                </div>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>

                    {/* Action Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Upload size={16} /> Upload Frame
                            </button>
                            <button 
                                onClick={() => setShowConnectModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Router size={16} /> Connect Stream
                            </button>
                            {image && (
                                <div className="text-xs text-slate-500 flex items-center gap-2 ml-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Source Active
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            disabled={!image || isAnalyzing}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/20"
                        >
                            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                            Run Diagnostics
                        </button>
                    </div>
                </div>

                {/* Right Panel: Analytics Dashboard */}
                <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Live Insights</h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        
                        {/* Skills Config */}
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                                <Eye size={12}/> Vision Skills
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-white">PPE Detection</p>
                                        <p className="text-[10px] text-slate-500">Gloves, Masks, Hats</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSkills({...activeSkills, ppe: !activeSkills.ppe})} 
                                        className={`w-8 h-4 rounded-full relative transition-colors ${activeSkills.ppe ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${activeSkills.ppe ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-white">Efficiency Tracking</p>
                                        <p className="text-[10px] text-slate-500">Motion & Task Analysis</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSkills({...activeSkills, efficiency: !activeSkills.efficiency})} 
                                        className={`w-8 h-4 rounded-full relative transition-colors ${activeSkills.efficiency ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${activeSkills.efficiency ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-white">Motion Heatmap</p>
                                        <p className="text-[10px] text-slate-500">Track high-traffic areas</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSkills({...activeSkills, heatmap: !activeSkills.heatmap})} 
                                        className={`w-8 h-4 rounded-full relative transition-colors ${activeSkills.heatmap ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${activeSkills.heatmap ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-white">Loitering Alert</p>
                                        <p className="text-[10px] text-slate-500">Dwell time {'>'} 5 mins</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSkills({...activeSkills, loitering: !activeSkills.loitering})} 
                                        className={`w-8 h-4 rounded-full relative transition-colors ${activeSkills.loitering ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${activeSkills.loitering ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-white">Theft Detection</p>
                                        <p className="text-[10px] text-slate-500">Unauth. Inventory Access</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveSkills({...activeSkills, theft: !activeSkills.theft})} 
                                        className={`w-8 h-4 rounded-full relative transition-colors ${activeSkills.theft ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${activeSkills.theft ? 'left-4.5' : 'left-0.5'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Results */}
                        {result && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Summary Score */}
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Kitchen Health Score</p>
                                    <div className="flex items-end gap-2">
                                        <span className={`text-4xl font-black ${result.performance_scores.kitchen_efficiency > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {result.performance_scores.kitchen_efficiency}
                                        </span>
                                        <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {result.summary_report}
                                    </div>
                                </div>

                                {/* Active Staff */}
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                                        <Users size={12}/> Detected Staff
                                    </h4>
                                    <div className="space-y-2">
                                        {result.staff_tracking.map(staff => (
                                            <div key={staff.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${staff.uniform_compliant ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {staff.role.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white">{staff.role}</p>
                                                        <p className="text-[10px] text-slate-500">{staff.action}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-bold ${staff.efficiency_score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {staff.efficiency_score}% Eff
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Alerts */}
                                {result.sop_deviations.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-bold text-red-500 uppercase mb-3 flex items-center gap-1">
                                            <ShieldAlert size={12}/> Critical Alerts
                                        </h4>
                                        <div className="space-y-2">
                                            {result.sop_deviations.map((dev, i) => (
                                                <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                                                    <p className="text-xs font-bold text-red-700 dark:text-red-400">{dev.deviation_type}</p>
                                                    <p className="text-[10px] text-red-600 dark:text-red-300 mt-1">{dev.explanation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!result && !isAnalyzing && !error && (
                            <div className="text-center py-10 text-slate-400">
                                <Info size={32} className="mx-auto mb-2 opacity-50"/>
                                <p className="text-xs">Run analysis to see live metrics.</p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
