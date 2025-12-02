
import React, { useState, useEffect } from 'react';
import { User, UserRole, MarketingRequest } from '../types';
import { generateMarketingVideo, generateMarketingImage, hasValidApiKey } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { Clapperboard, Image as ImageIcon, Loader2, PlayCircle, Download, RefreshCw, Upload, CheckCircle2, Clock, Wallet, Sparkles, Key, AlertCircle, History, Maximize2 } from 'lucide-react';

interface VideoStudioProps {
  user: User;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'create' | 'gallery'>('create');
  
  // Create State
  const [prompt, setPrompt] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  
  // Execution State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<MarketingRequest | null>(null);
  
  // History
  const [history, setHistory] = useState<MarketingRequest[]>([]);
  
  // API Key Status
  const [hasVeoKey, setHasVeoKey] = useState(() => hasValidApiKey());

  useEffect(() => {
      loadHistory();
      
      // Polling for key status
      const checkKey = async () => {
          if (hasValidApiKey()) {
              setHasVeoKey(true);
              if (error && (error.includes('API Key') || error.includes('entity was not found'))) setError(null);
              return;
          }
          if ((window as any).aistudio) {
              try {
                  const has = await (window as any).aistudio.hasSelectedApiKey();
                  setHasVeoKey(has);
                  if (has && error && (error.includes('API Key') || error.includes('entity was not found'))) setError(null);
              } catch(e) { console.error(e); }
          }
      };
      
      checkKey();
      const interval = setInterval(checkKey, 3000);
      return () => clearInterval(interval);
  }, [user.id, error]);

  const loadHistory = () => {
      const all = storageService.getAllMarketingRequests();
      // Filter by user and sort descending
      setHistory(all.filter(r => r.userId === user.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
  };

  const handleGenerate = async () => {
      if (!prompt) return;
      
      if (!hasVeoKey) {
          handleSelectKey();
          return;
      }
      
      const cost = mediaType === 'video' ? CREDIT_COSTS.VIDEO : CREDIT_COSTS.IMAGE;
      
      if (user.credits < cost) {
          setError(`Insufficient credits. Required: ${cost}, Balance: ${user.credits}`);
          return;
      }

      setIsGenerating(true);
      setError(null);
      setCurrentResult(null);

      try {
          // 1. Deduct Credits
          const success = storageService.deductCredits(user.id, cost, `${mediaType === 'video' ? 'Video' : 'Image'} Generation`);
          if (!success) {
              throw new Error("Credit deduction failed.");
          }

          // 2. Call AI Service
          let url = '';
          if (mediaType === 'video') {
              url = await generateMarketingVideo([], prompt, aspectRatio);
          } else {
              url = await generateMarketingImage(prompt, aspectRatio);
          }

          // 3. Save Request
          const newReq: MarketingRequest = {
              id: `mkt_${Date.now()}`,
              userId: user.id,
              userName: user.name,
              type: mediaType,
              prompt: prompt,
              aspectRatio: aspectRatio,
              status: 'completed',
              requestDate: new Date().toISOString(),
              outputUrl: url,
              completedDate: new Date().toISOString()
          };

          storageService.saveMarketingRequest(newReq);
          setCurrentResult(newReq);
          loadHistory();

      } catch (err: any) {
          console.error(err);
          // Handle specific Veo errors
          if (err.message && err.message.includes('entity was not found')) {
              setError("Access Denied. Please select a valid Project/API Key.");
              setHasVeoKey(false);
          } else {
              setError(err.message || "Generation failed. Please try again.");
          }
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSelectKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              // Optimistically set true, polling will correct if needed
              setHasVeoKey(true);
              setError(null);
          } catch (e) {
              console.error(e);
          }
      } else {
          // Fallback if not in AI Studio
          const key = prompt("Please enter your Google Gemini API Key:", "");
          if (key) {
              // Note: Ideally we don't use prompt, but this is a failsafe for the "Live Site" request
              // This part would typically be handled by env vars in prod
              console.log("Manual key entry not persisted in this demo mode.");
          }
      }
  };

  const downloadMedia = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('create')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'create' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <Sparkles size={16} /> Studio
            </button>
            <button 
                onClick={() => setViewMode('gallery')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${viewMode === 'gallery' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
                <History size={16} /> Gallery
            </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
            <Wallet size={12} fill="currentColor" />
            Credits: {user.credits}
        </div>
      </div>

      {viewMode === 'create' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
              
              {/* Controls */}
              <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto transition-colors">
                  <div className="mb-6">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Clapperboard size={24} className="text-pink-500" /> Marketing Studio
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create stunning visuals for Instagram, TikTok, and Ads using Generative AI.</p>
                  </div>

                  <div className="space-y-6">
                      {/* Media Type */}
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                          <button 
                              onClick={() => setMediaType('video')}
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mediaType === 'video' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                              <Clapperboard size={16} /> Video (Veo)
                          </button>
                          <button 
                              onClick={() => setMediaType('image')}
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mediaType === 'image' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                          >
                              <ImageIcon size={16} /> Image (Imagen)
                          </button>
                      </div>

                      {/* Aspect Ratio */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Aspect Ratio</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['16:9', '9:16', '1:1'].map((ratio) => (
                                  <button
                                      key={ratio}
                                      onClick={() => setAspectRatio(ratio as any)}
                                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                                          aspectRatio === ratio 
                                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                                      }`}
                                  >
                                      {ratio}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Prompt */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Prompt</label>
                          <textarea 
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder={`Describe your ${mediaType} in detail... e.g. "Cinematic slow motion shot of a burger with cheese dripping, neon lighting"`}
                              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none text-sm"
                          />
                      </div>

                      {error && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
                              <AlertCircle size={16} className="mt-0.5 shrink-0" />
                              <div className="flex-1">
                                  <p>{error}</p>
                                  {error.includes('Access Denied') && (
                                      <button onClick={handleSelectKey} className="text-xs underline font-bold mt-1">Re-authenticate</button>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* Generate Button */}
                      {!hasVeoKey ? (
                          <button 
                              onClick={handleSelectKey}
                              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                              <Key size={18} /> Connect API Key
                          </button>
                      ) : (
                          <button 
                              onClick={handleGenerate}
                              disabled={isGenerating || !prompt}
                              className="w-full py-3 bg-slate-900 dark:bg-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                              {isGenerating ? 'Generating...' : `Generate ${mediaType === 'video' ? 'Video' : 'Image'} (${mediaType === 'video' ? CREDIT_COSTS.VIDEO : CREDIT_COSTS.IMAGE} CR)`}
                          </button>
                      )}
                  </div>
              </div>

              {/* Preview Area */}
              <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden">
                  {isGenerating ? (
                      <div className="text-center text-slate-400">
                          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-emerald-500" />
                          <p className="text-lg font-bold text-white">Creating Magic...</p>
                          <p className="text-sm mt-2">{mediaType === 'video' ? 'Rendering video frames (this may take a minute)' : 'Synthesizing high-res image'}</p>
                      </div>
                  ) : currentResult ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                          {currentResult.type === 'video' ? (
                              <video 
                                  src={currentResult.outputUrl} 
                                  controls 
                                  autoPlay 
                                  loop 
                                  className="max-h-full max-w-full rounded-lg shadow-2xl"
                              />
                          ) : (
                              <img 
                                  src={currentResult.outputUrl} 
                                  alt={currentResult.prompt} 
                                  className="max-h-full max-w-full rounded-lg shadow-2xl object-contain"
                              />
                          )}
                          
                          <div className="absolute top-4 right-4 flex gap-2">
                              <button 
                                onClick={() => currentResult.outputUrl && downloadMedia(currentResult.outputUrl, `bistro-${currentResult.type}-${Date.now()}`)}
                                className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors"
                                title="Download"
                              >
                                  <Download size={20} />
                              </button>
                          </div>
                          
                          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-white text-sm font-medium line-clamp-2">{currentResult.prompt}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-slate-600">
                          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                              <PlayCircle size={40} className="opacity-50" />
                          </div>
                          <p className="text-lg font-medium">Ready to create</p>
                          <p className="text-sm mt-1 max-w-sm mx-auto">Use the controls on the left to generate professional marketing assets for your restaurant.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {viewMode === 'gallery' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto flex-1 transition-colors">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Your Gallery</h2>
              {history.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No media generated yet.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {history.map((item) => (
                          <div key={item.id} className="group relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700">
                              {item.type === 'video' ? (
                                  <video src={item.outputUrl} className="w-full h-full object-cover" />
                              ) : (
                                  <img src={item.outputUrl} alt="Generated" className="w-full h-full object-cover" />
                              )}
                              
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                                  <div className="flex justify-end">
                                      <span className="text-[10px] font-bold text-white bg-white/20 backdrop-blur px-2 py-1 rounded uppercase">
                                          {item.type}
                                      </span>
                                  </div>
                                  <div>
                                      <p className="text-white text-xs line-clamp-2 mb-3">{item.prompt}</p>
                                      <div className="flex gap-2">
                                          <button 
                                            onClick={() => {
                                                setCurrentResult(item);
                                                setViewMode('create');
                                            }}
                                            className="flex-1 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                                          >
                                              <Maximize2 size={12} /> View
                                          </button>
                                          <button 
                                            onClick={() => item.outputUrl && downloadMedia(item.outputUrl, `bistro-${item.id}`)}
                                            className="p-1.5 bg-white/20 text-white rounded hover:bg-white/30"
                                          >
                                              <Download size={14} />
                                          </button>
                                      </div>
                                  </div>
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
