
import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { ArrowRight, CheckCircle2, TrendingUp, ChefHat, FileText, Zap, Star, PlayCircle, Quote, Calculator, Server, BarChart3, ArrowUpRight, DollarSign, Mail, Phone, MapPin, X, ExternalLink, Sliders, Users, Sparkles, ChevronDown, ChevronUp, LayoutDashboard, Brain, MessageSquare, Database, Globe } from 'lucide-react';
import { PLANS } from '../constants';
import { PlanType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LandingProps {
  onGetStarted: () => void;
}

type LegalSection = 'privacy' | 'terms' | 'refund' | 'cancellation' | null;

const LEGAL_CONTENT = {
    privacy: {
        title: "Privacy Policy",
        content: (
            <div className="space-y-4 text-slate-600 text-sm">
                <p><strong>Effective Date:</strong> October 1, 2023</p>
                <p>At BistroIntelligence ("we", "our", "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website or use our SaaS application.</p>
                
                <h4 className="font-bold text-slate-900 mt-4">1. Information We Collect</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Personal Data:</strong> Name, email address, phone number, and billing information when you register.</li>
                    <li><strong>Business Data:</strong> Restaurant sales data, inventory logs, recipes, and expense reports uploaded to the platform.</li>
                    <li><strong>Usage Data:</strong> Information about how you interact with our services, including access times and features used.</li>
                </ul>

                <h4 className="font-bold text-slate-900 mt-4">2. How We Use Your Data</h4>
                <p>We use your data to provide AI-driven insights, process payments, send administrative information, and improve our algorithms. Your proprietary business data (recipes, sales) is <strong>never shared</strong> with other users or third parties without consent.</p>

                <h4 className="font-bold text-slate-900 mt-4">3. Data Security</h4>
                <p>We implement enterprise-grade security measures including encryption and access controls to protect your personal and business information.</p>

                <h4 className="font-bold text-slate-900 mt-4">4. Contact Us</h4>
                <p>If you have questions about this policy, please contact us at info@bistroconnect.in.</p>
            </div>
        )
    },
    terms: {
        title: "Terms & Conditions",
        content: (
            <div className="space-y-4 text-slate-600 text-sm">
                <p><strong>Last Updated:</strong> October 1, 2023</p>
                <p>Please read these Terms and Conditions ("Terms") carefully before using the BistroIntelligence platform operated by BistroConnect.</p>

                <h4 className="font-bold text-slate-900 mt-4">1. Acceptance of Terms</h4>
                <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>

                <h4 className="font-bold text-slate-900 mt-4">2. Subscriptions</h4>
                <p>Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (monthly or annually). Pricing is subject to change with notice.</p>

                <h4 className="font-bold text-slate-900 mt-4">3. Content & Intellectual Property</h4>
                <p>You retain all rights to the data (recipes, sales logs) you upload. However, you grant BistroIntelligence a license to use this data solely for the purpose of providing the Service to you.</p>

                <h4 className="font-bold text-slate-900 mt-4">4. Limitation of Liability</h4>
                <p>In no event shall BistroIntelligence, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits or data.</p>
            </div>
        )
    },
    refund: {
        title: "Return & Refund Policy",
        content: (
            <div className="space-y-4 text-slate-600 text-sm">
                <p>Thank you for choosing BistroIntelligence.</p>
                
                <h4 className="font-bold text-slate-900 mt-4">1. Refunds</h4>
                <p>We do not offer refunds for partial months of service, upgrade/downgrade refunds, or refunds for months unused with an open account. However, exceptions may be made in the following circumstances:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>If there was a technical error in billing (e.g., double charge).</li>
                    <li>If the service was unavailable for a significant period (uptime &lt; 99%) as per our SLA.</li>
                </ul>
                <p>To request a refund, please contact support at info@bistroconnect.in within 7 days of the billing date.</p>
            </div>
        )
    },
    cancellation: {
        title: "Cancellation Policy",
        content: (
            <div className="space-y-4 text-slate-600 text-sm">
                <h4 className="font-bold text-slate-900 mt-4">Subscription Cancellation</h4>
                <p>You may cancel your BistroIntelligence subscription at any time through your account dashboard under 'Plans & Billing'.</p>
                
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li><strong>Immediate Effect:</strong> Cancellation requests are processed immediately.</li>
                    <li><strong>Access:</strong> You will continue to have access to your premium features until the end of your current billing cycle.</li>
                    <li><strong>Data Retention:</strong> After cancellation, your account will revert to the Free tier. We will retain your data for 90 days, after which inactive data may be archived or deleted.</li>
                    <li><strong>Auto-Renewal:</strong> Canceling turns off auto-renewal. You will not be charged for the next cycle.</li>
                </ul>
                
                <p className="mt-4">For assistance with cancellation, please contact our support team.</p>
            </div>
        )
    }
};

const TESTIMONIALS = [
    {
        name: "Chef Vikram Singh",
        role: "Head Chef, The Golden Spoon",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
        quote: "BistroIntel helped us cut food waste by 18% in the first month. It's like having a dedicated operations director for a fraction of the cost."
    },
    {
        name: "Priya Sharma",
        role: "Owner, Masala & Co.",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
        quote: "The SOP generator is a lifesaver. We standardized our biryani prep across 3 outlets in just one week. The consistency has significantly improved our ratings."
    },
    {
        name: "Rahul Khanna",
        role: "Manager, Urban Chai",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
        quote: "I used to spend hours on recipe costing spreadsheets. Now, BistroIntel does it instantly. The price suggestions helped us boost our margins by 12%."
    }
];

const FAQS = [
    {
        q: "Does BistroIntelligence replace my POS?",
        a: "No, we integrate with your existing POS (Petpooja, Posist, etc.) to extract data and provide intelligence layer on top of it. You keep your billing software; we make it smarter."
    },
    {
        q: "Is my recipe data secure?",
        a: "Absolutely. Your recipes are your intellectual property. We encrypt all data with AES-256 standards, and our AI models are trained to never leak proprietary information between accounts."
    },
    {
        q: "Can I use it for a cloud kitchen?",
        a: "Yes! Cloud kitchens benefit the most from our food cost tracking and multi-brand management features. Our Pro+ plan is designed specifically for multi-outlet operations."
    },
    {
        q: "Do I need technical skills?",
        a: "Not at all. If you can chat with WhatsApp, you can use our Strategy AI. The interface is designed for chefs and owners, not IT experts."
    }
];

const FEATURE_COLORS = {
    yellow: { bg: 'bg-yellow-500', iconBg: 'text-yellow-600' },
    emerald: { bg: 'bg-emerald-500', iconBg: 'text-emerald-600' },
    purple: { bg: 'bg-purple-500', iconBg: 'text-purple-600' },
};

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const [activeLegal, setActiveLegal] = useState<LegalSection>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [isQuarterly, setIsQuarterly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // ROI Calculator State
  const [revenue, setRevenue] = useState(1500000);
  const [foodCostPct, setFoodCostPct] = useState(35);
  const [laborCostPct, setLaborCostPct] = useState(25);

  // Calculations
  const overheadsPct = 0.20; // Fixed 20% overheads assumption for demo
  const currentProfitMargin = 1 - (foodCostPct / 100) - (laborCostPct / 100) - overheadsPct;
  const currentAnnualProfit = revenue * 12 * currentProfitMargin;

  // Optimization Assumptions
  const optimizedFoodCost = foodCostPct * 0.93; // 7% reduction
  const optimizedLaborCost = laborCostPct * 0.90; // 10% efficiency gain
  const optimizedProfitMargin = 1 - (optimizedFoodCost / 100) - (optimizedLaborCost / 100) - overheadsPct;
  const optimizedAnnualProfit = revenue * 12 * optimizedProfitMargin;
  
  const extraProfit = optimizedAnnualProfit - currentAnnualProfit;

  const chartData = [
      { name: 'Current', profit: currentAnnualProfit, color: '#94a3b8' },
      { name: 'Optimized', profit: optimizedAnnualProfit, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-100">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo iconSize={28} light={true} />
          <div className="flex items-center gap-6">
            <button 
                onClick={onGetStarted}
                className="hidden md:block text-slate-300 font-medium hover:text-white transition-colors"
            >
                Log In
            </button>
            <button 
                onClick={onGetStarted}
                className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
            >
                Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-950 text-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 backdrop-blur-sm text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Sparkles size={12} fill="currentColor" />
                <span>The AI OS for Restaurants</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1]">
              Run Your Kitchen <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Like a Tech Giant.</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              Stop guessing costs. Start scaling profits. BistroIntelligence uses AI to automate recipe costing, standardise SOPs, and uncover hidden revenue opportunities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-xl hover:bg-slate-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 group"
              >
                Start Free Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setShowDemo(true)}
                className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm text-white text-lg font-bold rounded-xl border border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle size={20} /> Watch Demo
              </button>
            </div>

            <div className="pt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
               <div className="flex -space-x-2">
                   {[1,2,3,4].map(i => (
                       <div key={i} style={{ zIndex: 10 - i }} className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] text-white">
                           <Users size={12} />
                       </div>
                   ))}
               </div>
               <p>Trusted by 2,000+ modern restaurateurs</p>
            </div>
          </div>

          <div className="relative z-10 lg:h-[600px] flex items-center perspective-1000">
            {/* Dashboard Mockup with 3D Tilt Effect */}
            <div className="relative w-full animate-float transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl blur-3xl opacity-20 transform translate-y-4"></div>
                <div className="relative bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden ring-1 ring-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-20"></div>
                    
                    {/* Fake Browser Header */}
                    <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>

                    <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
                        alt="BistroIntelligence Dashboard" 
                        className="w-full h-auto object-cover opacity-80"
                        referrerPolicy="no-referrer"
                    />
                    
                    {/* Floating Insight Card */}
                    <div className="absolute bottom-8 left-8 right-8 bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-slate-700 shadow-2xl flex items-start gap-4 z-30 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">AI Strategy Insight</p>
                            <p className="text-sm font-medium text-white leading-snug">"Detected 15% wastage in avocados. Switch to Supplier B to save <span className="text-emerald-400">₹12,000/mo</span>."</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Partner Marquee */}
      <div className="bg-slate-950 border-b border-slate-800 overflow-hidden py-10 relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>
          
          <div className="flex animate-scroll whitespace-nowrap gap-16 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Duplicated list for seamless scroll */}
              {[...Array(2)].map((_, i) => (
                  <React.Fragment key={i}>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><Server size={24} /> Petpooja</span>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><Database size={24} /> Posist</span>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><Globe size={24} /> Zomato</span>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><MapPin size={24} /> Swiggy</span>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign size={24} /> Razorpay</span>
                      <span className="text-2xl font-bold text-white flex items-center gap-2"><LayoutDashboard size={24} /> UrbanPiper</span>
                  </React.Fragment>
              ))}
          </div>
      </div>

      {/* Comparison Section */}
      <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Stop Managing Chaos. Start Managing Growth.</h2>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">The old way of running restaurants is broken. Spreadsheets, gut feelings, and WhatsApp chaos are costing you money.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                  {/* The Old Way */}
                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                      <h3 className="text-xl font-bold text-slate-500 mb-6 flex items-center gap-2">
                          <X className="text-red-500" /> The Old Way
                      </h3>
                      <ul className="space-y-4">
                          {[
                              "Guessing food costs & margins",
                              "SOPs buried in WhatsApp groups",
                              "Manually checking inventory",
                              "Pricing based on competitor menu",
                              "Reactive fire-fighting mode"
                          ].map((item, i) => (
                              <li key={i} className="flex gap-3 text-slate-500">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold text-slate-500">×</span>
                                  </div>
                                  {item}
                              </li>
                          ))}
                      </ul>
                  </div>

                  {/* The BistroIntel Way */}
                  <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <CheckCircle2 className="text-emerald-600" /> The BistroIntel Way
                      </h3>
                      <ul className="space-y-4 relative z-10">
                          {[
                              "Real-time cost & margin tracking",
                              "Standardized, digital SOPs",
                              "AI-predicted inventory needs",
                              "Data-backed menu engineering",
                              "Proactive strategic growth"
                          ].map((item, i) => (
                              <li key={i} className="flex gap-3 text-slate-800 font-medium">
                                  <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                                      <CheckCircle2 size={14} />
                                  </div>
                                  {item}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">Features</div>
                  <h2 className="text-4xl font-bold text-slate-900">Everything You Need to Scale</h2>
                  <p className="text-lg text-slate-600 mt-2">A complete suite of tools to digitize your operations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                  {/* Feature 1 - Large */}
                  <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                      <div className="relative z-10 max-w-md">
                          <div className="w-12 h-12 bg-yellow-100 text-yellow-700 rounded-2xl flex items-center justify-center mb-6">
                              <ChefHat size={28} />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">Recipe Costing Engine</h3>
                          <p className="text-slate-600">Calculate plate costs instantly. Update one ingredient price, and watch it auto-update across your entire menu. Protect your margins automatically.</p>
                      </div>
                      <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-yellow-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
                      <img src="https://cdn-icons-png.flaticon.com/512/3075/3075977.png" className="absolute bottom-4 right-4 w-32 opacity-10 rotate-12" alt="icon" />
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-6">
                          <FileText size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">SOP Generator</h3>
                      <p className="text-slate-600 text-sm">Type a topic, get a standard procedure. Ensure consistency across all outlets.</p>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-6">
                          <Brain size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">AI Strategy Consultant</h3>
                      <p className="text-slate-600 text-sm">Your 24/7 CFO. Ask questions about sales trends, wastage, and growth opportunities.</p>
                  </div>

                  {/* Feature 4 - Large */}
                  <div className="md:col-span-2 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
                      <div className="relative z-10 text-white">
                          <div className="w-12 h-12 bg-slate-800 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
                              <LayoutDashboard size={28} />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">Central Command Center</h3>
                          <p className="text-slate-400 max-w-lg">Connect your POS, Inventory, and Accounting software. Get a single source of truth for your entire restaurant business.</p>
                      </div>
                      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-cyan-500/10 to-transparent"></div>
                  </div>
              </div>
          </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">Calculate Your Potential</h2>
                    <p className="text-lg text-slate-600 mb-8">See how small optimizations in food and labor cost can lead to massive profit jumps over a year.</p>
                    
                    <div className="space-y-8">
                        <div>
                            <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Monthly Revenue</span>
                                <span className="text-emerald-600">₹{(revenue/100000).toFixed(1)} Lakhs</span>
                            </label>
                            <input 
                                type="range" 
                                min="500000" 
                                max="10000000" 
                                step="100000"
                                value={revenue}
                                onChange={(e) => setRevenue(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                        </div>
                        <div>
                            <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Current Food Cost</span>
                                <span>{foodCostPct}%</span>
                            </label>
                            <input 
                                type="range" min="20" max="50" step="1" value={foodCostPct} onChange={(e) => setFoodCostPct(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                            />
                        </div>
                        <div>
                            <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                <span>Current Labor Cost</span>
                                <span>{laborCostPct}%</span>
                            </label>
                            <input 
                                type="range" min="15" max="40" step="1" value={laborCostPct} onChange={(e) => setLaborCostPct(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 p-8 rounded-3xl text-white border border-slate-800 relative shadow-2xl">
                    <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        Potential Savings
                    </div>
                    
                    <div className="mb-8 text-center">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wide">Annual Profit Increase</p>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-2">
                            ₹{extraProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Profit']}
                                />
                                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                   <h2 className="text-3xl font-bold mb-4">Trusted by the Best</h2>
                   <p className="text-slate-600 text-lg">Join the community of data-driven restaurateurs.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  {TESTIMONIALS.map((t, i) => (
                      <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <Quote className="text-emerald-500 mb-6 opacity-30" size={40} />
                          <p className="text-lg text-slate-700 mb-8 leading-relaxed font-medium">
                              "{t.quote}"
                          </p>
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-100">
                                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                  <p className="font-bold text-slate-900">{t.name}</p>
                                  <p className="text-emerald-600 text-sm">{t.role}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900">Plans for Every Stage</h2>
                <p className="text-lg text-slate-600 mt-2">No hidden fees. Cancel anytime.</p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-12 bg-slate-100 p-1.5 rounded-xl w-fit mx-auto">
                <button 
                    onClick={() => setIsQuarterly(false)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isQuarterly ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Monthly
                </button>
                <button 
                    onClick={() => setIsQuarterly(true)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isQuarterly ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Quarterly <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded uppercase">Save 10%</span>
                </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {Object.entries(PLANS).map(([key, plan]) => {
                    const isPro = key === 'PRO';
                    const displayPrice = isQuarterly ? plan.quarterlyPrice : plan.price;
                    
                    return (
                        <div key={key} className={`bg-white rounded-3xl p-8 flex flex-col relative transition-all ${isPro ? 'border-2 border-slate-900 shadow-2xl scale-105 z-10' : 'border border-slate-200 shadow-lg'}`}>
                            {isPro && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                                <div className="flex items-baseline mt-4">
                                    <span className="text-4xl font-black text-slate-900">₹{displayPrice.toLocaleString()}</span>
                                    <span className="text-slate-500 font-medium ml-1">/{isQuarterly ? 'qtr' : 'mo'}</span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 mb-6"></div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            
                            <button 
                                onClick={onGetStarted}
                                className={`w-full py-4 rounded-xl font-bold transition-all ${
                                    isPro 
                                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {key === PlanType.FREE ? 'Start Free Trial' : 'Get Started'}
                            </button>
                        </div>
                    );
                })}
            </div>
          </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {FAQS.map((faq, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <button 
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full flex items-center justify-between p-6 text-left"
                          >
                              <span className="font-bold text-slate-800">{faq.q}</span>
                              {openFaq === i ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                          </button>
                          {openFaq === i && (
                              <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-50 pt-4">
                                  {faq.a}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* CTA Band */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Ready to optimize your kitchen?</h2>
                <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">Join the new wave of profitable restaurants. Start your 3-day free trial today.</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={onGetStarted}
                        className="px-10 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-xl hover:bg-emerald-400 transition-colors text-lg"
                    >
                        Get Started Now
                    </button>
                </div>
            </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                  <Logo iconSize={28} light={true} />
                  <p className="mt-6 text-slate-500 text-sm leading-relaxed max-w-sm">
                      BistroIntelligence is the modern operating system for forward-thinking restaurants. 
                      We combine AI with operational expertise to help you build a more profitable business.
                  </p>
                  <p className="text-xs text-yellow-500 font-bold mt-4 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Built in India 🇮🇳
                  </p>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6">Legal</h4>
                  <ul className="space-y-3 text-sm">
                      <li><button onClick={() => setActiveLegal('privacy')} className="hover:text-emerald-400 transition-colors text-left">Privacy Policy</button></li>
                      <li><button onClick={() => setActiveLegal('terms')} className="hover:text-emerald-400 transition-colors text-left">Terms & Conditions</button></li>
                      <li><button onClick={() => setActiveLegal('refund')} className="hover:text-emerald-400 transition-colors text-left">Return & Refund Policy</button></li>
                      <li><button onClick={() => setActiveLegal('cancellation')} className="hover:text-emerald-400 transition-colors text-left">Cancellation Policy</button></li>
                  </ul>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6">Contact</h4>
                  <ul className="space-y-4 text-sm">
                      <li className="flex items-center gap-3">
                          <Mail size={16} className="text-emerald-500"/> info@bistroconnect.in
                      </li>
                      <li className="flex items-center gap-3">
                           <Phone size={16} className="text-emerald-500"/> 0731-6981639
                      </li>
                      <li className="flex items-center gap-3">
                           <MapPin size={16} className="text-emerald-500"/> Mumbai, Indore, Hyderabad
                      </li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 border-t border-slate-900 pt-8 text-center text-sm text-slate-600 flex justify-between items-center">
              <p>© 2024 BistroIntelligence Inc. All rights reserved.</p>
              <div className="flex gap-4">
                  {/* Social Icons Placeholder */}
              </div>
          </div>
      </footer>

      {/* Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
            <button 
              onClick={() => setShowDemo(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-slate-800 text-white rounded-full z-10 transition-all backdrop-blur-sm border border-white/10"
            >
              <X size={24} />
            </button>
            <div className="w-full h-full flex items-center justify-center text-white bg-slate-900">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/ysz5S6PUM-U?autoplay=1&mute=1&loop=1&playlist=ysz5S6PUM-U" 
                    title="BistroIntelligence Demo" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {activeLegal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h3 className="text-xl font-bold text-slate-900">{LEGAL_CONTENT[activeLegal].title}</h3>
                      <button 
                        onClick={() => setActiveLegal(null)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                      >
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar">
                      {LEGAL_CONTENT[activeLegal].content}
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
                      <button 
                        onClick={() => setActiveLegal(null)}
                        className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
