import React, { useRef, useEffect, useState } from 'react';
import { CombatMove, CombatStats, COMBAT_MOVES } from '../types';
import { Shield, Zap, Wind, AlertCircle, Volume2, VolumeX } from 'lucide-react';

interface CombatSimulatorProps {
  stats: CombatStats;
  selectedMove: CombatMove | null;
  onMoveTrigger: (move: CombatMove) => void;
  isOverdrive: boolean;
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

export default function CombatSimulator({
  stats,
  selectedMove,
  onMoveTrigger,
  isOverdrive,
}: CombatSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animation states
  const [animationTime, setAnimationTime] = useState(0);
  const currentMoveRef = useRef<CombatMove | null>(null);
  const moveProgressRef = useRef<number>(0); // 0 to 1
  const particlesRef = useRef<Particle[]>([]);

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
      synthesizeSound(selectedMove);
      spawnParticlesForMove(selectedMove);
    }
  }, [selectedMove]);

  // Particle Generation based on Move Visual Style
  const spawnParticlesForMove = (move: CombatMove) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const style = move.visualStyle;
    const particles: Particle[] = [];

    // Base position of cyber arm knuckle node
    let armX = cx + 55;
    let armY = cy - 40;

    for (let i = 0; i < style.particleCount; i++) {
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
      const cy = canvas.height / 2 + 10;
      setAnimationTime(prev => prev + 0.016);

      // 1. Clear with transparent backdrop, leaving slate tech aesthetic grid lines
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)'; // cyan
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

      // Progress active move
      let isStriking = false;
      let strikeExt = 0; // extension offset
      let circularRot = 0;
      let breathingExhaust = 0;

      if (currentMoveRef.current) {
        moveProgressRef.current += 16 / currentMoveRef.current.duration;
        if (moveProgressRef.current >= 1) {
          currentMoveRef.current = null;
          moveProgressRef.current = 0;
        } else {
          const progress = moveProgressRef.current;
          const m = currentMoveRef.current;

          if (m.id === 'gekisai') {
            isStriking = true;
            // Elastic punch extension: fast thrust forward, slower pull back
            if (progress < 0.25) {
              strikeExt = (progress / 0.25) * 65; // lunges forward
            } else {
              strikeExt = 65 * (1 - (progress - 0.25) / 0.75); // pulls back
            }
          } else if (m.id === 'tensho') {
            circularRot = progress * Math.PI * 4; // double rotation
            strikeExt = Math.sin(progress * Math.PI) * 15;
          } else if (m.id === 'seiyunchin') {
            // heavy lunge and downward pull
            if (progress < 0.3) {
              strikeExt = (progress / 0.3) * 40;
            } else {
              strikeExt = 40 - ((progress - 0.3) / 0.7) * 20;
            }
          } else if (m.id === 'ibuki') {
            // slow expansion and compression matching heavy abdominal breathing
            breathingExhaust = Math.sin(progress * Math.PI * 2) * 8;
          }
        }
      }

      // 2. DRAW PROTAGONIST VECTOR SCHEMATIC
      // Feet / Legs rooted in Sanchin-dachi Stance
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)'; // slate-400
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left foot rooted (back)
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + 20); // hip
      ctx.lineTo(cx - 50, cy + 70); // knee bent inwards
      ctx.lineTo(cx - 40, cy + 110); // rooted foot pigeon-toed
      ctx.stroke();

      // Right foot rooted (front)
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy + 20); // hip
      ctx.lineTo(cx + 25, cy + 65); // knee bent inwards
      ctx.lineTo(cx + 5, cy + 110); // rooted foot pigeon-toed
      ctx.stroke();

      // Body torso (broad chest, tilted slightly side-on)
      const breathingSwell = breathingExhaust * 0.6;
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.beginPath();
      ctx.moveTo(cx - 35 - breathingSwell / 2, cy - 60); // L shoulder
      ctx.lineTo(cx + 15 + breathingSwell, cy - 60); // R shoulder
      ctx.lineTo(cx + 10, cy + 20); // R hip
      ctx.lineTo(cx - 30, cy + 20); // L hip
      ctx.closePath();
      ctx.stroke();
      
      // Cybernetic core glowing in chest
      ctx.fillStyle = isOverdrive ? 'rgba(6, 182, 212, 0.8)' : 'rgba(6, 182, 212, 0.3)';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 25, 10 + breathingSwell * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Black Matrix-spec Trench Coat (Flowing coat segments drawn in dark outline)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // dark leather black
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 2.5;

      // Draw flowing coat tails billowing to the left (aerodynamic motion)
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 60); // L shoulder
      const windBillow = Math.sin(Date.now() / 250) * 8 - 15;
      ctx.bezierCurveTo(
        cx - 85 + windBillow, cy + 10,
        cx - 100 + windBillow, cy + 85,
        cx - 95 + windBillow, cy + 130
      ); // coat edge trailing
      ctx.lineTo(cx - 40, cy + 120);
      ctx.lineTo(cx - 30, cy + 20); // up to hip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dynamic collar
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy - 60);
      ctx.lineTo(cx - 28, cy - 80); // high collar
      ctx.lineTo(cx - 8, cy - 68);
      ctx.lineTo(cx + 8, cy - 60);
      ctx.fill();
      ctx.stroke();

      // Head / Martial Art focus eye visor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 82, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cybernetic visors glow
      ctx.strokeStyle = isOverdrive ? '#06b6d4' : '#0891b2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 84);
      ctx.lineTo(cx - 21, cy - 80);
      ctx.stroke();

      // Back Arm (Human Arm, guarded close to solar plexus)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 60); // L shoulder
      ctx.lineTo(cx - 45, cy - 35); // L elbow tucked
      ctx.lineTo(cx - 15, cy - 35); // L fist guarding center
      ctx.stroke();
      ctx.fillStyle = '#94a6b8';
      ctx.beginPath();
      ctx.arc(cx - 15, cy - 35, 5, 0, Math.PI * 2);
      ctx.fill();

      // FRONT ARM: THE CYBERNETIC PRECISION ARM (Glows neon-blue, fully segmented, hydraulics)
      // Shoulder joint
      const shX = cx + 15;
      const shY = cy - 60;
      
      // Calculate active elbow & hand coordinates based on current strike extension
      let elX = cx + 40;
      let elY = cy - 35;
      
      let fistX = cx + 55 + strikeExt;
      let fistY = cy - 40;

      if (circularRot > 0) {
        // Tensho palm circular paths
        fistX = cx + 45 + Math.cos(circularRot) * 14 + strikeExt;
        fistY = cy - 45 + Math.sin(circularRot) * 14;
        elX = cx + 32 + Math.cos(circularRot * 0.5) * 5;
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

      // Active Target Overlays (Reticles scanning)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red tactical enemy lock-on
      ctx.lineWidth = 1;
      const targetX = cx + 180;
      const targetY = cy - 40;
      
      ctx.beginPath();
      ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Reticle corners
      ctx.beginPath();
      ctx.moveTo(targetX - 25, targetY); ctx.lineTo(targetX - 15, targetY);
      ctx.moveTo(targetX + 15, targetY); ctx.lineTo(targetX + 25, targetY);
      ctx.moveTo(targetX, targetY - 25); ctx.lineTo(targetX, targetY - 15);
      ctx.moveTo(targetX, targetY + 15); ctx.lineTo(targetX, targetY + 25);
      ctx.stroke();

      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.fillText('TARGET LOCK: 98.7%', targetX - 45, targetY - 30);

      animFrame = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => cancelAnimationFrame(animFrame);
  }, [isOverdrive]);

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
        </div>
        
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
      </div>

      {/* Interactive Stage Canvas Container */}
      <div className="flex-1 min-h-[300px] bg-slate-900 relative" ref={containerRef}>
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Absolute telemetry layout */}
        <div className="absolute top-4 left-4 font-mono text-[10px] text-slate-400 space-y-1 bg-slate-950/80 p-2.5 rounded border border-slate-800/60 pointer-events-none">
          <div className="text-cyan-400 font-bold">CYBER-ARM TELEMETRY:</div>
          <div>MODEL: GOJU-SANCHIN V2</div>
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
          <div className="absolute top-4 right-4 bg-red-950/80 border border-red-500/50 rounded p-2 text-red-400 text-[10px] font-mono flex items-center space-x-1.5 animate-bounce">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <div>
              <span className="font-bold">WARNING: CORE OVERHEAT</span>
              <br />Execute [Ibuki] breath kata to vent!
            </div>
          </div>
        )}
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
