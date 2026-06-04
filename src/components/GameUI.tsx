/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameState, HighScore } from '../types';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Zap, Sparkles, Trophy, Calendar, Eye, HelpCircle } from 'lucide-react';

interface GameUIProps {
  gameState: GameState;
  score: number;
  distance: number;
  coins: number;
  highScores: HighScore[];
  isMuted: boolean;
  onStartGame: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onResetHighScores: () => void;
  activePowerUps: { [key: string]: number }; // active name -> seconds remaining
}

export const GameUI: React.FC<GameUIProps> = ({
  gameState,
  score,
  distance,
  coins,
  highScores,
  isMuted,
  onStartGame,
  onTogglePause,
  onToggleMute,
  onResetHighScores,
  activePowerUps,
}) => {
  return (
    <div id="game-ui-root" className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6">
      
      {/* 1. HUD OVERLAY (Always visible during active gameplay) */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <div id="hud-panel" className="w-full flex justify-between items-start pointer-events-auto">
          {/* Top-Left Stats Panel */}
          <div className="flex gap-3 md:gap-4 font-mono">
            {/* Score */}
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 backdrop-blur-md">
              <span className="text-[10px] text-cyan-400 block tracking-wider font-semibold uppercase">SCORE</span>
              <span className="text-lg md:text-xl font-bold text-white tracking-widest">
                {String(Math.floor(score)).padStart(6, '0')}
              </span>
            </div>

            {/* Distance */}
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-500/30 backdrop-blur-md">
              <span className="text-[10px] text-emerald-400 block tracking-wider font-semibold uppercase">DISTANCE</span>
              <span className="text-lg md:text-xl font-bold text-white">
                {distance.toFixed(1)} <span className="text-xs text-emerald-300">m</span>
              </span>
            </div>

            {/* Coins */}
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-amber-500/30 backdrop-blur-md flex items-center gap-2">
              <div>
                <span className="text-[10px] text-amber-400 block tracking-wider font-semibold uppercase">CORES</span>
                <span className="text-lg md:text-xl font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 inline-block text-amber-400 animate-pulse" />
                  {coins}
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right Settings Buttons */}
          <div className="flex items-center gap-2 font-mono">
            {/* Active Buff Timers Overlay */}
            <div className="flex gap-2 mr-2">
              {activePowerUps.SHIELD > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-400 text-cyan-300 animate-pulse text-xs">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SHIELD</span>
                </div>
              )}
              {activePowerUps.MAGNET > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-400 text-purple-300 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>MAGNET ({activePowerUps.MAGNET}s)</span>
                </div>
              )}
              {activePowerUps.BOOST > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/70 border border-rose-400 text-rose-300 text-xs font-bold ring-2 ring-rose-500/50">
                  <Zap className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                  <span>BOOST ({activePowerUps.BOOST}s)</span>
                </div>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-300 duration-200 transition-transform active:scale-90"
              title="Toggle Sounds"
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5 text-green-400" />}
            </button>

            {/* Pause/Resume Button */}
            <button
              onClick={onTogglePause}
              className="px-3.5 py-2 text-sm rounded-lg bg-cyan-900 mt-0.5 hover:bg-cyan-800 text-cyan-100 border border-cyan-700 font-bold active:scale-95 duration-200 cursor-pointer"
            >
              {gameState === 'PAUSED' ? 'RESUME' : 'PAUSE'}
            </button>

            {/* Quick Restart Button */}
            <button
              onClick={onStartGame}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 hover:bg-rose-950/20 text-slate-300 hover:text-rose-400 mt-0.5 duration-200 cursor-pointer active:scale-90"
              title="Restart Game"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN MENU SCREEN (State: MENU) */}
      {gameState === 'MENU' && (
        <div id="main-menu-overlay" className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center items-center p-6 text-center pointer-events-auto backdrop-blur-md">
          {/* Logo Brand Title */}
          <div className="relative mb-6">
            <span className="text-[12px] font-mono tracking-[0.25em] text-cyan-400 uppercase font-black block mb-1">
              NEO ARCADE RUNNER
            </span>
            <h1 className="text-5xl md:text-7xl font-sans font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              SKY RUNNER
            </h1>
          </div>

          <p className="text-slate-300 text-sm md:text-base max-w-md mx-auto mb-8 font-serif leading-relaxed">
            Run, jump, slide, and glide across high-altitude digital structures. Accumulate glowing gold cores and unleash supercharged rocket thrusters!
          </p>

          {/* Large Start Button */}
          <button
            onClick={onStartGame}
            className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl text-lg font-bold shadow-[0_0_25px_rgba(6,182,212,0.6)] duration-300 transition-all hover:scale-[1.03] active:scale-95 mb-8 z-20 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>INITIALIZE RUN</span>
          </button>

          {/* Quick instructions panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl max-w-lg mb-8 text-left font-mono">
            <div className="px-2 py-1">
              <span className="text-cyan-400 text-xs block font-bold mb-0.5">W / SPACE / ↑</span>
              <span className="text-[10px] text-slate-400">JUMP / DOUBLE JUMP</span>
            </div>
            <div className="px-2 py-1">
              <span className="text-purple-400 text-xs block font-bold mb-0.5">HOLD JUMP</span>
              <span className="text-[10px] text-slate-400">THRUSTER GLIDE</span>
            </div>
            <div className="px-2 py-1">
              <span className="text-rose-400 text-xs block font-bold mb-0.5">S / ↓</span>
              <span className="text-[10px] text-slate-400">SLIDE UNDER LASERS</span>
            </div>
            <div className="px-2 py-1">
              <span className="text-amber-400 text-xs block font-bold mb-0.5">TAP AIR DOWN</span>
              <span className="text-[10px] text-slate-400">FAST FALL SLAM</span>
            </div>
          </div>

          {/* Leaderboard High Scores panel */}
          <div className="w-full max-w-md bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2 tracking-wider uppercase">
                <Trophy className="w-4 h-4 text-yellow-400" />
                SYSTEM RECORD LOGS
              </h3>
              {highScores.length > 0 && (
                <button
                  onClick={onResetHighScores}
                  className="text-[10px] font-mono text-slate-500 hover:text-red-400 hover:underline cursor-pointer"
                >
                  CLEAR RECORDS
                </button>
              )}
            </div>

            {highScores.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-2">No terminal system logs available yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {highScores.map((hs, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-xs font-mono py-1 px-2.5 rounded bg-slate-900/60 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-500 font-bold">#0{index + 1}</span>
                      <span className="text-slate-300 font-bold">{hs.score} pts</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{hs.distance.toFixed(0)}m</span>
                      <span className="text-amber-400 font-bold">{hs.coins} Cores</span>
                      <span>{hs.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. PAUSED SCREEN OVERLAY (State: PAUSED) */}
      {gameState === 'PAUSED' && (
        <div id="pause-screen-overlay" className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 text-center pointer-events-auto">
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-cyan-500/30 max-w-sm w-full">
            <h2 className="text-3xl font-bold text-cyan-400 mb-2 font-sans tracking-wide">RUN SUSPENDED</h2>
            <p className="text-slate-400 text-xs mb-6 font-mono font-medium">SYSTEM DIAGNOSTICS: STABLE</p>

            <button
              onClick={onTogglePause}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl active:scale-95 duration-200 cursor-pointer mb-3"
            >
              RESUME SYSTEM FLOW
            </button>

            <button
              onClick={onStartGame}
              className="w-full py-2.5 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 hover:text-white font-mono text-xs font-bold rounded-xl border border-cyan-500/30 active:scale-95 duration-200 cursor-pointer mb-3 uppercase flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REBOOT RUN (RESTART)</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 duration-200 cursor-pointer"
            >
              RETRACT TO COREDOCK
            </button>
          </div>
        </div>
      )}

      {/* 4. GAME OVER SCREEN (State: GAMEOVER) */}
      {gameState === 'GAMEOVER' && (
        <div id="game-over-overlay" className="absolute inset-0 bg-rose-950/20 backdrop-blur-md flex flex-col justify-center items-center p-6 text-center pointer-events-auto">
          <div className="p-8 rounded-2xl bg-slate-950/95 border-2 border-rose-500/40 shadow-2xl shadow-rose-950/30 max-w-md w-full animate-fade-in">
            <span className="text-xs font-mono text-rose-500 tracking-[0.3em] font-black uppercase block mb-1">
              SYSTEM LOSS CRITICAL
            </span>
            <h2 className="text-4xl font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400 mb-6 tracking-tight filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              CRASH DETECTED
            </h2>

            {/* Game Stats Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800 p-3 rounded-xl mb-6">
              <div className="text-center">
                <span className="text-[9px] text-slate-400 font-mono uppercase block mb-0.5">SCORE</span>
                <span className="text-lg font-mono font-bold text-cyan-400">{score}</span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="text-[9px] text-slate-400 font-mono uppercase block mb-0.5">DISTANCE</span>
                <span className="text-lg font-mono font-bold text-emerald-400">{distance.toFixed(0)}m</span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="text-[9px] text-slate-400 font-mono uppercase block mb-0.5">CORES</span>
                <span className="text-lg font-mono font-bold text-amber-400">{coins}</span>
              </div>
            </div>

            {/* Encouragement Quote based on score */}
            <p className="text-slate-300 text-xs italic mb-8 font-serif leading-relaxed px-2">
              {score > 8000
                ? "Incredible reaction times. You conquered the digital sky skyline as a master class speedrunner!"
                : score > 3000
                ? "Excellent flight mechanics. Collect more Shield crystals next run to survive laser gates!"
                : "A brief impact. Jump slightly earlier next time to clean clear those spike hazards!"}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onStartGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer hover:scale-[1.02] duration-200 text-sm md:text-base flex items-center justify-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REBOOT RUN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding (unobtrusive detail) */}
      <div id="footer-branding" className="w-full text-center py-1 mt-auto select-none pointer-events-none">
        <span className="text-[9px] font-mono tracking-wider text-slate-600/60 uppercase">
          Powered by HTML5 WebGL / Audio Synthesis • SKY RUNNER SYSTEM V4.1
        </span>
      </div>
    </div>
  );
};
