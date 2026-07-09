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
  const [userScale, setUserScale] = useState(1);
  const [isPressing, setIsPressing] = useState(false);
  const [syncScore, setSyncScore] = useState(50); // overall sync level 0-100
  const [cycleProgress, setCycleProgress] = useState(0); // 0 to 100 for current phase
  const [perfectStreak, setPerfectStreak] = useState(0);

  const targetSphereRef = useRef<HTMLDivElement>(null);
  const userSphereRef = useRef<HTMLDivElement>(null);
  const frameCountRef = useRef(0);

  const userScaleRef = useRef(1);
  const syncScoreRef = useRef(50);
  const perfectStreakRef = useRef(0);
  const lastReportedSyncRef = useRef<number | null>(null);
  const lastVentTimeRef = useRef(0);

  const isPressingRef = useRef(isPressing);
  const breathStateRef = useRef(breathState);
  const triggerIbukiVentRef = useRef(triggerIbukiVent);
  const onSyncChangeRef = useRef(onSyncChange);
  const isOverdriveRef = useRef(isOverdrive);
  const setOverdriveRef = useRef(setOverdrive);

  // Sync refs to state values
  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  useEffect(() => {
    breathStateRef.current = breathState;
  }, [breathState]);

  useEffect(() => {
    triggerIbukiVentRef.current = triggerIbukiVent;
  }, [triggerIbukiVent]);

  useEffect(() => {
    onSyncChangeRef.current = onSyncChange;
  }, [onSyncChange]);

  useEffect(() => {
    isOverdriveRef.current = isOverdrive;
  }, [isOverdrive]);

  useEffect(() => {
    setOverdriveRef.current = setOverdrive;
  }, [setOverdrive]);

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

  // Continuous physics and breath cycle calculation loop
  useEffect(() => {
    const cycleStartTime = Date.now();
    let lastTime = Date.now();
    let frameId: number;

    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Cycle calculations
      const totalElapsed = now - cycleStartTime;
      const cycleElapsed = totalElapsed % 16000; // 16s full cycle

      let currentPhase: BreathState = 'inhale';
      let phaseElapsed = 0;

      if (cycleElapsed < 4000) {
        currentPhase = 'inhale';
        phaseElapsed = cycleElapsed;
      } else if (cycleElapsed < 8000) {
        currentPhase = 'hold';
        phaseElapsed = cycleElapsed - 4000;
      } else if (cycleElapsed < 12000) {
        currentPhase = 'exhale';
        phaseElapsed = cycleElapsed - 8000;
      } else {
        currentPhase = 'rest';
        phaseElapsed = cycleElapsed - 12000;
      }

      const pct = (phaseElapsed / 4000) * 100;

      // Update user scale smoothly based on physical input
      const pressing = isPressingRef.current;
      let nextUserScale = userScaleRef.current;
      if (pressing) {
        nextUserScale = Math.min(2.4, nextUserScale + dt * 1.8);
      } else {
        nextUserScale = Math.max(1.0, nextUserScale - dt * 1.8);
      }
      userScaleRef.current = nextUserScale;

      // Compute current target scale matching the visual progress
      const t = pct / 100;
      let target;
      if (currentPhase === 'inhale') {
        target = 1 + t * 1.4;
      } else if (currentPhase === 'hold') {
        target = 2.4;
      } else if (currentPhase === 'exhale') {
        target = 2.4 - t * 1.4;
      } else {
        target = 1;
      }

      // Compute instantaneous and smoothed sync alignment
      const diff = Math.abs(target - nextUserScale);
      const instantSync = Math.max(0, 100 - (diff / 1.4) * 100);

      const nextSyncScore = syncScoreRef.current * 0.96 + instantSync * 0.04;
      syncScoreRef.current = nextSyncScore;

      // Perfect alignment tracker
      let nextPerfectStreak = perfectStreakRef.current;
      if (instantSync > 90) {
        nextPerfectStreak += 1;
      } else {
        nextPerfectStreak = Math.max(0, nextPerfectStreak - 1.5);
      }
      perfectStreakRef.current = nextPerfectStreak;

      // Vent heat safely under sync exhale constraints
      if (instantSync > 88 && currentPhase === 'exhale' && !pressing) {
        if (now - lastVentTimeRef.current > 300) {
          lastVentTimeRef.current = now;
          if (triggerIbukiVentRef.current) {
            triggerIbukiVentRef.current();
          }
        }
      }

      // Direct DOM style updates for 60FPS fluid ring/sphere scaling (completely bypasses React Virtual DOM)
      if (targetSphereRef.current) {
        targetSphereRef.current.style.width = `${target * 50}px`;
        targetSphereRef.current.style.height = `${target * 50}px`;
        targetSphereRef.current.style.borderColor = currentPhase === 'hold' ? '#8b5cf6' : currentPhase === 'exhale' ? '#10b981' : '#06b6d4';
      }
      if (userSphereRef.current) {
        userSphereRef.current.style.width = `${nextUserScale * 50}px`;
        userSphereRef.current.style.height = `${nextUserScale * 50}px`;
        userSphereRef.current.style.borderColor = pressing ? '#22d3ee' : '#475569';
        userSphereRef.current.style.backgroundColor = pressing ? 'rgba(34, 211, 238, 0.05)' : 'transparent';
      }

      // Throttled local state dispatch to run once every 12 frames (~5 FPS) for static readings/progress bars
      frameCountRef.current++;
      if (currentPhase !== breathStateRef.current) {
        setBreathState(currentPhase);
      }
      if (frameCountRef.current % 12 === 0) {
        setCycleProgress(pct);
        setUserScale(nextUserScale);
        setSyncScore(nextSyncScore);
        setPerfectStreak(nextPerfectStreak);
      }

      // Report to parent if sync value has changed
      const roundedSync = Math.round(nextSyncScore);
      if (lastReportedSyncRef.current !== roundedSync) {
        lastReportedSyncRef.current = roundedSync;
        if (onSyncChangeRef.current) {
          onSyncChangeRef.current(roundedSync);
        }
      }

      // Overdrive trigger checked asynchronously
      if (nextPerfectStreak > 180 && !isOverdriveRef.current) {
        if (setOverdriveRef.current) {
          setOverdriveRef.current(true);
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Compute target scale derived directly from current render states
  const targetScale = (() => {
    const t = cycleProgress / 100;
    if (breathState === 'inhale') {
      return 1 + t * 1.4;
    } else if (breathState === 'hold') {
      return 2.4;
    } else if (breathState === 'exhale') {
      return 2.4 - t * 1.4;
    } else {
      return 1;
    }
  })();

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
            ref={targetSphereRef}
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
            ref={userSphereRef}
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
