/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameState, HighScore } from './types';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { sound } from './sound';
import { Zap, HelpCircle, Award, Sparkles, Trophy } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [restartTrigger, setRestartTrigger] = useState<number>(0);

  // Active power-ups overlay stats tracking
  const [activePowerUps, setActivePowerUps] = useState<{ [key: string]: number }>({
    SHIELD: 0,
    MAGNET: 0,
    BOOST: 0,
  });

  // Timers references to decrement countdowns on interval
  const powerUpIntervalRef = useRef<number | null>(null);

  // Load high scores on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sky_runner_scores');
      if (stored) {
        setHighScores(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load high scores from localStorage:', e);
    }
  }, []);

  // Sync mute state to the audio engine
  useEffect(() => {
    sound.setMute(isMuted);
  }, [isMuted]);

  // Handle countdown updates for active powerups visually on UI overlay
  useEffect(() => {
    if (gameState === 'PLAYING') {
      // Start intervals to decrement active powerup seconds
      powerUpIntervalRef.current = window.setInterval(() => {
        setActivePowerUps((prev) => {
          const next = { ...prev };
          let updated = false;

          Object.keys(next).forEach((key) => {
            // Shield does not count down by seconds, only by crash absorbs
            if (key !== 'SHIELD' && next[key] > 0) {
              next[key] = next[key] - 1;
              updated = true;
            }
          });

          return updated ? next : prev;
        });
      }, 1000);
    } else {
      if (powerUpIntervalRef.current) {
        clearInterval(powerUpIntervalRef.current);
        powerUpIntervalRef.current = null;
      }
    }

    return () => {
      if (powerUpIntervalRef.current) {
        clearInterval(powerUpIntervalRef.current);
      }
    };
  }, [gameState]);

  // Hook global pause shortcut inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const togglePause = () => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  };

  const handleStartGame = () => {
    setScore(0);
    setDistance(0);
    setCoins(0);
    setActivePowerUps({ SHIELD: 0, MAGNET: 0, BOOST: 0 });
    setGameState('PLAYING');
    setRestartTrigger((prev) => prev + 1);
  };

  const handleGameOver = (finalScore: number, finalCoins: number, finalDistance: number) => {
    sound.stopMusic();
    setGameState('GAMEOVER');

    // Update system record high score
    const newRecord: HighScore = {
      score: Math.floor(finalScore),
      coins: finalCoins,
      distance: finalDistance,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: '2-digit' }),
    };

    setHighScores((prev) => {
      const updated = [...prev, newRecord]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // top 5

      try {
        localStorage.setItem('sky_runner_scores', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save high scores inside localStorage:', e);
      }
      return updated;
    });
  };

  const handleResetHighScores = () => {
    try {
      localStorage.removeItem('sky_runner_scores');
      setHighScores([]);
    } catch (e) {
      console.warn('Failed to clean localStorage records.');
    }
  };

  const handlePowerUpTriggered = (type: string, duration: number) => {
    setActivePowerUps((prev) => ({
      ...prev,
      [type]: duration,
    }));
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between overflow-x-hidden select-none font-sans">
      
      {/* Dynamic Header */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 md:py-6 flex justify-between items-center border-b border-cyan-950/45">
        <div className="flex items-center gap-3">
          {/* Logo Glyph */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse">
            <Zap className="w-5 h-5 text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
              SKY RUNNER
            </h1>
            <p className="text-[10px] text-cyan-400/70 font-mono tracking-widest uppercase">ENDLESS SPACE RUNNER</p>
          </div>
        </div>

        {/* Top bar indicators */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-400">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="hidden md:inline">HI-SCORE:</span>
            <span className="text-yellow-400 font-bold">
              {highScores.length > 0 ? highScores[0].score : '00000'}
            </span>
          </div>
          
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/20 border border-cyan-800/20 hover:border-cyan-500/30 text-[11px] text-cyan-300 font-bold tracking-wider cursor-pointer active:scale-95 duration-150 transition-colors"
          >
            {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
          </button>
        </div>
      </header>

      {/* Main Game Frame Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col justify-center">
        <div className="relative w-full aspect-video md:aspect-[12/6.4] rounded-2xl bg-black border-2 border-cyan-500/40 shadow-inner shadow-cyan-900/40 overflow-hidden ring-4 ring-cyan-900/10 dark:ring-cyan-950/20">
          
          {/* Canvas Engine */}
          <GameCanvas
            gameState={gameState}
            score={score}
            distance={distance}
            coins={coins}
            onScoreChange={setScore}
            onDistanceChange={setDistance}
            onCoinsChange={setCoins}
            onGameOver={handleGameOver}
            onPowerUpTriggered={handlePowerUpTriggered}
            restartTrigger={restartTrigger}
          />

          {/* Fully Visual Interactive Interface Overlays */}
          <GameUI
            gameState={gameState}
            score={score}
            distance={distance}
            coins={coins}
            highScores={highScores}
            isMuted={isMuted}
            onStartGame={handleStartGame}
            onTogglePause={togglePause}
            onToggleMute={() => setIsMuted((prev) => !prev)}
            onResetHighScores={handleResetHighScores}
            activePowerUps={activePowerUps}
          />
        </div>
      </main>

      {/* Footer Instructions / Guides */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-3 md:py-5 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex gap-4 md:gap-6 items-center text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse"></span>
            <span>SHIELD absorbs 1 crash</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
            <span>MAGNET pulls coin rings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>BOOST makes invincible</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-600">
          © 2026 SKY RUNNER INTERACTIVE • ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  );
}
