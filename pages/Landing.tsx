
import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { ChatAssistant } from '../components/ChatAssistant';
import { ArrowRight, TrendingUp, Sliders, Sparkles, Star, PlayCircle, Brain, FileText, ShoppingBag, PenTool, Clapperboard, UtensilsCrossed } from 'lucide-react';
import { trackingService } from '../services/trackingService';

interface LandingProps {
  onGetStarted: () => void;
}

// Helper for Tailwind Safe Classes
const getColorStyles = (color: string) => {
    switch (color) {
        case 'emerald': return {
            bg: 'bg-emerald-500',
            text: 'text-emerald-500',
            decoration: 'decoration-emerald-400',
            gradient: 'from-emerald-400 to-emerald-600',
            dot: 'bg-emerald-500',
            iconBg: 'bg-emerald-500'
        };
        case 'blue': return {
            bg: 'bg-blue-500',
            text: 'text-blue-500',
            decoration: 'decoration-blue-400',
            gradient: 'from-blue-400 to-blue-600',
            dot: 'bg-blue-500',
            iconBg: 'bg-blue-500'
        };
        case 'purple': return {
            bg: 'bg-purple-500',
            text: 'text-purple-500',
            decoration: 'decoration-purple-400',
            gradient: 'from-purple-400 to-purple-600',
            dot: 'bg-purple-500',
            iconBg: 'bg-purple-500'
        };
        case 'orange': return {
            bg: 'bg-orange-500',
            text: 'text-orange-500',
            decoration: 'decoration-orange-400',
            gradient: 'from-orange-400 to-orange-600',
            dot: 'bg-orange-500',
            iconBg: 'bg-orange-500'
        };
        case 'pink': return {
            bg: 'bg-pink-500',
            text: 'text-pink-500',
            decoration: 'decoration-pink-400',
            gradient: 'from-pink-400 to-pink-600',
            dot: 'bg-pink-500',
            iconBg: 'bg-pink-500'
        };
        case 'amber': return {
            bg: 'bg-amber-500',
            text: 'text-amber-500',
            decoration: 'decoration-amber-400',
            gradient: 'from-amber-400 to-amber-600',
            dot: 'bg-amber-500',
            iconBg: 'bg-amber-500'
        };
        default: return {
            bg: 'bg-slate-500',
            text: 'text-slate-500',
            decoration: 'decoration-slate-400',
            gradient: 'from-slate-400 to-slate-600',
            dot: 'bg-slate-500',
            iconBg: 'bg-slate-500'
        };
    }
};

// Platform Module Details
const MODULES = [
    {
        id: 'recipe',
        title: "Recipe & Costing Engine",
        icon: UtensilsCrossed,
        color: "emerald",
        desc: "Precision engineering for your menu.",
        image: "https://images.unsplash.com/photo-1512485800893-cad879c43e2e?auto=format&fit=crop&w=1200&q=80",
        howTo: "Simply enter the name of your dish and any specific requirements. Our AI deconstructs it into ingredients, calculates precise yields, waste percentages, and total food cost based on real-time market rates.",
        benefits: ["Eliminate hidden food costs", "Standardize taste across outlets", "Instant margin analysis"]
    },
    {
        id: 'sop',
        title: "SOP Studio",
        icon: FileText,
        color: "blue",
        desc: "Standardize operations instantly.",
        image: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
        howTo: "Type a task name (e.g., 'Closing Checklist') or upload a photo of a workstation. The AI generates a step-by-step Standard Operating Procedure with compliance checklists and safety protocols.",
        benefits: ["Reduce staff training time", "Ensure hygiene compliance", "Consistent service quality"]
    },
    {
        id: 'inventory',
        title: "Smart Inventory",
        icon: ShoppingBag,
        color: "purple",
        desc: "Never run out, never overstock.",
        image: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80",
        howTo: "Upload your invoices or connect your POS. The system tracks stock levels, predicts depletion based on sales velocity, and auto-generates purchase orders for suppliers.",
        benefits: ["Cut food waste by 15%", "Automated reordering", "Theft detection via variance analysis"]
    },
    {
        id: 'layout',
        title: "Kitchen Layout Designer",
        icon: PenTool,
        color: "orange",
        desc: "Optimize workflow efficiency.",
        image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
        howTo: "Upload a hand-drawn sketch or define dimensions. The AI generates a professional 2D CAD layout optimized for staff movement, safety, and MEP (Mechanical, Electrical, Plumbing) efficiency.",
        benefits: ["Reduce staff collision", "Optimize utility usage", "Professional blueprints in minutes"]
    },
    {
        id: 'marketing',
        title: "Marketing Studio",
        icon: Clapperboard,
        color: "pink",
        desc: "Content creation on autopilot.",
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80",
        howTo: "Describe a promotion or dish. The AI generates high-quality images and video scripts tailored for Instagram and TikTok, complete with trending hashtags and captions.",
        benefits: ["Save agency fees", "Consistent social presence", "Higher customer engagement"]
    },
    {
        id: 'strategy',
        title: "Strategy AI",
        icon: Brain,
        color: "amber",
        desc: "Your 24/7 Business Consultant.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
        howTo: "Ask complex questions like 'How do I increase lunch footfall?' or 'Analyze my competitor's pricing'. The AI analyzes market data and your internal metrics to provide a step-by-step growth plan.",
        benefits: ["Data-backed decision making", "Competitor analysis", "Personalized growth roadmaps"]
    }
];

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const [showDemo, setShowDemo] = useState(false);
  
  useEffect(() => {
      // Start tracking the moment landing page loads
      trackingService.trackPageView('LANDING');
  }, []);

  const handleGetStarted = () => {
      trackingService.trackAction('Clicked Get Started');
      onGetStarted();
  };

  const handleDemoClick = () => {
      trackingService.trackAction('Viewed Demo Video');
      setShowDemo(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 selection:bg-yellow-200 selection:text-black">
      {/* Add ChatBot for Landing Page */}
      <ChatAssistant welcomeMessage="Hi! I'm BistroBot. Ask me about how we can automate your restaurant operations!" />

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-stone-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo iconSize={28} light={false} />
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={handleGetStarted} className="hidden md:block text-stone-600 font-semibold hover:text-black transition-colors">Log In</button>
            <button onClick={handleGetStarted} className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/30 active:scale-95 flex items-center gap-2">
                Start Free Trial <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[1000px] bg-yellow-100/50 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-orange-100/50 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wide shadow-sm mb-8 animate-fade-in-up">
                <Star size={12} fill="currentColor" className="text-yellow-500" />
                <span>The #1 Operating System for Restaurants</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-stone-900 mb-6 animate-fade-in-up" style={{animationDelay: '100ms'}}>
              Cook with Passion. <br className="hidden md:block"/>
              Manage with <span className="relative inline-block">
                 <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Intelligence</span>
                 <span className="absolute bottom-2 left-0 w-full h-3 bg-yellow-200/50 -z-10 transform -skew-x-6"></span>
              </span>.
            </h1>

            <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{animationDelay: '200ms'}}>
                Stop guessing. Start growing. BistroIntelligence automates recipe costing, standardizes SOPs, and unlocks hidden profits with a powerful AI Co-pilot tailored for F&B.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-fade-in-up" style={{animationDelay: '300ms'}}>
                <button onClick={handleGetStarted} className="px-8 py-4 bg-stone-900 text-white text-lg font-bold rounded-full hover:bg-black transition-all shadow-xl shadow-stone-900/20 flex items-center justify-center gap-2 hover:-translate-y-1">
                    Get Started for Free
                </button>
                <button onClick={handleDemoClick} className="px-8 py-4 bg-white text-stone-700 text-lg font-bold rounded-full border border-stone-200 hover:border-yellow-400 hover:text-yellow-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                    <PlayCircle size={20} /> Watch Demo
                </button>
            </div>

            <div className="relative max-w-5xl mx-auto animate-fade-in-up" style={{animationDelay: '400ms'}}>
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-3xl blur-2xl opacity-20 transform translate-y-8"></div>
                <div className="relative bg-white rounded-3xl p-3 shadow-2xl border border-stone-200 overflow-hidden group">
                    <div className="h-8 bg-stone-50 rounded-t-2xl flex items-center px-4 gap-2 border-b border-stone-100">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="relative overflow-hidden rounded-b-2xl aspect-video group">
                        <img src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=80" alt="Chef using BistroIntelligence Technology" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"/>
                         <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-20 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-white/50 max-w-[240px] animate-float hover:scale-105 transition-transform cursor-default">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shadow-sm"><TrendingUp size={20} /></div>
                                <div><p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">Profit Margin</p><p className="text-2xl font-black text-stone-900">+12.4%</p></div>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 w-[85%] rounded-full"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </header>

      {/* PLATFORM MODULES SECTION */}
      <section className="py-24 bg-stone-50">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-4xl font-extrabold text-stone-900 mb-4">Complete Operational Intelligence</h2>
                  <p className="text-xl text-stone-500 max-w-2xl mx-auto">One platform, six powerful engines. Everything you need to run a data-driven food business.</p>
              </div>

              <div className="space-y-20">
                  {MODULES.map((mod, idx) => {
                      const styles = getColorStyles(mod.color);
                      return (
                          <div key={mod.id} className={`flex flex-col lg:flex-row items-center gap-12 ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                              {/* Image Side */}
                              <div className="w-full lg:w-1/2 relative group">
                                  <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-200 aspect-[4/3] group-hover:-translate-y-2 transition-transform duration-500">
                                      <img src={mod.image} alt={mod.title} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                      <div className="absolute bottom-6 left-6 text-white">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${styles.iconBg} shadow-lg`}>
                                              <mod.icon size={24} className="text-white" />
                                          </div>
                                          <h3 className="text-2xl font-bold">{mod.title}</h3>
                                      </div>
                                  </div>
                              </div>

                              {/* Content Side */}
                              <div className="w-full lg:w-1/2 space-y-6">
                                  <h3 className={`text-3xl font-bold text-stone-900 ${styles.decoration} decoration-4 underline-offset-4`}>{mod.title}</h3>
                                  <p className="text-lg text-stone-600 font-medium leading-relaxed">{mod.desc}</p>
                                  
                                  <div className="bg-white p-6 rounded-xl border border-stone-100 shadow-sm">
                                      <h4 className="text-sm font-bold text-stone-800 uppercase mb-2 flex items-center gap-2">
                                          <Sliders size={16} className={styles.text} /> How it works
                                      </h4>
                                      <p className="text-stone-600 text-sm leading-relaxed">{mod.howTo}</p>
                                  </div>

                                  <div>
                                      <h4 className="text-sm font-bold text-stone-800 uppercase mb-3 flex items-center gap-2">
                                          <Sparkles size={16} className={styles.text} /> Key Benefits
                                      </h4>
                                      <ul className="space-y-3">
                                          {mod.benefits.map((benefit, i) => (
                                              <li key={i} className="flex items-start gap-3 text-stone-600 text-sm">
                                                  <div className={`w-1.5 h-1.5 rounded-full ${styles.dot} mt-2 shrink-0`}></div>
                                                  {benefit}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </section>

      {/* Footer / CTA */}
      <section className="py-24 bg-stone-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-extrabold mb-6">Ready to upgrade your kitchen?</h2>
              <p className="text-xl text-stone-400 mb-10 max-w-2xl mx-auto">Join thousands of food entrepreneurs using BistroIntelligence to streamline operations and boost profitability.</p>
              <button onClick={handleGetStarted} className="px-10 py-4 bg-yellow-400 text-black text-lg font-bold rounded-full hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 hover:-translate-y-1">
                  Start Your Free Trial
              </button>
              <p className="text-stone-500 text-sm mt-6">No credit card required. Cancel anytime.</p>
          </div>
      </section>
    </div>
  );
};
