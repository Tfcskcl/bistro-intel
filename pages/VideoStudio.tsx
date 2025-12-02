
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, MarketingRequest } from '../types';
import { generateMarketingVideo, generateMarketingImage, hasValidApiKey } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { Clapperboard, Image as ImageIcon, Loader2, PlayCircle, Download, RefreshCw, Upload, CheckCircle2, Clock, Wallet, Sparkles, Key } from 'lucide-react';

interface VideoStudioProps {
  user: User;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ user }) => {
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
  const [viewMode, setViewMode] = useState<'create' | 'gallery' | 'requests'>('create');
  
  // Create State
  const [prompt, setPrompt] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasVeoKey, setHasVeoKey] = useState(false);

  // Gallery
  const [gallery, setGallery] = useState<MarketingRequest[]>([]);

  // Requests (Admin)
  const [requests, setRequests] = useState<MarketingRequest[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Determine the correct key/data structure for gallery based on how we want to store it.
    // For now we'll fetch global marketing requests filtered by user ID as "Gallery".
    const allRequests = storageService.getAllMarketingRequests();
    setGallery(allRequests.filter(r => r.userId === user.id && r.status === 'completed'));
    
    if (isAdmin) {
      setRequests(allRequests.filter(r => r.status === 'pending'));
    }
    
    // Check initial key status
    if (hasValidApiKey()) setHasVeoKey(true);
  }, [user.id, isAdmin, viewMode]);

  // Check for Veo API Key status
  useEffect(() => {
    let interval: any;
    
    const checkVeoKey = async () => {
        if (hasValidApiKey()) {
            setHasVeoKey(true);
            if (error && error.includes('API key')) setError(null);
            return;
        }

        if (mediaType === 'video' && (window as any).aistudio) {
            try {
                const has = await (window as any).aistudio.hasSelectedApiKey();
                setHasVeoKey(has);
                if (has) setError(null);
            } catch (e) {
                console.error("Error checking Veo key:", e);
            }
        }
    };
    
    checkVeoKey();
    
    // Poll frequently if key is missing to catch updates from other tabs or delayed initialization
    if (!hasVeoKey && mediaType === 'video') {
        interval = setInterval(checkVeoKey, 2000);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [mediaType, hasVeoKey]);

  const handleSelectVeoKey = async () => {
      if ((window as any).aistudio) {
          try {
            await (window as any).aistudio.openSelectKey();
            // Optimistic update per guidelines
            setHasVeoKey(true);
            setError(null);
          } catch (e) {
            console.error("Error selecting key:", e);
            // Revert if explicitly failed, but usually openSelectKey doesn't throw on close
          }
      } else {
          // Manual Fallback
          const key = window.prompt("Enter your Google Cloud API Key (from https://aistudio.google.com):");
          if (key && key.trim()) {
              localStorage.setItem('gemini_api_key', key.trim());
              setHasVeoKey(true);
              setError(null);
              alert("API Key saved locally!");
          }
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Store base64 data without prefix for API, but with prefix for display?
          // The API likely expects raw bytes or base64. Let's assume the service handles data URLs or we strip them.
          // Services often want base64 data part only.
          const base64Data = reader.result.split(',')[1];
          setUploadedImages([base64Data]); 
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    // Check Credits
    const cost = mediaType === 'video' ? CREDIT_COSTS.VIDEO : CREDIT_COSTS.IMAGE;
    if (user.credits < cost) {
      setError(`Insufficient credits. Required: ${cost}, Available: ${user.credits}`);
      return;
    }

    // Check API Key for Veo
    if (mediaType === 'video' && !hasVeoKey) {
       setError("Video generation requires a paid Google Cloud API Key. Please select one to proceed.");
       return;
    }

    setIsGenerating(true);
    setError(null);
    setResultUrl(null);

    try {
      // Deduct Credits
      const success = storageService.deductCredits(user.id, cost, `${mediaType === 'video' ? 'Video' : 'Image'} Generation`);
      if (!success) throw new Error("Credit deduction failed");

      let url = '';
      if (mediaType === 'video') {
        url = await generateMarketingVideo(uploadedImages, prompt, aspectRatio);
      } else {
        url = await generateMarketingImage(prompt, aspectRatio);
      }

      setResultUrl(url);

      // Save to history
      const req: MarketingRequest = {
        id: `mkt_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        type: mediaType,
        prompt,
        aspectRatio,
        status: 'completed',
        requestDate: new Date().toISOString(),
        completedDate: new Date().toISOString(),
        outputUrl: url
      };
      storageService.saveMarketingRequest(req);

    } catch (err: any) {
      setError(err.message || "Generation failed");
      // If error suggests API key issue, reset state
      if (err.message && (err.message.includes('API key') || err.message.includes('403') || err.message.includes('401'))) {
          setHasVeoKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFulfillRequest = async (req: MarketingRequest) => {
      // Admin manual trigger if needed, though mostly automated
      alert("This is a placeholder for admin manual fulfillment.");
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
           <button 
             onClick={() => setViewMode('create')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
             Studio
           </button>
           <button 
             onClick={() => setViewMode('gallery')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'gallery' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
           >
             My Gallery
           </button>
           {isAdmin && (
             <button 
               onClick={() => setViewMode('requests')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${viewMode === 'requests' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
             >
               Queue
             </button>
           )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
            <Wallet size={12} fill="currentColor" />
            Credits: {user.credits}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
        {viewMode === 'create' && (
          <div className="flex h-full">
            <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/50 overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <Clapperboard className="text-pink-600 dark:text-pink-400" /> Content Creator
              </h3>
              
              <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Media Type</label>
                    <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                       <button 
                         onClick={() => setMediaType('video')}
                         className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${mediaType === 'video' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                       >
                         <PlayCircle size={16} /> Video ({CREDIT_COSTS.VIDEO} CR)
                       </button>
                       <button 
                         onClick={() => setMediaType('image')}
                         className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${mediaType === 'image' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                       >
                         <ImageIcon size={16} /> Image ({CREDIT_COSTS.IMAGE} CR)
                       </button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Prompt</label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the scene (e.g. Cinematic slow motion shot of steam rising from a hot cup of coffee...)"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Aspect Ratio</label>
                    <div className="flex gap-2">
                       {['16:9', '9:16', '1:1'].map(r => (
                          <button 
                            key={r}
                            onClick={() => setAspectRatio(r as any)}
                            className={`px-3 py-2 rounded-lg border text-xs font-bold ${aspectRatio === r ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-500 text-pink-700 dark:text-pink-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                          >
                            {r}
                          </button>
                       ))}
                    </div>
                 </div>

                 {mediaType === 'video' && (
                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Reference Image (Optional)</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-pink-400 transition-colors"
                      >
                         {uploadedImages.length > 0 ? (
                           <div className="text-center">
                             <CheckCircle2 className="text-emerald-500 mx-auto mb-2" />
                             <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Image Uploaded</p>
                             <button onClick={(e) => { e.stopPropagation(); setUploadedImages([]); }} className="text-[10px] text-red-500 underline mt-1">Remove</button>
                           </div>
                         ) : (
                           <>
                             <Upload className="text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500 dark:text-slate-400">Upload starting frame</p>
                           </>
                         )}
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                   </div>
                 )}
                 
                 {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                       <div className="shrink-0"><Key size={14}/></div>
                       <div>{error}</div>
                    </div>
                 )}

                 {mediaType === 'video' && !hasVeoKey ? (
                     <div className="space-y-3 mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-2">
                            <Key size={16} className="text-slate-500 dark:text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">API Key Required</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                    Video generation uses Veo models which require a paid Google Cloud API key.
                                </p>
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 underline mt-1 block">
                                    View Billing Documentation
                                </a>
                            </div>
                        </div>
                        <button 
                          onClick={handleSelectVeoKey}
                          className="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                        >
                          Select / Enter API Key
                        </button>
                     </div>
                 ) : (
                     <button 
                       onClick={handleGenerate}
                       disabled={isGenerating || !prompt}
                       className="w-full py-3 bg-slate-900 dark:bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                       Generate Asset
                     </button>
                 )}
              </div>
            </div>

            <div className="flex-1 bg-slate-900 flex items-center justify-center p-8 relative overflow-hidden">
               {/* Background pattern */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

               {isGenerating ? (
                 <div className="text-center text-white z-10">
                    <Loader2 size={48} className="animate-spin mx-auto mb-4 text-pink-500" />
                    <h3 className="text-2xl font-bold">Creating Magic...</h3>
                    <p className="text-slate-400 mt-2">This may take a minute. AI is rendering your {mediaType}.</p>
                 </div>
               ) : resultUrl ? (
                 <div className="z-10 max-w-full max-h-full flex flex-col items-center gap-4">
                    {mediaType === 'video' ? (
                      <video controls src={resultUrl} className="max-h-[70vh] rounded-xl shadow-2xl border border-slate-700" autoPlay loop />
                    ) : (
                      <img src={resultUrl} alt="Generated" className="max-h-[70vh] rounded-xl shadow-2xl border border-slate-700" />
                    )}
                    <a href={resultUrl} download={`bistro_gen_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'png'}`} className="px-6 py-2 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-200 flex items-center gap-2">
                       <Download size={18} /> Download
                    </a>
                 </div>
               ) : (
                 <div className="text-center text-slate-600 z-10">
                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Clapperboard size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-500">Preview Stage</h3>
                    <p className="text-sm text-slate-700">Generated content will appear here.</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {viewMode === 'gallery' && (
           <div className="p-6 h-full overflow-y-auto bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Your Creations</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {gallery.map(item => (
                    <div key={item.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square">
                       {item.type === 'video' ? (
                          <video src={item.outputUrl} className="w-full h-full object-cover" />
                       ) : (
                          <img src={item.outputUrl} alt={item.prompt} className="w-full h-full object-cover" />
                       )}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="text-white text-xs line-clamp-2 mb-2">{item.prompt}</p>
                          <a href={item.outputUrl} download className="p-2 bg-white/20 hover:bg-white/40 rounded text-white self-start">
                             <Download size={16} />
                          </a>
                       </div>
                    </div>
                 ))}
                 {gallery.length === 0 && <p className="text-slate-400 dark:text-slate-500 col-span-full text-center py-12">No assets generated yet.</p>}
              </div>
           </div>
        )}

        {viewMode === 'requests' && isAdmin && (
           <div className="p-6 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Request Queue</h3>
              {requests.map(req => (
                  <div key={req.id} className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg mb-2">
                      <div>
                          <p className="font-bold text-slate-800 dark:text-white">{req.prompt}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{req.userName} • {req.type}</p>
                      </div>
                      <div>
                          {req.status === 'completed' ? (
                              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Completed
                              </span>
                          ) : (
                              <button 
                                onClick={() => handleFulfillRequest(req)}
                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded hover:bg-pink-600 dark:hover:bg-pink-200 transition-colors flex items-center gap-2"
                              >
                                  <Sparkles size={14} /> Fulfill
                              </button>
                          )}
                      </div>
                  </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};
