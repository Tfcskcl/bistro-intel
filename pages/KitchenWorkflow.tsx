
import React, { useState, useEffect, useRef } from 'react';
import { User, KitchenWorkflowRequest, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { generateKitchenWorkflow } from '../services/geminiService';
import { CREDIT_COSTS } from '../constants';
import { GitMerge, Upload, FileVideo, Image as ImageIcon, CheckCircle2, Clock, Wallet, Loader2, PlayCircle, Eye, Edit3, Send, X, Trash2, ArrowLeft, Sparkles } from 'lucide-react';

interface KitchenWorkflowProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

export const KitchenWorkflow: React.FC<KitchenWorkflowProps> = ({ user, onUserUpdate }) => {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role);
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    
    // Data State
    const [requests, setRequests] = useState<KitchenWorkflowRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<KitchenWorkflowRequest | null>(null);

    // Form State (Customer)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<{name: string, type: 'image' | 'video', size: string}[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Admin State
    const [adminDraft, setAdminDraft] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        refreshData();
    }, [user.id, isAdmin]);

    const refreshData = () => {
        const all = storageService.getAllKitchenWorkflowRequests();
        if (isAdmin) {
            setRequests(all.sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
        } else {
            setRequests(all.filter(r => r.userId === user.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                name: file.name,
                type: file.type.startsWith('video') ? 'video' : 'image' as any,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
            }));
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;
        
        // Credit Check
        if (!isAdmin) {
            if (user.credits < CREDIT_COSTS.WORKFLOW) {
                alert(`Insufficient credits. Need ${CREDIT_COSTS.WORKFLOW} CR.`);
                return;
            }
            if (onUserUpdate) {
                const success = storageService.deductCredits(user.id, CREDIT_COSTS.WORKFLOW, 'Kitchen Workflow Request');
                if (success) {
                    onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.WORKFLOW });
                } else {
                    return;
                }
            }
        }

        setIsSubmitting(true);
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newReq: KitchenWorkflowRequest = {
            id: `kw_${Date.now()}`,
            userId: user.id,
            userName: user.name,
            title,
            description,
            mediaFiles: files,
            status: 'pending',
            requestDate: new Date().toISOString()
        };

        storageService.saveKitchenWorkflowRequest(newReq);
        refreshData();
        setIsSubmitting(false);
        setView('list');
        setTitle('');
        setDescription('');
        setFiles([]);
        alert("Request submitted successfully!");
    };

    const openRequest = (req: KitchenWorkflowRequest) => {
        setSelectedRequest(req);
        setAdminDraft(req.adminResponse || '');
        setView('detail');
    };

    // Admin Actions
    const generateDraft = async () => {
        if (!selectedRequest) return;
        setIsGenerating(true);
        try {
            const draft = await generateKitchenWorkflow(selectedRequest.description);
            setAdminDraft(draft);
        } catch (e) {
            alert("AI Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const approveRequest = () => {
        if (!selectedRequest) return;
        const updated: KitchenWorkflowRequest = {
            ...selectedRequest,
            status: 'approved',
            adminResponse: adminDraft,
            completedDate: new Date().toISOString()
        };
        storageService.updateKitchenWorkflowRequest(updated);
        refreshData();
        setView('list');
        alert("Workflow approved and sent to client.");
    };

    const rejectRequest = () => {
        if (!selectedRequest) return;
        if (!confirm("Are you sure you want to reject this request?")) return;
        const updated: KitchenWorkflowRequest = {
            ...selectedRequest,
            status: 'rejected',
            completedDate: new Date().toISOString()
        };
        storageService.updateKitchenWorkflowRequest(updated);
        refreshData();
        setView('list');
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setView('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                        {isAdmin ? 'Request Queue' : 'My Requests'}
                    </button>
                    {!isAdmin && (
                        <button 
                            onClick={() => setView('create')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${view === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                            <GitMerge size={16} /> New Request
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-full text-xs font-bold">
                    <Wallet size={12} fill="currentColor" />
                    Credits: {user.credits}
                </div>
            </div>

            {/* List View */}
            {view === 'list' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto flex-1">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">{isAdmin ? 'Incoming Workflow Requests' : 'Your Kitchen Optimizations'}</h2>
                    {requests.length === 0 ? (
                        <p className="text-slate-500 text-center py-12">No requests found.</p>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(req => (
                                <div key={req.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg hover:border-emerald-300 transition-all bg-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${
                                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 
                                            req.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                                        }`}>
                                            {req.status === 'approved' ? <CheckCircle2 size={20} /> : req.status === 'rejected' ? <X size={20} /> : <Clock size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{req.title}</h4>
                                            <p className="text-xs text-slate-500">
                                                {isAdmin ? `By: ${req.userName}` : req.status === 'pending' ? 'Waiting for admin review' : `Status: ${req.status}`} 
                                                • {new Date(req.requestDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openRequest(req)}
                                        className="px-4 py-2 border bg-white hover:bg-slate-50 rounded-lg text-sm font-bold text-slate-600"
                                    >
                                        {isAdmin ? 'Review' : 'View Details'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create View (Customer) */}
            {view === 'create' && (
                <div className="max-w-2xl mx-auto w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Kitchen Workflow</h2>
                    <p className="text-slate-500 mb-6">Upload videos or images of your kitchen layout. Our experts (and AI) will design an optimized workflow for you. Cost: {CREDIT_COSTS.WORKFLOW} CR.</p>
                    
                    <form onSubmit={handleSubmitRequest} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Workflow Title</label>
                            <input 
                                type="text" 
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Burger Assembly Line Optimization"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description & Pain Points</label>
                            <textarea 
                                required
                                rows={4}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe current issues (e.g. collision between prep and plating, slow dispatch) and what you want to improve..."
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Upload Media (Video/Images)</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-colors"
                            >
                                <Upload size={32} className="text-slate-400 mb-2" />
                                <p className="text-sm font-bold text-slate-600">Click to upload files</p>
                                <p className="text-xs text-slate-400">Max 50MB per file</p>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {file.type === 'video' ? <FileVideo size={20} className="text-blue-500"/> : <ImageIcon size={20} className="text-pink-500"/>}
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                                    <p className="text-xs text-slate-400">{file.size}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-red-100 text-red-500 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setView('list')} className="px-6 py-2 text-slate-500 hover:text-slate-800 font-bold">Cancel</button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !title || files.length === 0}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedRequest && (
                <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                    {/* Left: Request Info & Media */}
                    <div className="w-full lg:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <button onClick={() => setView('list')} className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-4 hover:text-slate-800">
                                <ArrowLeft size={12} /> Back
                            </button>
                            <h2 className="text-xl font-bold text-slate-800">{selectedRequest.title}</h2>
                            <p className="text-sm text-slate-500 mt-1">Requested by {selectedRequest.userName}</p>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
                            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6">
                                {selectedRequest.description}
                            </p>

                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Uploaded Media</h4>
                            <div className="space-y-3">
                                {selectedRequest.mediaFiles.map((file, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                                        {file.type === 'video' ? <FileVideo className="text-blue-500" /> : <ImageIcon className="text-pink-500" />}
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-400">{file.size}</p>
                                        </div>
                                        <button className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-600 hover:bg-slate-200">
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Workspace (Editor / Output) */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <GitMerge size={20} className="text-emerald-600" /> Workflow Design
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    selectedRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col p-6 overflow-hidden">
                            {isAdmin && selectedRequest.status === 'pending' ? (
                                <>
                                    <div className="mb-4 flex justify-end">
                                        <button 
                                            onClick={generateDraft}
                                            disabled={isGenerating}
                                            className="text-xs flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 font-bold"
                                        >
                                            {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />} 
                                            Generate AI Draft
                                        </button>
                                    </div>
                                    <textarea 
                                        value={adminDraft}
                                        onChange={(e) => setAdminDraft(e.target.value)}
                                        className="flex-1 w-full p-4 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                        placeholder="Design the workflow here using markdown..."
                                    />
                                    <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={rejectRequest} className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg text-sm">Reject</button>
                                        <button 
                                            onClick={approveRequest}
                                            disabled={!adminDraft}
                                            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50"
                                        >
                                            Approve & Send
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 rounded-lg border border-slate-200">
                                    {selectedRequest.adminResponse ? (
                                        <div className="prose prose-sm max-w-none text-slate-700">
                                            {/* Simple markdown rendering simulation */}
                                            {selectedRequest.adminResponse.split('\n').map((line, i) => (
                                                <p key={i} className={`mb-2 ${line.startsWith('#') ? 'font-bold text-slate-900 text-lg mt-4' : ''}`}>
                                                    {line.replace(/#/g, '')}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">
                                            <p>Workflow design pending approval.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
