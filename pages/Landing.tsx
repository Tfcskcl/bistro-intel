
import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { ChatAssistant } from '../components/ChatAssistant';
import { ArrowRight, CheckCircle2, TrendingUp, ChefHat, FileText, Zap, Star, PlayCircle, Quote, Calculator, Server, BarChart3, ArrowUpRight, DollarSign, Mail, Phone, MapPin, X, ExternalLink, Sliders, Users, Sparkles, ChevronDown, ChevronUp, Smartphone, Clock, ShieldCheck, Menu, UploadCloud, Brain, XCircle, Activity, Camera, AlertTriangle, Layers, Globe, Database } from 'lucide-react';
import { PLANS } from '../constants';
import { PlanType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LandingProps {
  onGetStarted: () => void;
}

type LegalSection = 'privacy' | 'terms' | 'refund' | 'cancellation' | 'about' | null;

const LEGAL_CONTENT = {
    about: {
        title: "About Us",
        content: (
            <div className="space-y-4 text-stone-600 text-sm">
                <p><strong>BistroIntelligence</strong> is the premier AI-powered operating system for the modern food and beverage industry. We translate complex operational data into simple, actionable insights that help restaurants grow.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">Our Heritage</h4>
                <p>We are proudly a part of <strong>TFCS KITCHEN SOLUTIONS LTD</strong>, a renowned name in culinary consultancy and kitchen infrastructure. Born from the trenches of real commercial kitchens, our platform combines TFCS's decades of operational expertise with cutting-edge artificial intelligence.</p>

                <h4 className="font-bold text-stone-900 mt-4">Our Mission</h4>
                <p>The restaurant industry is notorious for thin margins and high failure rates. Our mission is to change that narrative. We democratize access to elite tools for recipe costing, staff training, and strategic planning, making them accessible to independent cafes and large chains alike.</p>

                <h4 className="font-bold text-stone-900 mt-4">What We Do</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Standardization:</strong> Ensuring every dish tastes the same, every time.</li>
                    <li><strong>Cost Control:</strong> Tracking every gram and rupee to maximize profitability.</li>
                    <li><strong>Automation:</strong> Reducing manual operational overhead so chefs can focus on cooking.</li>
                </ul>

                <div className="mt-6 p-4 bg-stone-100 rounded-lg border border-stone-200">
                    <p className="text-xs text-stone-500"><strong>TFCS KITCHEN SOLUTIONS LTD</strong><br/>Innovating Food Service Since Inception.</p>
                </div>
            </div>
        )
    },
    privacy: {
        title: "Privacy Policy",
        content: (
            <div className="space-y-4 text-stone-600 text-sm">
                <p><strong>Effective Date:</strong> October 1, 2023</p>
                <p>At BistroIntelligence ("we", "our", "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website or use our SaaS application.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">1. Information We Collect</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Personal Data:</strong> Name, email address, phone number, and billing information when you register.</li>
                    <li><strong>Business Data:</strong> Restaurant sales data, inventory logs, recipes, and expense reports uploaded to the platform.</li>
                    <li><strong>Usage Data:</strong> Information about how you interact with our services, including access times and features used.</li>
                </ul>

                <h4 className="font-bold text-stone-900 mt-4">2. How We Use Your Data</h4>
                <p>We use your data to provide AI-driven insights, process payments, send administrative information, and improve our algorithms. Your proprietary business data (recipes, sales) is <strong>never shared</strong> with other users or third parties without consent.</p>

                <h4 className="font-bold text-stone-900 mt-4">3. Data Security</h4>
                <p>We implement enterprise-grade security measures including encryption and access controls to protect your personal and business information.</p>

                <h4 className="font-bold text-stone-900 mt-4">4. Contact Us</h4>
                <p>If you have questions about this policy, please contact us at info@bistroconnect.in.</p>
            </div>
        )
    },
    terms: {
        title: "Terms & Conditions",
        content: (
            <div className="space-y-4 text-stone-600 text-sm">
                <p><strong>Last Updated:</strong> October 1, 2023</p>
                <p>Please read these Terms and Conditions ("Terms") carefully before using the BistroIntelligence platform operated by BistroConnect.</p>

                <h4 className="font-bold text-stone-900 mt-4">1. Acceptance of Terms</h4>
                <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>

                <h4 className="font-bold text-stone-900 mt-4">2. Subscriptions</h4>
                <p>Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis (monthly or annually). Pricing is subject to change with notice.</p>

                <h4 className="font-bold text-stone-900 mt-4">3. Content & Intellectual Property</h4>
                <p>You retain all rights to the data (recipes, sales logs) you upload. However, you grant BistroIntelligence a license to use this data solely for the purpose of providing the Service to you.</p>

                <h4 className="font-bold text-stone-900 mt-4">4. Limitation of Liability</h4>
                <p>In no event shall BistroIntelligence, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits or data.</p>
            </div>
        )
    },
    refund: {
        title: "Return & Refund Policy",
        content: (
            <div className="space-y-4 text-stone-600 text-sm">
                <p>Thank you for choosing BistroIntelligence.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">1. Refunds</h4>
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
            <div className="space-y-4 text-stone-600 text-sm">
                <p><strong>Effective Date:</strong> October 1, 2023</p>
                <p>We believe in flexibility. You may cancel your BistroIntelligence subscription at any time. This policy outlines the terms and procedures for cancellation.</p>

                <h4 className="font-bold text-stone-900 mt-4">1. Cancellation Procedure</h4>
                <p>Subscribers can cancel their plan directly through the application:</p>
                <ol className="list-decimal pl-5 space-y-1">
                    <li>Navigate to <strong>Settings &gt; Billing</strong> in your dashboard.</li>
                    <li>Click on "Manage Subscription".</li>
                    <li>Select "Cancel Subscription" and confirm your choice.</li>
                </ol>
                <p>Alternatively, you may submit a cancellation request via email to billing@bistroconnect.in. Email requests must be sent at least 3 business days prior to your renewal date to ensure processing.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">2. Effect of Cancellation</h4>
                <p>Cancellation stops the auto-renewal of your subscription. You will continue to have full access to premium features until the end of your current billing cycle (monthly or annual). No further charges will be applied after the cancellation date.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">3. No Refunds for Partial Periods</h4>
                <p>Payments are non-refundable. We do not provide refunds or credits for any partial subscription periods or for unused services. If you cancel early, you will not receive a refund for the remaining time in your current billing cycle.</p>
                
                <h4 className="font-bold text-stone-900 mt-4">4. Data Handling Post-Cancellation</h4>
                <p>Upon the expiry of your subscription period:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Your account will be downgraded to the 'Free' tier (if available) or restricted.</li>
                    <li>Proprietary data (Recipes, SOPs, Inventory Logs) will be retained in read-only mode for 90 days.</li>
                    <li>After 90 days of inactivity on a cancelled account, we reserve the right to permanently delete your data from our servers.</li>
                </ul>

                <h4 className="font-bold text-stone-900 mt-4">5. Enterprise Contracts</h4>
                <p>If you are on an Enterprise plan with a signed custom contract, the cancellation terms specified in your Master Services Agreement (MSA) will supersede this policy.</p>

                <div className="mt-6 p-4 bg-stone-100 rounded-lg border border-stone-200">
                    <p className="text-xs text-stone-500"><strong>Questions?</strong> Contact our support team at support@bistroconnect.in for assistance with billing issues.</p>
                </div>
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

const DEEP_DIVE_FEATURES = [
    {
        title: "Stop Bleeding Profit on Every Plate",
        description: "Ingredient prices fluctuate daily. BistroIntelligence connects with your market rates to update recipe costs in real-time. Spot low-margin dishes instantly and adjust pricing before you lose money.",
        image: "https://images.unsplash.com/photo-1556742393-d75f468bfcb0?auto=format&fit=crop&w=1200&q=80", 
        icon: TrendingUp,
        color: "yellow",
        tags: ["Real-time Sync", "Margin Alerts", "Menu Engineering"]
    },
    {
        title: "Train Staff in Minutes, Not Months",
        description: "High turnover is a reality. Our AI generates step-by-step video and text SOPs for every station. New hires can scan a QR code and start prepping immediately with consistent quality.",
        image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80", 
        icon: Users,
        color: "emerald",
        tags: ["Video SOPs", "QR Access", "Quality Control"]
    },
    {
        title: "Your 24/7 Strategy Consultant",
        description: "Don't just look at sales; understand them. Ask our AI: 'Why did food cost spike this week?' or 'Plan a Valentine's Day promo'. Get actionable roadmaps backed by your actual data.",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", 
        icon: Zap,
        color: "orange",
        tags: ["Growth Roadmaps", "Root Cause Analysis", "Sales Forecasting"]
    }
];

const COMPARISON_FEATURES = [
    { feature: "Recipe Costing", old: "Hours on Spreadsheets", new: "Instant AI Calculation" },
    { feature: "Menu Updates", old: "Manual Price Checks", new: "Real-time Ingredient Sync" },
    { feature: "Staff Training", old: "Verbal Instructions", new: "Video SOPs on Demand" },
    { feature: "Decision Making", old: "Gut Feeling", new: "Data-Backed Strategy" }
];

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const [activeLegal, setActiveLegal] = useState<LegalSection>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [isQuarterly, setIsQuarterly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const [revenue, setRevenue] = useState(1500000);
  const [foodCostPct, setFoodCostPct] = useState(35);
  const [laborCostPct, setLaborCostPct] = useState(25);

  const overheadsPct = 0.20; 
  const currentProfitMargin = 1 - (foodCostPct / 100) - (laborCostPct / 100) - overheadsPct;
  const currentAnnualProfit = revenue * 12 * currentProfitMargin;

  const optimizedFoodCost = foodCostPct * 0.93; 
  const optimizedLaborCost = laborCostPct * 0.90; 
  const optimizedProfitMargin = 1 - (optimizedFoodCost / 100) - (optimizedLaborCost / 100) - overheadsPct;
  const optimizedAnnualProfit = revenue * 12 * optimizedProfitMargin;
  
  const extraProfit = optimizedAnnualProfit - currentAnnualProfit;

  const chartData = [
      { name: 'Current', profit: currentAnnualProfit, color: '#a8a29e' },
      { name: 'Optimized', profit: optimizedAnnualProfit, color: '#eab308' } 
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-stone-900 selection:bg-yellow-200 selection:text-black">
      {/* Add ChatBot for Landing Page with Sales Context */}
      <ChatAssistant welcomeMessage="Hi! I'm BistroBot. Ask me how we can help you reduce food costs or automate your kitchen operations!" />

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-stone-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo iconSize={28} light={false} />
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={onGetStarted} className="hidden md:block text-stone-600 font-semibold hover:text-black transition-colors">Log In</button>
            <button onClick={onGetStarted} className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-400/30 active:scale-95 flex items-center gap-2">
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
                Stop guessing your costs. BistroIntelligence automates recipe costing, standardizes SOPs, and unlocks hidden profits with a powerful AI Co-pilot.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-fade-in-up" style={{animationDelay: '300ms'}}>
                <button onClick={onGetStarted} className="px-8 py-4 bg-stone-900 text-white text-lg font-bold rounded-full hover:bg-black transition-all shadow-xl shadow-stone-900/20 flex items-center justify-center gap-2 hover:-translate-y-1">
                    Get Started for Free
                </button>
                <button onClick={() => setShowDemo(true)} className="px-8 py-4 bg-white text-stone-700 text-lg font-bold rounded-full border border-stone-200 hover:border-yellow-400 hover:text-yellow-700 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
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

      {/* Social Proof */}
      <div className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
            <p className="text-center text-sm font-bold text-stone-400 uppercase tracking-widest mb-8">Trusted by 500+ Modern Kitchens</p>
            <div className="flex flex-wrap justify-center gap-x-16 gap-y-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {['Acai by the Bay', 'The Paratha Project', 'Sattva Cafe', 'Heartful Cravings', 'Urban Spice'].map((brand, i) => (
                    <div key={i} className="flex items-center gap-3 group cursor-default">
                        <div className="w-10 h-10 bg-stone-800 rounded-xl rotate-3 group-hover:rotate-0 group-hover:bg-yellow-400 transition-all duration-300"></div>
                        <span className="text-xl font-black text-stone-800">{brand}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Operations Center Segment */}
      <section className="py-24 bg-stone-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="flex-1 space-y-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold uppercase tracking-wide">
                          <Activity size={12} className="animate-pulse" /> Live Intelligence
                      </div>
                      <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                          The All-Seeing Eye <br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">For Your Kitchen.</span>
                      </h2>
                      <p className="text-lg text-slate-400 leading-relaxed">
                          Turn your existing CCTV cameras into an operational command center. Our AI tracks staff movement, hygiene compliance, and correlates workflow with real-time orders to detect bottlenecks instantly.
                      </p>
                      
                      <div className="space-y-4">
                          <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><ShieldCheck size={20}/></div>
                              <div>
                                  <h4 className="text-white font-bold text-sm">SOP Compliance Tracking</h4>
                                  <p className="text-slate-400 text-xs mt-1">Automatically flag when handwashing is skipped or cross-contamination occurs.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><AlertTriangle size={20}/></div>
                              <div>
                                  <h4 className="text-white font-bold text-sm">Theft & Wastage Detection</h4>
                                  <p className="text-slate-400 text-xs mt-1">Correlate ingredient pickup with POS orders to identify unauthorized consumption.</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 w-full relative">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                          {/* Live Feed Header */}
                          <div className="absolute top-4 left-4 z-20 flex gap-2">
                              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE
                              </div>
                              <div className="bg-black/50 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20">
                                  CAM-01: PREP STATION
                              </div>
                          </div>
                          
                          {/* Mock CCTV Feed */}
                          <img 
                              src="https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=1200&q=80" 
                              className="w-full aspect-video object-cover opacity-60 grayscale" 
                              alt="Kitchen CCTV Analysis" 
                          />
                          
                          {/* AI Overlays */}
                          <div className="absolute top-[20%] left-[30%] w-[150px] h-[200px] border-2 border-dashed border-emerald-500 rounded-lg flex flex-col justify-end p-2 bg-emerald-500/10">
                              <span className="bg-emerald-600 text-white text-[9px] font-bold px-1 rounded w-fit">Chef: Chopping</span>
                          </div>
                          <div className="absolute top-[30%] right-[20%] w-[120px] h-[150px] border-2 border-dashed border-red-500 rounded-lg flex flex-col justify-end p-2 bg-red-500/10">
                              <span className="bg-red-600 text-white text-[9px] font-bold px-1 rounded w-fit">Alert: No Gloves</span>
                          </div>
                      </div>
                      
                      {/* Floating Stats Card */}
                      <div className="absolute -bottom-6 -left-6 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl w-64 animate-float">
                          <p className="text-xs text-slate-400 font-bold uppercase mb-2">Efficiency Score</p>
                          <div className="flex items-end gap-2">
                              <span className="text-3xl font-black text-white">94%</span>
                              <span className="text-emerald-400 text-xs font-bold mb-1">↑ 12% today</span>
                          </div>
                          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div className="bg-emerald-500 w-[94%] h-full"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Deep Dive Features */}
      <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 space-y-32">
              {DEEP_DIVE_FEATURES.map((feature, index) => {
                  const isEven = index % 2 === 0;
                  return (
                      <div key={index} className={`flex flex-col lg:flex-row items-center gap-16 ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                          <div className="flex-1 space-y-8">
                              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-${feature.color}-600 bg-${feature.color}-50 border border-${feature.color}-100 shadow-sm transform rotate-3`}>
                                  <feature.icon size={32} />
                              </div>
                              <h3 className="text-4xl lg:text-5xl font-bold text-stone-900 leading-tight">{feature.title}</h3>
                              <p className="text-xl text-stone-500 leading-relaxed">{feature.description}</p>
                              
                              <div className="flex flex-wrap gap-3 pt-4">
                                  {feature.tags.map((tag, i) => (
                                      <span key={i} className="px-4 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm font-bold text-stone-600">
                                          {tag}
                                      </span>
                                  ))}
                              </div>
                          </div>
                          <div className="flex-1 w-full">
                              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-100 group hover:shadow-yellow-500/20 transition-all duration-500">
                                  <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
                                  <img src={feature.image} alt={feature.title} className="w-full h-[500px] object-cover transform group-hover:scale-110 transition-transform duration-1000" />
                                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20">
                                      <p className="text-white font-bold text-lg flex items-center gap-2"><CheckCircle2 className="text-yellow-400" /> {feature.tags[0]} Active</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </section>

      {/* How It Works - Process Steps */}
      <section className="py-24 bg-stone-50 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
                <h2 className="text-3xl font-bold text-stone-900">Three Steps to Efficiency</h2>
                <p className="text-stone-500 mt-2 text-lg">We've simplified onboarding so you can see results in minutes.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative">
                <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-stone-300 to-transparent z-0 mx-24 opacity-50"></div>
                {[
                    { title: "Connect Data", desc: "Upload your menu PDF or connect your POS (Petpooja, Posist) in one click.", icon: UploadCloud, color: "blue" },
                    { title: "AI Analysis", desc: "Our AI instantly digitizes your recipes and flags high-cost ingredients.", icon: Brain, color: "purple" },
                    { title: "Take Action", desc: "Get actionable insights: Update prices, train staff with new SOPs, or launch promos.", icon: ArrowUpRight, color: "emerald" }
                ].map((step, i) => (
                    <div key={i} className="relative z-10 text-center group">
                        <div className={`w-24 h-24 bg-white rounded-full border-4 border-stone-200 group-hover:border-yellow-400 flex items-center justify-center mx-auto mb-6 shadow-sm transition-colors duration-300`}>
                            <step.icon size={32} className={`text-stone-400 group-hover:text-yellow-500 group-hover:scale-110 transition-all duration-300`} />
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 mb-2">{step.title}</h3>
                        <p className="text-stone-500 text-sm px-6 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Integrations Section - NEW */}
      <section className="py-24 bg-white border-t border-stone-200">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-4">
                      <Globe size={12} /> Tech Ecosystem
                  </div>
                  <h2 className="text-4xl font-bold text-stone-900">Seamless Integrations</h2>
                  <p className="text-stone-500 mt-2 max-w-2xl mx-auto">We play nice with the tools you already use. Connect your POS, delivery aggregators, and social channels in seconds.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                  {['Petpooja', 'Posist', 'UrbanPiper', 'Zomato', 'Swiggy', 'Instagram', 'Facebook', 'QuickBooks', 'Shopify', 'Razorpay', 'Zoho', 'Google'].map((partner, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 hover:bg-white border border-transparent hover:border-stone-200 hover:shadow-lg transition-all duration-300 group cursor-default">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-stone-400 group-hover:text-stone-900 group-hover:scale-110 transition-transform">
                              <Layers size={24} />
                          </div>
                          <span className="font-bold text-stone-600 group-hover:text-stone-900 text-sm">{partner}</span>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Testimonials Section - NEW */}
      <section className="py-24 bg-stone-900 text-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-yellow-400 text-xs font-bold uppercase tracking-wide mb-4">
                      <Quote size={12} /> Success Stories
                  </div>
                  <h2 className="text-4xl font-bold text-white">Loved by Restaurateurs</h2>
                  <p className="text-stone-400 mt-2 max-w-2xl mx-auto">See how kitchens across the globe are optimizing operations with BistroIntelligence.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {TESTIMONIALS.map((t, i) => (
                      <div key={i} className="bg-stone-800 p-8 rounded-2xl border border-stone-700 relative hover:-translate-y-2 transition-transform duration-300">
                          <div className="absolute top-8 right-8 text-stone-600 opacity-50">
                              <Quote size={40} />
                          </div>
                          <div className="mb-6">
                              <div className="flex gap-1 mb-4">
                                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className="text-yellow-400 fill-current" />)}
                              </div>
                              <p className="text-stone-300 leading-relaxed italic">"{t.quote}"</p>
                          </div>
                          <div className="flex items-center gap-4 mt-auto">
                              <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-stone-600" />
                              <div>
                                  <h4 className="font-bold text-white text-sm">{t.name}</h4>
                                  <p className="text-stone-500 text-xs">{t.role}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 bg-stone-50 border-y border-stone-200">
          <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-stone-900">Why Choose BistroIntelligence?</h2>
                  <p className="text-stone-500 mt-2">Don't let manual processes hold your business back.</p>
              </div>
              <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
                  <div className="grid grid-cols-3 bg-stone-900 text-white p-6 text-sm font-bold uppercase tracking-wider">
                      <div className="text-stone-400">Feature</div>
                      <div className="text-center text-stone-400">Old Way</div>
                      <div className="text-center text-yellow-400">Bistro Way</div>
                  </div>
                  <div className="divide-y divide-stone-100">
                      {COMPARISON_FEATURES.map((item, i) => (
                          <div key={i} className="grid grid-cols-3 p-6 items-center hover:bg-stone-50 transition-colors group">
                              <div className="font-bold text-stone-800">{item.feature}</div>
                              <div className="text-center text-stone-500 text-sm flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <XCircle size={20} className="text-red-400" />
                                  {item.old}
                              </div>
                              <div className="text-center text-stone-900 text-sm font-bold flex flex-col items-center gap-2">
                                  <CheckCircle2 size={24} className="text-emerald-500" />
                                  {item.new}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-24 bg-stone-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-800 border border-stone-700 text-yellow-400 text-xs font-bold uppercase tracking-wide mb-8">
                        <Calculator size={14} /> Profit Simulator
                    </div>
                    <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">Stop leaving money <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">on the table.</span></h2>
                    <p className="text-stone-400 text-xl mb-12 leading-relaxed">See how small optimizations in food cost and labor efficiency compound into massive annual gains.</p>
                    <div className="space-y-8 p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-3 text-stone-300"><span>Monthly Revenue</span><span className="text-yellow-400">₹{(revenue/100000).toFixed(1)} Lakhs</span></div>
                            <input type="range" min="500000" max="10000000" step="100000" value={revenue} onChange={(e) => setRevenue(parseInt(e.target.value))} className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"/>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-3 text-stone-300"><span>Current Food Cost</span><span className="text-white">{foodCostPct}%</span></div>
                            <input type="range" min="20" max="50" step="1" value={foodCostPct} onChange={(e) => setFoodCostPct(parseInt(e.target.value))} className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                        </div>
                    </div>
                </div>
                <div className="bg-white text-stone-900 rounded-[3rem] p-10 shadow-2xl border border-stone-200 text-center transform hover:-translate-y-2 transition-transform duration-500">
                    <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Potential Annual Extra Profit</p>
                    <div className="text-6xl lg:text-7xl font-black text-stone-900 mb-8 tracking-tighter">₹{extraProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div className="h-64 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barSize={60}>
                                <XAxis dataKey="name" stroke="#a8a29e" tick={{fontSize: 14, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#fff' }} formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Annual Profit']} />
                                <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <button onClick={onGetStarted} className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2">
                        Start Optimizing Now <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-stone-900">Simple, Transparent Pricing</h2>
                <p className="text-stone-500 mt-2">Start free, scale as you grow. No hidden fees.</p>
                
                <div className="flex justify-center items-center gap-3 mt-8">
                    <span className={`text-sm font-bold ${!isQuarterly ? 'text-stone-900' : 'text-stone-400'}`}>Monthly</span>
                    <button onClick={() => setIsQuarterly(!isQuarterly)} className="w-12 h-6 bg-stone-900 rounded-full relative transition-colors"><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isQuarterly ? 'left-7' : 'left-1'}`}></div></button>
                    <span className={`text-sm font-bold ${isQuarterly ? 'text-stone-900' : 'text-stone-400'}`}>Quarterly <span className="text-emerald-600 text-xs">(Save 10%)</span></span>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {Object.entries(PLANS).map(([key, plan]) => {
                    const price = isQuarterly ? plan.quarterlyPrice : plan.price;
                    const isPro = key === PlanType.PRO;
                    return (
                        <div key={key} className={`relative p-8 rounded-3xl bg-white border ${isPro ? 'border-yellow-400 shadow-xl scale-105 z-10' : 'border-stone-200 shadow-sm'} flex flex-col transition-transform hover:-translate-y-1`}>
                            {isPro && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-stone-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1"><Star size={10} fill="currentColor"/> Most Popular</div>}
                            <h3 className="text-xl font-bold text-stone-900 mb-2">{plan.name}</h3>
                            <div className="flex items-baseline mb-6"><span className="text-4xl font-black text-stone-900">₹{price.toLocaleString()}</span><span className="text-stone-500 text-sm font-medium">/{isQuarterly ? 'qtr' : 'mo'}</span></div>
                            <p className="text-sm text-stone-500 mb-8 border-b border-stone-100 pb-8">{plan.description}</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-stone-600">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={onGetStarted} className={`w-full py-3 rounded-xl font-bold transition-all ${isPro ? 'bg-yellow-400 text-stone-900 hover:bg-yellow-500' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                                Choose {plan.name}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white border-t border-stone-200">
          <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-center text-stone-900 mb-12">Frequently Asked Questions</h2>
              <div className="space-y-4">
                  {FAQS.map((faq, i) => (
                      <div key={i} className="border border-stone-200 rounded-2xl overflow-hidden transition-all duration-300">
                          <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex justify-between items-center p-6 text-left hover:bg-stone-50 transition-colors">
                              <span className="font-bold text-stone-800">{faq.q}</span>
                              {openFaq === i ? <ChevronUp size={20} className="text-stone-400"/> : <ChevronDown size={20} className="text-stone-400"/>}
                          </button>
                          <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48' : 'max-h-0'}`}>
                              <div className="p-6 pt-0 text-stone-600 text-sm leading-relaxed border-t border-stone-100">
                                  {faq.a}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-2">
                    <Logo iconSize={32} />
                    <p className="text-stone-500 mt-4 text-sm max-w-sm leading-relaxed">
                        The world's most intelligent operating system for restaurants. Built by chefs and engineers to simplify the complexity of food service.
                    </p>
                    <div className="flex gap-4 mt-6">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-900 hover:text-white transition-colors cursor-pointer">
                                <Globe size={14} />
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-stone-900 mb-4">Platform</h4>
                    <ul className="space-y-3 text-sm text-stone-500">
                        <li className="hover:text-stone-900 cursor-pointer">Recipe Costing</li>
                        <li className="hover:text-stone-900 cursor-pointer">Inventory AI</li>
                        <li className="hover:text-stone-900 cursor-pointer">SOP Generator</li>
                        <li className="hover:text-stone-900 cursor-pointer">Kitchen Workflow</li>
                        <li className="hover:text-stone-900 cursor-pointer">Integrations</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-stone-900 mb-4">Company</h4>
                    <ul className="space-y-3 text-sm text-stone-500">
                        <li onClick={() => setActiveLegal('about')} className="hover:text-stone-900 cursor-pointer">About Us</li>
                        <li className="hover:text-stone-900 cursor-pointer">Careers</li>
                        <li className="hover:text-stone-900 cursor-pointer">Blog</li>
                        <li className="hover:text-stone-900 cursor-pointer">Contact</li>
                    </ul>
                </div>
            </div>
            
            <div className="border-t border-stone-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-400">
                <p>&copy; {new Date().getFullYear()} BistroConnect Technologies Pvt Ltd. All rights reserved.</p>
                <div className="flex gap-6">
                    <button onClick={() => setActiveLegal('privacy')} className="hover:text-stone-900">Privacy Policy</button>
                    <button onClick={() => setActiveLegal('terms')} className="hover:text-stone-900">Terms of Service</button>
                    <button onClick={() => setActiveLegal('refund')} className="hover:text-stone-900">Refund Policy</button>
                    <button onClick={() => setActiveLegal('cancellation')} className="hover:text-stone-900">Cancellation Policy</button>
                </div>
            </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDemo(false)}>
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl shadow-2xl overflow-hidden border border-stone-800" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={() => setShowDemo(false)}
                    className="absolute top-6 right-6 z-10 p-3 bg-black/50 hover:bg-white hover:text-black text-white rounded-full transition-all backdrop-blur-sm border border-white/10"
                >
                    <X size={24} />
                </button>
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/ysz5S6PUM-U?autoplay=1&modestbranding=1&rel=0" 
                    title="BistroIntelligence Demo" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
        </div>
      )}

      {/* Legal Modal */}
      {activeLegal && (
          <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveLegal(null)}>
              <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                      <h3 className="text-xl font-bold text-stone-900">{LEGAL_CONTENT[activeLegal].title}</h3>
                      <button onClick={() => setActiveLegal(null)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-8 overflow-y-auto leading-relaxed">
                      {LEGAL_CONTENT[activeLegal].content}
                  </div>
                  <div className="p-6 border-t border-stone-100 bg-stone-50 text-right">
                      <button onClick={() => setActiveLegal(null)} className="px-6 py-2 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors">Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
