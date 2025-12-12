
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

interface ChatAssistantProps {
    welcomeMessage?: string;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
    welcomeMessage = 'Hello! I\'m your Bistro Chef assistant. I can help you navigate the app or answer questions about your restaurant operations. How can I help?' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', text: welcomeMessage }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Prepare history for API
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            
            const responseText = await getChatResponse(history, input);
            
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: responseText };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: "I'm having trouble connecting right now. Please check your API key configuration." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end font-sans">
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-scale-in origin-bottom-right">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-sm">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-none">Bistro Chef</h3>
                                <span className="text-[10px] text-indigo-100 opacity-80">Powered by Gemini 3 Pro</span>
                            </div>
                        </div>
                        <button onClick={toggleChat} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything..."
                                className="flex-1 px-3 py-2 bg-transparent border-none text-sm focus:ring-0 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                                autoFocus
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={toggleChat}
                className="group relative flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
                {isOpen ? (
                    <X size={28} />
                ) : (
                    <>
                        <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </>
                )}
            </button>
        </div>
    );
};
