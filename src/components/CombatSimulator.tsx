import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { CombatMove, CombatStats, COMBAT_MOVES } from '../types';
import { Shield, Zap, Wind, AlertCircle, Volume2, VolumeX, Brain, RefreshCw, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CombatSimulatorProps {
  stats: CombatStats;
  selectedMove: CombatMove | null;
  onMoveTrigger: (move: CombatMove) => void;
  isOverdrive: boolean;
  activeTarget?: any;
  onHardReset?: () => void;
  targetIntegrity?: number;
  onManeuverTrigger?: (maneuverId: string, heatCost: number) => void;
  hasDashBoost?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  shape?: 'circle' | 'spark' | 'ring' | 'hex';
}

interface HTMLParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  duration: number;
  shape: 'circle' | 'square' | 'spark' | 'triangle';
}

export default function CombatSimulator({
  stats,
  selectedMove,
  onMoveTrigger,
  isOverdrive,
  activeTarget,
  onHardReset,
  targetIntegrity = 100,
  onManeuverTrigger,
  hasDashBoost,
}: CombatSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animation states
  const currentMoveRef = useRef<CombatMove | null>(null);
  const moveProgressRef = useRef<number>(0); // 0 to 1
  const activeManeuverRef = useRef<string | null>(null);
  const maneuverProgressRef = useRef<number>(0); // 0 to 1
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);
  const damageFlashRef = useRef<number>(0);
  const hasImpactedRef = useRef<boolean>(false);

  const [htmlParticles, setHtmlParticles] = useState<HTMLParticle[]>([]);

  // HEATMAP STATES & REF
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedZone, setSelectedZone] = useState<string>('mid-center');
  const [strikeHistory, setStrikeHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('ren_combat_zones_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback to generating mock data
      }
    }
    
    // Generating mock initial data with mid-center bias
    const initialZones = [
      'high-left', 'high-center', 'high-right',
      'mid-left', 'mid-center', 'mid-right',
      'low-left', 'low-center', 'low-right'
    ];
    const initialHistory: string[] = [];
    
    // Create 35 mock records with strong bias for mid-center (Reactor)
    for (let i = 0; i < 35; i++) {
      const rand = Math.random();
      if (rand < 0.35) {
        initialHistory.push('mid-center'); // biased
      } else if (rand < 0.5) {
        initialHistory.push('high-center');
      } else if (rand < 0.65) {
        initialHistory.push('low-center');
      } else {
        const otherZones = initialZones.filter(z => z !== 'mid-center' && z !== 'high-center' && z !== 'low-center');
        initialHistory.push(otherZones[Math.floor(Math.random() * otherZones.length)]);
      }
    }
    return initialHistory;
  });

  const playZoneClickSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioCtxRef.current || new AudioContextClass();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (err) {
      // Fail silently
    }
  };

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('ren_combat_zones_history', JSON.stringify(strikeHistory));
  }, [strikeHistory]);

  // D3 Heatmap rendering logic
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Get container dimensions
    const container = svgRef.current.parentElement;
    if (!container) return;
    const width = container.clientWidth || 180;
    const height = container.clientHeight || 120;
    
    const margin = { top: 4, right: 4, bottom: 4, left: 4 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    svg.attr('width', width).attr('height', height);
    
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
      
    // 3x3 Layout Data
    const zonesData = [
      { id: 'high-left', shortLabel: 'H-L', row: 0, col: 0, name: 'Temple' },
      { id: 'high-center', shortLabel: 'H-C', row: 0, col: 1, name: 'Cranial' },
      { id: 'high-right', shortLabel: 'H-R', row: 0, col: 2, name: 'Optic' },
      { id: 'mid-left', shortLabel: 'M-L', row: 1, col: 0, name: 'L-Joint' },
      { id: 'mid-center', shortLabel: 'M-C', row: 1, col: 1, name: 'Reactor' },
      { id: 'mid-right', shortLabel: 'M-R', row: 1, col: 2, name: 'R-Joint' },
      { id: 'low-left', shortLabel: 'L-L', row: 2, col: 0, name: 'L-Knee' },
      { id: 'low-center', shortLabel: 'L-C', row: 2, col: 1, name: 'Anchor' },
      { id: 'low-right', shortLabel: 'L-R', row: 2, col: 2, name: 'R-Knee' },
    ];
    
    // Compute counts
    const counts = zonesData.reduce((acc, z) => {
      acc[z.id] = strikeHistory.filter(id => id === z.id).length;
      return acc;
    }, {} as Record<string, number>);
    
    const total = strikeHistory.length || 1;
    const maxCount = Math.max(...Object.values(counts), 1);
    
    const cellWidth = chartWidth / 3;
    const cellHeight = chartHeight / 3;
    
    // Color scale mapping counts to a glowing neon cyberpunk spectrum (slate-900 to cyan to warning-amber)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, maxCount * 0.25, maxCount * 0.6, maxCount])
      .range(['rgba(15, 23, 42, 0.4)', 'rgba(6, 182, 212, 0.3)', 'rgba(6, 182, 212, 0.75)', 'rgba(245, 158, 11, 0.9)']);
      
    const cells = chartGroup.selectAll('.cell')
      .data(zonesData)
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${d.col * cellWidth}, ${d.row * cellHeight})`);
      
    // Cell rect
    cells.append('rect')
      .attr('x', 2)
      .attr('y', 2)
      .attr('width', cellWidth - 4)
      .attr('height', cellHeight - 4)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', d => colorScale(counts[d.id] || 0))
      .attr('stroke', d => selectedZone === d.id ? '#22d3ee' : 'rgba(51, 65, 85, 0.3)')
      .attr('stroke-width', d => selectedZone === d.id ? 1.5 : 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedZone(d.id);
        playZoneClickSound();
      });
      
    // Abbreviation Label
    cells.append('text')
      .attr('x', cellWidth / 2)
      .attr('y', cellHeight / 2 - 2)
      .attr('text-anchor', 'middle')
      .attr('fill', d => (counts[d.id] || 0) > maxCount * 0.5 ? '#0f172a' : '#94a3b8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => d.shortLabel);
      
    // Count / Percentage label
    cells.append('text')
      .attr('x', cellWidth / 2)
      .attr('y', cellHeight / 2 + 8)
      .attr('text-anchor', 'middle')
      .attr('fill', d => (counts[d.id] || 0) > maxCount * 0.5 ? '#0f172a' : '#22d3ee')
      .attr('font-size', '7.5px')
      .attr('font-family', 'monospace')
      .style('pointer-events', 'none')
      .text(d => {
        const count = counts[d.id] || 0;
        const pct = Math.round((count / total) * 100);
        return `${count}x (${pct}%)`;
      });
      
    // Tooltip
    cells.append('title')
      .text(d => `${d.name}: ${counts[d.id] || 0} strikes (${Math.round(((counts[d.id] || 0) / total) * 100)}%)`);
      
  }, [strikeHistory, selectedZone]);

  const triggerFramerMotionSparks = (move: CombatMove) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const isMobileWidth = canvas.width < 500;
    const targetX = cx + (isMobileWidth ? 85 : 120);
    const targetY = cy - 45;

    const count = move.id === 'gekisai' ? 22 : move.id === 'seiyunchin' ? 28 : 16;
    const newParticles: HTMLParticle[] = [];

    const colors = move.id === 'gekisai'
      ? ['#22d3ee', '#06b6d4', '#e2e8f0', '#ffffff']
      : move.id === 'seiyunchin'
      ? ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#b45309']
      : ['#c084fc', '#a855f7', '#818cf8', '#ffffff'];

    const shapes: ('circle' | 'square' | 'spark' | 'triangle')[] =
      move.id === 'seiyunchin'
        ? ['square', 'triangle', 'circle']
        : ['spark', 'circle'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.5 + Math.PI;
      const speed = Math.random() * 10 + 5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - (Math.random() * 4);

      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: targetX,
        y: targetY,
        vx,
        vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * (move.id === 'seiyunchin' ? 7 : 4) + 3,
        duration: Math.random() * 0.5 + 0.5,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    setHtmlParticles(prev => [...prev.slice(-30), ...newParticles]);
  };

  const triggerFramerMotionSparksRef = useRef(triggerFramerMotionSparks);
  triggerFramerMotionSparksRef.current = triggerFramerMotionSparks;

  // --- COMBAT INTEL SYSTEM ---
  const [intelAdviceIndex, setIntelAdviceIndex] = useState(0);

  const currentAdvices = useMemo(() => {
    const advices: string[] = [];
    const heat = stats.heat;
    const sync = stats.sync;

    if (activeTarget) {
      advices.push(`TACTICAL INTEL: Current threat is ${activeTarget.name}. Weakness: ${activeTarget.weakness}.`);
      advices.push(`RECOMMENDED MOVE: Deploy ${activeTarget.recommendedMove} to exploit their ${activeTarget.shieldType}!`);
    }

    if (heat >= 85) {
      advices.push("CRITICAL HEAT DETECTED: Thermal expansion exceeds safety tolerances. CEASE offensive strikes and execute [Ibuki] venting!");
      advices.push("THERMAL LOCKOUT WARNING: Pneumatic joints near seizure limit. Hold physical maneuvers; active cooling is severely overloaded.");
    } else if (heat >= 70) {
      advices.push("HIGH THERMAL SPIKE: Actuator friction is elevating core temperatures. Perform an [Ibuki] venting cycle during Exhale state.");
      advices.push("COOLING RECOMMENDATION: Kinetic heat accumulation is high. Transition to passive Sanchin blocking to buffer energy.");
    } else {
      advices.push("MODERATE THERMAL STRESS: Dissipating active heat signatures. Coordinate deep breathing to activate light continuous cooling.");
    }

    if (sync < 60) {
      advices.push("NEURAL LINK LATENCY: Latency is sub-optimal (under 60%). Focus on breathing cycles in the optimizer to align system frequency.");
      advices.push("DESYNC RESISTANCE PENALTY: Lower synchronization increases actuator kinetic resistance, causing +20% higher heat buildup.");
    } else if (isOverdrive) {
      advices.push("OVERDRIVE STATUS: Flawless neural sync established. Strike precision is locked at 100%. Deliver Gekisai-zuki straight punches now.");
      advices.push("OVERDRIVE VENT ADVANTAGE: Friction-less link active. Deliver an immediate physical hit, then transition to Ibuki breathing.");
    } else if (sync >= 85) {
      advices.push("SYNAPTIC PEAK: Neural integration level is optimal (85%+). Maintain perfect alignment to enter BREATH SYNC OVERDRIVE.");
    }

    advices.push("TACTICAL ASSESSMENT: Elite Security Units are vulnerable to circular palm redirects. Use Tensho to block heavy counterattacks.");
    advices.push("UPGRADE OPTIMIZATION: Ensure the Cryo Heatsink module is active in the configuration dock to double passive ambient dissipation.");

    return advices;
  }, [isOverdrive, stats.heat >= 85, stats.heat >= 70, stats.sync < 60, stats.sync >= 85, activeTarget]);

  // Reset index to stay in range when current advices pool shifts
  useEffect(() => {
    setIntelAdviceIndex(0);
  }, [currentAdvices]);

  // Setup Audio Context safely
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
  };

  const toggleAudio = () => {
    if (audioEnabled) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
      setAudioEnabled(false);
    } else {
      initAudio();
    }
  };

  // Synth effect generator
  const synthesizeSound = (move: CombatMove) => {
    if (!audioEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const powerModifier = 1 + (stats.power / 100);
    const precisionModifier = 1 + (stats.precision / 100);

    if (move.id === 'gekisai') {
      // 1. Cyber Punch Impact & Piston Release
      // Main strike oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      // Pitch sweep down for kinetic impact
      osc.frequency.setValueAtTime(move.audioPitch * powerModifier, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      // Pneumatic Release Hiss (Noise buffer)
      try {
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now + 0.05);
      } catch (e) {
        // Fallback if audio buffer fails
      }
    } else if (move.id === 'sanchin') {
      // 2. Sanchin Iron Shield Guard (Muscle tension low drone + high-tech forcefield swell)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(move.audioPitch, now);
      osc2.frequency.setValueAtTime(move.audioPitch * 1.5, now);
      
      // Filter swell representing forcefield charge
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 10;
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.8);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } else if (move.id === 'tensho') {
      // 3. Tensho soft rotation palms (Phase sweeping pitch deflection)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(move.audioPitch * precisionModifier, now);
      // Sweep pitch up and down representing circular hands
      osc.frequency.linearRampToValueAtTime(move.audioPitch * 2.2, now + 0.4);
      osc.frequency.linearRampToValueAtTime(move.audioPitch * 0.8, now + 0.8);
      osc.frequency.linearRampToValueAtTime(150, now + 1.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.linearRampToValueAtTime(1500, now + 0.5);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 1.0);
    } else if (move.id === 'seiyunchin') {
      // 4. Seiyunchin Grapple-Slam (Gritty metal slide + concrete crunch impact)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      // Crushing metal servo drag
      osc.frequency.setValueAtTime(move.audioPitch, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.4);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
      
      // Slam impact spike at t=0.4
      gain.gain.setValueAtTime(0.35, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.9);
    } else if (move.id === 'ibuki') {
      // 5. Ibuki breathing (Dual low throat hum + loud aerodynamic exhaust hiss)
      // Voice cord oscillator
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const vocalGain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(75, now); // Deep bass roar
      osc2.frequency.setValueAtTime(110, now);
      
      vocalGain.gain.setValueAtTime(0.01, now);
      vocalGain.gain.linearRampToValueAtTime(0.18, now + 0.4); // Inhale-exhale swell
      vocalGain.gain.linearRampToValueAtTime(0.05, now + 1.0);
      vocalGain.gain.linearRampToValueAtTime(0.22, now + 1.4); // Second burst of air
      vocalGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc1.connect(vocalGain);
      osc2.connect(vocalGain);
      vocalGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.8);

      // Wind Hiss
      try {
        const bufferSize = ctx.sampleRate * 1.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.5;
        // Sweep wind filter to mimic lungs expanding/contracting
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        filter.frequency.exponentialRampToValueAtTime(150, now + 1.0);
        filter.frequency.exponentialRampToValueAtTime(950, now + 1.4);
        filter.frequency.exponentialRampToValueAtTime(50, now + 1.8);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.02, now);
        noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.4);
        noiseGain.gain.linearRampToValueAtTime(0.02, now + 1.0);
        noiseGain.gain.linearRampToValueAtTime(0.18, now + 1.4);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
      } catch (e) {
        // Fallback
      }
    }
  };

  const MANEUVERS = [
    {
      id: 'dash',
      name: 'Dash',
      japaneseName: '歩き / 四股',
      cost: 15,
      description: 'Burst forward to gain rapid alignment. Consumes 15 Heat. Next strike power +35% and deals 15 direct damage.',
      color: '#22d3ee'
    },
    {
      id: 'shift',
      name: 'Shift',
      japaneseName: '転身',
      cost: 10,
      description: 'Lateral chassis displacement. Consumes 10 Heat. Boosts Neural Synchrony by +25% directly.',
      color: '#34d399'
    },
    {
      id: 'parry',
      name: 'Parry',
      japaneseName: '受け',
      cost: 20,
      description: 'Electromagnetic deflection loop. Consumes 20 Heat. Absorbs force, dealing 10 direct damage and venting core.',
      color: '#38bdf8'
    }
  ];

  const synthesizeManeuverSound = (maneuverId: string) => {
    if (!audioEnabled || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
      if (maneuverId === 'dash') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
      } else if (maneuverId === 'shift') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.12);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (maneuverId === 'parry') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'square';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        
        osc2.frequency.setValueAtTime(450, now);
        osc2.frequency.exponentialRampToValueAtTime(900, now + 0.25);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      }
    } catch (e) {}
  };

  const spawnParticlesForManeuver = (type: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const renX = cx - (canvas.width < 500 ? 45 : 68);
    const particles: Particle[] = [];

    if (type === 'dash') {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: renX,
          y: cy - 40 + (Math.random() - 0.5) * 60,
          vx: -(Math.random() * 8 + 4),
          vy: (Math.random() - 0.5) * 1.5,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          size: Math.random() * 2 + 1,
          color: '#22d3ee',
          alpha: 1.0,
          shape: 'spark'
        });
      }
    } else if (type === 'shift') {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
          x: renX,
          y: cy - 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.6,
          maxLife: 0.6,
          size: Math.random() * 3 + 1.5,
          color: '#34d399',
          alpha: 1.0,
          shape: 'circle'
        });
      }
    } else if (type === 'parry') {
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: renX + 40,
          y: cy - 30,
          vx: 0,
          vy: 0,
          life: 0.4,
          maxLife: 0.4,
          size: 4 + i * 3,
          color: '#38bdf8',
          alpha: 0.8,
          shape: 'ring'
        });
      }
    }
    particlesRef.current = [...particlesRef.current, ...particles];
  };

  // Canvas Resize Observer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight || 450;
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Handle active move trigger
  useEffect(() => {
    if (selectedMove) {
      currentMoveRef.current = selectedMove;
      moveProgressRef.current = 0;
      hasImpactedRef.current = false;
      synthesizeSound(selectedMove);
      spawnParticlesForMove(selectedMove);
      
      // Record the strike zone to track the last 50 moves
      setStrikeHistory(prev => [...prev, selectedZone].slice(-50));
    }
  }, [selectedMove, selectedZone]);

  // Particle Generation based on Move Visual Style
  const spawnParticlesForMove = (move: CombatMove) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Enforce strict memory budget for low-end 2GB Android device:
    // Cap total concurrent active particles to 40 max to avoid GC stuttering
    if (particlesRef.current.length >= 40) {
      return;
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const style = move.visualStyle;
    const particles: Particle[] = [];

    // Base position of cyber arm knuckle node
    let armX = cx + 55;
    let armY = cy - 40;

    // Scale down particle density on smaller screens to optimize performance and visual density
    const isMobile = window.innerWidth < 640;
    const targetCount = isMobile ? Math.max(2, Math.floor(style.particleCount * 0.4)) : style.particleCount;

    for (let i = 0; i < targetCount; i++) {
      const life = Math.random() * 0.4 + 0.6; // 0.6 to 1.0s
      const maxLife = life;
      const size = Math.random() * 3 + 1.5;
      const color = style.color;

      if (style.pattern === 'shield') {
        // Sanchin defense: concentric hexagonal or circular ring shards expanding outward
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1.5;
        particles.push({
          x: cx + Math.cos(angle) * 35,
          y: cy - 25 + Math.sin(angle) * 35,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife,
          size: size + 1.5,
          color,
          alpha: 1,
          shape: Math.random() > 0.5 ? 'hex' : 'circle',
        });
      } else if (style.pattern === 'spiral') {
        // Tensho soft circles rotating around wrist
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 15 + 5;
        const speed = Math.random() * 1 + 0.5;
        particles.push({
          x: armX + Math.cos(angle) * radius,
          y: armY + Math.sin(angle) * radius,
          vx: -Math.sin(angle) * speed * 2 + (Math.random() - 0.5) * 0.5,
          vy: Math.cos(angle) * speed * 2 + (Math.random() - 0.5) * 0.5,
          life,
          maxLife,
          size,
          color,
          alpha: 1,
          shape: 'spark',
        });
      } else if (style.pattern === 'burst') {
        // Gekisai Punch: high energy explosion shooting forward (to the right)
        const angle = (Math.random() - 0.5) * 0.4; // narrow frontal cone
        const speed = Math.random() * 12 + 6;
        particles.push({
          x: armX,
          y: armY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 1.5,
          life: life * 0.8,
          maxLife: maxLife * 0.8,
          size: size * 1.5,
          color,
          alpha: 1,
          shape: 'spark',
        });
        
        // Add shockwave ring
        if (i === 0) {
          for (let r = 0; r < 20; r++) {
            const rAngle = Math.random() * Math.PI * 2;
            const rSpeed = Math.random() * 4 + 5;
            particles.push({
              x: armX + 20,
              y: armY,
              vx: Math.cos(rAngle) * rSpeed,
              vy: Math.sin(rAngle) * rSpeed,
              life: 0.3 + Math.random() * 0.2,
              maxLife: 0.5,
              size: 2,
              color: '#ffffff',
              alpha: 0.9,
              shape: 'ring',
            });
          }
        }
      } else if (style.pattern === 'linear') {
        // Seiyunchin grab/slam: gravity arcs falling downward
        particles.push({
          x: armX + (Math.random() - 0.5) * 30,
          y: armY - 10 + (Math.random() - 0.5) * 20,
          vx: (Math.random() * 4 + 2) * (Math.random() > 0.4 ? 1 : -0.5),
          vy: Math.random() * 8 + 4, // downward heavy gravity
          life: life * 0.9,
          maxLife: maxLife * 0.9,
          size: size + 1,
          color,
          alpha: 1,
          shape: 'circle',
        });
      } else if (style.pattern === 'radial') {
        // Ibuki breathing: particles vacuuming inward towards chest core
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 120 + 80;
        const speed = -(radius / 35); // negative speed moves inward
        particles.push({
          x: cx + Math.cos(angle) * radius,
          y: cy - 30 + Math.sin(angle) * radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.2,
          maxLife: 1.2,
          size: size * 1.2,
          color,
          alpha: 0.2,
          shape: 'circle',
        });
      }
    }

    particlesRef.current = [...particlesRef.current, ...particles];
  };

  // Gameloop for Canvas Render
  useEffect(() => {
    let animFrame: number;

    const updateAndDraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cx = canvas.width / 2;
      let cy = canvas.height / 2 + 10;

      // Handle screen shake calculations
      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current > 0.1) {
        shakeX = (Math.random() - 0.5) * shakeRef.current;
        shakeY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88; // decay
      }

      // Decay damage flash factor
      if (damageFlashRef.current > 0) {
        damageFlashRef.current -= 0.04;
      }

      // 1. Clear with transparent backdrop, leaving slate tech aesthetic grid lines
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Draw horizontal digital grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)'; // slate-700
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw subtle calibration crosshairs
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // cyan
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - 30, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 160, cy - 30);
      ctx.lineTo(cx + 160, cy - 30);
      ctx.moveTo(cx, cy - 190);
      ctx.lineTo(cx, cy + 130);
      ctx.stroke();

      // Overdrive background scanlines
      if (isOverdrive) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
        ctx.fillRect(0, (Math.sin(Date.now() / 150) * 150 + cy - 30) % canvas.height, canvas.width, 4);
      }

      // Active maneuver offsets and visualizations
      let maneuverXOffset = 0;
      let maneuverYOffset = 0;
      let drawShieldParry = false;
      let drawDashGhost = false;

      if (activeManeuverRef.current) {
        maneuverProgressRef.current += 0.04;
        const prog = maneuverProgressRef.current;
        const type = activeManeuverRef.current;

        if (prog >= 1) {
          activeManeuverRef.current = null;
          maneuverProgressRef.current = 0;
        } else {
          if (type === 'dash') {
            const ease = Math.sin(prog * Math.PI);
            maneuverXOffset = ease * 60;
            drawDashGhost = true;
          } else if (type === 'shift') {
            const ease = Math.sin(prog * Math.PI * 2);
            maneuverYOffset = ease * 30;
          } else if (type === 'parry') {
            drawShieldParry = true;
          }
        }
      }

      // Dynamic spacing coordinates for face-to-face alignment
      const isMobileWidth = canvas.width < 500;
      const spacingOffset = isMobileWidth ? 45 : 68;
      let renX = cx - spacingOffset;
      const targetX = cx + (isMobileWidth ? 85 : 120);
      const targetY = cy - 45;

      const maxStrikeExt = isMobileWidth ? 75 : 130;

      // Progress active move
      let isStriking = false;
      let strikeExt = 0; // extension offset
      let circularRot = 0;
      let breathingExhaust = 0;

      if (currentMoveRef.current) {
        moveProgressRef.current += 16 / currentMoveRef.current.duration;
        const progress = moveProgressRef.current;
        const m = currentMoveRef.current;

        if (progress >= 1) {
          currentMoveRef.current = null;
          moveProgressRef.current = 0;
        } else {
          if (m.id === 'gekisai') {
            isStriking = true;
            // Elastic punch extension: fast thrust forward, slower pull back
            if (progress < 0.25) {
              strikeExt = (progress / 0.25) * maxStrikeExt; // lunges forward
            } else {
              strikeExt = maxStrikeExt * (1 - (progress - 0.25) / 0.75); // pulls back
            }

            // Impact trigger at peak extension
            if (progress >= 0.23 && !hasImpactedRef.current) {
              hasImpactedRef.current = true;
              shakeRef.current = 14;
              damageFlashRef.current = 1.0;
              triggerFramerMotionSparksRef.current(m);
              
              // Spawn impact blast sparks directly at the collision boundary
              const impactCount = 15;
              for (let i = 0; i < impactCount; i++) {
                const angle = (Math.random() - 0.5) * Math.PI * 1.5 + Math.PI; // blowout to the left
                const speed = Math.random() * 8 + 4;
                particlesRef.current.push({
                  x: targetX - 10,
                  y: targetY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: Math.random() * 0.4 + 0.3,
                  maxLife: 0.7,
                  size: Math.random() * 3 + 2,
                  color: '#ffffff', // bright white electric sparks
                  alpha: 1.0,
                  shape: 'spark'
                });
              }
            }
          } else if (m.id === 'tensho') {
            circularRot = progress * Math.PI * 4; // double rotation
            strikeExt = Math.sin(progress * Math.PI) * (maxStrikeExt * 0.3);

            // Impact trigger during circular deflection cycle
            if (progress >= 0.3 && !hasImpactedRef.current) {
              hasImpactedRef.current = true;
              shakeRef.current = 6;
              damageFlashRef.current = 0.6;
              triggerFramerMotionSparksRef.current(m);
              
              // Spawn circular swirly sparks
              for (let i = 0; i < 12; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 2;
                particlesRef.current.push({
                  x: targetX - 15,
                  y: targetY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 0.5,
                  maxLife: 0.5,
                  size: 2.5,
                  color: m.visualStyle.color,
                  alpha: 1.0,
                  shape: 'circle'
                });
              }
            }
          } else if (m.id === 'seiyunchin') {
            // heavy lunge and downward pull
            if (progress < 0.3) {
              strikeExt = (progress / 0.3) * (maxStrikeExt * 0.65);
            } else {
              strikeExt = (maxStrikeExt * 0.65) - ((progress - 0.3) / 0.7) * (maxStrikeExt * 0.3);
            }

            if (progress >= 0.28 && !hasImpactedRef.current) {
              hasImpactedRef.current = true;
              shakeRef.current = 18; // heavy rumble
              damageFlashRef.current = 1.0;
              triggerFramerMotionSparksRef.current(m);

              // Heavy vertical sparks shooting downward
              for (let i = 0; i < 15; i++) {
                particlesRef.current.push({
                  x: targetX + (Math.random() - 0.5) * 35,
                  y: targetY - 20,
                  vx: (Math.random() - 0.5) * 3,
                  vy: Math.random() * 8 + 4, // heavy falling speed
                  life: 0.8,
                  maxLife: 0.8,
                  size: 3.5,
                  color: '#fbbf24', // golden copper heavy particles
                  alpha: 1.0,
                  shape: 'hex'
                });
              }
            }
          } else if (m.id === 'ibuki') {
            // slow expansion and compression matching heavy abdominal breathing
            breathingExhaust = Math.sin(progress * Math.PI * 2) * 8;
          }
        }
      }

      // 2. DRAW PROTAGONIST VECTOR SCHEMATIC
      // Store original coordinates and apply active maneuver offsets
      const originalRenX = renX;
      const originalCy = cy;
      renX += maneuverXOffset;
      cy += maneuverYOffset;

      // Feet / Legs rooted in Sanchin-dachi Stance
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'; // slate-400
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left foot rooted (back)
      ctx.beginPath();
      ctx.moveTo(renX - 30, cy + 20); // hip
      ctx.lineTo(renX - 50, cy + 70); // knee bent inwards
      ctx.lineTo(renX - 40, cy + 110); // rooted foot pigeon-toed
      ctx.stroke();

      // Right foot rooted (front)
      ctx.beginPath();
      ctx.moveTo(renX + 10, cy + 20); // hip
      ctx.lineTo(renX + 25, cy + 65); // knee bent inwards
      ctx.lineTo(renX + 5, cy + 110); // rooted foot pigeon-toed
      ctx.stroke();

      // Body torso (broad chest, tilted slightly side-on)
      const breathingSwell = breathingExhaust * 0.6;
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.beginPath();
      ctx.moveTo(renX - 35 - breathingSwell / 2, cy - 60); // L shoulder
      ctx.lineTo(renX + 15 + breathingSwell, cy - 60); // R shoulder
      ctx.lineTo(renX + 10, cy + 20); // R hip
      ctx.lineTo(renX - 30, cy + 20); // L hip
      ctx.closePath();
      ctx.stroke();
      
      // Cybernetic core glowing in chest
      ctx.fillStyle = isOverdrive ? 'rgba(6, 182, 212, 0.8)' : 'rgba(6, 182, 212, 0.3)';
      ctx.beginPath();
      ctx.arc(renX - 10, cy - 25, 10 + breathingSwell * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Black Matrix-spec Trench Coat (Flowing coat segments drawn in dark outline)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // dark leather black
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 2.5;

      // Draw flowing coat tails billowing to the left (aerodynamic motion)
      ctx.beginPath();
      ctx.moveTo(renX - 35, cy - 60); // L shoulder
      const windBillow = Math.sin(Date.now() / 250) * 8 - 15;
      ctx.bezierCurveTo(
        renX - 85 + windBillow, cy + 10,
        renX - 100 + windBillow, cy + 85,
        renX - 95 + windBillow, cy + 130
      ); // coat edge trailing
      ctx.lineTo(renX - 40, cy + 120);
      ctx.lineTo(renX - 30, cy + 20); // up to hip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dynamic collar
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(renX - 15, cy - 60);
      ctx.lineTo(renX - 28, cy - 80); // high collar
      ctx.lineTo(renX - 8, cy - 68);
      ctx.lineTo(renX + 8, cy - 60);
      ctx.fill();
      ctx.stroke();

      // Head / Martial Art focus eye visor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(renX - 10, cy - 82, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cybernetic visors glow
      ctx.strokeStyle = isOverdrive ? '#06b6d4' : '#0891b2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(renX - 5, cy - 84);
      ctx.lineTo(renX - 21, cy - 80);
      ctx.stroke();

      // Back Arm (Human Arm, guarded close to solar plexus)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(renX - 35, cy - 60); // L shoulder
      ctx.lineTo(renX - 45, cy - 35); // L elbow tucked
      ctx.lineTo(renX - 15, cy - 35); // L fist guarding center
      ctx.stroke();
      ctx.fillStyle = '#94a6b8';
      ctx.beginPath();
      ctx.arc(renX - 15, cy - 35, 5, 0, Math.PI * 2);
      ctx.fill();

      // FRONT ARM: THE CYBERNETIC PRECISION ARM (Glows neon-blue, fully segmented, hydraulics)
      // Shoulder joint
      const shX = renX + 15;
      const shY = cy - 60;
      
      // Calculate active elbow & hand coordinates based on current strike extension
      let elX = renX + 40;
      let elY = cy - 35;
      
      let fistX = renX + 55 + strikeExt;
      let fistY = cy - 40;

      if (circularRot > 0) {
        // Tensho palm circular paths
        fistX = renX + 45 + Math.cos(circularRot) * 14 + strikeExt;
        fistY = cy - 45 + Math.sin(circularRot) * 14;
        elX = renX + 32 + Math.cos(circularRot * 0.5) * 5;
      }

      // Draw cyber arm bone structures (neon circuitry core)
      ctx.strokeStyle = isOverdrive ? '#22d3ee' : '#06b6d4'; // bright cyan
      ctx.shadowBlur = isOverdrive ? 18 : 8;
      ctx.shadowColor = '#06b6d4';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';

      // Shoulder to Elbow
      ctx.beginPath();
      ctx.moveTo(shX, shY);
      ctx.lineTo(elX, elY);
      ctx.stroke();

      // Elbow to Knuckles
      ctx.beginPath();
      ctx.moveTo(elX, elY);
      ctx.lineTo(fistX, fistY);
      ctx.stroke();

      ctx.shadowBlur = 0; // reset shadow

      // Draw cybernetic sleeve armor plates (metallic dark pieces on top of neon lines)
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.lineWidth = 11;
      ctx.beginPath();
      // upper arm plate
      ctx.moveTo(shX + (elX - shX) * 0.2, shY + (elY - shY) * 0.2);
      ctx.lineTo(shX + (elX - shX) * 0.8, shY + (elY - shY) * 0.8);
      ctx.stroke();

      // forearm plate
      ctx.beginPath();
      ctx.moveTo(elX + (fistX - elX) * 0.15, elY + (fistY - elY) * 0.15);
      ctx.lineTo(elX + (fistX - elX) * 0.8, elY + (fistY - elY) * 0.8);
      ctx.stroke();

      // Segment junctions (glowing nodes)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(shX, shY, 5, 0, Math.PI * 2); // shoulder node
      ctx.arc(elX, elY, 4, 0, Math.PI * 2); // elbow node
      ctx.fill();

      // Glowing power knuckle / kinetic shockwave launcher fist
      ctx.fillStyle = isOverdrive ? '#22d3ee' : '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      ctx.arc(fistX, fistY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw custom maneuver-based visual overlays (motion blur / shield dome)
      if (drawDashGhost) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const ly = cy - 80 + i * 25;
          ctx.beginPath();
          ctx.moveTo(renX - 85 - i * 12, ly);
          ctx.lineTo(renX - 35 - i * 12, ly);
          ctx.stroke();
        }
      }

      if (drawShieldParry) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
        ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#22d3ee';
        
        ctx.beginPath();
        const shieldProg = maneuverProgressRef.current;
        const shieldRadius = 25 + shieldProg * 20;
        ctx.arc(renX + 45, cy - 30, shieldRadius, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }

      // Restore coordinates before continuing to world-space rendering (particles, target overlays)
      renX = originalRenX;
      cy = originalCy;

      // 3. ANIMATE AND DRAW ACTIVE PARTICLES
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.016;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Apply movement vector
        p.x += p.vx;
        p.y += p.vy;

        // Fade over lifespan
        p.alpha = p.life / p.maxLife;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;

        if (p.shape === 'hex') {
          // Draw hexagonal energy fragment
          ctx.beginPath();
          const side = p.size;
          for (let s = 0; s < 6; s++) {
            const angle = (s * Math.PI) / 3;
            ctx.lineTo(p.x + Math.cos(angle) * side, p.y + Math.sin(angle) * side);
          }
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'ring') {
          // Kinetic expand ring
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + (p.maxLife - p.life) * 4), 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.shape === 'spark') {
          // Glowing cross hair sparks
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.lineTo(p.x + p.size, p.y);
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.stroke();
        } else {
          // Circle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0; // reset alpha

      // Local helper to draw target hologram relative to targetX, targetY
      const drawTargetHologram = (tx: number, ty: number) => {
        if (!activeTarget) {
          // Draw a standard training dummy
          ctx.save();
          if (damageFlashRef.current > 0.1) {
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
          } else {
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.fillStyle = 'rgba(51, 65, 85, 0.15)';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(100, 116, 139, 0.2)';
          }
          ctx.lineWidth = 2;

          // Base plate
          ctx.beginPath();
          ctx.ellipse(tx, ty + 105, 25, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Main vertical post
          ctx.beginPath();
          ctx.moveTo(tx, ty + 100);
          ctx.lineTo(tx, ty - 60);
          ctx.stroke();

          // Padded hitting block
          ctx.beginPath();
          ctx.roundRect(tx - 15, ty - 45, 30, 85, 8);
          ctx.fill();
          ctx.stroke();

          // Target rings decal
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(tx, ty - 5, 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
          return;
        }

        const name = activeTarget.name.toLowerCase();
        ctx.save();

        if (damageFlashRef.current > 0.1) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + damageFlashRef.current * 0.6})`;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + damageFlashRef.current * 0.3})`;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ef4444';
        } else {
          const isHighThreat = activeTarget.threatLevel === 'OMEGA-LEVEL' || activeTarget.threatLevel === 'CLASS-SSS';
          const baseColor = isHighThreat ? '239, 68, 68' : '34, 211, 238'; // red vs cyan
          ctx.strokeStyle = `rgba(${baseColor}, 0.55)`;
          ctx.fillStyle = `rgba(${baseColor}, 0.12)`;
          ctx.shadowBlur = 4;
          ctx.shadowColor = `rgba(${baseColor}, 0.50)`;
        }
        ctx.lineWidth = 1.5;

        // Draw scanline offset
        const scanlineY = (Date.now() / 8) % 150 - 65;

        if (name.includes('mech-9') || name.includes('loader')) {
          // Loader Mech-9 bipedal cargo handler
          ctx.beginPath();
          ctx.rect(tx - 20, ty - 65, 40, 15); // Sensor top
          ctx.rect(tx - 32, ty - 45, 64, 48); // Body trunk
          ctx.fill();
          ctx.stroke();

          // Mech claw arms
          ctx.beginPath();
          ctx.moveTo(tx - 32, ty - 35);
          ctx.lineTo(tx - 50, ty - 45);
          ctx.lineTo(tx - 45, ty - 15);

          ctx.moveTo(tx + 32, ty - 35);
          ctx.lineTo(tx + 50, ty - 25);
          ctx.lineTo(tx + 40, ty + 5);
          ctx.stroke();

          // Heavy biped robot legs
          ctx.beginPath();
          ctx.moveTo(tx - 20, ty + 3);
          ctx.lineTo(tx - 26, ty + 40);
          ctx.lineTo(tx - 16, ty + 90);
          ctx.lineTo(tx - 30, ty + 100);

          ctx.moveTo(tx + 20, ty + 3);
          ctx.lineTo(tx + 26, ty + 40);
          ctx.lineTo(tx + 16, ty + 90);
          ctx.lineTo(tx + 30, ty + 100);
          ctx.stroke();

          // Sensor focal light
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(tx, ty - 35, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (name.includes('assassin') || name.includes('kuroko')) {
          // Cyber-Assassin Unit (slender organic style)
          ctx.beginPath();
          ctx.arc(tx, ty - 60, 9, 0, Math.PI * 2); // head
          ctx.moveTo(tx, ty - 51);
          ctx.lineTo(tx - 12, ty - 30);
          ctx.lineTo(tx + 10, ty + 20);
          ctx.lineTo(tx - 8, ty + 45);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Slender cybernetic assassin legs
          ctx.beginPath();
          ctx.moveTo(tx - 6, ty + 45);
          ctx.lineTo(tx - 18, ty + 75);
          ctx.lineTo(tx - 14, ty + 100);
          ctx.moveTo(tx + 6, ty + 45);
          ctx.lineTo(tx + 16, ty + 75);
          ctx.lineTo(tx + 20, ty + 100);
          ctx.stroke();

          // High frequency blades
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tx - 12, ty - 30);
          ctx.lineTo(tx - 40, ty + 10);
          ctx.moveTo(tx + 10, ty + 20);
          ctx.lineTo(tx + 34, ty + 60);
          ctx.stroke();
        } else if (name.includes('drone') || name.includes('swarm')) {
          // Drone Swarm with rotating blades
          ctx.beginPath();
          ctx.ellipse(tx, ty - 25, 20, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Rotors struts
          ctx.beginPath();
          ctx.moveTo(tx - 20, ty - 25); ctx.lineTo(tx - 38, ty - 32);
          ctx.moveTo(tx + 20, ty - 25); ctx.lineTo(tx + 38, ty - 32);
          ctx.stroke();

          // Faint rotor spinning paths
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
          ctx.beginPath();
          ctx.ellipse(tx - 38, ty - 32, 12, 3, 0, 0, Math.PI * 2);
          ctx.ellipse(tx + 38, ty - 32, 12, 3, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Scanning laser rays downward
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 22);
          ctx.lineTo(tx + (Math.sin(Date.now() / 450) * 40), ty + 75);
          ctx.stroke();
        } else if (name.includes('ryuji') || name.includes('chrome-fist')) {
          // Chrome-Fist Ryuji
          ctx.beginPath();
          ctx.arc(tx, ty - 65, 10, 0, Math.PI * 2); // Mohawk head
          ctx.fill();
          ctx.stroke();

          // Mohawk spikes
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 75); ctx.lineTo(tx, ty - 81);
          ctx.moveTo(tx - 3, ty - 74); ctx.lineTo(tx - 3, ty - 79);
          ctx.stroke();

          // Massive boxer shoulders & chest
          ctx.beginPath();
          ctx.moveTo(tx - 30, ty - 50);
          ctx.lineTo(tx + 30, ty - 50);
          ctx.lineTo(tx + 18, ty + 10);
          ctx.lineTo(tx - 18, ty + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Large glowing fists
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(tx - 25, ty - 45);
          ctx.lineTo(tx - 22, ty - 25);
          ctx.lineTo(tx - 10, ty - 35);

          ctx.moveTo(tx + 25, ty - 45);
          ctx.lineTo(tx + 22, ty - 25);
          ctx.lineTo(tx + 10, ty - 35);
          ctx.stroke();

          // Stout rooted legs
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx - 16, ty + 10);
          ctx.lineTo(tx - 30, ty + 50);
          ctx.lineTo(tx - 24, ty + 100);

          ctx.moveTo(tx + 16, ty + 10);
          ctx.lineTo(tx + 30, ty + 50);
          ctx.lineTo(tx + 24, ty + 100);
          ctx.stroke();
        } else {
          // Generic Enforcer / Sentinel
          ctx.beginPath();
          ctx.rect(tx - 10, ty - 65, 20, 12); // Helmet
          ctx.moveTo(tx - 22, ty - 50);
          ctx.lineTo(tx + 22, ty - 50);
          ctx.lineTo(tx + 15, ty + 15);
          ctx.lineTo(tx - 15, ty + 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Translucent energy shield bubble protecting front
          ctx.strokeStyle = isStriking ? 'rgba(34, 211, 238, 0.85)' : 'rgba(34, 211, 238, 0.25)';
          ctx.lineWidth = isStriking ? 2.5 : 1.2;
          ctx.beginPath();
          const bubbleRadius = 30 + Math.sin(Date.now() / 250) * 2;
          for (let s = 0; s < 6; s++) {
            const angle = (s * Math.PI) / 3;
            ctx.lineTo(tx - 16 + Math.cos(angle) * bubbleRadius, ty - 15 + Math.sin(angle) * bubbleRadius);
          }
          ctx.closePath();
          if (isStriking) {
            ctx.fillStyle = 'rgba(34, 211, 238, 0.05)';
            ctx.fill();
          }
          ctx.stroke();

          // Rooted armored legs
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(tx - 12, ty + 15);
          ctx.lineTo(tx - 20, ty + 55);
          ctx.lineTo(tx - 15, ty + 100);

          ctx.moveTo(tx + 12, ty + 15);
          ctx.lineTo(tx + 20, ty + 55);
          ctx.lineTo(tx + 15, ty + 100);
          ctx.stroke();
        }

        // Horizontal glitch/scan slice overlay
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx - 50, ty + scanlineY);
        ctx.lineTo(tx + 50, ty + scanlineY);
        ctx.stroke();

        ctx.restore();
      };

      // Draw the vector target hologram body
      drawTargetHologram(targetX, targetY);

      // Active Target Overlays (Reticles scanning)
      if (activeTarget) {
        if (targetIntegrity <= 0) {
          // Defeated state
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; // Emerald
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(targetX - 12, targetY - 12);
          ctx.lineTo(targetX + 12, targetY + 12);
          ctx.moveTo(targetX + 12, targetY - 12);
          ctx.lineTo(targetX - 12, targetY + 12);
          ctx.stroke();

          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#10b981';
          ctx.fillText('TARGET PURGED', targetX - 36, targetY - 30);
        } else {
          // Scanning state
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(targetX, targetY, 20 + Math.sin(Date.now() / 150) * 1.5, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle corners
          ctx.beginPath();
          ctx.moveTo(targetX - 25, targetY); ctx.lineTo(targetX - 15, targetY);
          ctx.moveTo(targetX + 15, targetY); ctx.lineTo(targetX + 25, targetY);
          ctx.moveTo(targetX, targetY - 25); ctx.lineTo(targetX, targetY - 15);
          ctx.moveTo(targetX, targetY + 15); ctx.lineTo(targetX, targetY + 25);
          ctx.stroke();

          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fillText(`LOCK: ${targetIntegrity.toFixed(0)}%`, targetX - 28, targetY - 30);

          // Kinetic connector line when striking
          if (isStriking) {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(fistX, fistY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Impact Splash text
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('CRITICAL DIRECT HIT', targetX - 48, targetY + 35);
          }
        }
      } else {
        // Default standby reticle (No active target selected)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(targetX - 25, targetY); ctx.lineTo(targetX - 15, targetY);
        ctx.moveTo(targetX + 15, targetY); ctx.lineTo(targetX + 25, targetY);
        ctx.stroke();

        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.fillText('STANDBY SCAN', targetX - 33, targetY - 30);
      }

      ctx.restore(); // Restore context back from our shake translation!

      animFrame = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => cancelAnimationFrame(animFrame);
  }, [isOverdrive, activeTarget, targetIntegrity]);

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800 backdrop-blur-sm rounded-sm overflow-hidden relative" id="combat-simulator">
      {/* Simulation Header */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-slate-300">
            TACTICAL CYBER-DOJO V1.08
          </span>
          {isOverdrive && (
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 text-[10px] px-2 py-0.5 rounded font-mono animate-pulse font-bold">
              BREATH SYNC OVERDRIVE ACTIVED
            </span>
          )}
          {activeTarget && (
            <span className="hidden sm:inline-flex items-center space-x-1.5 text-[9px] bg-red-950/40 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span>LOCK: {activeTarget.id}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-mono transition-all duration-300 ${
              audioEnabled
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/40 hover:bg-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
            }`}
            title="Enable neural audio feedback synthezier"
            id="audio-toggle-btn"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>SYNTH ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                <span>SYNTH MUTED</span>
              </>
            )}
          </button>

          {/* Hard Reset */}
          <button
            onClick={onHardReset}
            className="flex items-center space-x-1.5 px-3 py-1 bg-red-950/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-400 text-red-400 hover:text-red-300 rounded text-xs font-mono font-bold transition-all duration-300"
            title="Instantly clear heat and reset active target assignment"
            id="hard-reset-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>HARD RESET</span>
          </button>
        </div>
      </div>

          {/* Flex wrapper for canvas stage and tactical diagnostics sidebar */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[350px] overflow-hidden">
        {/* Interactive Stage Canvas Container */}
        <div className="flex-1 min-h-[300px] bg-slate-900 relative" ref={containerRef}>
          <canvas ref={canvasRef} className="w-full h-full block" />
          
          {/* HTML Particle Overlay System */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30" id="framer-motion-particles-container">
            <AnimatePresence>
              {htmlParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ 
                    x: p.x, 
                    y: p.y, 
                    opacity: 1, 
                    scale: 1,
                    rotate: 0 
                  }}
                  animate={{ 
                    x: p.x + p.vx * 22, 
                    y: p.y + p.vy * 22 + 45, // includes gravity fall
                    opacity: 0, 
                    scale: 0.1,
                    rotate: Math.random() * 360
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: p.duration, 
                    ease: 'easeOut' 
                  }}
                  onAnimationComplete={() => {
                    setHtmlParticles(prev => prev.filter(item => item.id !== p.id));
                  }}
                  className="absolute pointer-events-none"
                  style={{
                    left: 0,
                    top: 0,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.shape === 'spark' ? 'transparent' : p.color,
                    borderLeft: p.shape === 'spark' ? `2px solid ${p.color}` : 'none',
                    borderRight: p.shape === 'spark' ? `2px solid ${p.color}` : 'none',
                    borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'triangle' ? '0%' : '2px',
                    boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
                    clipPath: p.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
          
          {/* Absolute telemetry layout */}
          <div className="absolute top-4 left-4 font-mono text-[10px] text-slate-400 space-y-1 bg-slate-950/80 p-2.5 rounded border border-slate-800/60 pointer-events-none">
            <div className="text-cyan-400 font-bold">CYBER-ARM TELEMETRY:</div>
            <div>MODEL: GOJU-SANCHIN V2</div>
            {activeTarget && (
              <div className="text-red-400 font-bold uppercase tracking-wide">
                TARGET: {activeTarget.name.split(' ')[0]}
              </div>
            )}
            <div>PRECISION CLOCK: 4.88 GHz</div>
            <div>SERVO TORQUE: {(1.2 * (1 + stats.power / 100)).toFixed(2)} kN</div>
            <div>SYNC FEEDBACK: {isOverdrive ? '100% PERFECT' : `${stats.sync}%`}</div>
            <div className="flex items-center space-x-1.5">
              <span>CHASSIS TEMP:</span>
              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${stats.heat > 70 ? 'bg-red-500' : stats.heat > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, stats.heat)}%` }}
                />
              </div>
              <span className={`${stats.heat > 70 ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{stats.heat.toFixed(0)}°C</span>
            </div>
          </div>

          {/* Warning telemetry */}
          {stats.heat > 75 && (
            <div className="absolute top-4 right-4 bg-red-950/80 border border-red-500/50 rounded p-2 text-red-400 text-[10px] font-mono flex items-center space-x-1.5 animate-bounce z-25">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <div>
                <span className="font-bold">WARNING: CORE OVERHEAT</span>
                <br />Execute [Ibuki] breath kata to vent!
              </div>
            </div>
          )}

          {/* Target Dossier Real-time Status Monitor */}
          {activeTarget && (
            <div className={`absolute ${stats.heat > 75 ? 'top-[74px]' : 'top-4'} right-4 bg-[#0a0c14]/90 p-3 rounded-sm border ${targetIntegrity <= 0 ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'} font-mono text-[10px] space-y-2 w-48 backdrop-blur-md transition-all duration-300 z-20`} id="target-integrity-hud">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="font-bold text-slate-400">DEFENSE MATRIX</span>
                <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-black tracking-wider border ${
                  targetIntegrity <= 0 ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : 'bg-red-950 text-red-400 border-red-500/30'
                }`}>
                  {activeTarget.threatLevel.replace('-LEVEL', '')}
                </span>
              </div>
              
              <div>
                <div className="text-slate-100 font-bold truncate leading-none uppercase">{activeTarget.name}</div>
                <span className="text-[8px] text-slate-500 font-mono tracking-tight">{activeTarget.sector.split('//')[0]}</span>
              </div>

              {/* Target Integrity Health Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8.5px]">
                  <span className="text-slate-500 uppercase">HP INTEGRITY</span>
                  <span className={`font-extrabold ${targetIntegrity <= 0 ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`}>
                    {targetIntegrity > 0 ? `${targetIntegrity.toFixed(0)}%` : 'PURGED'}
                  </span>
                </div>
                <div className="bg-slate-950 h-2 border border-slate-800 p-[1px] rounded-full overflow-hidden flex items-center">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      targetIntegrity > 50 
                        ? 'bg-red-500 shadow-[0_0_4px_#ef4444]' 
                        : targetIntegrity > 20 
                        ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' 
                        : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    }`}
                    style={{ width: `${Math.max(0, targetIntegrity)}%` }}
                  />
                </div>
              </div>

              <div className={`text-[8.5px] p-1.5 rounded-xs leading-normal font-medium ${
                targetIntegrity <= 0 ? 'bg-emerald-950/20 text-emerald-300 border border-emerald-500/10' : 'bg-red-950/20 text-red-300 border border-red-500/10'
              }`}>
                {targetIntegrity <= 0 ? (
                  <span>Mission Success. Bounty assigned to Ren Kusanagi's secure bank.</span>
                ) : (
                  <>
                    <span className="font-extrabold text-red-400 block uppercase mb-0.5">VULNERABILITY:</span>
                    <span>{activeTarget.weakness.split('(')[0]}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Combat Intel Overlay during High Heat Scenario (heat >= 60) */}
          <AnimatePresence>
            {stats.heat >= 60 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute bottom-4 left-4 right-4 bg-[#08090d]/95 border border-amber-500/40 text-amber-200 p-3.5 rounded-sm backdrop-blur-md z-30 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col md:flex-row gap-3 md:items-center justify-between font-mono"
                id="combat-intel-overlay"
              >
                {/* Left Segment: Warning Indicator & Active Advice */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase flex items-center space-x-1.5">
                      <span>COGNITIVE LINK: COMBAT INTEL FEED</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    </span>
                    <span className="text-[9px] text-slate-500">| CODEC-VER: 0x9F</span>
                  </div>
                  
                  {/* Advice statement */}
                  <p className="text-[11px] text-slate-300 leading-normal font-medium pr-2">
                    {currentAdvices[intelAdviceIndex] || "Evaluating combat metrics..."}
                  </p>
                </div>

                {/* Right Segment: Interactive actions & Mini stats */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t border-slate-800/80 md:border-t-0 pt-2 md:pt-0">
                  <div className="text-[9px] text-slate-500 space-y-0.5 text-left md:text-right">
                    <div>HEAT RATE: <span className="text-slate-300">{(stats.heat / 100).toFixed(2)}x</span></div>
                    <div>VENT ENH: <span className="text-cyan-400">{(1 + stats.sync * 0.005).toFixed(2)}x</span></div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIntelAdviceIndex(prev => (prev + 1) % currentAdvices.length);
                    }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 rounded transition-colors text-[10px]"
                    title="Cycle to next advice telemetry feed"
                    id="cycle-intel-btn"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span className="font-bold">CYCLE INTEL</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tactical Diagnostics Sidebar (Target Matrix + D3 Heatmap) */}
        <div className="w-full md:w-[225px] bg-[#090b11] border-t md:border-t-0 md:border-l border-slate-800 p-3.5 flex flex-col justify-between shrink-0 font-mono text-xs z-30" id="tactical-calibration-sidebar">
          <div className="space-y-4">
            {/* Sidebar Header */}
            <div className="border-b border-slate-800 pb-2">
              <div className="text-[9px] text-cyan-400 uppercase tracking-widest leading-none mb-1 font-bold">COMBAT RECON</div>
              <h3 className="font-bold text-slate-200 text-[11px] tracking-tight">STRIKE MATRIX ANALYZER</h3>
            </div>

            {/* Section 1: Active Targeting Zone Selection */}
            <div className="space-y-2">
              <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase block font-bold">
                1. ACTIVE TARGET VECTOR
              </span>
              <div className="grid grid-cols-3 gap-1" id="strike-vector-selector">
                {[
                  { id: 'high-left', label: 'H-L', title: 'High Left (Temple)' },
                  { id: 'high-center', label: 'H-C', title: 'High Center (Cranial)' },
                  { id: 'high-right', label: 'H-R', title: 'High Right (Optic)' },
                  { id: 'mid-left', label: 'M-L', title: 'Mid Left (L-Joint)' },
                  { id: 'mid-center', label: 'M-C', title: 'Mid Center (Reactor)' },
                  { id: 'mid-right', label: 'M-R', title: 'Mid Right (R-Joint)' },
                  { id: 'low-left', label: 'L-L', title: 'Low Left (L-Knee)' },
                  { id: 'low-center', label: 'L-C', title: 'Low Center (Anchor)' },
                  { id: 'low-right', label: 'L-R', title: 'Low Right (R-Knee)' },
                ].map((cell) => {
                  const isSelected = selectedZone === cell.id;
                  return (
                    <button
                      key={cell.id}
                      onClick={() => {
                        setSelectedZone(cell.id);
                        playZoneClickSound();
                      }}
                      className={`p-1.5 text-center rounded border text-[9px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                      }`}
                      title={cell.title}
                      id={`vector-btn-${cell.id}`}
                    >
                      {cell.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                <span>Vector target:</span>
                <span className="text-cyan-400 font-bold">{selectedZone.replace('-', ' ')}</span>
              </div>
            </div>

            {/* Section 2: D3 Heatmap visualization */}
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase block font-bold">
                2. D3 PATTERN HEATMAP
              </span>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded p-1 h-[110px] flex items-center justify-center relative overflow-hidden">
                <svg ref={svgRef} className="w-full h-full block" id="d3-combat-heatmap" />
              </div>
            </div>
          </div>

          {/* Section 3: Pattern diagnostics / prediction risk warnings */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-[9px] text-slate-400 font-bold uppercase">DIAGNOSTIC REPORT (LAST 50)</div>
            {(() => {
              const counts = strikeHistory.reduce((acc, z) => {
                acc[z] = (acc[z] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              const total = strikeHistory.length || 1;
              let maxZone = 'mid-center';
              let maxCount = 0;
              Object.keys(counts).forEach(zone => {
                const count = counts[zone] || 0;
                if (count > maxCount) {
                  maxCount = count;
                  maxZone = zone;
                }
              });
              
              const pct = (maxCount / total) * 100;
              const isPredictable = pct > 35;
              
              return (
                <div className={`p-2 rounded border text-[9px] leading-relaxed font-medium ${
                  isPredictable 
                    ? 'bg-amber-500/5 border-amber-500/30 text-amber-300' 
                    : 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="font-extrabold uppercase mb-0.5">
                    {isPredictable ? '⚠️ SYSTEM DECRYPT RISK: HIGH' : '🛡️ DECRYPT INTEGRITY: SECURE'}
                  </div>
                  <div>
                    {isPredictable ? (
                      <span>
                        Heavy bias on <span className="font-bold underline uppercase text-amber-400">{maxZone.replace('-', ' ')}</span> ({pct.toFixed(0)}%). Rotate strike vectors!
                      </span>
                    ) : (
                      <span>
                        Strong strike pattern variance (peak {pct.toFixed(0)}%). Local security mechs cannot compute deflection loops.
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
            <button
              onClick={() => {
                setStrikeHistory([]);
                localStorage.removeItem('ren_combat_zones_history');
                playZoneClickSound();
              }}
              className="w-full py-1 text-center bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 transition-colors text-[8px] font-bold rounded cursor-pointer uppercase tracking-wider"
              title="Purge strike vector metrics"
              id="purge-vectors-btn"
            >
              Clear Vector Metrics
            </button>
          </div>
        </div>
      </div>

      {/* Tactical Maneuvers (Movement-Based Utility) */}
      <div className="bg-[#0b0f19] px-4 py-3 border-t border-slate-800 flex flex-col gap-2 relative z-30" id="maneuvers-section">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1.5">
            <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
            <span className="font-mono text-[10px] font-bold tracking-wider text-slate-300 uppercase">
              TACTICAL MANEUVERS (HEAT RECOVERY UTILITY)
            </span>
            <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded font-mono font-medium">
              CONVERTS HEAT TO POSITIONING SHIFTS
            </span>
          </div>
          {hasDashBoost && (
            <span className="bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 text-[9px] px-2 py-0.5 rounded font-mono animate-pulse font-bold">
              ⚡ NEXT STRIKE DAM: +35% ACTIVE
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {MANEUVERS.map((maneuver) => {
            const hasEnoughHeat = stats.heat >= maneuver.cost;
            const isManeuverActive = activeManeuverRef.current === maneuver.id;
            
            return (
              <button
                key={maneuver.id}
                onClick={() => {
                  if (hasEnoughHeat && onManeuverTrigger) {
                    activeManeuverRef.current = maneuver.id;
                    maneuverProgressRef.current = 0;
                    synthesizeManeuverSound(maneuver.id);
                    spawnParticlesForManeuver(maneuver.id);
                    onManeuverTrigger(maneuver.id, maneuver.cost);
                  }
                }}
                disabled={!hasEnoughHeat || isManeuverActive}
                className={`flex flex-col p-2.5 rounded border text-left transition-all duration-200 active:scale-95 ${
                  isManeuverActive
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                    : !hasEnoughHeat
                    ? 'opacity-40 bg-slate-950 border-slate-900 cursor-not-allowed text-slate-600'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900/80 cursor-pointer'
                }`}
                id={`maneuver-btn-${maneuver.id}`}
                title={maneuver.description}
              >
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold font-sans tracking-wide">
                    {maneuver.name.toUpperCase()} <span className="font-mono text-[8.5px] text-slate-500 font-normal">{maneuver.japaneseName}</span>
                  </span>
                  <span className={`text-[8.5px] font-mono font-bold ${hasEnoughHeat ? 'text-amber-400' : 'text-slate-500'}`}>
                    REQ: {maneuver.cost} Heat
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-normal font-mono font-medium">
                  {maneuver.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stances & Strikes Action Bar */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-2">
        {COMBAT_MOVES.map((move) => {
          const isActive = selectedMove?.id === move.id;
          return (
            <button
              key={move.id}
              onClick={() => onMoveTrigger(move)}
              disabled={move.id !== 'ibuki' && stats.heat >= 100}
              className={`flex flex-col items-center justify-between p-3 rounded border text-left transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/5'
                  : stats.heat >= 100 && move.id !== 'ibuki'
                  ? 'opacity-40 bg-slate-900 border-slate-800/50 cursor-not-allowed text-slate-500'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 text-slate-300 hover:bg-slate-900'
              }`}
              id={`move-btn-${move.id}`}
            >
              <div className="w-full flex justify-between items-start mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  {move.type}
                </span>
                <span className="text-[9px] font-mono px-1 py-0.5 bg-slate-950 rounded text-cyan-400 font-medium">
                  {move.japaneseName.split(' ')[0]}
                </span>
              </div>
              <span className="font-bold font-sans text-xs tracking-wide self-start truncate w-full">
                {move.name.split(' ').slice(1).join(' ') || move.name}
              </span>
              <div className="w-full flex justify-between items-center mt-2.5 text-[9px] font-mono text-slate-400">
                <span>{move.type === 'breath' ? 'Vents Heat' : `Heat: +${move.id === 'gekisai' ? '25' : move.id === 'seiyunchin' ? '15' : '5'}`}</span>
                <span className="text-slate-500">{(move.duration / 1000).toFixed(1)}s</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
