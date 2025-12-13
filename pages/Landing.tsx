
import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { ChatAssistant } from '../components/ChatAssistant';
import { ArrowRight, TrendingUp, Sliders, Sparkles, Star, Brain, FileText, ShoppingBag, PenTool, Clapperboard, UtensilsCrossed, Check, ChevronDown, ChevronUp, Globe, Shield, Zap, Users, Play, BarChart3, ChefHat, Layout, Phone, Mail, MapPin, Send, X, Lock, FileCheck, Loader2, DollarSign, Clock } from 'lucide-react';
import { trackingService } from '../services/trackingService';
import { generateRecipeCard } from '../services/geminiService';
import { RecipeCard } from '../types';

interface LandingProps {
  onGetStarted: () => void;
}

const FEATURE_CARDS = [
    {
        id: 'costing',
        title: 'Recipe Engineering',
        icon: UtensilsCrossed,
        desc: 'Calculate precise food costs and margins automatically.',
        color: 'yellow'
    },
    {
        id: 'sop',
        title: 'SOP Generator',
        icon: FileText,
        desc: 'Create training manuals and checklists in seconds.',
        color: 'blue'
    },
    {
        id: 'inventory',
        title: 'Smart Inventory',
        icon: ShoppingBag,
        desc: 'Predict stock needs and automate purchase orders.',
        color: 'purple'
    },
    {
        id: 'analytics',
        title: 'Profit Analytics',
        icon: TrendingUp,
        desc: 'Real-time insights into your kitchen\'s financial health.',
        color: 'emerald'
    }
];

const HOW_IT_WORKS = [
    {
        step: "01",
        title: "Connect Your Data",
        desc: "Seamlessly integrate your POS, upload food invoices, or simply snap photos of your kitchen setup. We gather the raw data that matters.",
        image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80"
    },
    {
        step: "02",
        title: "AI Analysis",
        desc: "Our advanced Gemini-powered engine processes your workflows, calculates true food costs, and identifies hidden operational inefficiencies.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
    },
    {
        step: "03",
        title: "Optimize & Grow",
        desc: "Receive actionable SOPs, engineered menu prices, and profit-boosting strategies directly on your dashboard. Execute and watch margins grow.",
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80"
    }
];

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  
  // Contact Form State
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });

  // Demo Recipe State
  const [demoDishInput, setDemoDishInput] = useState('');
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [demoRecipe, setDemoRecipe] = useState<RecipeCard | null>(null);

  useEffect(() => {
      trackingService.trackPageView('LANDING');
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
      trackingService.trackAction('Clicked Get Started');
      onGetStarted();
  };

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setFormStatus('sending');
      // Simulate API call to send email
      setTimeout(() => {
          setFormStatus('sent');
          setContactForm({ name: '', email: '', phone: '', message: '' });
          alert(`Thank you, ${contactForm.name}! Your message has been forwarded to info@bistroconnect.in.`);
          setTimeout(() => setFormStatus('idle'), 3000);
      }, 1500);
  };

  const handleDemoGenerate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!demoDishInput.trim()) return;
      
      setIsGeneratingDemo(true);
      try {
          const result = await generateRecipeCard(
              'demo_guest', 
              { sku_id: 'demo', name: demoDishInput, category: 'main', prep_time_min: 0, current_price: 0, ingredients: [] }, 
              'Make it a signature dish. optimize for cost.'
          );
          setDemoRecipe(result);
          trackingService.trackAction('Generated Demo Recipe');
      } catch (err) {
          console.error(err);
          // Fallback handled in service, but just in case
      } finally {
          setIsGeneratingDemo(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-yellow-200 selection:text-slate-900">
      <ChatAssistant welcomeMessage="Welcome to BistroConnect! Ready to optimize your kitchen operations?" />

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Logo iconSize={32} light={false} />
          <div className="flex items-center gap-4 md:gap-8">
            <button onClick={() => scrollToSection('how-it-works')} className="hidden md:block text-slate-600 font-bold hover:text-slate-900 transition-colors text-sm">How it Works</button>
            <button onClick={() => scrollToSection('contact')} className="hidden md:block text-slate-600 font-bold hover:text-slate-900 transition-colors text-sm">Contact</button>
            <button onClick={handleGetStarted} className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-full transition-all shadow-lg shadow-yellow-400/20 active:scale-95 flex items-center gap-2 text-sm">
                Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
        <div className="absolute top-0 inset-x-0 h-[80vh] bg-gradient-to-b from-white to-slate-50 z-0"></div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-yellow-300/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[30vw] h-[30vw] bg-slate-400/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-widest shadow-xl mb-8 animate-fade-in-up hover:scale-105 transition-transform cursor-default border border-slate-700">
                <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                <span>The Kitchen OS for 2025</span>
            </div>

            <h1 className="text-5xl lg:text-8xl font-black tracking-tighter leading-[1] text-slate-900 mb-8 animate-fade-in-up max-w-5xl mx-auto">
              Smart Kitchens<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600 relative">
                Run on Data.
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-yellow-300 opacity-50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up font-medium" style={{animationDelay: '100ms'}}>
                Stop guessing. Start scaling. BistroConnect brings Fortune 500 level analytics, recipe costing, and automation to your restaurant.
            </p>

            {/* Instant Demo Input */}
            <div className="max-w-xl mx-auto mb-12 animate-fade-in-up relative z-20" style={{animationDelay: '200ms'}}>
                <form onSubmit={handleDemoGenerate} className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-white rounded-full p-2 shadow-2xl border border-slate-100">
                        <div className="pl-4 text-slate-400">
                            <ChefHat size={20} />
                        </div>
                        <input 
                            type="text" 
                            value={demoDishInput}
                            onChange={(e) => setDemoDishInput(e.target.value)}
                            placeholder="Enter a dish name (e.g. Butter Chicken)..."
                            className="flex-1 p-3 bg-transparent border-none focus:ring-0 outline-none text-slate-800 placeholder-slate-400 font-medium"
                        />
                        <button 
                            type="submit" 
                            disabled={isGeneratingDemo || !demoDishInput}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {isGeneratingDemo ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            <span className="hidden sm:inline">Generate</span>
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-3 font-medium">✨ Try generating one recipe instantly. No signup required.</p>
                </form>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-24 animate-fade-in-up" style={{animationDelay: '300ms'}}>
                <button onClick={handleGetStarted} className="px-10 py-4 bg-yellow-400 text-slate-900 text-lg font-bold rounded-full hover:bg-yellow-500 transition-all shadow-xl flex items-center justify-center gap-2 hover:-translate-y-1 border border-yellow-500/20">
                    Get Started for Free
                </button>
                <button onClick={() => scrollToSection('how-it-works')} className="px-10 py-4 bg-white text-slate-900 border border-slate-200 text-lg font-bold rounded-full hover:bg-slate-50 transition-all shadow-lg flex items-center justify-center gap-2">
                    How it Works
                </button>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative max-w-6xl mx-auto animate-fade-in-up perspective-1000" style={{animationDelay: '400ms'}}>
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-[2rem] blur opacity-20"></div>
                <div className="relative bg-slate-950 rounded-[1.5rem] shadow-2xl border border-slate-800 overflow-hidden ring-1 ring-white/10 transform rotate-x-12 transition-transform duration-1000 hover:rotate-x-0">
                    
                    {/* Browser Chrome */}
                    <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-2">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                        </div>
                        <div className="ml-6 flex-1 max-w-2xl mx-auto bg-slate-950 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-mono">
                            bistroconnect.in/dashboard
                        </div>
                    </div>

                    {/* Content Image/Video */}
                    <div className="relative aspect-[16/9] bg-slate-900 group">
                        <img 
                            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" 
                            alt="Dashboard Interface" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-lg text-left transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-yellow-400 rounded-xl">
                                        <TrendingUp className="text-slate-900" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs font-bold uppercase">Weekly Profit</p>
                                        <p className="text-3xl font-black text-white">₹1,24,500</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm text-slate-300">
                                        <span>Food Cost</span>
                                        <span className="text-emerald-400 font-bold">28% (-2.4%)</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[28%]"></div>
                                    </div>
                                    <p className="text-xs text-slate-500 pt-2">AI Alert: Switching tomato supplier saved ₹4,200 this week.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </header>

      {/* Feature Grid */}
      <section id="features" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Core Features</span>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">Everything you need to run a restaurant</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {FEATURE_CARDS.map((card, i) => (
                      <div key={card.id} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-400/5 transition-all group">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-white shadow-sm group-hover:scale-110 transition-transform border border-slate-100`}>
                              <card.icon size={28} className="text-slate-900" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                          <p className="text-slate-600 leading-relaxed text-sm">{card.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* NEW: How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-20">
                  <span className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Workflow</span>
                  <h2 className="text-4xl font-black mt-2">How BistroConnect Works</h2>
                  <p className="text-slate-400 mt-4 max-w-2xl mx-auto">From messy receipts to optimized profitability in three simple steps.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {HOW_IT_WORKS.map((item, idx) => (
                      <div key={idx} className="relative group">
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-8 border border-slate-800 relative bg-slate-800">
                              <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-transparent transition-colors z-10"></div>
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs font-bold border border-slate-700 z-20">
                                  STEP {item.step}
                              </div>
                          </div>
                          <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                          <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Social Proof Strip */}
      <section className="bg-slate-50 py-16 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 text-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-10">Trusted by modern restaurateurs</p>
              <div className="flex flex-wrap justify-center gap-12 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500">
                  <div className="flex items-center gap-2 text-xl font-serif font-bold text-slate-800">
                      <UtensilsCrossed size={24} className="text-yellow-500"/> Egg Street Fusion Cafe
                  </div>
                  <div className="flex items-center gap-2 text-xl font-sans font-black tracking-tighter text-slate-800">
                      <Zap size={24} className="text-blue-500"/> Cafe Beats
                  </div>
                  <div className="flex items-center gap-2 text-xl font-mono font-bold text-slate-800">
                      <Globe size={24} className="text-red-500"/> Tokyo Night
                  </div>
                  <div className="flex items-center gap-2 text-xl font-sans font-bold text-slate-800">
                      <Star size={24} className="text-pink-500"/> Hearful Cravings
                  </div>
                  <div className="flex items-center gap-2 text-2xl font-serif italic font-bold text-slate-800">
                      <ChefHat size={28}/> Amato
                  </div>
              </div>
          </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="mb-16 text-center max-w-3xl mx-auto">
                  <h2 className="text-4xl font-black text-slate-900 mb-4">Complete Operational Control</h2>
                  <p className="text-lg text-slate-600">Replace your fragmented spreadsheets and disconnected tools with one cohesive operating system.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
                  {/* Large Card */}
                  <div className="md:col-span-2 row-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                      <div className="relative z-10 max-w-md">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase mb-4">
                              <Brain size={14}/> AI Strategy
                          </div>
                          <h3 className="text-3xl font-bold text-slate-900 mb-4">Your 24/7 Business Consultant</h3>
                          <p className="text-slate-600 text-lg mb-8">Ask BistroConnect anything. "How do I increase lunch sales?", "Optimize my burger recipe cost", or "Draft a marketing plan for Diwali".</p>
                          <button onClick={handleGetStarted} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Try AI Chat</button>
                      </div>
                      <div className="absolute right-[-50px] bottom-[-50px] w-[400px] h-[400px] bg-gradient-to-br from-yellow-100 to-amber-50 rounded-full z-0 group-hover:scale-110 transition-transform duration-700"></div>
                      <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" className="absolute right-0 bottom-0 w-1/2 h-full object-cover opacity-20 mix-blend-overlay z-0" alt="Strategy"/>
                  </div>

                  {/* Tall Card */}
                  <div className="md:col-span-1 row-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between text-white group hover:shadow-2xl transition-all">
                      <div>
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                              <PenTool className="text-yellow-400" size={24} />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Layout Designer</h3>
                          <p className="text-slate-400">Design efficient commercial kitchens with AI-powered CAD tools.</p>
                      </div>
                      <div className="mt-8 relative h-48 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden group-hover:border-yellow-500/50 transition-colors">
                          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-px opacity-20">
                              {[...Array(16)].map((_,i) => <div key={i} className="bg-slate-600"></div>)}
                          </div>
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-yellow-400 bg-yellow-400/10 rounded"></div>
                      </div>
                  </div>

                  {/* Wide Card */}
                  <div className="md:col-span-3 bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                      <div className="flex-1 relative z-10">
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">Automated Costing</h3>
                          <p className="text-slate-600">Dynamic recipe cards that update automatically when ingredient prices change. Always know your true margin.</p>
                      </div>
                      <div className="flex-1 flex gap-4 opacity-80">
                          <div className="bg-white p-4 rounded-xl border border-slate-100 flex-1 shadow-sm">
                              <p className="text-xs text-slate-500 uppercase font-bold">Food Cost</p>
                              <p className="text-2xl font-black text-slate-900">28%</p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex-1 shadow-sm">
                              <p className="text-xs text-yellow-700 uppercase font-bold">Profit</p>
                              <p className="text-2xl font-black text-yellow-600">₹450</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* NEW: Contact Section */}
      <section id="contact" className="py-24 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-10"></div>
          <div className="max-w-6xl mx-auto px-6 relative z-10">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                  {/* Contact Info */}
                  <div className="w-full md:w-5/12 bg-slate-100 p-10 flex flex-col justify-between border-r border-slate-200">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 mb-6">Get in Touch</h3>
                          <p className="text-slate-600 mb-8">Ready to transform your restaurant? Our team is here to help you get started with BistroConnect.</p>
                          
                          <div className="space-y-6">
                              <div className="flex items-start gap-4">
                                  <div className="p-3 bg-white rounded-lg shadow-sm text-emerald-600">
                                      <Phone size={20} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Call Us</p>
                                      <p className="text-lg font-bold text-slate-900">0731-6981639</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
                                      <Mail size={20} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Email Us</p>
                                      <p className="text-lg font-bold text-slate-900">info@bistroconnect.in</p>
                                  </div>
                              </div>
                              <div className="flex items-start gap-4">
                                  <div className="p-3 bg-white rounded-lg shadow-sm text-purple-600">
                                      <MapPin size={20} />
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Headquarters</p>
                                      <p className="text-lg font-bold text-slate-900">Mumbai, Maharashtra, India</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="mt-10">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connect with us</p>
                          <div className="flex gap-4 mt-3">
                              <a href="https://bistroconnect.in/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                                  <Globe size={16} /> bistroconnect.in
                              </a>
                          </div>
                      </div>
                  </div>

                  {/* Contact Form */}
                  <div className="w-full md:w-7/12 p-10 bg-white">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">Send us a message</h3>
                      <form onSubmit={handleContactSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Name</label>
                                  <input 
                                    required 
                                    type="text" 
                                    value={contactForm.name}
                                    onChange={e => setContactForm({...contactForm, name: e.target.value})}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                  <input 
                                    required 
                                    type="tel" 
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                              <input 
                                required 
                                type="email" 
                                value={contactForm.email}
                                onChange={e => setContactForm({...contactForm, email: e.target.value})}
                                placeholder="john@restaurant.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                              <textarea 
                                required 
                                rows={4} 
                                value={contactForm.message}
                                onChange={e => setContactForm({...contactForm, message: e.target.value})}
                                placeholder="Tell us about your restaurant..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none"
                              />
                          </div>
                          <button 
                            type="submit" 
                            disabled={formStatus !== 'idle'}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                              {formStatus === 'sending' ? 'Sending...' : formStatus === 'sent' ? 'Message Sent!' : 'Send Message'}
                              {formStatus === 'idle' && <Send size={18} />}
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                  <div className="flex flex-col gap-4">
                      <Logo light={true} iconSize={32} />
                      <p className="text-sm max-w-xs leading-relaxed">
                          The intelligent operating system for modern food businesses. Empowering chefs and owners with data-driven insights.
                      </p>
                      <div className="flex gap-4 mt-4">
                          <span className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 cursor-pointer transition-colors"><Globe size={18}/></span>
                          <span className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 cursor-pointer transition-colors"><Mail size={18}/></span>
                          <span className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 cursor-pointer transition-colors"><Phone size={18}/></span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm">
                      <div className="flex flex-col gap-3">
                          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Platform</h4>
                          <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="hover:text-white transition-colors">Features</a>
                          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="hover:text-white transition-colors">How it Works</a>
                          <a href="#" className="hover:text-white transition-colors">Testimonials</a>
                      </div>
                      <div className="flex flex-col gap-3">
                          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Company</h4>
                          <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="hover:text-white transition-colors">Terms & Conditions</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="hover:text-white transition-colors">Privacy Policy</a>
                          <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }} className="hover:text-white transition-colors">Contact Us</a>
                      </div>
                      <div className="flex flex-col gap-3">
                          <h4 className="font-bold text-white uppercase tracking-wider text-xs">Contact</h4>
                          <p>0731-6981639</p>
                          <p>info@bistroconnect.in</p>
                          <p>Mumbai, MH, India</p>
                      </div>
                  </div>
              </div>
              <div className="mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-center md:text-left">
                  <p>© 2025 BistroConnect • Part of TFCS KITCHEN SOLUTIONS LTD</p>
                  <p>Made by chefs for restaurant owners.</p>
              </div>
          </div>
      </footer>

      {/* Modals */}
      {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                          {activeModal === 'terms' ? <FileCheck size={24} className="text-blue-600"/> : <Lock size={24} className="text-emerald-600"/>}
                          {activeModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                      </h3>
                      <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-8 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4">
                      {activeModal === 'terms' ? (
                          <>
                              <p><strong>1. Introduction</strong><br/>Welcome to BistroConnect. These Terms and Conditions govern your use of our website and software services.</p>
                              <p><strong>2. Services</strong><br/>BistroConnect provides AI-powered restaurant management tools including recipe costing, SOP generation, and analytics.</p>
                              <p><strong>3. User Accounts</strong><br/>You are responsible for maintaining the confidentiality of your account credentials. BistroConnect is not liable for any loss or damage arising from your failure to protect your account.</p>
                              <p><strong>4. Subscription & Payments</strong><br/>Services are billed on a subscription basis. You agree to pay all fees associated with your chosen plan. Refunds are processed according to our Refund Policy.</p>
                              <p><strong>5. Limitation of Liability</strong><br/>TFCS KITCHEN SOLUTIONS LTD shall not be liable for any indirect, incidental, or consequential damages arising from the use of our service.</p>
                              <p className="pt-4 text-xs text-slate-400">Last updated: January 2025</p>
                          </>
                      ) : (
                          <>
                              <p><strong>1. Data Collection</strong><br/>We collect information you provide directly to us, such as your name, email address, and restaurant details when you create an account.</p>
                              <p><strong>2. Use of Data</strong><br/>We use your data to provide, maintain, and improve our services, including generating AI insights for your business.</p>
                              <p><strong>3. Data Security</strong><br/>We implement industry-standard security measures to protect your personal information and business data.</p>
                              <p><strong>4. Third-Party Sharing</strong><br/>We do not sell your personal data. We may share data with trusted third-party service providers (e.g., payment processors) solely for the purpose of operating our services.</p>
                              <p className="pt-4 text-xs text-slate-400">Last updated: January 2025</p>
                          </>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                      <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors">
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Demo Recipe Modal */}
      {demoRecipe && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in relative">
                  <button 
                      onClick={() => setDemoRecipe(null)}
                      className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-10 backdrop-blur transition-colors"
                  >
                      <X size={20} />
                  </button>

                  <div className="overflow-y-auto custom-scrollbar flex-1">
                      {/* Header Image */}
                      <div className="h-48 bg-slate-100 relative">
                          <img src={demoRecipe.imageUrl} className="w-full h-full object-cover" alt={demoRecipe.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                              <div>
                                  <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">AI Generated Preview</span>
                                  <h2 className="text-3xl font-black text-white">{demoRecipe.name}</h2>
                              </div>
                          </div>
                      </div>

                      <div className="p-8">
                          <div className="grid grid-cols-3 gap-4 mb-8">
                              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                  <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Food Cost</p>
                                  <p className="text-xl font-black text-emerald-600">₹{demoRecipe.food_cost_per_serving}</p>
                              </div>
                              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                                  <p className="text-xs font-bold text-blue-800 uppercase mb-1">Sell Price</p>
                                  <p className="text-xl font-black text-blue-600">₹{demoRecipe.suggested_selling_price}</p>
                              </div>
                              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                                  <p className="text-xs font-bold text-purple-800 uppercase mb-1">Margin</p>
                                  <p className="text-xl font-black text-purple-600">
                                      {((1 - (demoRecipe.food_cost_per_serving / demoRecipe.suggested_selling_price)) * 100).toFixed(0)}%
                                  </p>
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div>
                                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><UtensilsCrossed size={18}/> Ingredients</h3>
                                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                      <ul className="space-y-2 text-sm text-slate-600">
                                          {demoRecipe.ingredients.slice(0, 5).map((ing, i) => (
                                              <li key={i} className="flex justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                                  <span>{ing.name}</span>
                                                  <span className="font-mono font-bold">{ing.qty}</span>
                                              </li>
                                          ))}
                                          {demoRecipe.ingredients.length > 5 && <li className="text-center text-xs text-slate-400 italic pt-2">and {demoRecipe.ingredients.length - 5} more...</li>}
                                      </ul>
                                  </div>
                              </div>
                              
                              <div>
                                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText size={18}/> Preparation</h3>
                                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      {demoRecipe.preparation_steps[0]}... <br/><br/>
                                      <span className="italic opacity-70">Sign up to view full preparation method and SOPs.</span>
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                          <h4 className="font-bold text-lg">Like this result?</h4>
                          <p className="text-slate-400 text-sm">Create account to save this recipe and generate unlimited more.</p>
                      </div>
                      <button 
                          onClick={onGetStarted}
                          className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-yellow-400/20 active:scale-95"
                      >
                          Save & Continue
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
