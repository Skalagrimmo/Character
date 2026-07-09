import React, { useState } from 'react';
import { Terminal, Shield, Zap, History, Trash2, Award, Trophy, Activity, Cpu, Database, Flame, Clock, TrendingUp, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export interface CombatLog {
  id: string;
  targetId: string;
  targetName: string;
  threatLevel: string;
  sector: string;
  timestamp: string;
  duration: number; // in seconds
  movesExecuted: number;
  maxHeat: number;
  avgSync: number;
  bountyCredits: string;
  criticalHits: number;
  notes: string;
}

interface CombatLogsProps {
  logs: CombatLog[];
  onClearLogs: () => void;
}

const playExportSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(620, now);
    osc1.frequency.exponentialRampToValueAtTime(1180, now + 0.08);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(840, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(1680, now + 0.16);
    
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.14);
    
    osc2.start(now + 0.06);
    osc2.stop(now + 0.22);
  } catch (err) {
    // Fail silently if browser blocks audio
  }
};

export default function CombatLogs({ logs, onClearLogs }: CombatLogsProps) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLog = logs.find(log => log.id === selectedLogId) || logs[0] || null;

  // Calculate totals/stats for top summary indicators
  const totalBounty = logs.reduce((acc, log) => {
    const val = parseInt(log.bountyCredits.replace(/[^0-9]/g, '')) || 0;
    return acc + val;
  }, 0);

  const avgSyncAll = logs.length > 0 
    ? Math.round(logs.reduce((acc, log) => acc + log.avgSync, 0) / logs.length) 
    : 0;

  const maxHeatAll = logs.length > 0 
    ? Math.max(...logs.map(log => log.maxHeat)) 
    : 0;

  const last10Missions = [...logs]
    .slice(0, 10)
    .reverse()
    .map((log, idx) => ({
      index: idx + 1,
      name: log.targetName,
      shortName: log.targetName.split(' ')[0],
      avgSync: log.avgSync,
      threat: log.threatLevel.replace('-LEVEL', ''),
      credits: log.bountyCredits,
    }));

  const handleExportLogs = () => {
    if (logs.length === 0) return;

    const formattedHeader = `==================================================
        CYBER-ARM ENGAGEMENT METRICS REPORT
==================================================
Generated on: ${new Date().toLocaleString()}
Sector Grid: Sanchin-03-A

SESSION SUMMARY INDICATORS:
- Total Simulated Engagements: ${logs.length}
- Cumulative Bounty Credits:  ${totalBounty.toLocaleString()} CR
- Average Neural Synchrony:   ${avgSyncAll}%
- Peak Mechanical Temperature: ${maxHeatAll.toFixed(1)}°C
==================================================

MISSION ENTRIES DETAILED:
${logs.map((log, index) => `${index + 1}. TARGET: ${log.targetName.toUpperCase()}
   - THREAT STATUS:     [${log.threatLevel}]
   - SIMULATION TIME:    ${log.timestamp}
   - DURATION:           ${log.duration} seconds
   - KINETIC STRIKES:    ${log.movesExecuted} strikes
   - REWARDS CREDITED:   ${log.bountyCredits}
   - AVERAGE SYNC RATIO: ${log.avgSync}%
   - PEAK CORE THERMAL:  ${log.maxHeat.toFixed(1)}°C
   - COMBAT RECON NOTES: "${log.notes}"
--------------------------------------------------`).join('\n')}

==================================================
        END OF RECORD - STANDBY PROTOCOL ACTIVE
==================================================`;

    navigator.clipboard.writeText(formattedHeader).then(() => {
      setCopied(true);
      playExportSound();
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy metrics: ', err);
    });
  };

  return (
    <div 
      className="bg-slate-900/40 border border-slate-800 backdrop-blur-sm p-5 rounded-sm flex flex-col font-mono text-xs relative overflow-hidden"
      id="combat-logs-panel"
    >
      {/* Background scanline accent */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.05)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none" />

      {/* Header Info */}
      <div className="flex justify-between items-center mb-4 relative z-10 border-b border-slate-800/60 pb-3">
        <div className="flex items-center space-x-2">
          <History className="h-4 w-4 text-emerald-400" />
          <div>
            <div className="text-[9px] text-emerald-400 uppercase tracking-widest leading-none font-bold">ENGAGEMENT LEDGER</div>
            <h3 className="text-xs font-bold text-slate-200 tracking-tight uppercase">
              Mission Performance Logs
            </h3>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportLogs}
              className={`flex items-center space-x-1.5 px-2.5 py-1 border transition-all duration-200 rounded-sm text-[9px] font-bold cursor-pointer active:scale-95 ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-cyan-950/20 hover:bg-cyan-900/40 border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300'
              }`}
              id="export-logs-btn"
              title="Copy session telemetry report to clipboard for external tracking"
            >
              {copied ? <Check className="h-3 w-3 animate-bounce" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'REPORT COPIED' : 'EXPORT REPORT'}</span>
            </button>

            <button
              onClick={onClearLogs}
              className="flex items-center space-x-1 px-2 py-1 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 transition-all rounded-sm text-[9px] cursor-pointer"
              id="clear-logs-btn"
              title="Clear all local simulation logs"
            >
              <Trash2 className="h-3 w-3" />
              <span>PURGE REGISTRY</span>
            </button>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        /* Empty State */
        <div className="h-40 flex flex-col items-center justify-center text-center p-4 bg-slate-950/30 rounded border border-slate-800/40 relative z-10">
          <Database className="h-6 w-6 text-slate-600 mb-2 animate-pulse" />
          <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">No active logs compiled</div>
          <p className="text-slate-500 text-[10px] max-w-xs mt-1 leading-normal">
            Select a high-threat objective in the target dispatch feed, engage, and complete the tactical simulation sequence to generate high-performance metrics.
          </p>
        </div>
      ) : (
        /* Rendered Logs Board */
        <div className="space-y-4 relative z-10">
          {/* Quick Metrics Header Row */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-2.5 rounded border border-slate-800/50">
            <div className="text-left">
              <span className="text-[8px] text-slate-500 block uppercase">TOTAL REWARDS</span>
              <span className="text-emerald-400 font-bold text-xs">
                {totalBounty.toLocaleString()} <span className="text-[8px] font-medium text-emerald-500">CR</span>
              </span>
            </div>
            <div className="text-left border-l border-slate-800/80 pl-3">
              <span className="text-[8px] text-slate-500 block uppercase">AVG NEURAL SYNC</span>
              <span className="text-cyan-400 font-bold text-xs">{avgSyncAll}%</span>
            </div>
            <div className="text-left border-l border-slate-800/80 pl-3">
              <span className="text-[8px] text-slate-500 block uppercase">PEAK THERMAL CAP</span>
              <span className="text-amber-500 font-bold text-xs">{maxHeatAll.toFixed(0)}°C</span>
            </div>
          </div>

          {/* NEURAL SYNC TRENDS Mini-Chart */}
          <div className="bg-slate-950/40 p-3 rounded border border-slate-800/60" id="avg-sync-trends-chart">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-mono text-[9px] tracking-wider text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-cyan-400 animate-pulse" />
                Neural Sync Trends // Last 10 Missions
              </span>
              <span className="text-[8px] font-mono text-cyan-500/80 uppercase">
                Calibrations: {Math.min(10, logs.length)}/10
              </span>
            </div>
            {/* Chart Container */}
            <div className="h-[90px] w-full pr-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={last10Missions}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="syncGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.25} horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="shortName" 
                    stroke="#475569" 
                    fontSize={8}
                    tickLine={false}
                    axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={8}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950/95 border border-slate-800 p-2 rounded shadow-xl font-mono text-[9px] text-slate-300">
                            <div className="text-cyan-400 font-bold uppercase mb-0.5 truncate max-w-[150px]">
                              {data.name}
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>THREAT:</span>
                              <span className="text-amber-400 font-bold">{data.threat}</span>
                            </div>
                            <div className="flex justify-between gap-4 mt-0.5">
                              <span>AVG SYNC:</span>
                              <span className="text-cyan-400 font-bold">{data.avgSync}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgSync" 
                    stroke="#22d3ee" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#syncGrad)" 
                    activeDot={{ r: 4, stroke: '#22d3ee', strokeWidth: 1, fill: '#0f172a' }}
                  />
                  <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" strokeWidth={0.5} opacity={0.5} label={{ value: 'CALIBRATED', fill: '#10b981', fontSize: 7, position: 'insideTopRight' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left Side: Log items listing */}
            <div className="md:col-span-5 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const isSelected = selectedLogId === log.id || (!selectedLogId && activeLog?.id === log.id);
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full text-left p-2 rounded-sm border transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/10 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                    id={`log-item-${log.id}`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[8px] px-1 py-0.5 bg-slate-950 text-emerald-400 font-bold rounded-xs border border-emerald-500/20 uppercase">
                          {log.threatLevel.replace('-LEVEL', '')}
                        </span>
                        <span className={`text-[10px] font-bold tracking-tight truncate ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {log.targetName.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-500 block mt-0.5">
                        {log.timestamp} // {log.sector.split('//')[0]}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 pr-1 shrink-0">
                      +{parseInt(log.bountyCredits.replace(/[^0-9]/g, '')) / 1000}K
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Side: Log Item Dossier Detail */}
            {activeLog && (
              <div className="md:col-span-7 bg-slate-950/60 rounded border border-slate-800 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Trophy className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-bold text-slate-300 uppercase">
                        DEBRIEF: {activeLog.id}
                      </span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono">SECURE PROTOCOL</span>
                  </div>

                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-tight">
                    {activeLog.targetName} DEFEATED
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic my-1.5">
                    &ldquo;{activeLog.notes}&rdquo;
                  </p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-800/40 pt-2 text-[9.5px]">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <div>
                        <span className="text-[8px] text-slate-500 block uppercase">ENGAGEMENT TIME</span>
                        <span className="text-slate-300 font-medium">{activeLog.duration}s</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Cpu className="h-3 w-3 text-slate-500" />
                      <div>
                        <span className="text-[8px] text-slate-500 block uppercase">KINETIC MANEUVERS</span>
                        <span className="text-slate-300 font-medium">{activeLog.movesExecuted} strikes</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Flame className="h-3 w-3 text-red-400" />
                      <div>
                        <span className="text-[8px] text-slate-500 block uppercase">PEAK CORE HEAT</span>
                        <span className="text-slate-300 font-medium">{activeLog.maxHeat.toFixed(0)}°C</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Activity className="h-3 w-3 text-cyan-400" />
                      <div>
                        <span className="text-[8px] text-slate-500 block uppercase">AVG NEURAL SYNC</span>
                        <span className="text-slate-300 font-medium">{activeLog.avgSync}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-2 mt-2.5 flex justify-between items-center text-[8.5px] text-slate-500">
                  <span>BOUNTY RECOVERY STATUS:</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-500/20 rounded-xs">
                    CREDITED SUCCESSFULLY
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
