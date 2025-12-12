
import React, { useState, useEffect } from 'react';
import { User, Task } from '../types';
import { storageService, storageEvents } from '../services/storageService';
import { CheckSquare, Plus, Trash2, Tag, Filter, CheckCircle2, Circle, X, Calendar } from 'lucide-react';

interface TaskManagerProps {
    user: User;
}

const AVAILABLE_TAGS = [
    { name: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
    { name: 'Kitchen', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
    { name: 'FOH', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    { name: 'Personal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
    { name: 'Admin', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
    { name: 'Work', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
];

export const TaskManager: React.FC<TaskManagerProps> = ({ user }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState('All');

    useEffect(() => {
        const load = () => setTasks(storageService.getTasks(user.id));
        load();
        
        window.addEventListener(storageEvents.DATA_UPDATED, load);
        return () => window.removeEventListener(storageEvents.DATA_UPDATED, load);
    }, [user.id]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTask: Task = {
            id: `task_${Date.now()}`,
            text: newTaskText,
            completed: false,
            tags: selectedTags.length > 0 ? selectedTags : [],
            createdAt: new Date().toISOString()
        };

        const updatedTasks = [newTask, ...tasks];
        setTasks(updatedTasks);
        storageService.saveTasks(user.id, updatedTasks);
        setNewTaskText('');
        setSelectedTags([]);
    };

    const toggleTask = (id: string) => {
        const updatedTasks = tasks.map(t => 
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        setTasks(updatedTasks);
        storageService.saveTasks(user.id, updatedTasks);
    };

    const deleteTask = (id: string) => {
        const updatedTasks = tasks.filter(t => t.id !== id);
        setTasks(updatedTasks);
        storageService.saveTasks(user.id, updatedTasks);
    };

    const toggleTagSelection = (tagName: string) => {
        if (selectedTags.includes(tagName)) {
            setSelectedTags(selectedTags.filter(t => t !== tagName));
        } else {
            setSelectedTags([...selectedTags, tagName]);
        }
    };

    const filteredTasks = activeFilter === 'All' 
        ? tasks 
        : tasks.filter(t => t.tags.includes(activeFilter));

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col items-center">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                
                {/* Header & Input */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <CheckSquare size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Daily Operations & Tasks</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage your to-do list efficiently</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddTask} className="space-y-4">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="What needs to be done?"
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                            <button 
                                type="submit" 
                                disabled={!newTaskText.trim()}
                                className="bg-slate-900 dark:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus size={20} /> <span className="hidden sm:inline">Add Task</span>
                            </button>
                        </div>
                        
                        {/* Tag Selector */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase mr-2 flex items-center gap-1">
                                <Tag size={12} /> Tags:
                            </span>
                            {AVAILABLE_TAGS.map(tag => (
                                <button
                                    key={tag.name}
                                    type="button"
                                    onClick={() => toggleTagSelection(tag.name)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                        selectedTags.includes(tag.name)
                                            ? tag.color + ' ring-2 ring-offset-1 dark:ring-offset-slate-900 ring-slate-400'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>

                {/* Filter Bar */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    <span className="text-xs text-slate-400"><Filter size={14} /></span>
                    <button 
                        onClick={() => setActiveFilter('All')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            activeFilter === 'All' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        All Tasks
                    </button>
                    {AVAILABLE_TAGS.map(tag => (
                        <button
                            key={tag.name}
                            onClick={() => setActiveFilter(tag.name)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                                activeFilter === tag.name 
                                    ? tag.color 
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>No tasks found.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div 
                                key={task.id} 
                                className={`flex items-start gap-4 p-4 rounded-xl border transition-all group ${
                                    task.completed 
                                        ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-sm'
                                }`}
                            >
                                <button 
                                    onClick={() => toggleTask(task.id)}
                                    className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}
                                >
                                    {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </button>
                                
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {task.text}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                        {task.tags.map(tagName => {
                                            const tagConfig = AVAILABLE_TAGS.find(t => t.name === tagName);
                                            return (
                                                <span 
                                                    key={tagName} 
                                                    className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${tagConfig?.color || 'bg-slate-100 text-slate-600'}`}
                                                >
                                                    {tagName}
                                                </span>
                                            );
                                        })}
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                                            <Calendar size={10} />
                                            {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => deleteTask(task.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
