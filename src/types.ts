export interface CombatStats {
  power: number;      // Physical/hydraulic force
  precision: number;  // Combat target tracking and strike accuracy (highly boosted by cyber-arm)
  defense: number;    // Rooted guard and deflection
  sync: number;       // Neural alignment with cybernetic limb
  heat: number;       // Thermal build-up from cybernetic arm operation
}

export interface CyberneticModule {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'actuator' | 'cooling' | 'tactile';
  statsModifier: Partial<CombatStats>;
  cost: number; // in cyber-energy / resources
  color: string; // Tailwind color class for glowing indicators
}

export interface CombatMove {
  id: string;
  name: string;
  japaneseName: string;
  type: 'kata' | 'strike' | 'block' | 'breath';
  description: string;
  audioPitch: number; // For our Web Audio synthesizer
  audioWave: OscillatorType; // Synthesizer waveform
  duration: number; // ms
  visualStyle: {
    color: string;
    particleCount: number;
    pattern: 'radial' | 'linear' | 'shield' | 'spiral' | 'burst';
  };
}

export const CYBER_MODULES: CyberneticModule[] = [
  {
    id: 'pneumatic_drive',
    name: 'Hydraulic Impact Hammer',
    description: 'Deploys localized pneumatic pressure behind strikes. Massive damage, higher thermal generation.',
    category: 'actuator',
    statsModifier: { power: 30, precision: -10, heat: 25 },
    cost: 40,
    color: 'from-amber-500 to-red-600',
  },
  {
    id: 'neural_sync',
    name: 'Quantum Synaptic Link',
    description: 'Bypasses standard motor nerves for direct cerebral control of the cyber-arm. Drastically increases precision.',
    category: 'core',
    statsModifier: { precision: 35, sync: 20, defense: 5 },
    cost: 50,
    color: 'from-cyan-400 to-blue-600',
  },
  {
    id: 'cryo_cooler',
    name: 'Liquid Nitrogen Heatsink',
    description: 'Active cooling tubes embedded along forearm plates. Reduces heat accumulation and stabilizes defense.',
    category: 'cooling',
    statsModifier: { defense: 15, heat: -30, sync: 10 },
    cost: 30,
    color: 'from-emerald-400 to-teal-600',
  },
  {
    id: 'arc_induction',
    name: 'Plasma Arc Coils',
    description: 'Wraps the cybernetic fist in localized electromagnetic plasma fields, destabilizing target defenses.',
    category: 'tactile',
    statsModifier: { power: 15, precision: 10, sync: 15 },
    cost: 45,
    color: 'from-fuchsia-500 to-violet-600',
  }
];

export const COMBAT_MOVES: CombatMove[] = [
  {
    id: 'sanchin',
    name: 'Sanchin Iron Guard',
    japaneseName: '三戦 (Sanchin-dachi)',
    type: 'kata',
    description: 'The fundamental Rooted Isometric Guard. Couples dynamic muscle tension with absolute ground friction to absorb or deflect all incoming cybernetic projectiles.',
    audioPitch: 110,
    audioWave: 'triangle',
    duration: 1200,
    visualStyle: {
      color: '#06b6d4', // cyan-500
      particleCount: 80,
      pattern: 'shield',
    }
  },
  {
    id: 'tensho',
    name: 'Tensho Palm Deflection',
    japaneseName: '転掌 (Tensho)',
    type: 'block',
    description: 'Circular soft deflection patterns that redirect high-torque enemy limbs. Harnesses rotational kinetic energy to open up counter-strike apertures.',
    audioPitch: 220,
    audioWave: 'sine',
    duration: 1000,
    visualStyle: {
      color: '#10b981', // emerald-500
      particleCount: 60,
      pattern: 'spiral',
    }
  },
  {
    id: 'gekisai',
    name: 'Gekisai Cyber-Punch',
    japaneseName: '撃砕 (Gekisai-zuki)',
    type: 'strike',
    description: 'A rapid, straight punch executing high-torque pneumatic compression. Sends a focused kinetic shockwave through armor plating.',
    audioPitch: 180,
    audioWave: 'sawtooth',
    duration: 600,
    visualStyle: {
      color: '#ef4444', // red-500
      particleCount: 120,
      pattern: 'burst',
    }
  },
  {
    id: 'seiyunchin',
    name: 'Seiyunchin Grapple-Slam',
    japaneseName: '制引戦 (Seiyunchin)',
    type: 'strike',
    description: 'Close-quarters grapple maneuver. Latches onto an opponent’s cyberware joints using hydraulic fingers, followed by a heavy dynamic takedown.',
    audioPitch: 130,
    audioWave: 'sawtooth',
    duration: 900,
    visualStyle: {
      color: '#f59e0b', // amber-500
      particleCount: 90,
      pattern: 'linear',
    }
  },
  {
    id: 'ibuki',
    name: 'Ibuki Deep Resonant Breath',
    japaneseName: '息吹 (Ibuki)',
    type: 'breath',
    description: 'Goju-Ryu’s legendary forced abdominal breathing. Flushes thermal exhausts, synchronizes neural pathways, and restores cybernetic arm calibration to peak.',
    audioPitch: 75,
    audioWave: 'sine',
    duration: 1800,
    visualStyle: {
      color: '#a855f7', // purple-500
      particleCount: 40,
      pattern: 'radial',
    }
  }
];
