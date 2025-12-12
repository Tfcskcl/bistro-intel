
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, KitchenLayout } from '../types';
import { generateKitchenLayout } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { CREDIT_COSTS } from '../constants';
import { 
    PenTool, Loader2, Sparkles, Box, Zap, Droplets, 
    ArrowRight, Download, Ruler, Image as ImageIcon, 
    X, RotateCw, Move, Grid, Layout, Layers,
    Maximize, Minimize, Plus, Trash2, Save, MousePointer2, Upload, CheckCircle2
} from 'lucide-react';

interface KitchenLayoutDesignerProps {
    user: User;
    onUserUpdate?: (user: User) => void;
}

// Internal types for the visual designer
interface PlacedItem {
    id: string;
    name: string;
    category: 'cooking' | 'refrigeration' | 'prep' | 'washing' | 'furniture' | 'service';
    x: number; // Grid X position
    y: number; // Grid Y position
    width: number; // Grid units
    height: number; // Grid units
    rotation: number; // 0, 90, 180, 270
    specs?: {
        power?: string;
        water?: string;
    };
    color?: string;
}

// Catalog of items user can drag in manually
const EQUIPMENT_CATALOG = {
    cooking: [
        { name: '4-Burner Range', width: 3, height: 3, color: 'bg-red-100 border-red-300', specs: { power: '3kW Gas', water: 'None' } },
        { name: 'Convection Oven', width: 3, height: 3, color: 'bg-red-100 border-red-300', specs: { power: '5kW 3-Phase', water: 'None' } },
        { name: 'Grill / Plancha', width: 3, height: 2, color: 'bg-red-100 border-red-300', specs: { power: '4kW Gas', water: 'None' } },
        { name: 'Deep Fryer', width: 2, height: 3, color: 'bg-red-100 border-red-300', specs: { power: '2.5kW', water: 'None' } },
    ],
    refrigeration: [
        { name: 'Walk-in Fridge', width: 6, height: 5, color: 'bg-blue-100 border-blue-300', specs: { power: '1.5kW', water: 'Drain' } },
        { name: 'Reach-in Freezer', width: 3, height: 3, color: 'bg-blue-100 border-blue-300', specs: { power: '1kW', water: 'None' } },
        { name: 'Undercounter Fridge', width: 3, height: 3, color: 'bg-blue-100 border-blue-300', specs: { power: '0.5kW', water: 'None' } },
    ],
    prep: [
        { name: 'SS Work Table', width: 4, height: 3, color: 'bg-emerald-100 border-emerald-300', specs: { power: 'None', water: 'None' } },
        { name: 'Prep Counter', width: 5, height: 3, color: 'bg-emerald-100 border-emerald-300', specs: { power: '0.3kW', water: 'None' } },
        { name: 'Wall Shelf', width: 4, height: 1, color: 'bg-emerald-50 border-emerald-200', specs: { power: 'None', water: 'None' } },
    ],
    washing: [
        { name: '3-Compartment Sink', width: 5, height: 3, color: 'bg-cyan-100 border-cyan-300', specs: { power: 'None', water: 'Hot/Cold Inlet' } },
        { name: 'Dishwasher Hood', width: 3, height: 3, color: 'bg-cyan-100 border-cyan-300', specs: { power: '6kW 3-Phase', water: 'Inlet/Drain' } },
        { name: 'Hand Sink', width: 2, height: 2, color: 'bg-cyan-50 border-cyan-200', specs: { power: 'None', water: 'Cold Inlet' } },
    ],
    service: [
        { name: 'Pass Window', width: 6, height: 2, color: 'bg-amber-100 border-amber-300', specs: { power: 'None', water: 'None' } },
        { name: 'Heat Lamp Station', width: 4, height: 2, color: 'bg-amber-50 border-amber-200', specs: { power: '1.2kW', water: 'None' } },
    ]
};

// 1 Grid Unit = 1 Foot (approx)
const GRID_SIZE = 40; 

export const KitchenLayoutDesigner: React.FC<KitchenLayoutDesignerProps> = ({ user, onUserUpdate }) => {
    // Canvas State
    const [kitchenDims, setKitchenDims] = useState({ length: 20, width: 30 }); // in feet
    const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    
    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI Form State
    const [cuisine, setCuisine] = useState('');
    const [kitchenType, setKitchenType] = useState('Commercial Closed Kitchen');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Catalog Sidebar State
    const [activeCategory, setActiveCategory] = useState<keyof typeof EQUIPMENT_CATALOG>('cooking');

    // New Features: Sketch & MEP
    const [sketchImage, setSketchImage] = useState<string | null>(null);
    const [sketchOpacity, setSketchOpacity] = useState(0.5);
    const [viewMode, setViewMode] = useState<'layout' | 'utilities'>('layout');

    // --- UTILITIES CALCULATOR ---
    const mepStats = useMemo(() => {
        let totalPower = 0;
        let waterPoints = 0;
        placedItems.forEach(item => {
            if (item.specs?.power && item.specs.power !== 'None') {
                const kw = parseFloat(item.specs.power) || 1.5; // fallback
                totalPower += kw;
            }
            if (item.specs?.water && item.specs.water !== 'None') {
                waterPoints += 1;
            }
        });
        return { totalPower, waterPoints };
    }, [placedItems]);

    // --- AI GENERATION LOGIC ---
    const findCatalogItem = (name: string) => {
        for (const cat of Object.values(EQUIPMENT_CATALOG)) {
            const found = cat.find(i => i.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(i.name.toLowerCase()));
            if (found) return found;
        }
        return null;
    }

    const handleAIGenerate = async () => {
        if (!cuisine) {
            setError("Please specify a cuisine type.");
            return;
        }
        if (user.credits < CREDIT_COSTS.LAYOUT) {
            setError("Insufficient credits.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // Deduct credits
            if (onUserUpdate) {
                storageService.deductCredits(user.id, CREDIT_COSTS.LAYOUT, 'Kitchen Layout Gen');
                onUserUpdate({ ...user, credits: user.credits - CREDIT_COSTS.LAYOUT });
            }

            const area = kitchenDims.length * kitchenDims.width;
            
            // Pass the sketch image if available for multimodal analysis
            const rawLayout = await generateKitchenLayout(
                cuisine, 
                kitchenType, 
                area, 
                "Optimize for efficiency", 
                sketchImage || undefined
            );
            
            // CONVERT AI RESPONSE TO COORDINATES
            const newItems: PlacedItem[] = [];
            const zones = rawLayout.zones || [];
            
            // Layout Strategy: Quadrants
            // Extended mapping to catch more AI variations
            const zoneMap: Record<string, {startX: number, startY: number, color: string, cat: any}> = {
                'Storage': { startX: 1, startY: 1, color: 'bg-blue-100 border-blue-300', cat: 'refrigeration' },
                'Cold': { startX: 1, startY: 1, color: 'bg-blue-100 border-blue-300', cat: 'refrigeration' },
                
                'Prep': { startX: kitchenDims.length / 2 + 1, startY: 1, color: 'bg-emerald-100 border-emerald-300', cat: 'prep' },
                
                'Cook': { startX: 1, startY: kitchenDims.width / 2 + 1, color: 'bg-red-100 border-red-300', cat: 'cooking' },
                'Hot': { startX: 1, startY: kitchenDims.width / 2 + 1, color: 'bg-red-100 border-red-300', cat: 'cooking' },
                
                'Dish': { startX: kitchenDims.length - 6, startY: kitchenDims.width - 6, color: 'bg-cyan-100 border-cyan-300', cat: 'washing' },
                'Wash': { startX: kitchenDims.length - 6, startY: kitchenDims.width - 6, color: 'bg-cyan-100 border-cyan-300', cat: 'washing' },
                'Scullery': { startX: kitchenDims.length - 6, startY: kitchenDims.width - 6, color: 'bg-cyan-100 border-cyan-300', cat: 'washing' },
                
                'Service': { startX: kitchenDims.length / 2 - 3, startY: kitchenDims.width / 2, color: 'bg-amber-100 border-amber-300', cat: 'service' },
                'Pass': { startX: kitchenDims.length / 2 - 3, startY: kitchenDims.width / 2, color: 'bg-amber-100 border-amber-300', cat: 'service' }
            };

            const zoneOffsets: Record<string, number> = {};
            let globalIdx = 0;

            zones.forEach((zone) => {
                if (!zone.name) return; // Skip if invalid
                
                // Fuzzy match zone name to our map
                const mapKey = Object.keys(zoneMap).find(k => zone.name.includes(k)) || 'Prep';
                const config = zoneMap[mapKey];
                
                // Track offset for collision prevention in this quadrant
                let currentOffset = zoneOffsets[mapKey] || 0;

                (zone.required_equipment || []).forEach((eq, idx) => {
                    const catalogItem = findCatalogItem(eq.name);
                    
                    let width = 3; // Default
                    let height = 3; // Default
                    let color = config.color;

                    if (catalogItem) {
                        width = catalogItem.width;
                        height = catalogItem.height;
                        color = catalogItem.color;
                    } else if (eq.dimensions) {
                        // Parse "3x3" or "3x4" string
                        const parts = eq.dimensions.toLowerCase().split('x');
                        if (parts.length === 2) {
                            width = parseInt(parts[0]) || 3;
                            height = parseInt(parts[1]) || 3;
                        }
                    }
                    
                    // Place items in a grid pattern starting from the zone's anchor point
                    // Add a small offset based on current count to avoid stacking
                    let x = config.startX + (currentOffset % 3) * 4; 
                    let y = config.startY + Math.floor(currentOffset / 3) * 4;
                    currentOffset++;

                    // Bounds check
                    if (x > kitchenDims.length - width) x = kitchenDims.length - width;
                    if (y > kitchenDims.width - height) y = kitchenDims.width - height;
                    if (x < 0) x = 0;
                    if (y < 0) y = 0;

                    newItems.push({
                        id: `ai_${Date.now()}_${globalIdx++}`,
                        name: eq.name,
                        category: config.cat,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        rotation: 0,
                        specs: {
                            power: eq.power_rating || 'Standard',
                            water: eq.water_connection || 'None'
                        },
                        color: color
                    });
                });
                
                // Save offset for next zone if it maps to same quadrant
                zoneOffsets[mapKey] = currentOffset;
            });

            if (newItems.length > 0) {
                setPlacedItems(newItems);
                setSuccessMsg("Layout generated successfully!");
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setError("AI returned no equipment items. Please try different requirements.");
            }

        } catch (e: any) {
            setError(e.message || "Failed to generate layout");
        } finally {
            setLoading(false);
        }
    };

    // --- SKETCH HANDLERS ---
    const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setSketchImage(ev.target.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // --- INTERACTION HANDLERS ---

    const handleDragStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedItemId(id);
        setIsDragging(true);
        
        const item = placedItems.find(i => i.id === id);
        if (item && canvasRef.current) {
            // Calculate offset relative to the item's top-left
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / scale;
            const mouseY = (e.clientY - rect.top) / scale;
            
            setDragOffset({
                x: mouseX - (item.x * GRID_SIZE),
                y: mouseY - (item.y * GRID_SIZE)
            });
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedItemId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;

        // Snap to Grid logic
        let newGridX = Math.round((mouseX - dragOffset.x) / GRID_SIZE);
        let newGridY = Math.round((mouseY - dragOffset.y) / GRID_SIZE);

        // Bounds Checking
        const item = placedItems.find(i => i.id === selectedItemId);
        if (item) {
            newGridX = Math.max(0, Math.min(newGridX, kitchenDims.length - item.width));
            newGridY = Math.max(0, Math.min(newGridY, kitchenDims.width - item.height));

            setPlacedItems(prev => prev.map(i => 
                i.id === selectedItemId ? { ...i, x: newGridX, y: newGridY } : i
            ));
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    const handleAddItem = (itemTemplate: any) => {
        const newItem: PlacedItem = {
            id: `manual_${Date.now()}`,
            name: itemTemplate.name,
            category: activeCategory as any,
            x: Math.floor(kitchenDims.length / 2) - 1, // Center default
            y: Math.floor(kitchenDims.width / 2) - 1,
            width: itemTemplate.width,
            height: itemTemplate.height,
            rotation: 0,
            color: itemTemplate.color,
            specs: itemTemplate.specs || { power: 'Standard', water: 'None' }
        };
        setPlacedItems([...placedItems, newItem]);
        setSelectedItemId(newItem.id);
    };

    const handleRotate = () => {
        if (!selectedItemId) return;
        setPlacedItems(prev => prev.map(i => {
            if (i.id === selectedItemId) {
                // Swap dimensions on rotate
                return { ...i, rotation: (i.rotation + 90) % 360, width: i.height, height: i.width };
            }
            return i;
        }));
    };

    const handleDeleteItem = () => {
        if (!selectedItemId) return;
        setPlacedItems(prev => prev.filter(i => i.id !== selectedItemId));
        setSelectedItemId(null);
    };

    const handleDownloadBlueprint = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            kitchenDims,
            items: placedItems,
            mepStats
        }, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `kitchen_layout_${cuisine}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const selectedItem = placedItems.find(i => i.id === selectedItemId);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            
            {/* Toolbar Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex justify-between items-center shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                        <PenTool className="text-purple-600" size={20} />
                        <span className="hidden sm:inline">Kitchen CAD</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <div className="flex gap-2">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500" title="Zoom Out"><Minimize size={16} /></button>
                        <span className="text-xs font-mono self-center text-slate-400">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500" title="Zoom In"><Maximize size={16} /></button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <div className="flex gap-2 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Ruler size={14}/> {kitchenDims.length}' x {kitchenDims.width}'</span>
                    </div>
                    
                    {/* View Toggles */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-4">
                        <button 
                            onClick={() => setViewMode('layout')}
                            className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'layout' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500'}`}
                        >
                            Layout
                        </button>
                        <button 
                            onClick={() => setViewMode('utilities')}
                            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 ${viewMode === 'utilities' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow' : 'text-slate-500'}`}
                        >
                            <Zap size={10} /> Utilities
                        </button>
                    </div>
                </div>

                {/* Rest of the component code (no logic changes) ... */}
                {/* ... (Sidebar, Canvas, Inspector) ... */}
                <div className="flex items-center gap-2">
                    {sketchImage && (
                        <div className="flex items-center gap-2 mr-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Opacity</span>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={sketchOpacity} 
                                onChange={(e) => setSketchOpacity(parseFloat(e.target.value))}
                                className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                    
                    <div className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-100 mr-2">
                        {placedItems.length} Items
                    </div>
                    <button onClick={handleDownloadBlueprint} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded transition-colors">
                        <Download size={14} /> Export
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold rounded transition-colors shadow-sm">
                        <Save size={14} /> Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT SIDEBAR: Catalog & AI */}
                <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-lg z-10">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button className="flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/10">Catalog</button>
                        <button className="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">AI Assistant</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                            {Object.keys(EQUIPMENT_CATALOG).map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setActiveCategory(cat as any)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {EQUIPMENT_CATALOG[activeCategory].map((item, i) => (
                                <div 
                                    key={i}
                                    onClick={() => handleAddItem(item)}
                                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all bg-slate-50 dark:bg-slate-800 group"
                                >
                                    <div className={`h-12 w-full ${item.color} rounded mb-2 flex items-center justify-center text-xs opacity-80 group-hover:opacity-100`}>
                                        <Box size={16} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                                    <p className="text-[10px] text-slate-400">{item.width}' x {item.height}'</p>
                                </div>
                            ))}
                        </div>

                        {/* AI & Sketch Controls */}
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Sparkles size={12}/> Auto-Layout / Sketch</h3>
                            <div className="space-y-3">
                                
                                {/* Sketch Upload */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 cursor-pointer hover:border-purple-400 text-center transition-colors bg-slate-50 dark:bg-slate-800"
                                >
                                    {sketchImage ? (
                                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                                            <ImageIcon size={14} /> <span className="text-xs font-bold">Sketch Loaded</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={16} className="mx-auto text-slate-400 mb-1" />
                                            <p className="text-[10px] text-slate-500 font-bold">Upload Handmade Drawing</p>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSketchUpload} />
                                </div>

                                <input 
                                    value={cuisine}
                                    onChange={(e) => setCuisine(e.target.value)}
                                    placeholder="Cuisine (e.g. Italian)"
                                    className="w-full p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                />
                                <div className="flex gap-2">
                                    <input 
                                        type="number"
                                        value={kitchenDims.length}
                                        onChange={(e) => setKitchenDims({...kitchenDims, length: parseFloat(e.target.value)})}
                                        className="w-1/2 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        title="Length"
                                    />
                                    <input 
                                        type="number"
                                        value={kitchenDims.width}
                                        onChange={(e) => setKitchenDims({...kitchenDims, width: parseFloat(e.target.value)})}
                                        className="w-1/2 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        title="Width"
                                    />
                                </div>
                                <button 
                                    onClick={handleAIGenerate}
                                    disabled={loading}
                                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} 
                                    {sketchImage ? 'Analyze Sketch & Build' : 'Auto-Generate'}
                                </button>
                                {error && <p className="text-[10px] text-red-500 leading-tight">{error}</p>}
                                {successMsg && <p className="text-[10px] text-emerald-500 leading-tight flex items-center gap-1"><CheckCircle2 size={10} /> {successMsg}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER: Canvas */}
                <div 
                    className="flex-1 bg-slate-100 dark:bg-[#0f172a] relative overflow-hidden cursor-move"
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onClick={() => setSelectedItemId(null)} // Deselect on bg click
                >
                    {/* Canvas Container */}
                    <div 
                        ref={canvasRef}
                        className="absolute bg-white dark:bg-[#1e293b] shadow-2xl border-4 border-slate-800 dark:border-slate-400 transition-transform duration-75 ease-out origin-center box-content"
                        style={{
                            width: kitchenDims.length * GRID_SIZE,
                            height: kitchenDims.width * GRID_SIZE,
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) scale(${scale})`,
                            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                        }}
                    >
                        {/* Background Sketch Layer */}
                        {sketchImage && (
                            <div 
                                className="absolute inset-0 z-0 pointer-events-none"
                                style={{
                                    backgroundImage: `url(${sketchImage})`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    opacity: sketchOpacity
                                }}
                            />
                        )}

                        {/* Grid Layer (On top of sketch if translucent) */}
                        <div 
                            className="absolute inset-0 z-0 pointer-events-none"
                            style={{
                                backgroundImage: `
                                    linear-gradient(to right, rgba(128,128,128,0.2) 1px, transparent 1px),
                                    linear-gradient(to bottom, rgba(128,128,128,0.2) 1px, transparent 1px)
                                `,
                                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                            }}
                        />

                        {/* Dimensional Markers */}
                        <div className="absolute -top-8 left-0 w-full text-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{kitchenDims.length}' Length</div>
                        <div className="absolute -left-8 top-0 h-full flex items-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300" style={{writingMode: 'vertical-rl'}}>{kitchenDims.width}' Width</div>

                        {/* Placed Items */}
                        {placedItems.map((item) => (
                            <div
                                key={item.id}
                                onMouseDown={(e) => handleDragStart(e, item.id)}
                                className={`absolute flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing border-2 transition-all select-none text-[10px] leading-tight font-bold z-10
                                    ${item.color || 'bg-slate-200'} 
                                    ${selectedItemId === item.id ? 'border-purple-500 shadow-xl ring-2 ring-purple-500/30 scale-[1.02]' : 'border-black/10 hover:border-black/30'}
                                `}
                                style={{
                                    left: item.x * GRID_SIZE,
                                    top: item.y * GRID_SIZE,
                                    width: item.width * GRID_SIZE,
                                    height: item.height * GRID_SIZE,
                                }}
                            >
                                <span className="pointer-events-none opacity-80 px-1 truncate w-full">{item.name}</span>
                                {scale > 0.8 && (
                                    <span className="pointer-events-none text-[8px] opacity-50 font-mono mt-0.5">
                                        {item.width}'x{item.height}'
                                    </span>
                                )}
                                
                                {/* Rotate Handle if Selected */}
                                {selectedItemId === item.id && (
                                    <div className="absolute -top-3 -right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 shadow-sm z-20" title="Rotated 0 deg">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>
                                )}

                                {/* UTILITY OVERLAYS */}
                                {viewMode === 'utilities' && (
                                    <>
                                        {item.specs?.power && item.specs.power !== 'None' && (
                                            <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-yellow-600 shadow-sm z-20" title={`Power: ${item.specs.power}`}>
                                                <Zap size={10} className="text-black fill-current" />
                                            </div>
                                        )}
                                        {item.specs?.water && item.specs.water !== 'None' && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-blue-700 shadow-sm z-20" title={`Water: ${item.specs.water}`}>
                                                <Droplets size={10} className="text-white fill-current" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Hint */}
                    <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-black/50 backdrop-blur px-3 py-2 rounded-lg text-xs text-slate-500 pointer-events-none">
                        <MousePointer2 size={12} className="inline mr-1"/> Click & Drag to move • Grid Snap: 1ft
                    </div>
                </div>

                {/* RIGHT SIDEBAR: Inspector & MEP Report */}
                <div className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-lg z-10">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Inspector</h3>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto">
                        
                        {/* MEP Summary Panel */}
                        {viewMode === 'utilities' && (
                            <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-fade-in">
                                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3 flex items-center gap-1">
                                    <Zap size={12}/> MEP Load Summary
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Total Power</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{mepStats.totalPower.toFixed(1)} kW</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Water Points</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{mepStats.waterPoints}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedItem ? (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Item Name</label>
                                    <input 
                                        value={selectedItem.name} 
                                        onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === selectedItem.id ? {...i, name: e.target.value} : i))}
                                        className="w-full mt-1 p-2 border rounded text-sm font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Position X</label>
                                        <div className="text-sm font-mono p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">{selectedItem.x} ft</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Position Y</label>
                                        <div className="text-sm font-mono p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">{selectedItem.y} ft</div>
                                    </div>
                                </div>

                                {/* Size Editing Inputs */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Width (ft)</label>
                                        <input 
                                            type="number"
                                            value={selectedItem.width}
                                            onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === selectedItem.id ? {...i, width: Math.max(1, parseInt(e.target.value) || 1)} : i))}
                                            className="w-full mt-1 p-2 border rounded text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Depth (ft)</label>
                                        <input 
                                            type="number"
                                            value={selectedItem.height}
                                            onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === selectedItem.id ? {...i, height: Math.max(1, parseInt(e.target.value) || 1)} : i))}
                                            className="w-full mt-1 p-2 border rounded text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Specifications</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                            <Zap size={14}/> 
                                            <input 
                                                value={selectedItem.specs?.power || ''}
                                                onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === selectedItem.id ? {...i, specs: {...i.specs, power: e.target.value}} : i))}
                                                className="bg-transparent border-none w-full focus:outline-none font-mono"
                                                placeholder="Power Spec"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                                            <Droplets size={14}/> 
                                            <input 
                                                value={selectedItem.specs?.water || ''}
                                                onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === selectedItem.id ? {...i, specs: {...i.specs, water: e.target.value}} : i))}
                                                className="bg-transparent border-none w-full focus:outline-none font-mono"
                                                placeholder="Water Spec"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                                    <button onClick={handleRotate} className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
                                        <RotateCw size={14}/> Rotate 90°
                                    </button>
                                    <button onClick={handleDeleteItem} className="w-full py-2 bg-red-50 text-red-600 rounded font-bold text-xs hover:bg-red-100 flex items-center justify-center gap-2">
                                        <Trash2 size={14}/> Remove Item
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 mt-12">
                                <MousePointer2 size={32} className="mx-auto mb-2 opacity-50"/>
                                <p className="text-sm">Select an item on the canvas to view or edit specs.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
