import React, { useState, useEffect } from 'react';
import { Shield, Target, Crosshair, RefreshCw, Radio, AlertOctagon, Cpu, Zap, Eye, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ThreatTarget {
  id: string;
  name: string;
  threatLevel: 'CLASS-A' | 'CLASS-S' | 'CLASS-SSS' | 'OMEGA-LEVEL';
  sector: string;
  bounty: string;
  shieldType: string;
  weakness: string;
  recommendedMove: string;
  description: string;
  status: 'ANALYZING' | 'LOCKED' | 'ENGAGED' | 'STANDBY';
  neuralMatch: number; // percentage match
}

const SHIELD_TYPES = [
  'Pneumatic Deflection Matrix v3',
  'Nanite-reconstructive Bio-Shell',
  'Sub-dermal Carbon-Titanium Plating',
  'High-Frequency Electromagentic Arc Shield',
  'Acoustic Wave Kinetic Absorber'
];

const WEAKNESSES = [
  'Rotational kinetic forces (Tensho redirect)',
  'High-torque hydraulic pressure (Gekisai strike)',
  'Prolonged continuous thermal build-up',
  'Ground-friction impact resonance (Sanchin root)',
  'Neural sync frequency disruption'
];

const RECOMMENDED_MOVES = [
  'Gekisai Cyber-Punch [击碎]',
  'Sanchin Iron Guard [三战]',
  'Tensho Palm Deflection [转掌]',
  'Seiyunchin Grapple-Slam [制引战]',
  'Ibuki Abdominal Venting [息吹]'
];

const THREATS: Omit<ThreatTarget, 'id' | 'shieldType' | 'weakness' | 'recommendedMove' | 'neuralMatch'>[] = [
  {
    name: 'Arasaka Heavy Loader Mech-9',
    threatLevel: 'CLASS-S',
    sector: 'Sector 07 // Hangar Bay C',
    bounty: '120,000 Credits',
    description: 'An automated cargo-handling exoskeleton reprogrammed for extreme perimeter defense. Its mechanical arms pack enough hydraulic torque to crush low-alloy structures instantly.',
    status: 'LOCKED'
  },
  {
    name: 'Kuroko Cyber-Assassin Unit',
    threatLevel: 'CLASS-SSS',
    sector: 'District 42 // Rain Sewer Conduit 8',
    bounty: '280,000 Credits',
    description: 'Chrome-plated surgical operative wearing high-frequency cloaking armor. Employs laser monomolecular blades with speed variables that challenge neural processing limits.',
    status: 'ENGAGED'
  },
  {
    name: 'Zaibatsu Heavy Guard Drone Swarm',
    threatLevel: 'CLASS-A',
    sector: 'Arasaka Plaza Sub-Level 3',
    bounty: '75,000 Credits',
    description: 'Hexacopter squadron outfitted with electromagnetic rail-guns. They move in synchronized tactical vectors designed to corner targets and induce cognitive panic.',
    status: 'ANALYZING'
  },
  {
    name: 'Shin-Okubo "Chrome-Fist" Ryuji',
    threatLevel: 'OMEGA-LEVEL',
    sector: 'Neo-Tokyo Underpass B3',
    bounty: '450,000 Credits + Core Parts',
    description: 'Mercenary chief with double overcharged cybernetic forearms. Focuses on full-kinetic hydraulic strikes. Employs crude, unbuffered thermal release venting.',
    status: 'LOCKED'
  },
  {
    name: 'Nexus Tech Sentinel Elite',
    threatLevel: 'CLASS-S',
    sector: 'Kabuki Neon Bazaar alleyways',
    bounty: '165,000 Credits',
    description: 'Elite corporate enforcer wearing responsive impact-gel coats. Master of close-quarters cyber-grappling and dynamic deflective combat.',
    status: 'STANDBY'
  }
];

interface TargetAssignmentTrackerProps {
  onTargetSelect?: (target: ThreatTarget) => void;
  activeTarget?: ThreatTarget | null;
}

export default function TargetAssignmentTracker({ onTargetSelect, activeTarget }: TargetAssignmentTrackerProps) {
  const [threatList, setThreatList] = useState<ThreatTarget[]>([]);
  const [selectedThreatId, setSelectedThreatId] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptionProgress, setDecryptionProgress] = useState<number>(0);

  // Generate mock feed targets on mount
  useEffect(() => {
    generateMockFeed();
  }, []);

  const generateMockFeed = () => {
    setIsDecrypting(true);
    setDecryptionProgress(0);

    // Simulate standard decrypt terminal timeline
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 12) + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        
        // Finalize state
        const generated: ThreatTarget[] = THREATS.map((t, idx) => ({
          ...t,
          id: `TGT-0${idx + 1}-${Math.floor(100 + Math.random() * 900)}`,
          shieldType: SHIELD_TYPES[idx % SHIELD_TYPES.length],
          weakness: WEAKNESSES[idx % WEAKNESSES.length],
          recommendedMove: RECOMMENDED_MOVES[idx % RECOMMENDED_MOVES.length],
          neuralMatch: Math.floor(Math.random() * 31) + 65, // 65-95%
        }));

        setThreatList(generated);
        // Select first target by default
        const initialTarget = generated[0];
        setSelectedThreatId(initialTarget.id);
        if (onTargetSelect) {
          onTargetSelect(initialTarget);
        }
        setIsDecrypting(false);
      } else {
        setDecryptionProgress(current);
      }
    }, 120);
  };

  const handleSelectThreat = (threat: ThreatTarget) => {
    setSelectedThreatId(threat.id);
    if (onTargetSelect) {
      onTargetSelect(threat);
    }
  };

  const activeThreat = activeTarget || threatList.find(t => t.id === selectedThreatId) || null;

  return (
    <div 
      className="bg-slate-900/40 border border-slate-800 backdrop-blur-sm p-5 rounded-sm flex flex-col font-mono text-xs relative overflow-hidden"
      id="target-assignment-tracker"
    >
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

      {/* Header info */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center space-x-2">
          <Crosshair className="h-4 w-4 text-cyan-500 animate-spin" style={{ animationDuration: '6s' }} />
          <div>
            <div className="text-[9px] text-cyan-400 uppercase tracking-widest leading-none">TARGET DISPATCH</div>
            <h3 className="text-xs font-bold text-slate-200 tracking-tight uppercase">
              Daily Threat Assignments
            </h3>
          </div>
        </div>

        <button
          onClick={generateMockFeed}
          disabled={isDecrypting}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 disabled:opacity-50 transition-all rounded-sm text-[10px]"
          id="fetch-threats-btn"
        >
          <RefreshCw className={`h-3 w-3 ${isDecrypting ? 'animate-spin text-cyan-400' : ''}`} />
          <span>RE-CONNECT DECRYPTOR</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isDecrypting ? (
          /* Decrypting scanning loading screen */
          <motion.div
            key="decrypting-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-44 flex flex-col justify-center items-center space-y-3 bg-slate-950/80 rounded border border-slate-800/60 p-4"
          >
            <Radio className="h-6 w-6 text-cyan-400 animate-bounce" />
            <div className="text-center space-y-1">
              <span className="text-[10px] text-cyan-400 tracking-widest block font-bold">
                CONNECTING PROTOCOLS...
              </span>
              <div className="text-[9px] text-slate-500 uppercase">
                DECRYPTING ENCRYPTED DAILY SEC-FEEDS (DISTRICT 42 & SECTOR 07)
              </div>
            </div>

            {/* Decrypt loading bar */}
            <div className="w-full max-w-xs bg-slate-900 h-2.5 border border-slate-800 p-[1px] rounded-full overflow-hidden relative flex items-center justify-center">
              <div 
                className="h-full bg-cyan-500 rounded-full transition-all duration-100"
                style={{ width: `${decryptionProgress}%` }}
              />
              <span className="absolute text-[8px] font-bold text-slate-100 drop-shadow-md">
                {decryptionProgress}% SEC-LINK
              </span>
            </div>
          </motion.div>
        ) : (
          /* Render Active assignment dossier */
          <motion.div
            key="loaded-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10"
          >
            {/* Left side list: clickable list of assignments */}
            <div className="md:col-span-5 space-y-2 max-h-[195px] overflow-y-auto pr-1">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                TODAY'S DISPATCH FEEDS
              </div>
              {threatList.map((threat) => {
                const isSelected = selectedThreatId === threat.id;
                const statusColor = 
                  threat.threatLevel === 'OMEGA-LEVEL' ? 'text-red-400 border-red-500/30' :
                  threat.threatLevel === 'CLASS-SSS' ? 'text-purple-400 border-purple-500/30' :
                  'text-amber-400 border-amber-500/30';

                return (
                  <button
                    key={threat.id}
                    onClick={() => handleSelectThreat(threat)}
                    className={`w-full text-left p-2 rounded-sm border transition-all duration-200 flex items-center justify-between ${
                      isSelected 
                        ? 'bg-cyan-950/20 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.1)]' 
                        : 'bg-slate-950/55 border-slate-800/80 hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                    id={`threat-item-${threat.id}`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">
                          [{threat.id.split('-')[2]}]
                        </span>
                        <span className={`text-[10px] font-bold tracking-tight truncate ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {threat.name}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 flex items-center space-x-1.5 font-mono truncate">
                        <span>{threat.sector.split('//')[0]}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-cyan-400 font-medium">{threat.bounty.split(' ')[0]} bounty</span>
                      </div>
                    </div>

                    <span className={`text-[8px] px-1 py-0.5 font-black border uppercase tracking-wider rounded-xs bg-slate-950 shrink-0 ${statusColor}`}>
                      {threat.threatLevel.replace('-LEVEL', '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right side details: Full active threat analysis */}
            {activeThreat ? (
              <div className="md:col-span-7 bg-slate-950/60 rounded border border-slate-800 p-4.5 space-y-3.5 flex flex-col justify-between">
                <div>
                  {/* Top line detail */}
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <AlertOctagon className={`h-3.5 w-3.5 ${
                        activeThreat.threatLevel === 'OMEGA-LEVEL' ? 'text-red-500 animate-pulse' : 'text-amber-500'
                      }`} />
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">
                        Intel File: {activeThreat.id}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[8px] text-slate-500">NEURAL SIM MATCH</span>
                      <span className="text-emerald-400 font-bold">{activeThreat.neuralMatch}%</span>
                    </div>
                  </div>

                  {/* Threat Description */}
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight mb-1">
                    {activeThreat.name}
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-normal mb-3.5">
                    {activeThreat.description}
                  </p>

                  {/* Matrix Attributes list */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800/40 pt-2.5 text-[10px]">
                    <div>
                      <span className="text-slate-500 block uppercase text-[8.5px]">SECTOR REGION</span>
                      <span className="text-slate-300 font-medium">{activeThreat.sector}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[8.5px]">BOUNTY ESTIMATE</span>
                      <span className="text-cyan-400 font-bold">{activeThreat.bounty}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[8.5px]">PRIMARY DEFENSE MATRIX</span>
                      <span className="text-slate-300 font-medium text-[9px] block truncate" title={activeThreat.shieldType}>
                        {activeThreat.shieldType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase text-[8.5px]">ARM DETECTED VULNERABILITY</span>
                      <span className="text-red-400 font-bold text-[9px] block truncate" title={activeThreat.weakness}>
                        {activeThreat.weakness}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tactical combat link tip */}
                <div className="bg-cyan-950/20 border border-cyan-950 rounded p-2.5 flex items-start gap-2 text-[10px] text-cyan-300 font-mono mt-2">
                  <Cpu className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[9.5px] text-cyan-200 uppercase">DOJO INTEGRATION ADVICE:</span>
                    Optimize training simulations. Execute <span className="text-amber-300 font-bold">{activeThreat.recommendedMove}</span> to effectively target this opponent's weak zones.
                  </div>
                </div>
              </div>
            ) : (
              <div className="md:col-span-7 h-full flex items-center justify-center text-slate-500">
                No threat profile active. Reload target datalink.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
