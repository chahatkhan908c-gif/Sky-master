/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface HighScore {
  score: number;
  coins: number;
  distance: number;
  date: string;
}

export type PowerUpType = 'SHIELD' | 'MAGNET' | 'BOOST';

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  collected: boolean;
  pulseTimer: number;
}

export interface Player {
  y: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  jumpCount: number;
  isSliding: boolean;
  slideTimer: number;
  isGliding: boolean;
  shieldActive: boolean;
  magnetActive: boolean;
  magnetTimer: number;
  boostActive: boolean;
  boostTimer: number;
  rotation: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'SPIKE' | 'LASER_BARRIER' | 'DRONE';
  speedFactor: number;
  animationFrame: number;
  passed: boolean;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  value: number;
  rotation: number;
  isPowerCoin?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  shape: 'circle' | 'square' | 'spark';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

export interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  blinkSpeed: number;
  alpha: number;
}
