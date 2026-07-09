import React from 'react';
import { CombatStats, CyberneticModule, CYBER_MODULES } from '../types';
import { Shield, Cpu, Flame, Check, HelpCircle, Activity } from 'lucide-react';

interface CyberArmConfigProps {
  stats: CombatStats;
  activeModules: string[];
  onToggleModule: (id: string) => void;
  baseStats: CombatStats;
}

export default function CyberArmConfig({
  stats,
  activeModules,
  onToggleModule,
  baseStats,
}: CyberArmConfigProps) {

  // Dynamic status descriptor based on current precision
  const getPrecisionStatus = (prec: number) => {
    if (prec >= 90) return 'NANO-CALIBRATED (0.002mm)';
    if (prec >= 70) return 'ENHANCED ACCURACY (0.15mm)';
    if (prec >= 50) return 'STANDARD TACTICAL SENSOR';
    return 'SUB-OPTIMAL NEURAL DRIFT';
  };

  const getPowerStatus = (pwr: number) => {
    if (pwr >= 90) return 'PNEUMATIC CRUSH RATIO';
    if (pwr >= 70) return 'REINFORCED SERVO TORQUE';
    return 'KINETIC MASS STANDARD';
  };

  const statLabels: { key: keyof CombatStats; label: string; icon: any; color: string }[] = [
    { key: 'power', label: 'Hydraulic Power', icon: Activity, color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' },
    { key: 'precision', label: 'Combat Precision', icon: Cpu, color: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' },
    { key: 'defense', label: 'Rooted Guard / Deflect', icon: Shield, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-sm p-5 flex flex-col h-full rounded-sm" id="cyber-arm-config">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase">
            Cybernetic Arm Interface & Calibrations
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 rounded text-cyan-400 border border-cyan-500/20">
          GOJU-SANCHIN V2
        </span>
      </div>

      {/* Cybernetic Specifications dossier */}
      <div className="bg-slate-950 rounded p-4 border border-slate-800/60 mb-5 space-y-3 font-mono text-[11px]">
        <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1.5 flex items-center space-x-1.5">
          <span>SPECIFICATIONS CORE</span>
          <span className="text-slate-600 font-normal">| ARM INTEGRATED AUGMENTATION</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-400">
          <div>CHASSIS: <span className="text-slate-200">Titanium-Carbide Monocoque</span></div>
          <div>NEURAL DELAY: <span className="text-slate-200">0.002ms Synapse-Solder</span></div>
          <div>PRECISION: <span className="text-cyan-300">{getPrecisionStatus(stats.precision)}</span></div>
          <div>FEEDBACK LOOPS: <span className="text-slate-200">Dynamic Piezo-Electric</span></div>
          <div>INTERFACE LINK: <span className="text-slate-200">Coat-Seam Carbon Electrodes</span></div>
          <div>HYDRAULICS: <span className="text-amber-300">{getPowerStatus(stats.power)}</span></div>
        </div>
        <div className="pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 leading-normal">
          *Precision combat coordinates are dynamically updated in real-time by linking shoulder motor nerve fibers with the Matrix-style shock-absorbing trench coat.
        </div>
      </div>

      {/* Interactive Stat Meters */}
      <div className="space-y-4 mb-6">
        <span className="font-mono text-[10px] tracking-wider text-slate-500 uppercase block font-bold">
          Active Combat Attribute Allocation
        </span>
        
        {statLabels.map(({ key, label, icon: Icon, color }) => {
          const val = stats[key];
          const baseVal = baseStats[key];
          const bonus = val - baseVal;

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <div className="flex items-center space-x-1.5">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-300 font-sans">{label}</span>
                </div>
                <div className="font-mono text-xs text-slate-200 flex items-center space-x-1.5">
                  <span className="font-bold">{val.toFixed(0)}</span>
                  {bonus !== 0 && (
                    <span className={`text-[10px] ${bonus > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bonus > 0 ? `(+${bonus})` : `(${bonus})`}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-[1px] relative flex">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${Math.min(100, val)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Cyber Arm Upgrades / Modules Selection */}
      <div className="flex-1 flex flex-col min-h-[180px]">
        <span className="font-mono text-[10px] tracking-wider text-slate-500 uppercase block mb-3 font-bold">
          Installable Cybernetic Modules
        </span>

        <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
          {CYBER_MODULES.map((mod) => {
            const isInstalled = activeModules.includes(mod.id);
            return (
              <button
                key={mod.id}
                onClick={() => onToggleModule(mod.id)}
                className={`p-3 rounded border text-left flex items-start gap-3 transition-all duration-200 cursor-pointer active:scale-98 ${
                  isInstalled
                    ? 'bg-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.06)]'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
                id={`mod-btn-${mod.id}`}
              >
                {/* Checkbox indicator */}
                <div className={`mt-0.5 w-4.5 h-4.5 rounded flex items-center justify-center transition-all duration-200 shrink-0 ${
                  isInstalled
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-900'
                }`}>
                  {isInstalled && <Check className="h-3 w-3 stroke-[3]" />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold font-sans ${isInstalled ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {mod.name}
                    </span>
                    <span className="text-[9px] font-mono uppercase text-slate-500">
                      {mod.category}
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {mod.description}
                  </p>

                  {/* Stat bonus summary */}
                  <div className="flex flex-wrap gap-2 mt-2 font-mono text-[9px]">
                    {Object.entries(mod.statsModifier).map(([statName, modifier]) => {
                      if (!modifier || modifier === 0) return null;
                      const isPositive = (modifier as number) > 0;
                      return (
                        <span 
                          key={statName}
                          className={`px-1.5 py-0.5 rounded ${
                            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {statName.toUpperCase()}: {isPositive ? '+' : ''}{modifier as number}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
