import React, { useState, useEffect, useMemo } from 'react';
import { CombatStats, CombatMove, COMBAT_MOVES, CYBER_MODULES } from './types';
import ProtagonistDossier from './components/ProtagonistDossier';
import CombatSimulator from './components/CombatSimulator';
import CyberArmConfig from './components/CyberArmConfig';
import BreathingTrainer from './components/BreathingTrainer';
import { Terminal, Shield, Zap, Sparkles, AlertTriangle, Clock } from 'lucide-react';

const BASE_STATS: CombatStats = {
  power: 50,
  precision: 55,
  defense: 60,
  sync: 45,
  heat: 0
};

export default function App() {
  const [activeModules, setActiveModules] = useState<string[]>(['neural_sync']);
  const [selectedMove, setSelectedMove] = useState<CombatMove | null>(null);
  const [currentHeat, setCurrentHeat] = useState(25);
  const [syncScore, setSyncScore] = useState(45);
  const [isOverdrive, setOverdrive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute final stats dynamically based on installed cybernetic modules
  const modifiedStats = useMemo(() => {
    const stats = { ...BASE_STATS };
    
    // Apply each active modules stats modifiers
    activeModules.forEach(modId => {
      const module = CYBER_MODULES.find(m => m.id === modId);
      if (module) {
        Object.entries(module.statsModifier).forEach(([statKey, val]) => {
          if (statKey !== 'heat') {
            const key = statKey as keyof CombatStats;
            stats[key] = (stats[key] || 0) + (val || 0);
          }
        });
      }
    });

    // Override / modify stats based on breathing sync level
    stats.sync = isOverdrive ? 100 : Math.round(stats.sync * 0.5 + syncScore * 0.5);
    
    if (isOverdrive) {
      stats.precision = 100; // Perfect cybernetic target alignment
      stats.power = Math.round(stats.power * 1.25); // Overcharged hydraulics
    }

    // Clip stats within absolute tactical safety margins (10 to 100)
    stats.power = Math.max(10, Math.min(100, stats.power));
    stats.precision = Math.max(10, Math.min(100, stats.precision));
    stats.defense = Math.max(10, Math.min(100, stats.defense));
    stats.sync = Math.max(10, Math.min(100, stats.sync));
    stats.heat = currentHeat;

    return stats;
  }, [activeModules, syncScore, isOverdrive, currentHeat]);

  // Handle installing/uninstalling modular cybernetic arm parts
  const handleToggleModule = (id: string) => {
    setActiveModules(prev => {
      if (prev.includes(id)) {
        return prev.filter(mId => mId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Triggered when a combat move starts executing
  const handleMoveTrigger = (move: CombatMove) => {
    setSelectedMove(move);

    if (move.id === 'ibuki') {
      // Ibuki completely vents heat and resets thermal capacity
      setCurrentHeat(0);
    } else {
      // Direct attacks generate heat
      setCurrentHeat(prev => {
        let heatCost = 5; // default block heat
        if (move.id === 'gekisai') heatCost = 25;
        if (move.id === 'seiyunchin') heatCost = 15;
        
        // Modules might modify heat generation
        let heatMultiplier = 1;
        if (activeModules.includes('pneumatic_drive')) heatMultiplier += 0.35;
        if (activeModules.includes('cryo_cooler')) heatMultiplier -= 0.25;

        const nextHeat = prev + heatCost * heatMultiplier;
        return Math.min(100, nextHeat);
      });
    }

    // Reset selected move trigger state after execution concludes
    setTimeout(() => {
      setSelectedMove(null);
    }, move.duration);
  };

  // Trigger continuous light cooling during rhythmic respiration exhales
  const triggerIbukiVent = () => {
    setCurrentHeat(prev => Math.max(0, prev - 1.2));
  };

  // Passive ambient heat dissipation over time
  useEffect(() => {
    const dissipationInterval = setInterval(() => {
      setCurrentHeat(prev => {
        if (prev <= 0) return 0;
        // Dissipation rate is higher if cryo heatsink is installed
        const rate = activeModules.includes('cryo_cooler') ? 1.8 : 0.8;
        return Math.max(0, prev - rate);
      });
    }, 1000);

    return () => clearInterval(dissipationInterval);
  }, [activeModules]);

  // Sync state fading if inactive
  useEffect(() => {
    if (isOverdrive) {
      // Overdrive decays after 15 seconds
      const overdriveTimer = setTimeout(() => {
        setOverdrive(false);
      }, 15000);

      return () => clearTimeout(overdriveTimer);
    }
  }, [isOverdrive]);

  return (
    <div className="min-h-screen bg-[#050508] text-[#e2e8f0] font-mono relative overflow-hidden flex flex-col p-4 md:p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Ambient Background FX */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, transparent 70%)' }}></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>

      {/* Top Navigation / Header */}
      <header className="relative z-10 flex justify-between items-end border-b border-slate-800 pb-4 mb-6 shrink-0">
        <div>
          <div className="text-[10px] text-cyan-400 tracking-widest uppercase mb-1">Biological Data Sync: Active</div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white font-sans uppercase">
            Ren Kusanagi <span className="text-cyan-500">"Shadow-Sanchin"</span>
          </h1>
        </div>
        <div className="flex gap-4 md:gap-8 text-right font-mono text-xs">
          <div className="hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase">Location</div>
            <div className="text-slate-300">Sector 07 // District 42</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Threat Level</div>
            <div className="text-red-500 font-bold">EXTREME SSS</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Telemetry Clock</div>
            <div className="text-cyan-400 font-bold">{currentTime.toLocaleTimeString()}</div>
          </div>
        </div>
      </header>

      {/* Main Simulation Bento Grid */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full overflow-auto">
        
        {/* LEFT PANEL: Character biography profile and Breathing synchronize trainer */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Protagonist profile details */}
          <div className="flex-1">
            <ProtagonistDossier isOverdrive={isOverdrive} />
          </div>

          {/* Abdominal breathing optimizer */}
          <div className="shrink-0">
            <BreathingTrainer 
              onSyncChange={setSyncScore}
              isOverdrive={isOverdrive}
              setOverdrive={setOverdrive}
              triggerIbukiVent={triggerIbukiVent}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Tactical dojo simulation (Canvas) and Cyber arm upgrades */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Tactical Canvas & Audio Dojo */}
          <div className="flex-1 min-h-[380px] lg:min-h-0">
            <CombatSimulator 
              stats={modifiedStats}
              selectedMove={selectedMove}
              onMoveTrigger={handleMoveTrigger}
              isOverdrive={isOverdrive}
            />
          </div>

          {/* Cybernetic arm customization controls */}
          <div className="shrink-0">
            <CyberArmConfig 
              stats={modifiedStats}
              activeModules={activeModules}
              onToggleModule={handleToggleModule}
              baseStats={BASE_STATS}
            />
          </div>
        </div>

      </main>

      {/* Bottom Status Footer */}
      <footer className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-3 border-t border-slate-800 pt-4 gap-4 shrink-0 font-mono text-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">[X]</div>
          <div>
            <div className="text-[9px] text-slate-500 uppercase">Encryption Secure Link</div>
            <div className="text-slate-300">256-BIT_POLY_LINK_ACTIVE</div>
          </div>
        </div>
        <div className="flex justify-center items-center gap-3">
          <div className="px-4 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">
            RONIN PROTOCOL ACTIVE
          </div>
          <div className="px-4 py-1.5 bg-cyan-600/20 border border-cyan-500 text-cyan-400 text-[10px] uppercase font-bold tracking-[0.2em] shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
            GOJU-SANCHIN ONLINE
          </div>
        </div>
        <div className="text-right flex flex-col justify-center">
          <div className="text-[9px] text-cyan-700 uppercase font-bold">SYSTEM LOG // READY FOR DEPLOYMENT</div>
          <div className="text-[10px] text-slate-500">
            CORE_TEMP: {(30 + modifiedStats.heat * 0.42).toFixed(1)}°C | FAN_SPEED: {Math.round(1200 + modifiedStats.heat * 18)}RPM
          </div>
        </div>
      </footer>

    </div>
  );
}
