/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMutedState: boolean = false;
  private beatInterval: number | null = null;
  private beatStep: number = 0;
  private musicPlaying: boolean = false;

  constructor() {
    // Initialized lazily on first user interaction
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn('Web Audio API not supported in this browser:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(muted: boolean) {
    this.isMutedState = muted;
    if (muted) {
      this.stopBeat();
    } else if (this.musicPlaying) {
      this.startBeat();
    }
  }

  get isMuted() {
    return this.isMutedState;
  }

  playJump() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playDoubleJump() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
  }

  playCoin() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    // Dual-tone classic digital bell chime
    const playChime = (freq: number, delay: number, dur: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + dur);
    };

    playChime(880, 0, 0.08);
    playChime(1320, 0.04, 0.12);
  }

  playSlide() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    // Soft friction swoosh noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
  }

  playPowerUp() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    // Uplifting arpeggio sound
    const playTone = (freq: number, delay: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.15);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.16);
    };

    playTone(261.63, 0); // C
    playTone(329.63, 0.06); // E
    playTone(392.00, 0.12); // G
    playTone(523.25, 0.18); // High C
  }

  playCrash() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    // Dynamic explosion/crunch sound
    const osc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();

    osc.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.45);

    noiseGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.55);

    // Also a low vibration
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, this.ctx.currentTime);
    subOsc.frequency.linearRampToValueAtTime(10, this.ctx.currentTime + 0.6);
    subGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.61);
    subOsc.start();
    subOsc.stop(this.ctx.currentTime + 0.65);
  }

  playShieldLost() {
    this.init();
    this.resume();
    if (this.isMutedState || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }

  startMusic() {
    this.musicPlaying = true;
    this.startBeat();
  }

  stopMusic() {
    this.musicPlaying = false;
    this.stopBeat();
  }

  private startBeat() {
    this.init();
    this.resume();
    if (this.beatInterval) return;
    if (this.isMutedState || !this.ctx) return;

    // Simple bass beat synthesizer looped (retro synthwave beat)
    const notes = [110, 110, 146.83, 110, 110, 110, 164.81, 110]; // Retro bass loop (A2, A2, D3, A2, A2, A2, E3, A2)

    this.beatInterval = window.setInterval(() => {
      if (!this.ctx || this.isMutedState) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      const noteFreq = notes[this.beatStep % notes.length];
      osc.frequency.setValueAtTime(noteFreq, this.ctx.currentTime);

      // Slap sound trigger with a tiny short pitch decay for a kick feel
      osc.frequency.exponentialRampToValueAtTime(noteFreq / 2, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.19);

      // Hi-hat sound on offbeats (even steps)
      if (this.beatStep % 2 === 1) {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();

        hatOsc.connect(hatGain);
        hatGain.connect(this.ctx.destination);

        // High frequency white noise proxy
        hatOsc.type = 'triangle';
        hatOsc.frequency.setValueAtTime(10000, this.ctx.currentTime);

        hatGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        hatGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        hatOsc.start();
        hatOsc.stop(this.ctx.currentTime + 0.05);
      }

      this.beatStep++;
    }, 220); // ~136 BPM
  }

  private stopBeat() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }
}

export const sound = new SoundEngine();
