
import React, { useState, useRef, useEffect } from 'react';
import { User, PlanType, MarketingRequest, UserRole } from '../types';
import { Clapperboard, Upload, Play, Loader2, Sparkles, CheckCircle2, Film, AlertCircle, Key, Info, Plus, Trash2, Clock3, UserCheck, Download, Image as ImageIcon, Grid, Maximize2, Youtube, ExternalLink, Wand2 } from 'lucide-react';
import { generateMarketingVideo, generateMarketingImage } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface VideoStudioProps {
  user: User;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');
  const [prompt, setPrompt] = useState('');
  
  // Image Request State
  const [images, setImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  
  // New: YouTube Reference URL
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // View Modes: 'generator' (for fulfilling) | 'request-form' | 'requests' | 'my-requests'
  const [viewMode, setViewMode] = useState<'generator' | 'request-form' | 'requests' | 'my-requests'>('request-form');
  
  // Admin/Queue State
  const [adminQueue, setAdminQueue] = useState<MarketingRequest[]>([]);
  const [myRequests, setMyRequests] = useState<MarketingRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<MarketingRequest | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);

  useEffect(() => {
      refreshRequests();
      // Default View logic
      if (isAdmin) {
          setViewMode('requests');
      } else {
          setViewMode('request-form');
      }
  }, [user.id, user.role]);

  const refreshRequests = () => {
      const all = storageService.getAllMarketingRequests();
      setAdminQueue(all.filter(r => r.status === 'pending'));
      setMyRequests(all.filter(r => r.userId === user.id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files);
          
          // Limit to 3 images total if using multiple
          if (images.length + files.length > 3) {
              setError("Maximum 3 images allowed for reference.");
              return;
          }

          files.forEach((file: File) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  const base64Data = result.split(',')[1];
                  setImages(prev => [...prev, base64Data]);
              };
              reader.readAsDataURL(file);
          });
          // Reset input
          e.target.value = '';
      }
  };

  const removeImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 1. Submit Request (User)
  const handleSubmitRequest = async () => {
      if (!prompt.trim()) {
          setError("Please describe the content you want.");
          return;
      }
      
      if (activeTab === 'video' && images.length === 0 && !youtubeUrl) {
          setError("Please upload a source image or provide a YouTube URL for context.");
          return;
      }

      const newReq: MarketingRequest = {
          id: `mkt_req_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          type: activeTab,
          prompt: prompt,
          images: images,
          youtubeUrl: youtubeUrl,
          aspectRatio: aspectRatio as any,
          status: 'pending',
          requestDate: new Date().toISOString()
      };

      storageService.saveMarketingRequest(newReq);
      refreshRequests();
      setImages([]);
      setYoutubeUrl('');
      setPrompt('');
      alert(`${activeTab === 'video' ? 'Video' : 'Image'} Request Submitted! Admin will process it.`);
      setViewMode('my-requests');
  };

  // 2. Fulfill Request (Admin)
  const handleFulfillRequest = (req: MarketingRequest) => {
      setActiveRequest(req);
      setActiveTab(req.type);
      setImages(req.images || []);
      setYoutubeUrl(req.youtubeUrl || '');
      setPrompt(req.prompt);
      setAspectRatio(req.aspectRatio);
      setViewMode('generator');
      setError(null);
      setOutputUrl(null);
  };

  // 3. Generate Content (Admin in Generator Mode)
  const handleGenerate = async () => {
      // Check for API Key Selection (Required for both Veo and Imagen 3)
      try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
              setLoading(true);
              setLoadingState("Waiting for API Key selection...");
              await (window as any).aistudio.openSelectKey();
          }
      } catch (e) {
          console.warn("AI Studio key check skipped or failed", e);
      }

      setLoading(true);
      setError(null);
      setOutputUrl(null);
      setProgress(0);
      setLoadingState(`Initializing ${activeTab === 'video' ? 'Veo' : 'Imagen'} Model...`);

      // Progress Timer
      const progressTimer = setInterval(() => {
          setProgress(old => {
              if (old >= 95) return 95;
              // Slow down progress as it gets higher
              const increment = old < 50 ? 5 : old < 80 ? 2 : 0.5;
              return old + (Math.random() * increment);
          });
      }, 500);

      try {
          if (activeTab === 'video') {
              if (images.length === 0 && !prompt) throw new Error("Source images or prompt required.");
              
              // Progress simulation for text
              const progressInterval = setInterval(() => {
                  setLoadingState(prev => {
                      if (prev.includes("Initializing")) return "Analyzing Image Structure...";
                      if (prev.includes("Analyzing")) return "Generating frames...";
                      if (prev.includes("Generating")) return "Rendering video...";
                      return prev;
                  });
              }, 4000);

              const url = await generateMarketingVideo(images, prompt, aspectRatio as '16:9' | '9:16');
              clearInterval(progressInterval);
              setOutputUrl(url);
          } else {
              // Image Generation
              setLoadingState("Generating high-quality image...");
              const url = await generateMarketingImage(prompt, aspectRatio);
              setOutputUrl(url);
          }
          setProgress(100);
      } catch (err: any) {
          setError(err.message || "Generation failed.");
          setProgress(0);
      } finally {
          clearInterval(progressTimer);
          setLoading(false);
          setLoadingState('');
      }
  };

  // Generate Promo Video Handler
  const handleGeneratePromo = async () => {
      // Check for API Key Selection
      try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
              setLoading(true);
              setLoadingState("Waiting for API Key selection...");
              await (window as any).aistudio.openSelectKey();
          }
      } catch (e) {
          console.warn("AI Studio key check skipped or failed", e);
      }

      setActiveTab('video');
      setAspectRatio('9:16');
      const promoPrompt = "A futuristic montage of a professional kitchen. Shows a chef using a digital tablet to check recipe costs, then a shot of a digital checklist being completed for SOPs, followed by a business analytics dashboard with growing revenue charts. Cinematic lighting, high tech, professional style.";
      setPrompt(promoPrompt);
      setImages([]); // Clear images for text-to-video
      
      setLoading(true);
      setError(null);
      setOutputUrl(null);
      setProgress(0);
      setLoadingState("Initializing Veo for Promo Generation...");

      const progressTimer = setInterval(() => {
          setProgress(old => {
              if (old >= 95) return 95;
              return old + (Math.random() * 2);
          });
      }, 800);

      try {
           // Direct Service Call Logic for Text-to-Video (Promo)
           // Workaround: Create a simple placeholder image on the fly
           const canvas = document.createElement('canvas');
           canvas.width = 10; canvas.height = 10;
           const ctx = canvas.getContext('2d');
           if (ctx) {
               ctx.fillStyle = '#000'; 
               ctx.fillRect(0,0,10,10);
           }
           const dummyImage = canvas.toDataURL().split(',')[1];
           
           const url = await generateMarketingVideo([dummyImage], promoPrompt, '9:16');
           setOutputUrl(url);
           setProgress(100);

      } catch (err: any) {
          setError(err.message || "Promo generation failed.");
      } finally {
          clearInterval(progressTimer);
          setLoading(false);
          setLoadingState('');
      }
  };

  // 4. Save/Complete Request (Admin)
  const handleCompleteRequest = () => {
      if (!activeRequest) return;
      if (!outputUrl) return;

      // Update request status
      const completedReq: MarketingRequest = {
          ...activeRequest,
          status: 'completed',
          completedDate: new Date().toISOString(),
          outputUrl: outputUrl // In real app, upload to cloud. Here logic persists locally.
      };
      storageService.updateMarketingRequest(completedReq);
      
      refreshRequests();
      alert(`Request for ${activeRequest.userName} marked as completed.`);
      setActiveRequest(null);
      setOutputUrl(null);
      setImages([]);
      setYoutubeUrl('');
      setPrompt('');
      setViewMode('requests');
  };

  const openKeyDialog = async () => {
      try {
          await (window as any).aistudio.openSelectKey();
      } catch (e) {
          alert("Could not open key selection dialog.");
      }
  };

  if (user.plan === PlanType.FREE && !user.isTrial) {
      return (
          <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center text-center p-8">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
                  <Clapperboard size={48} className="text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Marketing Studio Locked</h2>
              <p className="text-slate-500 max-w-md mt-2">AI Video generation requires high-performance compute. Upgrade to Pro to access Veo video generation.</p>
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Top Bar */}
      <div className="flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Clapperboard className="text-pink-500" /> Marketing Studio
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Create cinematic videos with Veo or high-quality images with Gemini.</p>
          </div>
          
          <div className="flex gap-3">
              {isAdmin && (
                  <button 
                    onClick={() => setViewMode('requests')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'requests' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                      Request Queue {adminQueue.length > 0 && `(${adminQueue.length})`}
                  </button>
              )}
              
              {!isAdmin && (
                  <>
                    <button 
                        onClick={() => {
                            setViewMode('request-form');
                            // Reset Form State
                            setPrompt('');
                            setImages([]);
                            setYoutubeUrl('');
                            setAspectRatio('16:9');
                            setActiveRequest(null);
                            setError(null);
                            setOutputUrl(null);
                            setActiveTab('video');
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'request-form' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        New Request
                    </button>
                    <button 
                        onClick={() => setViewMode('my-requests')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'my-requests' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        My Requests
                    </button>
                  </>
              )}

              <button 
                onClick={openKeyDialog}
                className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                  <Key size={12} /> API Key
              </button>
          </div>
      </div>

      {/* --- QUEUE VIEWS --- */}
      {(viewMode === 'requests' || viewMode === 'my-requests') && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-fade-in">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">
                  {viewMode === 'requests' ? 'Pending Customer Requests' : 'My Marketing Requests'}
              </h3>
              
              <div className="space-y-3">
                  {(viewMode === 'requests' ? adminQueue : myRequests).length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No requests found.</p>
                  ) : (
                      (viewMode === 'requests' ? adminQueue : myRequests).map((req) => (
                          <div key={req.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-start gap-4">
                                  {/* Icon Type */}
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${req.type === 'video' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                      {req.type === 'video' ? <Film size={20} /> : <ImageIcon size={20} />}
                                  </div>
                                  
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-800 dark:text-white text-sm">{req.userName}</span>
                                          <span className="text-xs text-slate-400">• {new Date(req.requestDate).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">{req.prompt}</p>
                                      
                                      <div className="flex items-center gap-3 mt-1">
                                          <p className="text-[10px] text-slate-400 uppercase">{req.type} • {req.aspectRatio}</p>
                                          {req.youtubeUrl && (
                                              <a href={req.youtubeUrl} target="_blank" rel="noreferrer" className="text-[10px] text-red-500 flex items-center gap-1 hover:underline">
                                                  <Youtube size={10} /> Ref Video
                                              </a>
                                          )}
                                      </div>
                                  </div>
                              </div>

                              <div>
                                  {req.status === 'completed' ? (
                                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1">
                                          <CheckCircle2 size={12} /> Completed
                                      </span>
                                  ) : isAdmin && viewMode === 'requests' ? (
                                      <button 
                                        onClick={() => handleFulfillRequest(req)}
                                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-pink-600 transition-colors flex items-center gap-2"
                                      >
                                          <Sparkles size={14} /> Generate
                                      </button>
                                  ) : (
                                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1">
                                          <Clock3 size={12} /> Pending
                                      </span>
                                  )}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* --- GENERATOR / FORM VIEW --- */}
      {(viewMode === 'generator' || viewMode === 'request-form') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* Left Column: Inputs */}
            <div className="lg:col-span-1 space-y-6">
                
                {activeRequest && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800 font-medium flex items-center gap-2">
                        <UserCheck size={16} /> Fulfilling request for: {activeRequest.userName}
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                    
                    {/* Instant Promo Button */}
                    {!activeRequest && (
                        <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} /> Instant Promo</h3>
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">9:16</span>
                            </div>
                            <p className="text-xs text-white/80 mb-3">Generate a showcase video for BistroIntelligence features.</p>
                            <button 
                                onClick={handleGeneratePromo}
                                disabled={loading}
                                className="w-full py-2 bg-white text-pink-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading && prompt.includes("futuristic montage") ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                                Auto-Generate Promo
                            </button>
                        </div>
                    )}

                    {/* Type Switcher (Only if not fulfilling) */}
                    {!activeRequest && (
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('video')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'video' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                <Film size={14} /> Video
                            </button>
                            <button 
                                onClick={() => setActiveTab('image')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                <ImageIcon size={14} /> Image
                            </button>
                        </div>
                    )}

                    {/* Image Upload (Video Mode Only) */}
                    {activeTab === 'video' && (
                        <div>
                            <label className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                                <span>Source Images (Max 3)</span>
                                <span className="text-slate-400">{images.length}/3</span>
                            </label>
                            
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover" alt="" />
                                        {!activeRequest && (
                                            <button 
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {!activeRequest && images.length < 3 && (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-pink-400 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-pink-500"
                                    >
                                        <Plus size={20} />
                                        <span className="text-[10px] font-bold mt-1">Add</span>
                                    </div>
                                )}
                            </div>
                            
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

                    {/* YouTube Reference Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            Reference Video (YouTube URL)
                        </label>
                        <div className="relative">
                            <Youtube className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                readOnly={!!activeRequest} // Admins can copy, but usually read-only context if fulfilling exact request. Or editable if Admin is adjusting. Let's keep it editable but initialized.
                                className={`w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white ${activeRequest ? 'opacity-80' : ''}`}
                            />
                            {youtubeUrl && (
                                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="absolute right-3 top-2.5 text-slate-400 hover:text-pink-500">
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            {activeTab === 'video' ? 'Motion Description' : 'Image Prompt'}
                        </label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={activeTab === 'video' ? "E.g. Camera pans slowly around the burger..." : "E.g. High resolution photo of a gourmet avocado toast on a wooden table..."}
                            className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none h-24"
                        />
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                            Format
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => {
                                // Only allow specific ratios for Video if needed, Veo supports 16:9/9:16 mainly
                                const disabled = activeTab === 'video' && !['16:9', '9:16'].includes(ratio);
                                
                                return (
                                    <button 
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio)}
                                        disabled={disabled}
                                        className={`py-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                                            aspectRatio === ratio 
                                            ? 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' 
                                            : disabled
                                                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-pink-200'
                                        }`}
                                    >
                                        {ratio}
                                    </button>
                                );
                            })}
                        </div>
                        {activeTab === 'video' && images.length > 1 && (
                            <p className="text-[10px] text-slate-400 mt-2">
                                Note: Multiple reference images force 16:9 aspect ratio.
                            </p>
                        )}
                    </div>

                    {activeRequest ? (
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {loading ? 'Generating...' : 'Generate for User'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmitRequest}
                            disabled={loading}
                            className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Upload size={20} /> Submit Request
                        </button>
                    )}
                </div>
            </div>

            {/* Right Column: Preview / Result */}
            <div className="lg:col-span-2">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 h-[500px] flex items-center justify-center relative overflow-hidden shadow-2xl">
                    
                    {loading ? (
                         <div className="absolute inset-0 z-20 bg-slate-900/90 flex flex-col items-center justify-center p-8">
                            {/* Animated Icon */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-pink-500 blur-xl opacity-20 animate-pulse"></div>
                                <div className="relative w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-2xl">
                                    {activeTab === 'video' ? (
                                        <Film className="text-pink-500 animate-bounce" size={40} />
                                    ) : (
                                        <ImageIcon className="text-pink-500 animate-pulse" size={40} />
                                    )}
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2">Creating Magic</h3>
                            <p className="text-slate-400 text-sm mb-8 animate-pulse">{loadingState}</p>

                            {/* Progress Bar */}
                            <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-pink-600 to-purple-600 transition-all duration-300 ease-out"
                                    style={{ width: `${Math.round(progress)}%` }}
                                >
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 font-mono text-center w-full">{Math.round(progress)}% Complete</p>
                        </div>
                    ) : outputUrl ? (
                        <div className="w-full h-full flex flex-col bg-black">
                            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                                {activeTab === 'video' ? (
                                    <video 
                                        src={outputUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <img 
                                        src={outputUrl} 
                                        alt="Generated" 
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                
                                {/* Preview Label */}
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-white/10">
                                    <Maximize2 size={12} /> Preview Mode
                                </div>
                            </div>

                            {activeRequest && (
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-20 px-4">
                                    <a 
                                        href={outputUrl} 
                                        download={`${activeTab}-${activeRequest.id}.${activeTab === 'video' ? 'mp4' : 'png'}`}
                                        className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md text-white font-bold rounded-xl border border-white/10 text-sm transition-colors flex items-center gap-2"
                                    >
                                        <Download size={16} /> Download
                                    </a>
                                    <button 
                                        onClick={handleCompleteRequest}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg text-sm transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={16} /> Approve & Mark Completed
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-600 max-w-sm px-6">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Play size={32} className="ml-2 opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-500 mb-2">
                                {activeRequest ? 'Ready to Generate' : 'Request Mode'}
                            </h3>
                            <p className="text-sm">
                                {activeRequest 
                                ? 'Review inputs on the left and click Generate to fulfill this request.' 
                                : 'Upload assets, add a reference URL, and describe the vision to submit a request.'}
                            </p>
                        </div>
                    )}

                    {/* Grid overlay effect */}
                    {!outputUrl && !loading && (
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
