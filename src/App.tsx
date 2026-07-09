import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CombatStats, CombatMove, COMBAT_MOVES, CYBER_MODULES } from './types';
import ProtagonistDossier from './components/ProtagonistDossier';
import CombatSimulator from './components/CombatSimulator';
import CyberArmConfig from './components/CyberArmConfig';
import BreathingTrainer from './components/BreathingTrainer';
import TargetAssignmentTracker, { ThreatTarget } from './components/TargetAssignmentTracker';
import CombatLogs, { CombatLog } from './components/CombatLogs';
import { Terminal, Shield, Zap, Sparkles, AlertTriangle, Clock } from 'lucide-react';

const generateOutcomeNarrative = (targetName: string, lastMove: string, sector: string) => {
  const templates = [
    `Executed flawless kinetic redirection sequence. Breached core chassis with a terminal ${lastMove} punch in ${sector}. Sector secure.`,
    `Delivered a decisive blow with ${lastMove}. Overloaded the central defense system of ${targetName}, dispersing local threats.`,
    `Synthesized complete physical integration with Goju-Sanchin V2 cyber-arm. Ruptured armor shielding using ${lastMove} and collected total security bounty.`,
    `Neutralized ${targetName} armor joints using targeted ${lastMove} vibrations in ${sector}. Sanchin rooted posture recorded optimal bone safety.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

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
  const [activeTarget, setActiveTarget] = useState<ThreatTarget | null>(null);
  const [hasDashBoost, setHasDashBoost] = useState(false);

  // Simulation engagement tracker states
  const [targetIntegrity, setTargetIntegrity] = useState(100);
  const [movesCount, setMovesCount] = useState(0);
  const [maxHeatReached, setMaxHeatReached] = useState(0);
  const [totalSyncValues, setTotalSyncValues] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Load compiled logs or initialize seeds
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>(() => {
    const saved = localStorage.getItem('ren_combat_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Safe fallback
      }
    }
    const initialSeed: CombatLog[] = [
      {
        id: 'LOG-391824',
        targetId: 'seed-1',
        targetName: 'Nexus Corp Cyber-Ninja',
        threatLevel: 'CLASS-S',
        sector: 'Neo-Tokyo Underpass B3',
        timestamp: '11:15:32 AM',
        duration: 12,
        movesExecuted: 4,
        maxHeat: 45,
        avgSync: 82,
        bountyCredits: '95,000 Credits',
        criticalHits: 1,
        notes: 'Executed clean circular kinetic redirect before counter-thrusting. Target\'s mechanical joint ruptured from acoustic feedback resonance.'
      },
      {
        id: 'LOG-772910',
        targetId: 'seed-2',
        targetName: 'Automated Security Drone Swarm',
        threatLevel: 'CLASS-A',
        sector: 'District 42 Lower levels',
        timestamp: '09:42:01 AM',
        duration: 8,
        movesExecuted: 3,
        maxHeat: 35,
        avgSync: 78,
        bountyCredits: '60,000 Credits',
        criticalHits: 0,
        notes: 'Engaged pneumatic Sanchin posture to block high-frequency laser sweeps. Direct kinetic feed back disintegrated target cluster.'
      }
    ];
    localStorage.setItem('ren_combat_logs', JSON.stringify(initialSeed));
    return initialSeed;
  });

  // Track engagement reset on target switch
  useEffect(() => {
    if (activeTarget) {
      setTargetIntegrity(100);
      setMovesCount(0);
      setMaxHeatReached(0);
      setTotalSyncValues(0);
      setStartTime(Date.now());
    }
  }, [activeTarget]);

  // Instantly clears combat heat and resets current target assignment
  const handleHardReset = useCallback(() => {
    setCurrentHeat(0);
    setActiveTarget(null);
    setOverdrive(false);
    setTargetIntegrity(100);
    setHasDashBoost(false);
  }, []);

  const handleClearLogs = useCallback(() => {
    setCombatLogs([]);
    localStorage.removeItem('ren_combat_logs');
  }, []);

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
  const handleToggleModule = useCallback((id: string) => {
    setActiveModules(prev => {
      if (prev.includes(id)) {
        return prev.filter(mId => mId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  const handleSetModules = useCallback((ids: string[]) => {
    setActiveModules(ids);
  }, []);

  // Triggered when a combat move starts executing
  const handleMoveTrigger = useCallback((move: CombatMove) => {
    setSelectedMove(move);

    // Track active target statistics and damage
    if (activeTarget && targetIntegrity > 0) {
      setMovesCount(prev => prev + 1);
      setTotalSyncValues(prev => prev + modifiedStats.sync);
      setMaxHeatReached(prev => Math.max(prev, modifiedStats.heat));

      // Check if this move triggers target's critical weakness / recommended response
      const rec = activeTarget.recommendedMove || '';
      const isWeakness = rec.toLowerCase().includes(move.id.toLowerCase());
      
      const baseDamage = isWeakness 
        ? Math.floor(Math.random() * 11) + 35 // 35 to 45 damage for weaknesses
        : Math.floor(Math.random() * 7) + 12; // 12 to 18 damage for others

      // Stats multipliers
      const powerMultiplier = 1 + (modifiedStats.power / 100);
      const syncMultiplier = 0.5 + (modifiedStats.sync / 100);
      const isCritical = Math.random() * 100 < modifiedStats.precision;
      const criticalMultiplier = isCritical ? 1.5 : 1.0;

      let rawDamage = baseDamage * powerMultiplier * syncMultiplier * criticalMultiplier;
      if (hasDashBoost && move.type === 'strike') {
        rawDamage *= 1.35;
        setHasDashBoost(false);
      }
      const finalDamage = Math.max(5, Math.round(rawDamage));

      setTargetIntegrity(prev => {
        const nextInt = prev - finalDamage;
        if (nextInt <= 0) {
          // Success! Target neutralized, compile performance logs
          const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
          const durationSec = Math.max(2, Math.round((Date.now() - startTime) / 1000));
          const notesText = generateOutcomeNarrative(activeTarget.name, move.name, activeTarget.sector);

          const newLog: CombatLog = {
            id: logId,
            targetId: activeTarget.id || activeTarget.name.replace(/\s+/g, '-').toLowerCase(),
            targetName: activeTarget.name,
            threatLevel: activeTarget.threatLevel,
            sector: activeTarget.sector,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            duration: durationSec,
            movesExecuted: movesCount + 1,
            maxHeat: Math.max(maxHeatReached, modifiedStats.heat),
            avgSync: Math.round((totalSyncValues + modifiedStats.sync) / (movesCount + 1)),
            bountyCredits: activeTarget.bounty,
            criticalHits: isCritical ? 1 : 0,
            notes: notesText
          };

          setCombatLogs(prevLogs => {
            const updated = [newLog, ...prevLogs];
            localStorage.setItem('ren_combat_logs', JSON.stringify(updated));
            return updated;
          });

          return 0;
        }
        return nextInt;
      });
    }

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
  }, [activeModules, activeTarget, targetIntegrity, startTime, movesCount, maxHeatReached, totalSyncValues, modifiedStats, hasDashBoost]);

  // Trigger continuous light cooling during rhythmic respiration exhales
  const triggerIbukiVent = useCallback(() => {
    setCurrentHeat(prev => Math.max(0, prev - 1.2));
  }, []);

  // Handle executing movement-based skills that consume thermal build-up
  const handleManeuverTrigger = useCallback((maneuverId: string, heatCost: number) => {
    setCurrentHeat(prev => Math.max(0, prev - heatCost));

    if (maneuverId === 'dash') {
      setHasDashBoost(true);
      if (activeTarget && targetIntegrity > 0) {
        setTargetIntegrity(prev => {
          const nextInt = prev - 15;
          if (nextInt <= 0) {
            const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
            const durationSec = Math.max(2, Math.round((Date.now() - startTime) / 1000));
            const notesText = `Chassis overcharged with thermal energy. Executed high-speed Dash (Aruki) strike to dismantle ${activeTarget.name}'s structure directly.`;
            const newLog = {
              id: logId,
              targetId: activeTarget.id || activeTarget.name.replace(/\s+/g, '-').toLowerCase(),
              targetName: activeTarget.name,
              threatLevel: activeTarget.threatLevel,
              sector: activeTarget.sector,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              duration: durationSec,
              movesExecuted: movesCount + 1,
              maxHeat: Math.max(maxHeatReached, currentHeat),
              avgSync: Math.round((totalSyncValues + syncScore) / (movesCount + 1)),
              bountyCredits: activeTarget.bounty,
              criticalHits: 1,
              notes: notesText
            };
            setCombatLogs(prevLogs => {
              const updated = [newLog, ...prevLogs];
              localStorage.setItem('ren_combat_logs', JSON.stringify(updated));
              return updated;
            });
            return 0;
          }
          return nextInt;
        });
      }
    } else if (maneuverId === 'shift') {
      setSyncScore(prev => Math.min(100, prev + 25));
    } else if (maneuverId === 'parry') {
      if (activeTarget && targetIntegrity > 0) {
        setTargetIntegrity(prev => {
          const nextInt = prev - 10;
          if (nextInt <= 0) {
            const logId = `LOG-${Math.floor(100000 + Math.random() * 900000)}`;
            const durationSec = Math.max(2, Math.round((Date.now() - startTime) / 1000));
            const notesText = `Intercepted target strike vector with electromagnetic Parry deflection loop. Backlash energy ruptured ${activeTarget.name}'s chassis core.`;
            const newLog = {
              id: logId,
              targetId: activeTarget.id || activeTarget.name.replace(/\s+/g, '-').toLowerCase(),
              targetName: activeTarget.name,
              threatLevel: activeTarget.threatLevel,
              sector: activeTarget.sector,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              duration: durationSec,
              movesExecuted: movesCount + 1,
              maxHeat: Math.max(maxHeatReached, currentHeat),
              avgSync: Math.round((totalSyncValues + syncScore) / (movesCount + 1)),
              bountyCredits: activeTarget.bounty,
              criticalHits: 1,
              notes: notesText
            };
            setCombatLogs(prevLogs => {
              const updated = [newLog, ...prevLogs];
              localStorage.setItem('ren_combat_logs', JSON.stringify(updated));
              return updated;
            });
            return 0;
          }
          return nextInt;
        });
      }
    }
  }, [currentHeat, activeTarget, targetIntegrity, startTime, movesCount, maxHeatReached, totalSyncValues, syncScore]);

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
    <div className="min-h-screen bg-[#050508] text-[#e2e8f0] font-mono relative overflow-hidden flex flex-col p-2.5 sm:p-4 md:p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Ambient Background FX */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, transparent 70%)' }}></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
      </div>

      {/* Top Navigation / Header */}
      <header className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-end gap-3 sm:gap-4 border-b border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6 shrink-0">
        <div>
          <div className="text-[9px] sm:text-[10px] text-cyan-400 tracking-widest uppercase mb-0.5 sm:mb-1">Biological Data Sync: Active</div>
          <h1 className="text-lg xs:text-xl sm:text-2xl md:text-4xl font-black tracking-tighter text-white font-sans uppercase">
            Ren Kusanagi <span className="text-cyan-500 font-sans font-black">"Shadow-Sanchin"</span>
          </h1>
        </div>
        <div className="flex gap-4 md:gap-8 justify-between sm:justify-end text-left sm:text-right font-mono text-[10.5px] sm:text-xs">
          <div className="hidden xs:block">
            <div className="text-[8.5px] sm:text-[10px] text-slate-500 uppercase">Location</div>
            <div className="text-slate-300">Sector 07 // District 42</div>
          </div>
          <div>
            <div className="text-[8.5px] sm:text-[10px] text-slate-500 uppercase">Threat Level</div>
            <div className="text-red-500 font-bold">EXTREME SSS</div>
          </div>
          <div>
            <div className="text-[8.5px] sm:text-[10px] text-slate-500 uppercase">Telemetry Clock</div>
            <div className="text-cyan-400 font-bold">{currentTime.toLocaleTimeString()}</div>
          </div>
        </div>
      </header>

      {/* Main Simulation Bento Grid */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full overflow-auto">
        
        {/* LEFT PANEL: Character biography profile, Breathing synchronize trainer, and Target Assignment tracker */}
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

          {/* Daily Target Assignment tracker */}
          <div className="shrink-0">
            <TargetAssignmentTracker 
              onTargetSelect={setActiveTarget}
              activeTarget={activeTarget}
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
              activeTarget={activeTarget}
              onHardReset={handleHardReset}
              targetIntegrity={targetIntegrity}
              onManeuverTrigger={handleManeuverTrigger}
              hasDashBoost={hasDashBoost}
            />
          </div>

          {/* Cybernetic arm customization controls */}
          <div className="shrink-0">
            <CyberArmConfig 
              stats={modifiedStats}
              activeModules={activeModules}
              onToggleModule={handleToggleModule}
              onSetModules={handleSetModules}
              baseStats={BASE_STATS}
            />
          </div>

          {/* Persistent Combat Logs performance archiver */}
          <div className="shrink-0">
            <CombatLogs 
              logs={combatLogs} 
              onClearLogs={handleClearLogs} 
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
