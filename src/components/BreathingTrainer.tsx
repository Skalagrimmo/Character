import React, { useState, useEffect, useRef } from 'react';
import { Wind, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface BreathingTrainerProps {
  onSyncChange: (syncPercent: number) => void;
  isOverdrive: boolean;
  setOverdrive: (active: boolean) => void;
  triggerIbukiVent: () => void;
}

type BreathState = 'inhale' | 'hold' | 'exhale' | 'rest';

export default function BreathingTrainer({
  onSyncChange,
  isOverdrive,
  setOverdrive,
  triggerIbukiVent,
}: BreathingTrainerProps) {
  const [breathState, setBreathState] = useState<BreathState>('inhale');
  const [targetScale, setTargetScale] = useState(1); // 1 to 2.5
  const [userScale, setUserScale] = useState(1);
  const [isPressing, setIsPressing] = useState(false);
  const [syncScore, setSyncScore] = useState(50); // overall sync level 0-100
  const [cycleProgress, setCycleProgress] = useState(0); // 0 to 100 for current phase
  const [perfectStreak, setPerfectStreak] = useState(0);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const userScaleRef = useRef(1);
  const syncScoreRef = useRef(50);
  const perfectStreakRef = useRef(0);

  // Rhythmic breath target cycle loop
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathState(prev => {
        switch (prev) {
          case 'inhale':
            return 'hold';
          case 'hold':
            return 'exhale';
          case 'exhale':
            return 'rest';
          case 'rest':
          default:
            return 'inhale';
        }
      });
      setCycleProgress(0);
    }, 4000); // 4 seconds per phase

    return () => clearInterval(interval);
  }, []);

  // Update target scale and progress based on state
  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    const startTime = Date.now();
    const duration = 4000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setCycleProgress(pct);

      const t = elapsed / duration;
      setTargetScale(prev => {
        if (breathState === 'inhale') {
          return 1 + t * 1.4; // Grows from 1 to 2.4
        } else if (breathState === 'hold') {
          return 2.4; // Stays at 2.4
        } else if (breathState === 'exhale') {
          return 2.4 - t * 1.4; // Shrinks to 1
        } else {
          return 1; // Stays at 1
        }
      });

      if (elapsed < duration) {
        progressTimer = setTimeout(tick, 30);
      }
    };

    tick();

    return () => clearTimeout(progressTimer);
  }, [breathState]);

  // Handle keyboard/Spacebar listener for tactile accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPressing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPressing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update user scale based on pressing state
  useEffect(() => {
    const updatePhysics = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      let nextUserScale = userScaleRef.current;
      if (isPressing) {
        // Inhaling (expanding)
        nextUserScale = Math.min(2.4, nextUserScale + dt * 1.8);
      } else {
        // Exhaling (contracting)
        nextUserScale = Math.max(1.0, nextUserScale - dt * 1.8);
      }
      userScaleRef.current = nextUserScale;
      setUserScale(nextUserScale);

      // Calculate instantaneous alignment difference
      const diff = Math.abs(targetScale - nextUserScale);
      const instantSync = Math.max(0, 100 - (diff / 1.4) * 100);

      // Smooth overall sync score
      const nextSyncScore = syncScoreRef.current * 0.96 + instantSync * 0.04;
      syncScoreRef.current = nextSyncScore;
      setSyncScore(nextSyncScore);

      // Track perfect alignment streaks (alignment score > 90)
      let nextPerfectStreak = perfectStreakRef.current;
      if (instantSync > 90) {
        nextPerfectStreak += 1;
      } else {
        nextPerfectStreak = Math.max(0, nextPerfectStreak - 1.5);
      }
      perfectStreakRef.current = nextPerfectStreak;
      setPerfectStreak(nextPerfectStreak);

      // If user holds/releases in sync, occasionally help vent heat
      if (instantSync > 88 && breathState === 'exhale' && isPressing === false) {
        Promise.resolve().then(() => {
          triggerIbukiVent();
        });
      }

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    lastTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPressing, targetScale, breathState, triggerIbukiVent]);

  // Propagate sync score to parent safely during Commit phase
  useEffect(() => {
    onSyncChange(Math.round(syncScore));
  }, [syncScore, onSyncChange]);

  // Propagate Overdrive status to parent safely when streak requirement is met
  useEffect(() => {
    if (perfectStreak > 180 && !isOverdrive) {
      setOverdrive(true);
    }
  }, [perfectStreak, isOverdrive, setOverdrive]);

  const stateDetails = {
    inhale: {
      label: 'DYNAMIC INHALE',
      desc: 'Draw raw air. Click and hold to expand lung volume.',
      color: 'text-cyan-400',
      barColor: 'bg-cyan-500',
    },
    hold: {
      label: 'COMPRESS & ENGAGE',
      desc: 'Lock solar plexus. Hold mouse button down.',
      color: 'text-violet-400',
      barColor: 'bg-violet-500',
    },
    exhale: {
      label: 'IBUKI FORCE EXHAUST',
      desc: 'Expel deep vocalized breath. Release to vent.',
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
    },
    rest: {
      label: 'NEURAL FLUSH',
      desc: 'Rest and let lungs recalibrate. Stay relaxed.',
      color: 'text-slate-400',
      barColor: 'bg-slate-500',
    },
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-sm p-5 flex flex-col h-full rounded-sm relative" id="breathing-trainer">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2">
          <Wind className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase">
            Ibuki Respiratory Sync Core
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          METHOD: GOJU-RYU IBUKI
        </div>
      </div>

      {/* Main Breathing Stage Panel */}
      <div className="flex-1 bg-slate-950 rounded border border-slate-800/60 p-4 flex flex-col md:flex-row items-center justify-around gap-6 relative overflow-hidden">
        
        {/* Dynamic target rings visualizer */}
        <div className="relative w-40 h-40 flex items-center justify-center bg-slate-900/50 rounded-full border border-slate-800/20">
          
          {/* Grid target rings */}
          <div className="absolute w-12 h-12 rounded-full border border-dashed border-slate-800" />
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-slate-800" />

          {/* Glowing Target Ring (Dynamic expand) */}
          <div 
            className="absolute rounded-full border-2 border-emerald-500/30 transition-all duration-300 ease-out flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            style={{ 
              width: `${targetScale * 50}px`, 
              height: `${targetScale * 50}px`,
              borderColor: breathState === 'hold' ? '#8b5cf6' : breathState === 'exhale' ? '#10b981' : '#06b6d4'
            }}
          >
            {/* Pulsating target center */}
            <div className={`w-2 h-2 rounded-full ${breathState === 'hold' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
          </div>

          {/* User Breath Outer Sphere (Driven by Mouse Hold) */}
          <div 
            className="absolute rounded-full border-2 border-dashed transition-transform duration-75 ease-out shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            style={{ 
              width: `${userScale * 50}px`, 
              height: `${userScale * 50}px`,
              borderColor: isPressing ? '#22d3ee' : '#475569',
              backgroundColor: isPressing ? 'rgba(34, 211, 238, 0.05)' : 'transparent'
            }}
          />

          {/* Perfect Match Shimmer Effect */}
          {Math.abs(targetScale - userScale) < 0.15 && (
            <div className="absolute inset-0 border border-cyan-400 rounded-full animate-ping opacity-25" />
          )}
        </div>

        {/* Sync Telemetry panel */}
        <div className="flex-1 space-y-3 font-mono text-xs w-full max-w-[260px]">
          <div className="bg-slate-900/80 rounded border border-slate-800/80 p-3 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-800 pb-1.5">
              <span>CYBERNETIC COUPLING</span>
              <span className={stateDetails[breathState].color}>{breathState.toUpperCase()}</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Target Volume:</span>
              <span className="text-slate-200">{(targetScale * 41).toFixed(0)} L/psi</span>
            </div>
            
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">Limb Feedback:</span>
              <span className={isPressing ? 'text-cyan-400' : 'text-slate-400'}>
                {(userScale * 41).toFixed(0)} L/psi
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Synaptic Sync:</span>
              <span className={`text-sm font-bold ${syncScore > 85 ? 'text-emerald-400' : syncScore > 65 ? 'text-cyan-400' : 'text-amber-500'}`}>
                {syncScore.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Phase progress tracker */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>CYCLE SEQUENCE</span>
              <span>{Math.round(cycleProgress)}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-100 ${stateDetails[breathState].barColor}`}
                style={{ width: `${cycleProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guide details and interactive Sync Hold Button */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="flex-1 text-left">
          <div className={`text-xs font-bold font-mono tracking-wider ${stateDetails[breathState].color}`}>
            {stateDetails[breathState].label}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
            {stateDetails[breathState].desc}
          </p>
        </div>

        {/* Large, high-tech button */}
        <button
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={(e) => { e.preventDefault(); setIsPressing(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setIsPressing(false); }}
          className={`w-full sm:w-auto px-6 py-3.5 rounded border font-mono text-xs font-bold tracking-wider select-none cursor-pointer transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 ${
            isPressing
              ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
              : 'bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-300 hover:bg-slate-900'
          }`}
          id="sync-breath-btn"
        >
          <Wind className={`h-4 w-4 ${isPressing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
          <span>{isPressing ? 'HOLDING SYNAPSE...' : 'HOLD TO INHALE [SPACEBAR]'}</span>
        </button>
      </div>

      {/* Overdrive Meter / Reward Indicator */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          {isOverdrive ? (
            <CheckCircle2 className="h-4 w-4 text-cyan-400 animate-pulse" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-700" />
          )}
          <span className="text-slate-400">
            {isOverdrive ? 'OVERDRIVE MODE CALIBRATED' : 'ALIGNMENT CORE STATUS:'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-slate-500">Perfect Streak:</span>
          <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50 flex">
            <div 
              className="h-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] transition-all duration-100"
              style={{ width: `${Math.min(100, (perfectStreak / 180) * 100)}%` }}
            />
          </div>
          <span className={`w-8 text-right font-bold ${perfectStreak > 150 ? 'text-cyan-400' : 'text-slate-400'}`}>
            {Math.min(100, Math.round((perfectStreak / 180) * 100))}%
          </span>
        </div>
      </div>
    </div>
  );
}
