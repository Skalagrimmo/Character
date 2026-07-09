import React, { useState } from 'react';
import { Shield, BookOpen, Layers, Award, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import protagonistImg from '../assets/images/cyberpunk_protagonist_1783585627894.jpg';

interface ProtagonistDossierProps {
  isOverdrive: boolean;
}

export default function ProtagonistDossier({ isOverdrive }: ProtagonistDossierProps) {
  const [activeTab, setActiveTab] = useState<'backstory' | 'heritage' | 'coat'>('backstory');

  const principles = [
    { title: 'The "Go" (Hard)', desc: 'Hydraulic straight punches and rooted isometric blocking designed to crack armored security exoskeletons.' },
    { title: 'The "Ju" (Soft)', desc: 'Rotational deflection loops (Tensho) that capture the momentum of cybernetic blades and direct them into empty space.' },
    { title: 'The "Ibuki" (Breath)', desc: 'Forced respiratory venting that flushes liquid nitrogen and vents built-up compression exhaust from the cybernetic arm.' }
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-sm p-5 flex flex-col h-full rounded-sm" id="protagonist-dossier">
      {/* Bio Identity Header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start mb-5 pb-5 border-b border-slate-800/80">
        
        {/* Protagonist Art Portrait Frame */}
        <div className="relative w-36 sm:w-44 aspect-[3/4] rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-950 shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] group">
          <img
            src={protagonistImg}
            alt="Cyberpunk Goju-Ryu Protagonist"
            className={`w-full h-full object-cover transition-all duration-700 ${
              isOverdrive ? 'scale-105 brightness-110 hue-rotate-15' : 'scale-100'
            }`}
            referrerPolicy="no-referrer"
          />
          
          {/* Cyber HUD Overlay elements on portrait */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
          
          {/* Neon laser scanlines */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-400/50 animate-[bounce_3.5s_infinite] pointer-events-none shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          
          {isOverdrive && (
            <div className="absolute inset-0 bg-cyan-400/10 border-2 border-cyan-400 animate-pulse pointer-events-none" />
          )}

          <div className="absolute bottom-2 left-2 bg-slate-950/80 px-1.5 py-0.5 rounded font-mono text-[8px] text-cyan-400 border border-cyan-500/20">
            SYSTEM MATCH 100%
          </div>
        </div>

        {/* Identity Details */}
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <span className="font-mono text-[9px] font-bold text-cyan-400 tracking-wider block">
              PROTAGONIST PROFILE // NEURAL LINK STABLE
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-baseline gap-2">
              Ren Kusanagi
              <span className="text-xs font-mono font-normal text-slate-400">
                [Alias: Sanchin]
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
              STYLE: GOJU-RYU KARATE
            </span>
            <span className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
              CYBERNETIC: GOJU-SANCHIN V2
            </span>
            <span className="bg-slate-950 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono px-2 py-0.5 rounded">
              COAT: MATRIX-SPEC COATED
            </span>
          </div>

          {/* Style mantra */}
          <div className="border-l-2 border-cyan-500 pl-3 py-1 bg-slate-950/30">
            <p className="text-xs italic text-slate-400 leading-relaxed font-sans">
              &ldquo;Go (Hard) and Ju (Soft) exist in equilibrium. Cybernetic strength is useless unless calibrated with deep organic breathing control.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Dossier Tabs selection */}
      <div className="flex border-b border-slate-800/80 mb-4 gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('backstory')}
          className={`pb-2 px-1 transition-all duration-200 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'backstory'
              ? 'border-cyan-400 text-cyan-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-backstory"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>BACKSTORY</span>
        </button>

        <button
          onClick={() => setActiveTab('heritage')}
          className={`pb-2 px-1 transition-all duration-200 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'heritage'
              ? 'border-cyan-400 text-cyan-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-heritage"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>CYBER GOJU-RYU</span>
        </button>

        <button
          onClick={() => setActiveTab('coat')}
          className={`pb-2 px-1 transition-all duration-200 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'coat'
              ? 'border-cyan-400 text-cyan-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-coat"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>MATRIX COAT SPEC</span>
        </button>
      </div>

      {/* Interactive Tabs content with smooth fade animations */}
      <div className="flex-1 text-slate-300 text-xs leading-relaxed font-sans relative">
        {activeTab === 'backstory' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
            id="content-backstory"
          >
            <p>
              In the rain-slicked concrete sprawl of Neo-Tokyo, where conglomerates trade human dignity for synaptic processing power, Ren Kusanagi operates as an independent operator. Disillusioned with hyper-weaponry, Ren chose to integrate his physical body with a high-torque, hydraulic martial-arts prosthetic.
            </p>
            <p>
              He rejects guns in favor of **Goju-Ryu Karate**—re-engineered for close-quarters cybernetic warfare. Equipped with a custom pneumatic arm designed specifically for karate thrusts, Ren disables targets by releasing calculated sonic shockwaves directly through their structural weld joints.
            </p>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-800/50 mt-1">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>LOG: ACTIVE RETINAL FEEDS RETRIEVED FROM CORPORATE SHUTDOWN SESSIONS.</span>
            </div>
          </motion.div>
        )}

        {activeTab === 'heritage' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
            id="content-heritage"
          >
            <p>
              Goju-Ryu Karate translates directly to **&quot;Hard-Soft Style Karate&quot;**. Ren adapts this traditional Okinawan system using mechanical actuators and high-precision tactical sub-processors:
            </p>
            <div className="space-y-2 mt-2">
              {principles.map((pr, index) => (
                <div key={index} className="bg-slate-950/60 p-2.5 rounded border border-slate-800/40">
                  <span className="font-bold font-mono text-[10px] text-cyan-400 block mb-0.5">
                    {pr.title}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-normal block">
                    {pr.desc}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'coat' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
            id="content-coat"
          >
            <p>
              Rens iconic black leather duster is not merely for style—it is a critical cybernetic buffer interface woven with military-grade carbon lattice chains:
            </p>
            <ul className="space-y-2 mt-2 pl-1 list-none font-mono text-[11px] text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <div>
                  <strong className="text-slate-300">Kinetic Shock Absorbency:</strong> Woven lining absorbs up to 1400 Newtons of recoil force from pneumatic straight punches.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <div>
                  <strong className="text-slate-300">Thermoptic Camouflage Threads:</strong> Grounded carbon fiber dissipates the massive heat plumes emitted by the cyber arm during active combat.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <div>
                  <strong className="text-slate-300">Aerodynamic Sweep:</strong> The Matrix-style cut ensures zero friction resistance during circular deflection rotations.
                </div>
              </li>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}
