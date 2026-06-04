/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  GameState,
  Player,
  Obstacle,
  Coin,
  PowerUp,
  Particle,
  FloatingText,
  Cloud,
  BackgroundStar,
} from '../types';
import { sound } from '../sound';

interface GameCanvasProps {
  gameState: GameState;
  score: number;
  distance: number;
  coins: number;
  onScoreChange: (score: number) => void;
  onDistanceChange: (distance: number) => void;
  onCoinsChange: (coins: number) => void;
  onGameOver: (score: number, coins: number, distance: number) => void;
  onPowerUpTriggered: (type: string, duration: number) => void;
  restartTrigger: number;
}

// Fixed design coordinates (virtual resolution)
const VIRTUAL_WIDTH = 1200;
const VIRTUAL_HEIGHT = 640;
const GROUND_Y = 520;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  score,
  distance,
  coins,
  onScoreChange,
  onDistanceChange,
  onCoinsChange,
  onGameOver,
  onPowerUpTriggered,
  restartTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Score & distance stats mirrors to read in animation frame without closures
  const statsRef = useRef({ score, coins, distance });
  useEffect(() => {
    statsRef.current = { score, coins, distance };
  }, [score, coins, distance]);

  // Input states
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Entities state
  const playerRef = useRef<Player>({
    y: GROUND_Y - 80,
    vy: 0,
    width: 50,
    height: 80,
    isGrounded: true,
    jumpCount: 0,
    isSliding: false,
    slideTimer: 0,
    isGliding: false,
    shieldActive: false,
    magnetActive: false,
    magnetTimer: 0,
    boostActive: false,
    boostTimer: 0,
    rotation: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const starsRef = useRef<BackgroundStar[]>([]);

  // Physics & running settings
  const runSpeedRef = useRef<number>(6.5);
  const maxRunSpeed = 16.0;
  const gravity = 0.8;
  const jumpForce = -15;
  const doubleJumpForce = -13;
  const slideDuration = 45; // game ticks
  const invincibilityTicksRef = useRef<number>(0);

  // Animation and spawning triggers
  const obstacleSpawnTimer = useRef<number>(0);
  const coinSpawnTimer = useRef<number>(0);
  const powerUpSpawnTimer = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // Initialize stellar sky background
  useEffect(() => {
    // Generate static stars
    const newStars: BackgroundStar[] = [];
    for (let i = 0; i < 40; i++) {
      newStars.push({
        x: Math.random() * VIRTUAL_WIDTH,
        y: Math.random() * (VIRTUAL_HEIGHT - 250),
        size: Math.random() * 2 + 1,
        blinkSpeed: 0.01 + Math.random() * 0.03,
        alpha: Math.random(),
      });
    }
    starsRef.current = newStars;

    // Generate static clouds
    const newClouds: Cloud[] = [];
    for (let i = 0; i < 6; i++) {
      newClouds.push({
        x: Math.random() * VIRTUAL_WIDTH,
        y: 80 + Math.random() * 180,
        size: 50 + Math.random() * 80,
        speed: 0.1 + Math.random() * 0.4,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
    cloudsRef.current = newClouds;
  }, []);

  // Reset function called on mount and restarts
  const initGame = () => {
    sound.init();
    sound.stopMusic();
    sound.startMusic();

    playerRef.current = {
      y: GROUND_Y - 80,
      vy: 0,
      width: 50,
      height: 80,
      isGrounded: true,
      jumpCount: 0,
      isSliding: false,
      slideTimer: 0,
      isGliding: false,
      shieldActive: false,
      magnetActive: false,
      magnetTimer: 0,
      boostActive: false,
      boostTimer: 0,
      rotation: 0,
    };

    obstaclesRef.current = [];
    coinsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    invincibilityTicksRef.current = 0;
    runSpeedRef.current = 6.5;
    frameCount.current = 0;
    obstacleSpawnTimer.current = 0;
    coinSpawnTimer.current = 0;
    powerUpSpawnTimer.current = 0;

    onScoreChange(0);
    onDistanceChange(0);
    onCoinsChange(0);
  };

  // Watch for external restart triggers
  useEffect(() => {
    if (restartTrigger > 0) {
      initGame();
    }
  }, [restartTrigger]);

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.code;
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(k)) {
        e.preventDefault();
      }

      if (gameState !== 'PLAYING') return;

      if (!keysPressed.current[k]) {
        keysPressed.current[k] = true;

        if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') {
          triggerJump();
        } else if (k === 'ArrowDown' || k === 'KeyS') {
          triggerSlide();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (gameState !== 'PLAYING') return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        playerRef.current.isGliding = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Jump trigger logic
  const triggerJump = () => {
    const player = playerRef.current;
    if (player.boostActive) return; // cannot jump in direct boost rocket mode

    if (player.isGrounded) {
      sound.playJump();
      player.vy = jumpForce;
      player.isGrounded = false;
      player.jumpCount = 1;
      player.isSliding = false;

      // Spawn ground jump dust
      spawnJumpDust();
    } else if (player.jumpCount < 2) {
      // Double Jump
      sound.playDoubleJump();
      player.vy = doubleJumpForce;
      player.jumpCount = 2;
      player.rotation = 0; // Trigger front-flip animation

      // Spawn double jump burst circles
      spawnDoubleJumpSparks();
    } else {
      // Activate glide
      player.isGliding = true;
    }
  };

  // Slide trigger logic
  const triggerSlide = () => {
    const player = playerRef.current;
    if (player.isGrounded && !player.isSliding) {
      sound.playSlide();
      player.isSliding = true;
      player.slideTimer = slideDuration;
      player.height = 45; // reduce hitbox height
      player.y = GROUND_Y - 45;

      // Slide spark trail
      spawnSlideSparks();
    } else if (!player.isGrounded) {
      // Fast fall when pressing down in air
      player.vy = 12;
      player.isGliding = false;
    }
  };

  // Particle Generators
  const spawnJumpDust = () => {
    const player = playerRef.current;
    const count = 12;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: 80 + player.width / 2,
        y: GROUND_Y,
        vx: -2 - Math.random() * 4,
        vy: -Math.random() * 3,
        color: '#38bdf8', // Light sky blue
        size: Math.random() * 6 + 3,
        alpha: 0.8,
        decay: 0.02 + Math.random() * 0.03,
        shape: 'circle',
      });
    }
  };

  const spawnDoubleJumpSparks = () => {
    const player = playerRef.current;
    const count = 15;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = Math.random() * 4 + 3;
      particlesRef.current.push({
        x: 80 + player.width / 2,
        y: player.y + player.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1,
        color: '#f43f5e', // Hot magenta red
        size: Math.random() * 4 + 2,
        alpha: 0.9,
        decay: 0.03 + Math.random() * 0.04,
        shape: 'spark',
      });
    }
  };

  const spawnSlideSparks = () => {
    const count = 8;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: 90,
        y: GROUND_Y - 2,
        vx: -6 - Math.random() * 5,
        vy: -Math.random() * 3,
        color: '#06b6d4', // Teal spark
        size: Math.random() * 3 + 2,
        alpha: 0.9,
        decay: 0.04 + Math.random() * 0.04,
        shape: 'spark',
      });
    }
  };

  const spawnCoinCollectParticles = (x: number, y: number, isGold = true) => {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isGold ? '#eab308' : '#a855f7', // Golden amber or power-up purple
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        shape: 'spark',
      });
    }
  };

  const spawnCrashExplosion = () => {
    const player = playerRef.current;
    const count = 45;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particlesRef.current.push({
        x: 80 + player.width / 2,
        y: player.y + player.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: i % 3 === 0 ? '#ff007f' : i % 3 === 1 ? '#00ffff' : '#ffff00', // Neon palette
        size: Math.random() * 10 + 4,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        shape: i % 2 === 0 ? 'circle' : 'spark',
      });
    }
  };

  const addFloatingText = (text: string, x: number, y: number, color = '#ffd700') => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      alpha: 1.0,
      vy: -1.8,
    });
  };

  const spawnShieldAbsorbRing = () => {
    const player = playerRef.current;
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      particlesRef.current.push({
        x: 80 + player.width / 2,
        y: player.y + player.height / 2,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        color: '#38bdf8', // Neon blue shield wave
        size: 5,
        alpha: 1.0,
        decay: 0.04,
        shape: 'circle',
      });
    }
  };

  // Touch listener setup
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING' || !touchStartPos.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    // Detect Tap vs Swishe/Swipe
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      // Tap is jump
      triggerJump();
    } else if (dy > 40) {
      // Swipe down is slide
      triggerSlide();
    } else if (dy < -40) {
      // Swipe up is jump/double jump
      triggerJump();
    }
    touchStartPos.current = null;
  };

  // Main game update physics ticks
  const updatePhysics = () => {
    frameCount.current++;
    const player = playerRef.current;
    const currentSpeed = player.boostActive ? runSpeedRef.current * 2.2 : runSpeedRef.current;

    // Slowly increase standard run speed over distance
    if (runSpeedRef.current < maxRunSpeed && frameCount.current % 120 === 0) {
      runSpeedRef.current += 0.08;
    }

    // Incinvibility timer tick down
    if (invincibilityTicksRef.current > 0) {
      invincibilityTicksRef.current--;
    }

    // Decrease active status effects
    if (player.magnetActive) {
      player.magnetTimer--;
      if (player.magnetTimer <= 0) {
        player.magnetActive = false;
        addFloatingText('MAGNET LOST', 100, player.y - 15, '#c084fc');
      }
    }
    if (player.boostActive) {
      player.boostTimer--;
      if (player.boostTimer <= 0) {
        player.boostActive = false;
        addFloatingText('BOOST OVER', 100, player.y - 15, '#f472b6');
        // Resume speed smoothly
        runSpeedRef.current = Math.max(6.5, runSpeedRef.current);
      }
      // Create hyper rocket sparks
      particlesRef.current.push({
        x: 80,
        y: player.y + player.height / 2 + (Math.random() * 10 - 5),
        vx: -12 - Math.random() * 8,
        vy: Math.random() * 4 - 2,
        color: '#ffff00',
        size: Math.random() * 7 + 4,
        alpha: 1.0,
        decay: 0.05,
        shape: 'spark',
      });
    }

    // 1. UPDATE PLAYER STATE
    if (player.isSliding) {
      player.slideTimer--;
      if (player.slideTimer <= 0) {
        // Stop sliding
        player.isSliding = false;
        player.height = 80; // height standard
        player.y = GROUND_Y - 80;
      } else {
        // Emission of sliding sparks
        if (Math.random() < 0.35) {
          spawnSlideSparks();
        }
      }
    }

    // Apply gravity & velocity
    if (!player.isGrounded && !player.boostActive) {
      let activeGravity = gravity;
      if (player.isGliding && player.vy > 0) {
        activeGravity = gravity * 0.22; // very low floaty gravity

        // Rocket glide flame particles from boots
        particlesRef.current.push({
          x: 100,
          y: player.y + player.height,
          vx: -3 - Math.random() * 3,
          vy: 2 + Math.random() * 4,
          color: '#f97316', // orange rocket
          size: Math.random() * 4 + 2,
          alpha: 0.9,
          decay: 0.08,
          shape: 'spark',
        });
      }
      player.vy += activeGravity;
      player.y += player.vy;

      // Handle flip animation if double jumping
      if (player.jumpCount === 2) {
        player.rotation += 0.2;
      }
    } else if (player.boostActive) {
      // Hover cleanly during boost mode
      const targetY = GROUND_Y - 140;
      player.y += (targetY - player.y) * 0.12;
      player.vy = 0;
      player.rotation = 0.1 * Math.sin(frameCount.current * 0.2); // subtle oscillation
    } else {
      player.rotation = 0;
    }

    // Floor collision
    if (player.y >= GROUND_Y - player.height) {
      player.y = GROUND_Y - player.height;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0;
      player.isGliding = false;
      player.rotation = 0;
    }

    // Running exhaust feet dust particles
    if (player.isGrounded && !player.isSliding && Math.random() < 0.2) {
      particlesRef.current.push({
        x: 100,
        y: GROUND_Y,
        vx: -currentSpeed * 0.4 - Math.random() * 2,
        vy: -Math.random() * 2,
        color: '#64748b',
        size: Math.random() * 5 + 2,
        alpha: 0.6,
        decay: 0.04,
        shape: 'circle',
      });
    }

    // 2. PARALLAX SCROLLING BACKGROUNDS
    cloudsRef.current.forEach((cloud) => {
      cloud.x -= cloud.speed + currentSpeed * 0.02;
      if (cloud.x + cloud.size * 2 < 0) {
        cloud.x = VIRTUAL_WIDTH + cloud.size;
        cloud.y = 80 + Math.random() * 180;
      }
    });

    starsRef.current.forEach((star) => {
      // Twinkle alpha cycle
      star.alpha += star.blinkSpeed;
      if (star.alpha > 1 || star.alpha < 0.1) {
        star.blinkSpeed = -star.blinkSpeed;
      }
    });

    // 3. SPAWNING ENTITIES
    // Obstacles
    obstacleSpawnTimer.current += currentSpeed;
    const baseSpawnRate = 220; // smaller is faster spawning
    const currentSpawnRate = Math.max(120, baseSpawnRate - runSpeedRef.current * 8);

    if (obstacleSpawnTimer.current >= currentSpawnRate) {
      obstacleSpawnTimer.current = 0;
      spawnObstacle();
    }

    // Coins spawning in custom neat patterns
    coinSpawnTimer.current += currentSpeed;
    if (coinSpawnTimer.current >= 180) {
      coinSpawnTimer.current = 0;
      spawnCoinRow();
    }

    // Power-ups (rare spawning)
    powerUpSpawnTimer.current += currentSpeed;
    if (powerUpSpawnTimer.current >= 1200) {
      powerUpSpawnTimer.current = 0;
      spawnPowerUp();
    }

    // 4. ENTITY UPDATE & COLLISIONS
    // Obstacles
    obstaclesRef.current = obstaclesRef.current.filter((obs) => {
      obs.x -= currentSpeed * obs.speedFactor;

      // Check collision
      if (!obs.passed && checkColliding(player, obs)) {
        if (player.boostActive) {
          // Smash obstacle completely in boost!
          obs.passed = true;
          addFloatingText('SMASH! +100', obs.x, obs.y, '#f472b6');
          onScoreChange(statsRef.current.score + 100);
          sound.playCoin();
          // Explosion particles
          for (let pIdx = 0; pIdx < 10; pIdx++) {
            particlesRef.current.push({
              x: obs.x,
              y: obs.y,
              vx: 5 + Math.random() * 5,
              vy: -2 - Math.random() * 4,
              color: '#ef4444',
              size: Math.random() * 8 + 3,
              alpha: 1.0,
              decay: 0.05,
              shape: 'spark',
            });
          }
          return false;
        }

        if (invincibilityTicksRef.current > 0) {
          // ignore collision if invincible
          return true;
        }

        if (player.shieldActive) {
          // Absorb crash!
          player.shieldActive = false;
          invincibilityTicksRef.current = 90; // 1.5s invincibility
          obs.passed = true;
          sound.playShieldLost();
          spawnShieldAbsorbRing();
          addFloatingText('SHIELD SHATTERED!', obs.x, obs.y - 20, '#38bdf8');
          onPowerUpTriggered('SHIELD_LOST', 0);
          return false; // delete individual obstacle
        } else {
          // CRASH Game Over!
          sound.playCrash();
          spawnCrashExplosion();
          onGameOver(
            statsRef.current.score,
            statsRef.current.coins,
            statsRef.current.distance
          );
          return false;
        }
      }

      // Check if safely passed to add points
      if (!obs.passed && obs.x + obs.width < 70) {
        obs.passed = true;
        const addScore = obs.type === 'DRONE' ? 50 : 25;
        onScoreChange(statsRef.current.score + addScore);
        addFloatingText(`+${addScore}`, 80 + player.width / 2, player.y - 10, '#60a5fa');
      }

      return obs.x + obs.width > -100;
    });

    // Coins update & collection
    coinsRef.current = coinsRef.current.filter((coin) => {
      coin.x -= currentSpeed;
      coin.rotation += 0.06;

      // Coin Magnet logic
      if (player.magnetActive && !coin.collected) {
        const dx = (80 + player.width / 2) - coin.x;
        const dy = (player.y + player.height / 2) - coin.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (distToPlayer < 240) {
          // Magnet pull
          const pullForce = 0.16;
          coin.x += dx * pullForce;
          coin.y += dy * pullForce;
        }
      }

      // Boost auto-vacuum logic
      if (player.boostActive && !coin.collected) {
        const dx = (80 + player.width / 2) - coin.x;
        const dy = (player.y + player.height / 2) - coin.y;
        coin.x += dx * 0.25;
        coin.y += dy * 0.25;
      }

      // Check overlap
      if (!coin.collected && checkCoinOverlap(player, coin)) {
        coin.collected = true;
        const val = coin.isPowerCoin ? 100 : 10;
        onCoinsChange(statsRef.current.coins + (coin.isPowerCoin ? 5 : 1));
        onScoreChange(statsRef.current.score + val);
        sound.playCoin();
        spawnCoinCollectParticles(coin.x, coin.y, !coin.isPowerCoin);
        addFloatingText(`+${val}`, coin.x, coin.y - 12, coin.isPowerCoin ? '#a855f7' : '#facc15');
        return false;
      }

      return coin.x + coin.radius > -50;
    });

    // Power-ups
    powerUpsRef.current = powerUpsRef.current.filter((pw) => {
      pw.x -= currentSpeed;
      pw.pulseTimer += 0.05;

      if (!pw.collected && checkPowerUpOverlap(player, pw)) {
        pw.collected = true;
        sound.playPowerUp();
        spawnCoinCollectParticles(pw.x, pw.y, false);

        triggerPowerUp(pw.type);
        return false;
      }

      return pw.x + pw.width > -50;
    });

    // Particles physics
    particlesRef.current = particlesRef.current.filter((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      return pt.alpha > 0;
    });

    // Floating text rising animation
    floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
      ft.y += ft.vy;
      ft.alpha -= 0.018;
      return ft.alpha > 0;
    });

    // Update stats scoreboard values (distance)
    onDistanceChange(statsRef.current.distance + currentSpeed * 0.05);
    onScoreChange(statsRef.current.score + Math.floor(currentSpeed * 0.05));
  };

  // Trigger collected powerups state & timers
  const triggerPowerUp = (type: string) => {
    const player = playerRef.current;
    addFloatingText(`${type} POWER-UP!`, 120, player.y - 25, '#c084fc');

    if (type === 'SHIELD') {
      player.shieldActive = true;
      onPowerUpTriggered('SHIELD', 999999);
    } else if (type === 'MAGNET') {
      player.magnetActive = true;
      player.magnetTimer = 550; // ticks ~9 seconds
      onPowerUpTriggered('MAGNET', Math.ceil(550 / 60));
    } else if (type === 'BOOST') {
      player.boostActive = true;
      player.boostTimer = 300; // ~5 seconds hyper rocket
      onPowerUpTriggered('BOOST', Math.ceil(300 / 60));
      // Give initial blast of speed particles
      for (let i = 0; i < 25; i++) {
        particlesRef.current.push({
          x: 100,
          y: player.y + player.height / 2,
          vx: Math.random() * 12 + 6,
          vy: Math.random() * 6 - 3,
          color: '#ffffff',
          size: Math.random() * 5 + 3,
          alpha: 1.0,
          decay: 0.03,
          shape: 'circle',
        });
      }
    }
  };

  // Circle-Rect collision for coin overlap
  const checkCoinOverlap = (player: Player, coin: Coin): boolean => {
    const pX = 80;
    const pY = player.y;
    const pW = player.width;
    const pH = player.height;

    const closestX = Math.max(pX, Math.min(coin.x, pX + pW));
    const closestY = Math.max(pY, Math.min(coin.y, pY + pH));

    const dx = coin.x - closestX;
    const dy = coin.y - closestY;
    const distanceSquare = dx * dx + dy * dy;

    return distanceSquare < coin.radius * coin.radius;
  };

  // Rect-Rect for powerup overlap
  const checkPowerUpOverlap = (player: Player, pw: PowerUp): boolean => {
    const pX = 80;
    return (
      pX < pw.x + pw.width &&
      pX + player.width > pw.x &&
      player.y < pw.y + pw.height &&
      player.y + player.height > pw.y
    );
  };

  // Collision calculation based on shrink bounding boxes for accurate feel
  const checkColliding = (player: Player, obs: Obstacle): boolean => {
    // Player coordinates relative to design space x=80
    const pX = 80;
    const pY = player.y;
    const pW = player.width;
    const pH = player.height;

    // Use tighter collision padding indices to make game feel fair and competitive
    const padX = pW * 0.22;
    const padY = pH * 0.12;

    const px1 = pX + padX;
    const px2 = pX + pW - padX;
    const py1 = pY + padY;
    const py2 = pY + pH - padY;

    // Obstacle box padding
    const obPadX = obs.width * 0.15;
    const obPadY = obs.height * 0.15;

    const ox1 = obs.x + obPadX;
    const ox2 = obs.x + obs.width - obPadX;
    const oy1 = obs.y + obPadY;
    const oy2 = obs.y + obs.height - obPadY;

    return px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1;
  };

  // Spawn functions
  const spawnObstacle = () => {
    const types: Obstacle['type'][] = ['SPIKE', 'LASER_BARRIER', 'DRONE'];
    // Random choices weighted on current run speed (higher speed spawns spikes & flying drones more, and barrier mixes)
    let choice: Obstacle['type'] = 'SPIKE';
    const rand = Math.random();

    if (runSpeedRef.current > 8.5) {
      if (rand < 0.35) choice = 'SPIKE';
      else if (rand < 0.7) choice = 'LASER_BARRIER';
      else choice = 'DRONE';
    } else {
      if (rand < 0.55) choice = 'SPIKE';
      else choice = 'LASER_BARRIER';
    }

    let width = 45;
    let height = 55;
    let y = GROUND_Y - height;

    if (choice === 'LASER_BARRIER') {
      width = 25;
      height = 110;
      y = GROUND_Y - 180; // Suspended laser: slide gap is underneath
    } else if (choice === 'DRONE') {
      width = 50;
      height = 40;
      y = GROUND_Y - 140 - Math.random() * 60; // Floating drone: double jump or glide
    }

    obstaclesRef.current.push({
      id: Math.random().toString(),
      x: VIRTUAL_WIDTH + 100,
      y,
      width,
      height,
      type: choice,
      speedFactor: choice === 'DRONE' ? 1.2 : 1.0,
      animationFrame: 0,
      passed: false,
    });
  };

  // Spawn coin arrangements (straight curves, circles, waves!)
  const spawnCoinRow = () => {
    const count = 4 + Math.floor(Math.random() * 5);
    const patternRand = Math.random();
    const startX = VIRTUAL_WIDTH + 80;
    const startY = GROUND_Y - 50 - Math.random() * 140;

    for (let i = 0; i < count; i++) {
      let x = startX + i * 45;
      let y = startY;

      // Custom wavy geometry configurations
      if (patternRand < 0.4) {
        // Sine wave coin pattern
        y = startY + Math.sin(i * 0.8) * 80;
      } else if (patternRand < 0.7) {
        // Arch pattern
        const peakIndex = count / 2;
        y = startY - (peakIndex - Math.abs(i - peakIndex)) * 35;
      }

      // Check overlapping constraints
      if (y < GROUND_Y - 30) {
        coinsRef.current.push({
          id: Math.random().toString(),
          x,
          y,
          radius: 12,
          collected: false,
          value: 10,
          rotation: Math.random() * Math.PI,
          isPowerCoin: Math.random() < 0.08, // 8% chance to be gold/purple mega-coin index
        });
      }
    }
  };

  const spawnPowerUp = () => {
    const types: PowerUp['type'][] = ['SHIELD', 'MAGNET', 'BOOST'];
    const pType = types[Math.floor(Math.random() * types.length)];
    const py = GROUND_Y - 120 - Math.random() * 130;

    powerUpsRef.current.push({
      x: VIRTUAL_WIDTH + 80,
      y: py,
      width: 40,
      height: 40,
      type: pType,
      collected: false,
      pulseTimer: 0,
    });
  };

  // Rendering Game Scene onto Canvas
  const drawScene = (ctx: CanvasRenderingContext2D) => {
    // 1. Clear with gradient starry cosmic deep space background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    bgGrad.addColorStop(0, '#0a0a23'); // Midnight indigo
    bgGrad.addColorStop(0.5, '#120c38'); // Deep neon blue/indigo
    bgGrad.addColorStop(1, '#02010d'); // Jet black space floor
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // 2. Draw Stars
    ctx.save();
    starsRef.current.forEach((star) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 3. Far Cyber Grid Horizon
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'; // Very faint bright cyan
    ctx.lineWidth = 1;
    ctx.beginPath();
    const horizonY = 280;
    // Horizontal lines
    for (let y = horizonY; y < GROUND_Y; y += 30) {
      ctx.moveTo(0, y);
      ctx.lineTo(VIRTUAL_WIDTH, y);
    }
    // Vanishing perspective rays
    for (let x = -400; x < VIRTUAL_WIDTH + 400; x += 80) {
      ctx.moveTo(VIRTUAL_WIDTH / 2, horizonY - 40);
      ctx.lineTo(x, GROUND_Y);
    }
    ctx.stroke();

    // 4. Parallax Background Cyber Buildings (Synthwave skyline silhouettes)
    ctx.save();
    ctx.fillStyle = 'rgba(18, 9, 36, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)'; // Glowing outlines
    for (let i = 0; i < 15; i++) {
      const bW = 80 + (i % 3) * 35;
      const bH = 140 + (i % 4) * 45;
      const bX = (i * 90 - (statsRef.current.distance * 1.5)) % (VIRTUAL_WIDTH + 150) - 100;

      ctx.fillRect(bX, GROUND_Y - bH, bW, bH);
      ctx.strokeRect(bX, GROUND_Y - bH, bW, bH);

      // Distant windows
      ctx.fillStyle = 'rgba(250, 204, 21, 0.04)';
      for (let wx = bX + 15; wx < bX + bW - 15; wx += 25) {
        for (let wy = GROUND_Y - bH + 20; wy < GROUND_Y - 20; wy += 35) {
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
      ctx.fillStyle = 'rgba(18, 9, 36, 0.6)';
    }
    ctx.restore();

    // 5. Scrolling Fluffy Vector Clouds
    ctx.save();
    cloudsRef.current.forEach((cloud) => {
      ctx.fillStyle = `rgba(139, 92, 246, ${cloud.opacity})`; // Soft twilight purple clouds
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.3, cloud.y - cloud.size * 0.15, cloud.size * 0.5, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // 6. DRAW GROUND TRACKS & EDGES
    // Sub-floor drawing
    ctx.fillStyle = '#0f172a'; // Deep slate floor
    ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);

    // Neon Cyber Grid underfoot
    ctx.strokeStyle = '#bd93f9'; // Soft purple grid edges
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < VIRTUAL_WIDTH; gx += 40) {
      const scrollX = (gx - statsRef.current.distance * (playerRef.current.boostActive ? 30 : 12)) % 40;
      ctx.moveTo(scrollX, GROUND_Y);
      ctx.lineTo(scrollX, VIRTUAL_HEIGHT);
    }
    for (let gy = GROUND_Y; gy < VIRTUAL_HEIGHT; gy += 25) {
      ctx.moveTo(0, gy);
      ctx.lineTo(VIRTUAL_WIDTH, gy);
    }
    ctx.stroke();

    // Glowing Neon Top Deck strip
    ctx.save();
    ctx.strokeStyle = '#06b6d4'; // Deep electric cyan
    ctx.lineWidth = 6;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(VIRTUAL_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.restore();

    // 7. DRAW POWER-UPS ORB
    ctx.save();
    powerUpsRef.current.forEach((pw) => {
      const pt = pw.pulseTimer;
      const sizeOffset = Math.sin(pt * 3.5) * 5;
      const outerRad = pw.width / 2 + sizeOffset;

      // Glow backing
      ctx.shadowBlur = 16 + sizeOffset * 2;
      ctx.shadowColor = pw.type === 'SHIELD' ? '#38bdf8' : pw.type === 'MAGNET' ? '#c084fc' : '#f43f5e';

      // Inner power crystal
      ctx.fillStyle = ctx.shadowColor;
      ctx.beginPath();
      const cx = pw.x + pw.width / 2;
      const cy = pw.y + pw.height / 2;
      ctx.moveTo(cx, cy - outerRad);
      ctx.lineTo(cx + outerRad * 0.8, cy - outerRad * 0.2);
      ctx.lineTo(cx + outerRad * 0.4, cy + outerRad * 0.8);
      ctx.lineTo(cx - outerRad * 0.4, cy + outerRad * 0.8);
      ctx.lineTo(cx - outerRad * 0.8, cy - outerRad * 0.2);
      ctx.closePath();
      ctx.fill();

      // Power Symbol drawing
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textSym = pw.type === 'SHIELD' ? 'S' : pw.type === 'MAGNET' ? 'M' : 'B';
      ctx.fillText(textSym, cx, cy);
    });
    ctx.restore();

    // 8. DRAW COINS
    ctx.save();
    coinsRef.current.forEach((coin) => {
      ctx.save();
      ctx.translate(coin.x, coin.y);

      // Gold shimmer angle
      ctx.rotate(coin.rotation);

      ctx.shadowBlur = coin.isPowerCoin ? 15 : 8;
      ctx.shadowColor = coin.isPowerCoin ? '#a855f7' : '#eab308'; // royal purple or yellow gold
      ctx.strokeStyle = coin.isPowerCoin ? '#d8b4fe' : '#fef08a';
      ctx.lineWidth = 2.5;

      // Yellow golden metal or glowing sapphire
      ctx.fillStyle = coin.isPowerCoin ? '#a855f7' : '#eab308';

      // Draw shiny hexagonal coin
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const cAngle = (i / 6) * Math.PI * 2;
        const cX = Math.cos(cAngle) * coin.radius;
        const cY = Math.sin(cAngle) * coin.radius;
        if (i === 0) ctx.moveTo(cX, cY);
        else ctx.lineTo(cX, cY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core design drawing
      ctx.fillStyle = coin.isPowerCoin ? '#f3e8ff' : '#fef9c3';
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
    ctx.restore();

    // 9. DRAW OBSTACLES
    ctx.save();
    obstaclesRef.current.forEach((obs) => {
      if (obs.type === 'SPIKE') {
        // Red glowing hazard spiked barricade
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f43f5e';
        ctx.fillStyle = '#310d1a'; // Dark core
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width * 0.25, obs.y + 12);
        ctx.lineTo(obs.x + obs.width * 0.5, obs.y + obs.height * 0.6);
        ctx.lineTo(obs.x + obs.width * 0.75, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === 'LASER_BARRIER') {
        // High hanging glowing laser posts
        // Mount platforms
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(obs.x - 10, obs.y, obs.width + 20, 20);
        ctx.fillRect(obs.x - 10, obs.y + obs.height - 20, obs.width + 20, 20);

        // Bright laser beams
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ef4444';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y + 15);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height - 15);
        ctx.stroke();

        // Pulsing light shields around beams
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.lineWidth = 14 + Math.sin(frameCount.current * 0.4) * 4;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y + 15);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height - 15);
        ctx.stroke();
        ctx.restore();
      } else if (obs.type === 'DRONE') {
        // Flying cyber-hawk robot
        const droneOscY = obs.y + Math.sin(frameCount.current * 0.15) * 8;

        // Draw drone wings flapping
        const flapOffset = Math.sin(frameCount.current * 0.35) * obs.height * 0.4;

        ctx.save();
        ctx.translate(obs.x + obs.width / 2, droneOscY + obs.height / 2);

        // Core glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#e11d48';

        // Wings
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Left Wing
        ctx.moveTo(-10, -5);
        ctx.quadraticCurveTo(-25, -25 - flapOffset, -35, -5);
        // Right Wing
        ctx.moveTo(10, -5);
        ctx.quadraticCurveTo(25, -25 - flapOffset, 35, -5);
        ctx.stroke();

        // Drone main structural fuselage
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, obs.width * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // High blinking robotic camera eye
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(-4, -1, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });
    ctx.restore();

    // 10. DRAW MAIN PLAYER CHARACTER - CYBER RUNNER
    const player = playerRef.current;
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
      // Flash player body if invincible
      if (invincibilityTicksRef.current === 0 || Math.floor(frameCount.current / 4) % 2 === 0) {
        ctx.save();
        ctx.translate(80 + player.width / 2, player.y + player.height / 2);

        // Handle midair rotflip
        if (player.rotation !== 0) {
          ctx.rotate(player.rotation);
        }

        const runCycle = frameCount.current * 0.18;

        // Render shadow glowing rings base
        if (player.boostActive) {
          ctx.shadowBlur = 24 + Math.sin(frameCount.current * 0.5) * 6;
          ctx.shadowColor = '#f43f5e';
        } else if (player.shieldActive) {
          ctx.shadowBlur = 18;
          ctx.shadowColor = '#06b6d4';
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
        }

        // Draw Player Character: Modern stylized robot ninja
        // If sliding, compress shape rendering
        if (player.isSliding) {
          // Drawing a sliding hover sled and curled cyber ninja
          ctx.fillStyle = '#1e1c2e';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;

          // Compressed helmet/body
          ctx.beginPath();
          ctx.ellipse(0, 8, player.width / 2 + 5, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cyan neon eye visor line
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(8, 2, 14, 4);

          // Spark propulsion jet trails
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-player.width / 2, 8);
          ctx.lineTo(-player.width / 2 - 15, 8);
          ctx.stroke();
        } else if (player.boostActive) {
          // Drawing Super Rocket Rocketship / Cyber flight mode
          ctx.strokeStyle = '#f43f5e';
          ctx.fillStyle = '#0f172a';
          ctx.lineWidth = 3;

          // Aerodynamic cyber fuselage capsule
          ctx.beginPath();
          ctx.moveTo(player.width * 0.6, 0);
          ctx.lineTo(-player.width * 0.4, -player.height * 0.3);
          ctx.lineTo(-player.width * 0.5, 0);
          ctx.lineTo(-player.width * 0.4, player.height * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Neon red glowing visor
          ctx.fillStyle = '#fdb3b8';
          ctx.beginPath();
          ctx.moveTo(12, -4);
          ctx.lineTo(24, 0);
          ctx.lineTo(12, 4);
          ctx.closePath();
          ctx.fill();

          // Back rocket exhaust
          ctx.fillStyle = '#ffff33';
          ctx.beginPath();
          ctx.moveTo(-player.width * 0.5, -8);
          ctx.lineTo(-player.width * 0.5 - 28, 0);
          ctx.lineTo(-player.width * 0.5, 8);
          ctx.closePath();
          ctx.fill();
        } else {
          // ---- NORMAL WALKING/JUMPING MODE ----
          // DRAW LEGS (Jointed bones with swinging motion calculations!)
          ctx.restore();
          ctx.save();
          ctx.translate(80 + player.width / 2, player.y + player.height / 2);

          ctx.strokeStyle = '#38bdf8'; // Sky blue neon limbs
          ctx.lineWidth = 4.5;
          ctx.lineCap = 'round';

          // Simple skeletal swings on sine wave
          const swingFront = Math.sin(runCycle) * 16;
          const swingBack = -Math.sin(runCycle) * 16;

          const hOffset = player.height / 2;

          if (player.isGrounded) {
            // Leg Front Leg
            ctx.beginPath();
            ctx.moveTo(0, hOffset * 0.1); // Hip
            ctx.lineTo(swingFront, hOffset * 0.58 + Math.abs(Math.cos(runCycle)) * 4); // Knee
            ctx.lineTo(swingFront * 1.3 + 8, hOffset * 0.95); // Foot
            ctx.stroke();

            // Leg Back Leg
            ctx.beginPath();
            ctx.moveTo(-2, hOffset * 0.1);
            ctx.lineTo(swingBack, hOffset * 0.58 + Math.abs(Math.sin(runCycle)) * 4);
            ctx.lineTo(swingBack * 1.3 - 4, hOffset * 0.95);
            ctx.stroke();
          } else {
            // Legs bent tuck in midair
            ctx.beginPath();
            ctx.moveTo(-3, hOffset * 0.1); // Hip
            ctx.lineTo(-12, hOffset * 0.45); // Knee tucked
            ctx.lineTo(-8, hOffset * 0.72); // Foot
            ctx.stroke();

            // Leg 2 extended
            ctx.beginPath();
            ctx.moveTo(2, hOffset * 0.1);
            ctx.lineTo(8, hOffset * 0.48);
            ctx.lineTo(15, hOffset * 0.85);
            ctx.stroke();
          }

          // TORSO / BODY
          ctx.fillStyle = '#0f172a'; // Carbon fiber armor plating
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.roundRect(-10, -hOffset * 0.65, 20, 35, 6);
          ctx.fill();
          ctx.stroke();

          // Cyber Chest core glowing engine panel
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(0, -hOffset * 0.35, 3.8, 0, Math.PI * 2);
          ctx.fill();

          // SWING HANDS / SWING ARMS
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5;
          if (player.isGrounded) {
            // Front ARM swing opposite of leg
            ctx.beginPath();
            ctx.moveTo(-4, -hOffset * 0.52);
            ctx.lineTo(swingBack * 0.5 + 4, -hOffset * 0.15);
            ctx.lineTo(swingBack * 0.7, hOffset * 0.1);
            ctx.stroke();
          } else {
            // Hands flying behind or floating thrusters
            ctx.beginPath();
            ctx.moveTo(-4, -hOffset * 0.52);
            ctx.lineTo(-18, -hOffset * 0.28);
            ctx.lineTo(-24, -hOffset * 0.05);
            ctx.stroke();
          }

          // CYBER NINJA HELMET HEAD
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          ctx.arc(0, -hOffset * 0.82, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Neon Blue Eye Visor
          ctx.fillStyle = player.isGliding ? '#ec4899' : '#06b6d4';
          ctx.beginPath();
          ctx.ellipse(3, -hOffset * 0.84, 7, 3.2, 0.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw active powerup shields wrapper
        if (player.shieldActive && !player.boostActive) {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 18;
          ctx.shadowColor = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, 0, player.height * 0.7, 0, Math.PI * 2);
          ctx.stroke();

          // Tiny pulsing hex details inside shield
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.lineWidth = 1;
          for (let sAng = 0; sAng < Math.PI * 2; sAng += Math.PI / 3) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(sAng) * player.height * 0.65, Math.sin(sAng) * player.height * 0.65);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Magnet attraction field indicator when magnetActive
        if (player.magnetActive && !player.boostActive) {
          ctx.save();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 75 + Math.sin(frameCount.current * 0.15) * 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }
    }

    // 11. DRAW PARTICLES
    ctx.save();
    particlesRef.current.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      if (pt.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'square') {
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      } else if (pt.shape === 'spark') {
        // Draw starry points
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - pt.size);
        ctx.lineTo(pt.x + pt.size * 0.3, pt.y - pt.size * 0.3);
        ctx.lineTo(pt.x + pt.size, pt.y);
        ctx.lineTo(pt.x + pt.size * 0.3, pt.y + pt.size * 0.3);
        ctx.lineTo(pt.x, pt.y + pt.size);
        ctx.lineTo(pt.x - pt.size * 0.3, pt.y + pt.size * 0.3);
        ctx.lineTo(pt.x - pt.size, pt.y);
        ctx.lineTo(pt.x - pt.size * 0.3, pt.y - pt.size * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.restore();

    // 12. DRAW FLOATING RISING SCORE TEXTS
    ctx.save();
    floatingTextsRef.current.forEach((ft) => {
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px "JetBrains Mono", Courier, monospace';
      ctx.globalAlpha = ft.alpha;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  };

  // Keep resizing consistent: fits high resolution pixel scale dynamically within layout container!
  useEffect(() => {
    let animationId: number;

    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const canvas = canvasRef.current;
      const rect = containerRef.current.getBoundingClientRect();

      // Ensure canvas occupies perfect layout proportions but is internally always rendering 1200x640 design coordinates!
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    window.addEventListener('resize', handleResize);
    // Initial size calculation call
    setTimeout(handleResize, 150);

    const matchGameTickAndRender = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear and update logic
          if (gameState === 'PLAYING') {
            updatePhysics();
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Standard scale of coordinates dynamically from design system VIRTUAL scale to actual window pixels
          ctx.save();
          const scaleX = canvas.width / VIRTUAL_WIDTH;
          const scaleY = canvas.height / VIRTUAL_HEIGHT;
          ctx.scale(scaleX, scaleY);

          drawScene(ctx);

          ctx.restore();
        }
      }
      animationId = requestAnimationFrame(matchGameTickAndRender);
    };

    animationId = requestAnimationFrame(matchGameTickAndRender);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className="relative w-full h-[320px] md:h-[480px] lg:h-[550px] border border-cyan-500/20 rounded-2xl bg-black overflow-hidden shadow-2xl shadow-cyan-950/20 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        id="sky-runner-canvas"
        className="block w-full h-full cursor-pointer touch-none"
      />

      {/* Decorative Swipe indicators on touch devices */}
      <div className="absolute bottom-3 left-4 hidden md:flex items-center gap-3 text-[10px] font-mono text-cyan-400/40 pointer-events-none select-none">
        <span>[SPACE / ↑ / W] JUMP / GLIDE</span>
        <span>[↓ / S] SLIDE / SLAM</span>
      </div>
    </div>
  );
};
