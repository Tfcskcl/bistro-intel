
import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { ArrowRight, CheckCircle2, TrendingUp, ChefHat, FileText, Zap, Star, PlayCircle, Quote, Calculator, Server, BarChart3, ArrowUpRight, DollarSign, Mail, Phone, MapPin, X } from 'lucide-react';
import { PLANS } from '../constants';
import { PlanType } from '../types';

interface LandingProps {
  onGetStarted: () => void;
}

type LegalSection = 'privacy' | 'terms' | 'refund' | null;

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
                
                <h4 className="font-bold text-slate-900 mt-4">1. Subscription Cancellation</h4>
                <p>You may cancel your subscription at any time via the 'Plans & Billing' section of your dashboard. Your access will continue until the end of your current billing cycle.</p>

                <h4 className="font-bold text-slate-900 mt-4">2. Refunds</h4>
                <p>We do not offer refunds for partial months of service, upgrade/downgrade refunds, or refunds for months unused with an open account. However, exceptions may be made in the following circumstances:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>If there was a technical error in billing (e.g., double charge).</li>
                    <li>If the service was unavailable for a significant period (uptime &lt; 99%) as per our SLA.</li>
                </ul>
                <p>To request a refund, please contact support at info@bistroconnect.in within 7 days of the billing date.</p>
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

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => {
  const [activeLegal, setActiveLegal] = useState<LegalSection>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [isQuarterly, setIsQuarterly] = useState(false);
  
  // ROI Calculator State
  const [revenue, setRevenue] = useState(1500000);
  const annualSavings = (revenue * 12 * 0.12).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-yellow-200">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo iconSize={24} light={true} />
          <div className="flex items-center gap-6">
            <button 
                onClick={onGetStarted}
                className="hidden md:block text-slate-300 font-medium hover:text-white transition-colors"
            >
                Log In
            </button>
            <button 
                onClick={onGetStarted}
                className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-lg hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 active:scale-95"
            >
                Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900 text-white">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 right-0 -translate-y-20 translate-x-20 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-20 -translate-x-20 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-in relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                <Star size={12} fill="currentColor" />
                <span>#1 Operations OS for Restaurants</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              The Intelligence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">Your Kitchen Craves.</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
              BistroIntelligence replaces gut feeling with data. Automate recipe costing, standardize SOPs, and unlock hidden profits with our AI Co-pilot.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-bold rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                Start Free Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setShowDemo(true)}
                className="px-8 py-4 bg-slate-800 text-white text-lg font-bold rounded-xl border border-slate-700 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 hover:shadow-lg"
              >
                <PlayCircle size={20} /> Watch Demo
              </button>
            </div>

            <div className="flex items-center gap-6 pt-6 border-t border-slate-800">
               <div className="flex flex-col">
                   <span className="text-3xl font-bold text-white">500+</span>
                   <span className="text-xs text-slate-500 uppercase tracking-wide">Active Kitchens</span>
               </div>
               <div className="w-px h-10 bg-slate-800"></div>
               <div className="flex flex-col">
                   <span className="text-3xl font-bold text-white">₹45cr</span>
                   <span className="text-xs text-slate-500 uppercase tracking-wide">Costs Optimized</span>
               </div>
            </div>
          </div>

          <div className="relative z-10 lg:h-[600px] flex items-center">
            {/* Dashboard Mockup Container */}
            <div className="relative w-full animate-float">
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 to-emerald-500 rounded-2xl blur-lg opacity-30 transform translate-y-4"></div>
                <div className="relative bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-2xl">
                    <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
                        alt="Bistro Dashboard" 
                        className="rounded-xl w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                    />
                    
                    {/* Floating Cards */}
                    <div className="absolute -left-8 top-20 bg-white p-4 rounded-xl shadow-xl border border-slate-100 max-w-[200px] hidden md:block animate-bounce-slow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <TrendingUp size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Profit Margin</p>
                                <p className="text-lg font-bold text-slate-900">+12.4%</p>
                            </div>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-[75%]"></div>
                        </div>
                    </div>

                    <div className="absolute -right-6 bottom-20 bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-700 max-w-[220px] hidden md:block">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-slate-900 font-bold">
                                AI
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Insight Detected</p>
                                <p className="text-sm font-medium text-white">"Switch avocado supplier to save ₹2.5k/week"</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trusted By Strip */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Powering modern brands</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Simulated Logo Placeholders */}
                {['Acai by the Bay', 'The Paratha Project', 'Sattva Cafe', 'Heartful Cravings'].map((brand, i) => (
                    <span key={i} className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-800 rounded-full"></div> {brand}
                    </span>
                ))}
            </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Complete Kitchen Intelligence</h2>
                <p className="text-lg text-slate-600">Replace disconnected spreadsheets with a unified operating system designed for growth.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {
                        icon: ChefHat,
                        color: 'yellow',
                        title: 'Precision Recipe Costing',
                        desc: 'Calculate exact food costs down to the gram. Our AI suggests menu pricing based on real-time ingredient rates and margin goals.',
                        tags: ['Menu Engineering', 'Margin Protection']
                    },
                    {
                        icon: FileText,
                        color: 'emerald',
                        title: 'AI SOP Generator',
                        desc: 'Standardize operations instantly. Type "Opening Checklist" and generate detailed, compliant procedures in seconds.',
                        tags: ['Staff Training', 'Quality Control']
                    },
                    {
                        icon: Zap,
                        color: 'purple',
                        title: 'Strategy & Forecasting',
                        desc: 'Your personal AI CFO. Chat with your data to uncover sales trends, waste patterns, and actionable revenue opportunities.',
                        tags: ['Predictive Analytics', 'Growth Hacking']
                    }
                ].map((feature, idx) => (
                    <div key={idx} className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity bg-${feature.color}-500 rounded-bl-2xl`}>
                            <feature.icon size={64} className={`text-${feature.color}-600`} />
                        </div>
                        
                        <div className={`w-14 h-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 text-${feature.color}-600`}>
                            <feature.icon size={28} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                        <p className="text-slate-600 leading-relaxed mb-6">
                            {feature.desc}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                            {feature.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">How BistroIntelligence Works</h2>
                <p className="text-slate-600 mt-2">Transform your operations in three simple steps.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
                <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-slate-200 z-0 mx-24"></div>
                
                {[
                    { title: "Connect", desc: "Sync your POS & Inventory", icon: Server },
                    { title: "Analyze", desc: "AI scans for inefficiencies", icon: BarChart3 },
                    { title: "Optimize", desc: "Execute profitable strategies", icon: ArrowUpRight }
                ].map((step, i) => (
                    <div key={i} className="relative z-10 text-center">
                        <div className="w-24 h-24 bg-white rounded-full border-4 border-slate-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <step.icon size={32} className="text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                        <p className="text-slate-500">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Kitchen Visuals Gallery - Updated Images */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-slate-900">Built for the Heat of the Kitchen</h2>
                <p className="text-slate-600 mt-2 max-w-2xl mx-auto">
                    Designed by restaurateurs, for restaurateurs. We understand the chaos of service and the precision required for profitability.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-[600px]">
                {/* Large Left Image */}
                <div className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden group shadow-lg">
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/0 transition-colors z-10"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80" 
                        alt="Plated Food" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 left-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent w-full">
                        <p className="text-white font-bold text-lg">Streamlined Workflow</p>
                        <p className="text-slate-200 text-sm">Orchestrate your team with digital precision.</p>
                    </div>
                </div>

                {/* Top Right Small */}
                <div className="relative rounded-2xl overflow-hidden group shadow-lg">
                    <img 
                        src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80" 
                        alt="Bar service" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                    />
                </div>

                {/* Top Right Small 2 */}
                <div className="relative rounded-2xl overflow-hidden group shadow-lg">
                    <img 
                        src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80" 
                        alt="Cafe atmosphere" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                    />
                </div>

                {/* Bottom Wide */}
                <div className="md:col-span-2 relative rounded-2xl overflow-hidden group shadow-lg">
                     <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/0 transition-colors z-10"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" 
                        alt="Fresh ingredients" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 left-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent w-full">
                        <p className="text-white font-bold text-lg">Inventory Control</p>
                        <p className="text-slate-200 text-sm">Track every gram, reducing waste and boosting margin.</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase mb-6">
                    <Calculator size={14} /> Profit Simulator
                </div>
                <h2 className="text-3xl font-bold mb-4">See your potential savings</h2>
                <p className="text-slate-400 text-lg mb-8">
                    Based on our average user data, BistroIntel helps restaurants reduce food costs by ~5-8% and operational waste by ~10%.
                </p>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm font-bold mb-2">
                            <span>Monthly Revenue</span>
                            <span className="text-emerald-400">₹{revenue.toLocaleString()}</span>
                        </div>
                        <input 
                            type="range" 
                            min="500000" 
                            max="5000000" 
                            step="100000"
                            value={revenue}
                            onChange={(e) => setRevenue(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>₹5L</span>
                            <span>₹50L+</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-slate-400 font-medium mb-2">Estimated Annual Savings</h3>
                <div className="text-5xl font-bold text-white mb-2 flex items-baseline gap-2">
                    ₹{annualSavings}
                    <span className="text-lg text-emerald-400 font-medium">*</span>
                </div>
                <p className="text-sm text-slate-500 mb-8">* Projected based on 12% margin improvement.</p>
                <button 
                    onClick={onGetStarted}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-all"
                >
                    Unlock My Savings
                </button>
            </div>
        </div>
      </section>

      {/* Social Proof / Wall of Love */}
      <section className="py-24 bg-white text-slate-900 relative">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                   <div className="mb-4 flex justify-center">
                        {[1,2,3,4,5].map(i => <Star key={i} size={24} className="text-yellow-400 fill-yellow-400" />)}
                   </div>
                   <h2 className="text-4xl font-bold mb-4">Loved by Restaurateurs Across India</h2>
                   <p className="text-slate-500 text-lg">Join hundreds of businesses transforming their operations.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  {TESTIMONIALS.map((t, i) => (
                      <div key={i} className="bg-slate-50 p-8 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                          <Quote className="text-yellow-500 mb-6 opacity-50" size={32} />
                          <p className="text-lg text-slate-600 mb-8 leading-relaxed italic">
                              "{t.quote}"
                          </p>
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0">
                                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
      <section className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
                <p className="text-lg text-slate-600 mt-2">Start for free. Upgrade as you scale.</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mb-12">
                <span className={`text-sm font-bold ${!isQuarterly ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
                <button 
                    onClick={() => setIsQuarterly(!isQuarterly)}
                    className="w-12 h-6 bg-emerald-600 rounded-full relative transition-colors focus:outline-none"
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${isQuarterly ? 'left-7' : 'left-1'}`}></div>
                </button>
                <span className={`text-sm font-bold ${isQuarterly ? 'text-slate-900' : 'text-slate-500'}`}>Quarterly</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Save ~10%</span>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {Object.entries(PLANS).map(([key, plan]) => {
                    const isPro = key === 'PRO';
                    const isPlus = key === 'PRO_PLUS';
                    const displayPrice = isQuarterly ? plan.quarterlyPrice : plan.price;
                    
                    return (
                        <div key={key} className={`bg-white rounded-2xl p-8 flex flex-col relative transition-transform duration-300 hover:-translate-y-2 ${isPro ? 'border-2 border-yellow-400 shadow-2xl z-10 scale-105' : 'border border-slate-200 shadow-lg'}`}>
                            {isPro && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className={`text-xl font-bold ${isPlus ? 'text-purple-600' : 'text-slate-900'}`}>{plan.name}</h3>
                                <div className="flex items-baseline mt-4">
                                    <span className="text-4xl font-extrabold text-slate-900">₹{displayPrice.toLocaleString()}</span>
                                    <span className="text-slate-500 font-medium ml-1">/{isQuarterly ? 'qtr' : 'mo'}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">+ Taxes applicable</p>
                            </div>

                            <div className="h-px bg-slate-100 mb-6"></div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                                        <div className={`mt-0.5 rounded-full p-0.5 ${isPro ? 'bg-yellow-100 text-yellow-700' : isPlus ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                            <CheckCircle2 size={12} />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            
                            <button 
                                onClick={onGetStarted}
                                className={`w-full py-4 rounded-xl font-bold transition-all ${
                                    isPro 
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' 
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

      {/* CTA Band */}
      <section className="py-20 bg-emerald-600 text-white">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-6">Ready to optimize your kitchen?</h2>
                <p className="text-emerald-100 text-lg mb-8">Join over 2,000 restaurants using BistroIntelligence to save costs and boost efficiency.</p>
                <button 
                    onClick={onGetStarted}
                    className="px-10 py-4 bg-white text-emerald-800 font-bold rounded-xl shadow-xl hover:bg-slate-50 transition-colors"
                >
                    Get Started for Free
                </button>
            </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                  <Logo iconSize={24} light={true} />
                  <p className="mt-6 text-slate-500 text-sm leading-relaxed max-w-sm">
                      BistroIntelligence is the modern operating system for forward-thinking restaurants. 
                      We combine AI with operational expertise to help you build a more profitable business.
                  </p>
                  <div className="flex gap-4 mt-6">
                      {/* Social placeholders */}
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"></div>)}
                  </div>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6">Legal</h4>
                  <ul className="space-y-3 text-sm">
                      <li><button onClick={() => setActiveLegal('privacy')} className="hover:text-yellow-400 transition-colors text-left">Privacy Policy</button></li>
                      <li><button onClick={() => setActiveLegal('terms')} className="hover:text-yellow-400 transition-colors text-left">Terms & Conditions</button></li>
                      <li><button onClick={() => setActiveLegal('refund')} className="hover:text-yellow-400 transition-colors text-left">Return & Refund Policy</button></li>
                  </ul>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-6">Contact</h4>
                  <ul className="space-y-4 text-sm">
                      <li className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-yellow-400">
                             <Mail size={16} />
                          </div>
                          info@bistroconnect.in
                      </li>
                      <li className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-yellow-400">
                             <Phone size={16} />
                          </div>
                          0731-6981639
                      </li>
                      <li className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-yellow-400">
                             <MapPin size={16} />
                          </div>
                          Indore, India
                      </li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 border-t border-slate-800 pt-8 text-center text-sm text-slate-600">
              © 2024 BistroIntelligence Inc. All rights reserved.
          </div>
      </footer>

      {/* Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
            <button 
              onClick={() => setShowDemo(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-slate-800 text-white rounded-full z-10 transition-all backdrop-blur-sm border border-white/10"
            >
              <X size={24} />
            </button>
            <div className="w-full h-full flex items-center justify-center text-white bg-slate-800">
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
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
