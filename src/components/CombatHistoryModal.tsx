import React, { useState } from 'react';
import { X, Terminal, Shield, RefreshCw, Zap, Award, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CombatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EngagementLog {
  id: string;
  timestamp: string;
  sector: string;
  opponent: string;
  moveUsed: string;
  outcome: 'SUCCESS' | 'WARNING' | 'RE-VENTED';
  thermalSpike: number;
  syncLevel: number;
  description: string;
}

const OPPONENTS = [
  'Arasaka Sec-Unit Elite',
  'Nexus Corp Cyber-Ninja',
  'Sector-09 Ripper-Gang Raider',
  'Heavy Exoskeleton Loader-S7',
  'Automated Security Drone Swarm',
  'Zaibatsu Enforcer Sentinel',
  'Chrome-plated Street Ronin'
];

const SECTORS = [
  'Sector-07 Alleyways',
  'District 42 Lower levels',
  'Arasaka Main Plaza Rooftop',
  'Neo-Tokyo Underpass B3',
  'Kabuki Neon Bazaar',
  'Cyber-Sewer Conduit 9',
  'Corporate High-rise Hangar'
];

const MOVES = [
  'Gekisai Cyber-Punch [击碎]',
  'Sanchin Iron Guard [三战]',
  'Tensho Palm Deflection [转掌]',
  'Seiyunchin Grapple-Slam [制引战]',
  'Ibuki Abdominal Venting [息吹]'
];

const OUTCOMES: ('SUCCESS' | 'WARNING' | 'RE-VENTED')[] = ['SUCCESS', 'WARNING', 'RE-VENTED'];

const NARRATIVE_TEMPLATES = [
  "Executed clean circular kinetic redirect before counter-thrusting. Target's mechanical joint ruptured from acoustic feedback resonance. System recorded zero bone stress in Ren's forearm due to carbon-fiber trench coat lining.",
  "Engaged pneumatic Sanchin posture to block high-frequency laser sword sweeps. Redirected raw kinetic vibrations back through cyber-arm pistons, disintegrating target's frontal chest plating.",
  "Successfully performed circular palm deflections. Absorbed incoming kinetic energy to buffer primary cooling tubes, then delivered a concentrated pressure blast through the target's power core.",
  "Heavy close-quarter grapple initiated. Applied hydraulic compression lock on opponent's titanium spine. Sub-optimal thermal dissipation required immediate Ibuki breathing venting post-impact.",
  "Cornered in rain-slicked alleyway. Synaptic overlay reached peak integration at t+14s. Discharged single Gekisai-zuki straight punch, triggering total circuit failure across all target cyberware."
];

function generateRandomLogs(count: number): EngagementLog[] {
  const logs: EngagementLog[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const opp = OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)];
    const sec = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const move = MOVES[Math.floor(Math.random() * MOVES.length)];
    const outcome = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)];
    const thermal = Math.floor(Math.random() * 65) + 20;
    const sync = Math.floor(Math.random() * 30) + 70;
    const desc = NARRATIVE_TEMPLATES[Math.floor(Math.random() * NARRATIVE_TEMPLATES.length)];
    
    const minutesAgo = (i + 1) * (Math.floor(Math.random() * 45) + 15);
    const logTime = new Date(now.getTime() - minutesAgo * 60000);

    logs.push({
      id: `LOG-ID-${100000 + i + Math.floor(Math.random() * 90000)}`,
      timestamp: logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sector: sec,
      opponent: opp,
      moveUsed: move,
      outcome,
      thermalSpike: thermal,
      syncLevel: sync,
      description: desc
    });
  }
  return logs;
}

export default function CombatHistoryModal({ isOpen, onClose }: CombatHistoryModalProps) {
  const [logs, setLogs] = useState<EngagementLog[]>(() => generateRandomLogs(4));

  const handleRefresh = () => {
    setLogs(generateRandomLogs(4));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-2xl bg-[#090a0f] border border-slate-800 rounded-sm overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(6,182,212,0.15)] z-10 font-mono text-xs"
            id="combat-history-modal"
          >
            {/* Header */}
            <div className="bg-slate-950/90 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
                <div>
                  <div className="text-[9px] text-cyan-400 uppercase tracking-widest">Historical Telemetry</div>
                  <h3 className="text-sm font-bold text-slate-100 tracking-tight uppercase">
                    Tactical Engagement Archives
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-all rounded-sm text-[10px]"
                  title="Simulate new engagement datasets"
                  id="refresh-sim-btn"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>RE-SIMULATE</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 p-1.5 rounded transition-colors"
                  id="close-modal-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / History List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="text-slate-400 leading-relaxed mb-4">
                These telemetry files document Ren Kusanagi's previous close-quarters engagements in the Neo-Tokyo sectors. Each log confirms the mechanical efficiency of the **Goju-Sanchin V2** cybernetic arm combined with traditional Sanchin stance physics.
              </div>

              <div className="space-y-3.5">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm flex flex-col md:flex-row gap-4 relative overflow-hidden"
                  >
                    {/* Glowing side accent */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        log.outcome === 'SUCCESS' 
                          ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' 
                          : log.outcome === 'WARNING' 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                    />

                    {/* Left Column: ID & Telemetry indicators */}
                    <div className="md:w-1/3 space-y-2.5 shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">ENGAGEMENT ID</span>
                        <span className="text-slate-200 font-bold tracking-wider">{log.id}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">TIME_MARK</span>
                          <span className="text-slate-300 font-medium">{log.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">SECTOR_REF</span>
                          <span className="text-slate-300 font-medium truncate block" title={log.sector}>
                            {log.sector.split(' ')[0]}
                          </span>
                        </div>
                      </div>

                      {/* Stat progress */}
                      <div className="space-y-1 text-[9px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">NEURAL SYNC</span>
                          <span className="text-cyan-400 font-bold">{log.syncLevel}%</span>
                        </div>
                        <div className="h-1 bg-slate-950 w-full rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: `${log.syncLevel}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Narrative details & Move output */}
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-1.5">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">OPPONENT UNIT</span>
                          <span className="text-slate-200 font-bold">{log.opponent}</span>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          log.outcome === 'SUCCESS' 
                            ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/20' 
                            : log.outcome === 'WARNING' 
                            ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' 
                            : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.outcome}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase mb-0.5">TACTICAL MANEUVER</span>
                        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                          <Zap className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{log.moveUsed}</span>
                        </div>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed italic mt-1.5">
                        &ldquo;{log.description}&rdquo;
                      </p>

                      <div className="flex justify-between items-center pt-2 text-[9px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-red-400" />
                          Thermal Peak: <span className="text-slate-300 font-bold">{log.thermalSpike}°C</span>
                        </span>
                        <span>SYSTEM LINK LEVEL A+</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950/90 px-5 py-3 border-t border-slate-800 flex justify-between items-center shrink-0 text-[10px] text-slate-500">
              <span>DATABASE // SYNAPSE PROTOCOLS LOADED</span>
              <span>TOTAL DOSSIER ARCHIVES: 48</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
