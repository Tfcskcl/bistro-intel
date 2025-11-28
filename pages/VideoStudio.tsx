import React, { useState, useRef, useEffect } from 'react';
import { User, MarketingRequest } from '../types';
import { generateMarketingImage, generateMarketingVideo } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { Loader2, Image as ImageIcon, Video, Trash2, Plus, Download, Wallet, Sparkles, AlertCircle, History, LayoutTemplate } from 'lucide-react';

interface VideoStudioProps {
    user: User;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
    const [viewMode, setViewMode] = useState<'create' | 'gallery'>('create');
    
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
    const [images, setImages] = useState<string[]>([]); // Base64 strings without prefix
    const [displayImages, setDisplayImages] = useState<string[]>([]); // Data URLs for display
    
    const [generating, setGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [requests, setRequests] = useState<MarketingRequest[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load history
        const all = storageService.getAllMarketingRequests();
        // Filter for current user and sort by date desc
        setRequests(all.filter(r => r.userId === user.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
    }, [user.id]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setDisplayImages(prev => [...prev, result].slice(0, 3));
                    // Extract base64 part
                    const base64Data = result.split(',')[1];
                    setImages(prev => [...prev, base64Data].slice(0, 3));
                };
                reader.readAsDataURL(file);
            });
        }
        // Reset input
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setDisplayImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!prompt) {
            setError("Please enter a prompt describing what you want to generate.");
            return;
        }

        const cost = activeTab === 'video' ? CREDIT_COSTS.VIDEO : CREDIT_COSTS.IMAGE;
        if (user.credits < cost) {
            setError(`Insufficient credits. Need ${cost} CR, you have ${user.credits} CR.`);
            return;
        }

        setError(null);
        setGenerating(true);
        setGeneratedContent(null);

        try {
            let resultUrl = '';
            
            if (activeTab === 'video') {
                // Veo requires user-selected API key via aistudio interface
                const aistudio = (window as any).aistudio;
                if (aistudio && aistudio.hasSelectedApiKey) {
                    const hasKey = await aistudio.hasSelectedApiKey();
                    if (!hasKey && aistudio.openSelectKey) {
                        await aistudio.openSelectKey();
                    }
                }
                
                resultUrl = await generateMarketingVideo(images, prompt, aspectRatio as any);
            } else {
                resultUrl = await generateMarketingImage(prompt, aspectRatio);
            }

            setGeneratedContent(resultUrl);
            storageService.deductCredits(user.id, cost, `${activeTab === 'video' ? 'Video' : 'Image'} Generation`);
            
            const req: MarketingRequest = {
                id: Date.now().toString(),
                userId: user.id,
                userName: user.name,
                type: activeTab,
                prompt,
                images,
                aspectRatio,
                status: 'completed',
                requestDate: new Date().toISOString(),
                completedDate: new Date().toISOString(),
                outputUrl: resultUrl
            };
            storageService.saveMarketingRequest(req);
            setRequests(prev => [req, ...prev]);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Generation failed. Please try again.");
            
            // Handle Veo specific key error retry
            if (err.message && err.message.includes("Requested entity was not found") && activeTab === 'video') {
                 const aistudio = (window as any).aistudio;
                 if (aistudio && aistudio.openSelectKey) {
                     await aistudio.openSelectKey();
                 }
            }
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewMode('create')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'create' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Sparkles size={16} /> Studio
                    </button>
                    <button 
                        onClick={() => setViewMode('gallery')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'gallery' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        <History size={16} /> History ({requests.length})
                    </button>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
                    <Wallet size={12} fill="currentColor" />
                    Credits: {user.credits}
                </div>
            </div>

            {viewMode === 'create' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                    {/* Controls */}
                    <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            {activeTab === 'image' ? <ImageIcon className="text-pink-500" /> : <Video className="text-blue-500" />}
                            Creative Studio
                        </h2>

                        {/* Mode Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                            <button 
                                onClick={() => setActiveTab('image')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ImageIcon size={16} /> Image
                            </button>
                            <button 
                                onClick={() => setActiveTab('video')}
                                className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'video' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Video size={16} /> Video
                            </button>
                        </div>

                        {/* Prompt */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prompt</label>
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={activeTab === 'image' ? "A hyper-realistic photo of a gourmet burger..." : "A cinematic slow-motion shot of coffee pouring..."}
                                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none text-sm"
                                />
                            </div>

                            {/* Aspect Ratio */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aspect Ratio</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: '16:9', icon: <LayoutTemplate size={16} className="rotate-90" />, label: 'Landscape' },
                                        { id: '9:16', icon: <LayoutTemplate size={16} />, label: 'Portrait' },
                                        { id: '1:1', icon: <LayoutTemplate size={16} />, label: 'Square' }
                                    ].map((ratio) => (
                                        <button
                                            key={ratio.id}
                                            onClick={() => setAspectRatio(ratio.id as any)}
                                            className={`flex-1 py-2 px-3 border rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${aspectRatio === ratio.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {ratio.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reference Images (Video Only) */}
                            {activeTab === 'video' && (
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                                        <span>Reference Images (Max 3)</span>
                                        <span className="text-slate-400">{images.length}/3</span>
                                    </label>
                                    
                                    <div className="space-y-2 mb-3">
                                        {displayImages.map((img, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-md overflow-hidden bg-white border border-slate-200">
                                                        <img src={img} className="w-full h-full object-cover" alt="ref" />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">Ref {idx + 1}</span>
                                                </div>
                                                <button onClick={() => removeImage(idx)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {images.length < 3 && (
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-slate-500 hover:text-emerald-600"
                                        >
                                            <Plus size={16} />
                                            <span className="text-xs font-bold">Upload Image</span>
                                        </button>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*" 
                                        multiple
                                        className="hidden" 
                                    />
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={generating || !prompt}
                                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} fill="currentColor" />}
                                    {generating ? 'Generating Magic...' : `Generate (${activeTab === 'video' ? CREDIT_COSTS.VIDEO : CREDIT_COSTS.IMAGE} CR)`}
                                </button>
                                {error && (
                                    <div className="mt-3 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
                        
                        {generating ? (
                            <div className="text-center">
                                <div className="relative w-24 h-24 mx-auto mb-6">
                                    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Sparkles className="absolute inset-0 m-auto text-emerald-400 animate-pulse" size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Creating your masterpiece</h3>
                                <p className="text-slate-400 text-sm">This may take {activeTab === 'video' ? 'a few minutes' : 'a few seconds'}...</p>
                            </div>
                        ) : generatedContent ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
                                {activeTab === 'image' ? (
                                    <img src={generatedContent} alt="Generated" className="max-h-[80%] max-w-full rounded-lg shadow-2xl border border-slate-700" />
                                ) : (
                                    <video src={generatedContent} controls autoPlay loop className="max-h-[80%] max-w-full rounded-lg shadow-2xl border border-slate-700" />
                                )}
                                
                                <div className="mt-6 flex gap-4">
                                    <a 
                                        href={generatedContent} 
                                        download={`bistro_generated_${Date.now()}.${activeTab === 'image' ? 'png' : 'mp4'}`}
                                        className="px-6 py-2 bg-white text-slate-900 font-bold rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-2"
                                    >
                                        <Download size={18} /> Download
                                    </a>
                                    <button 
                                        onClick={() => setGeneratedContent(null)}
                                        className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
                                    >
                                        Create New
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-600">
                                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                    {activeTab === 'image' ? <ImageIcon size={40} /> : <Video size={40} />}
                                </div>
                                <p className="text-lg font-medium">Ready to Create</p>
                                <p className="text-sm">Configure your prompt on the left to start.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'gallery' && (
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Creation History</h2>
                    {requests.length === 0 ? (
                        <p className="text-slate-500 text-center py-12">No history found.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {requests.map((req) => (
                                <div key={req.id} className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all">
                                    {req.outputUrl ? (
                                        req.type === 'image' ? (
                                            <img src={req.outputUrl} alt="Generated" className="w-full aspect-square object-cover" />
                                        ) : (
                                            <video src={req.outputUrl} className="w-full aspect-square object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full aspect-square flex items-center justify-center bg-slate-100 text-slate-400 text-xs">Processing...</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                        <p className="text-white text-xs font-medium line-clamp-2 mb-2">{req.prompt}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-300 uppercase font-bold">{req.type}</span>
                                            {req.outputUrl && (
                                                <a 
                                                    href={req.outputUrl} 
                                                    download 
                                                    className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-emerald-400 transition-colors"
                                                >
                                                    <Download size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono">
                                        {req.aspectRatio}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};