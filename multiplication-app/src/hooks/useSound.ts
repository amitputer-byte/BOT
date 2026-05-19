import { useCallback, useRef } from 'react';
import { Howl } from 'howler';
import { useSettingsStore } from '../store/settingsStore';

// We generate simple tones using Web Audio API as fallback since we don't have audio files
// The Howl instances will be created with inline data URIs for simple beep sounds

// Base64-encoded minimal WAV files (short beeps at different frequencies)
// These are very short single-frequency tones generated procedurally

function createBeepDataUri(frequency: number, duration: number, type: OscillatorType = 'sine'): string {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, Math.min(t * 20, (duration - t) * 20));
    let sample = 0;

    if (type === 'square') {
      sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
    } else if (type === 'triangle') {
      sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
    } else {
      sample = Math.sin(2 * Math.PI * frequency * t);
    }

    view.setInt16(44 + i * 2, sample * envelope * 16000, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// ── Ambient melody ─────────────────────────────────────────────────────────────
// C-E-G-E pattern at 120bpm (each beat = 500ms)
// Generates a looping 4-beat melody as a WAV

function createAmbientMelodyDataUri(volume = 0.18): string {
  const sampleRate = 44100;
  // C4=261.63, E4=329.63, G4=392.00
  const notes = [261.63, 329.63, 392.0, 329.63];
  const beatDuration = 0.5; // 120bpm
  const totalDuration = notes.length * beatDuration;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.min(Math.floor(t / beatDuration), notes.length - 1);
    const freq = notes[noteIndex];
    const noteT = t - noteIndex * beatDuration;
    // Soft envelope: attack 30ms, decay to 0.6 at 100ms, release last 80ms
    const attack = 0.03;
    const release = 0.08;
    let env = 1;
    if (noteT < attack) {
      env = noteT / attack;
    } else if (noteT > beatDuration - release) {
      env = (beatDuration - noteT) / release;
    }
    env = Math.max(0, Math.min(1, env)) * 0.6;
    const sample = Math.sin(2 * Math.PI * freq * t) * env * volume;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Create sounds lazily
const soundCache: Record<string, Howl> = {};

function getSound(key: string, factory: () => Howl): Howl {
  if (!soundCache[key]) {
    soundCache[key] = factory();
  }
  return soundCache[key];
}

// Singleton ambient Howl instance
let ambientHowl: Howl | null = null;

export function useSound() {
  const { soundEnabled, musicEnabled, volume } = useSettingsStore();
  const initialized = useRef(false);

  // Pre-generate data URIs once
  if (!initialized.current) {
    initialized.current = true;
  }

  const playSound = useCallback(
    (key: string, factory: () => Howl) => {
      if (!soundEnabled) return;
      try {
        const howl = getSound(key, factory);
        howl.volume(volume);
        howl.play();
      } catch {
        // Silent fail if audio not available
      }
    },
    [soundEnabled, volume]
  );

  const playCorrect = useCallback(() => {
    playSound('correct', () =>
      new Howl({
        src: [createBeepDataUri(523, 0.15), createBeepDataUri(659, 0.15)],
        format: ['wav'],
      })
    );
    // Play a happy ascending arpeggio: C5 -> E5 -> G5
    if (!soundEnabled) return;
    try {
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const howl = new Howl({
            src: [createBeepDataUri(freq, 0.12)],
            format: ['wav'],
            volume,
          });
          howl.play();
        }, i * 80);
      });
    } catch {
      // Silent fail
    }
  }, [soundEnabled, volume, playSound]);

  const playWrong = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const howl = new Howl({
        src: [createBeepDataUri(200, 0.3, 'square')],
        format: ['wav'],
        volume,
      });
      howl.play();
    } catch {
      // Silent fail
    }
  }, [soundEnabled, volume]);

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const howl = new Howl({
        src: [createBeepDataUri(440, 0.05)],
        format: ['wav'],
        volume: volume * 0.5,
      });
      howl.play();
    } catch {
      // Silent fail
    }
  }, [soundEnabled, volume]);

  const playStreak = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const howl = new Howl({
            src: [createBeepDataUri(freq, 0.1)],
            format: ['wav'],
            volume,
          });
          howl.play();
        }, i * 60);
      });
    } catch {
      // Silent fail
    }
  }, [soundEnabled, volume]);

  const playLevelUp = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const howl = new Howl({
            src: [createBeepDataUri(freq, 0.15)],
            format: ['wav'],
            volume,
          });
          howl.play();
        }, i * 100);
      });
    } catch {
      // Silent fail
    }
  }, [soundEnabled, volume]);

  const playAmbient = useCallback(() => {
    if (!musicEnabled) return;
    try {
      if (!ambientHowl) {
        ambientHowl = new Howl({
          src: [createAmbientMelodyDataUri()],
          format: ['wav'],
          loop: true,
          volume: volume * 0.3,
        });
      } else {
        ambientHowl.volume(volume * 0.3);
      }
      if (!ambientHowl.playing()) {
        ambientHowl.play();
      }
    } catch {
      // Silent fail
    }
  }, [musicEnabled, volume]);

  const stopAmbient = useCallback(() => {
    try {
      if (ambientHowl && ambientHowl.playing()) {
        ambientHowl.fade(ambientHowl.volume() as number, 0, 800);
        setTimeout(() => {
          ambientHowl?.stop();
        }, 800);
      }
    } catch {
      // Silent fail
    }
  }, []);

  return { playCorrect, playWrong, playClick, playStreak, playLevelUp, playAmbient, stopAmbient };
}
