/**
 * Linear / Raycast-Grade Audio Synthesizer (Web Audio API)
 * Generates pure harmonic audio chimes for verification success, failures,
 * self-healing patch applications, and micro-haptic ticks.
 * Zero external audio files required.
 */

export interface SoundSynthesizerOptions {
  masterVolume?: number; // 0.0 - 1.0
  muted?: boolean;
}

export class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private masterVolume: number;
  private isMuted: boolean;

  constructor(options?: SoundSynthesizerOptions) {
    this.masterVolume = options?.masterVolume ?? 0.35;
    this.isMuted = options?.muted ?? false;

    // Check localStorage in browser environments
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('proofix_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    }
  }

  /**
   * Lazily initializes the browser AudioContext on first user interaction.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Toggles mute state and persists to localStorage.
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('proofix_audio_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a pristine, elegant harmonic major triad (C6 + E6 + G6)
   * on verification success (Linear/Raycast style).
   */
  public playSuccessChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [1046.5, 1318.51, 1567.98]; // C6, E6, G6
    const duration = 0.55;

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      // Smooth envelope with exponential decay
      const peakGain = (this.masterVolume * 0.22) / (idx + 1);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + duration);
    });
  }

  /**
   * Plays a subtle, gentle descending warning chord (F4 -> Db4) on failure.
   */
  public playFailureChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [349.23, 277.18]; // F4, Db4
    const duration = 0.45;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      const peakGain = this.masterVolume * 0.2;
      gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + duration);
    });
  }

  /**
   * Plays an ascending "magic" arpeggio (E5 -> G#5 -> B5 -> E6)
   * on self-healing patch application.
   */
  public playSelfHealChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const arpeggio = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    const step = 0.06;
    const noteDuration = 0.35;

    arpeggio.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * step);

      const peakGain = this.masterVolume * 0.25;
      gain.gain.setValueAtTime(0.0001, now + idx * step);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + idx * step + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * step + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * step);
      osc.stop(now + idx * step + noteDuration);
    });
  }

  /**
   * Plays a crisp, subtle mechanical click tick for interactive buttons/timeline scrub.
   */
  public playClickTick(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);

    gain.gain.setValueAtTime(this.masterVolume * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  }
}

export const globalSoundSynthesizer = new SoundSynthesizer();
