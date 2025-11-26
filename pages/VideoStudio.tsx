
import React, { useState, useRef } from 'react';
import { User, PlanType } from '../types';
import { Clapperboard, Upload, Play, Loader2, Sparkles, CheckCircle2, Film, AlertCircle, Key, Info } from 'lucide-react';
import { generateMarketingVideo } from '../services/geminiService';

interface VideoStudioProps {
  user: User;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ user }) => {
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          // Remove data:image/png;base64, prefix for the API
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
      if (!imageBase64) {
          setError("Please upload an image first.");
          return;
      }
      if (!prompt.trim()) {
          setError("Please describe the motion you want.");
          return;
      }

      // Check for API Key Selection (Veo Requirement)
      try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              setLoading(true);
              setLoadingState("Waiting for API Key selection...");
              await window.aistudio.openSelectKey();
              // Assume success after dialog interaction or re-check
          }
      } catch (e) {
          console.warn("AI Studio key check skipped or failed", e);
      }

      setLoading(true);
      setError(null);
      setVideoUrl(null);
      setLoadingState("Initializing Veo Model...");

      try {
          // Progress simulation for better UX during long polling
          const progressInterval = setInterval(() => {
              setLoadingState(prev => {
                  if (prev === "Initializing Veo Model...") return "Analyzing Image Structure...";
                  if (prev === "Analyzing Image Structure...") return "Dreaming up motion frames...";
                  if (prev === "Dreaming up motion frames...") return "Rendering video (this takes a moment)...";
                  return prev;
              });
          }, 4000);

          const url = await generateMarketingVideo(imageBase64, prompt, aspectRatio);
          
          clearInterval(progressInterval);
          setVideoUrl(url);
      } catch (err: any) {
          setError(err.message || "Failed to generate video.");
      } finally {
          setLoading(false);
          setLoadingState('');
      }
  };

  const openKeyDialog = async () => {
      try {
          await window.aistudio.openSelectKey();
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
      <div className="flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Clapperboard className="text-pink-500" /> Marketing Studio
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Transform your food photos into cinematic videos using Google Veo.</p>
          </div>
          <button 
            onClick={openKeyDialog}
            className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
              <Key size={12} /> Manage API Key
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Generator Inputs */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* How it works card */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5">
                  <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
                      <Info size={16} /> How to use
                  </h3>
                  <ol className="space-y-2 text-sm text-blue-700 dark:text-blue-200 list-decimal pl-4">
                      <li>Upload a high-quality photo of your dish.</li>
                      <li>Describe the motion (e.g., "Slow pan right, steam rising").</li>
                      <li>Select format (Portrait for Reels, Landscape for Ads).</li>
                      <li>Generate & Download!</li>
                  </ol>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                  
                  {/* Image Upload */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Source Image</label>
                      <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${
                              imageBase64 ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-700 hover:border-pink-400'
                          }`}
                      >
                          {imageBase64 ? (
                              <>
                                <img src={`data:image/png;base64,${imageBase64}`} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold flex items-center gap-2"><Upload size={16}/> Change Image</span>
                                </div>
                              </>
                          ) : (
                              <div className="text-center text-slate-400">
                                  <Upload size={32} className="mx-auto mb-2" />
                                  <p className="text-sm font-medium">Click to upload photo</p>
                                  <p className="text-xs opacity-70">PNG or JPG</p>
                              </div>
                          )}
                          <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*" 
                              className="hidden" 
                          />
                      </div>
                  </div>

                  {/* Prompt */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Describe Motion</label>
                      <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="E.g. Camera pans slowly around the burger, cheese dripping, steam rising..."
                          className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-pink-500 outline-none resize-none h-24"
                      />
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">3. Format</label>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setAspectRatio('9:16')}
                              className={`flex-1 py-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                                  aspectRatio === '9:16' 
                                  ? 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                          >
                              <div className="w-3 h-5 border-2 border-current rounded-sm"></div>
                              Portrait (9:16)
                          </button>
                          <button 
                              onClick={() => setAspectRatio('16:9')}
                              className={`flex-1 py-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                                  aspectRatio === '16:9' 
                                  ? 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                          >
                              <div className="w-5 h-3 border-2 border-current rounded-sm"></div>
                              Landscape (16:9)
                          </button>
                      </div>
                  </div>

                  <button 
                      onClick={handleGenerate}
                      disabled={loading || !imageBase64}
                      className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      {loading ? 'Processing...' : 'Generate Video'}
                  </button>
              </div>
          </div>

          {/* Right Column: Preview / Result */}
          <div className="lg:col-span-2">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 h-[600px] flex items-center justify-center relative overflow-hidden shadow-2xl">
                  
                  {loading ? (
                      <div className="text-center z-10">
                          <div className="relative w-20 h-20 mx-auto mb-6">
                              <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                              <div className="absolute inset-0 border-4 border-t-pink-500 rounded-full animate-spin"></div>
                              <Film className="absolute inset-0 m-auto text-pink-500" size={24} />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Creating Magic</h3>
                          <p className="text-slate-400 text-sm animate-pulse">{loadingState}</p>
                      </div>
                  ) : videoUrl ? (
                      <div className="w-full h-full flex flex-col">
                          <video 
                              src={videoUrl} 
                              controls 
                              autoPlay 
                              loop 
                              className="w-full h-full object-contain bg-black"
                          />
                          <div className="absolute top-4 right-4 z-20">
                              <a 
                                  href={videoUrl} 
                                  download="bistro-marketing-video.mp4"
                                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-lg border border-white/20 text-sm transition-colors flex items-center gap-2"
                              >
                                  <CheckCircle2 size={16} /> Download
                              </a>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center text-slate-600 max-w-sm px-6">
                          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                              <Play size={32} className="ml-2 opacity-50" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-500 mb-2">Ready to Animate</h3>
                          <p className="text-sm">Upload an image and click Generate to see the Veo model bring your food to life.</p>
                      </div>
                  )}

                  {/* Grid overlay effect for 'empty' state */}
                  {!videoUrl && !loading && (
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
    </div>
  );
};
