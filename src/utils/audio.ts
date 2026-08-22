// Web Audio API Sound Generator for Dark Gothic Vampire Castle Game

// Distortion curve generator for electric guitar
function makeDistortionCurve(amount = 45): Float32Array {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isBattleBgmActive: boolean = false;
  private activeBgmOscillators: OscillatorNode[] = [];
  private distortionCurve: Float32Array | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /* -------------------------------------------------------------
     ⚔️ 영화 300 스타일 비장한 배틀 록 BGM (25초 루프 엔진)
     - 0초~3초: 비장하고 묵직한 일렉기타 솔로 리프
     - 3초~6초: 묵직한 베이스 기타 합류 (기타 + 베이스)
     - 6초~25초: 폭발적인 드럼(킥, 스네어, 하이햇, 크래시) 합류하여 풀 록 밴드 연주
     - 25초 후: 웨이브 종료 시까지 끊김 없이 반복 루프 (저작권 안전 순수 오리지널 멜로디)
  ------------------------------------------------------------- */
  public playBattleRockBgm() {
    this.init();
    if (!this.ctx) return;

    // Stop existing BGM if running
    this.stopBattleRockBgm();

    this.isBattleBgmActive = true;
    if (!this.distortionCurve) {
      this.distortionCurve = makeDistortionCurve(55);
    }

    // Master BGM Gain
    this.bgmGainNode = this.ctx.createGain();
    this.bgmGainNode.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    this.bgmGainNode.connect(this.ctx.destination);

    const scheduleLoop = (startTime: number) => {
      if (!this.isBattleBgmActive || !this.ctx || !this.bgmGainNode) return;

      this.activeBgmOscillators = [];
      const ctx = this.ctx;
      const master = this.bgmGainNode;
      const distCurve = this.distortionCurve!;

      // 1. Helper: Play Distorted Electric Guitar Note / Power Chord
      const playGuitarNote = (time: number, freq: number, duration: number, gainVal = 0.22) => {
        if (!this.isBattleBgmActive) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const shaper = ctx.createWaveShaper();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq * 1.003, time); // slight detune for thick chorus

        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(freq * 0.5, time); // 1 octave down body

        shaper.curve = distCurve as unknown as Float32Array<ArrayBuffer>;
        shaper.oversample = '2x';

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.Q.setValueAtTime(1.8, time);

        noteGain.gain.setValueAtTime(0.001, time);
        noteGain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
        noteGain.gain.setValueAtTime(gainVal * 0.85, time + duration * 0.7);
        noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(shaper);
        osc2.connect(shaper);
        subOsc.connect(filter);
        shaper.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(master);

        osc1.start(time);
        osc2.start(time);
        subOsc.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
        subOsc.stop(time + duration);

        this.activeBgmOscillators.push(osc1, osc2, subOsc);
      };

      // 2. Helper: Play Punchy Bass Guitar Note
      const playBassNote = (time: number, freq: number, duration: number, gainVal = 0.35) => {
        if (!this.isBattleBgmActive) return;
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, time);
        filter.Q.setValueAtTime(2.5, time);

        bassGain.gain.setValueAtTime(0.001, time);
        bassGain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(master);

        osc.start(time);
        sub.start(time);
        osc.stop(time + duration);
        sub.stop(time + duration);

        this.activeBgmOscillators.push(osc, sub);
      };

      // 3. Helper: Rock Drum - Kick
      const playKick = (time: number) => {
        if (!this.isBattleBgmActive) return;
        const osc = ctx.createOscillator();
        const kickGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

        kickGain.gain.setValueAtTime(0.65, time);
        kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(kickGain);
        kickGain.connect(master);

        osc.start(time);
        osc.stop(time + 0.22);
        this.activeBgmOscillators.push(osc);
      };

      // 4. Helper: Rock Drum - Snare
      const playSnare = (time: number) => {
        if (!this.isBattleBgmActive) return;
        // Noise component
        const bufferSize = ctx.sampleRate * 0.18;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(900, time);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(master);

        // Body tone component
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.12);

        oscGain.gain.setValueAtTime(0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.connect(oscGain);
        oscGain.connect(master);

        noise.start(time);
        osc.start(time);
        noise.stop(time + 0.18);
        osc.stop(time + 0.18);
      };

      // 5. Helper: Rock Drum - HiHat
      const playHiHat = (time: number, isAccented = false) => {
        if (!this.isBattleBgmActive) return;
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(8500, time);

        const gain = ctx.createGain();
        const vol = isAccented ? 0.22 : 0.12;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        source.start(time);
        source.stop(time + 0.05);
      };

      // 6. Helper: Rock Drum - Crash Cymbal
      const playCrash = (time: number) => {
        if (!this.isBattleBgmActive) return;
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4500, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.4);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        source.start(time);
        source.stop(time + 1.4);
      };

      // Note frequency definitions (E Phrygian / Spartan war scale)
      const E2 = 82.41;
      const F2 = 87.31;
      const G2 = 97.99;
      const A2 = 110.00;
      const Bb2 = 116.54;
      const B2 = 123.47;
      const C3 = 130.81;
      const D3 = 146.83;
      const E3 = 164.81;
      const G3 = 195.99;

      const E1 = 41.20;
      const F1 = 43.65;
      const G1 = 48.99;
      const A1 = 55.00;
      const Bb1 = 58.27;
      const B1 = 61.74;
      const C2 = 65.41;
      const D2 = 73.42;

      /* ============================================================
         PHASE 1: 0.0s ~ 3.0s (Solemn Distorted Electric Guitar Solo)
      ============================================================ */
      // 0.0s ~ 1.0s: Heavy E Chug & Gallop
      playGuitarNote(startTime + 0.0, E2, 0.45, 0.28);
      playGuitarNote(startTime + 0.5, E2, 0.22, 0.24);
      playGuitarNote(startTime + 0.75, G2, 0.22, 0.26);

      // 1.0s ~ 2.0s: F2 -> E2 Drop
      playGuitarNote(startTime + 1.0, F2, 0.45, 0.26);
      playGuitarNote(startTime + 1.5, E2, 0.22, 0.24);
      playGuitarNote(startTime + 1.75, D3 * 0.5, 0.22, 0.24);

      // 2.0s ~ 3.0s: E2 -> Bb2 War Tension
      playGuitarNote(startTime + 2.0, E2, 0.45, 0.28);
      playGuitarNote(startTime + 2.5, G2, 0.22, 0.26);
      playGuitarNote(startTime + 2.75, A2, 0.22, 0.26);

      /* ============================================================
         PHASE 2: 3.0s ~ 6.0s (Bass Guitar Joins the Electric Guitar)
      ============================================================ */
      // 3.0s ~ 4.0s: Bb2 -> A2 with Driving Bass
      playGuitarNote(startTime + 3.0, Bb2, 0.45, 0.30);
      playBassNote(startTime + 3.0, Bb1, 0.45, 0.38);

      playGuitarNote(startTime + 3.5, A2, 0.45, 0.28);
      playBassNote(startTime + 3.5, A1, 0.45, 0.38);

      // 4.0s ~ 5.0s: G2 -> F2
      playGuitarNote(startTime + 4.0, G2, 0.45, 0.28);
      playBassNote(startTime + 4.0, G1, 0.45, 0.38);

      playGuitarNote(startTime + 4.5, F2, 0.45, 0.28);
      playBassNote(startTime + 4.5, F1, 0.45, 0.38);

      // 5.0s ~ 6.0s: E2 Riff Build-up (Rapid 16th gallop pulse)
      playGuitarNote(startTime + 5.0, E2, 0.22, 0.30);
      playBassNote(startTime + 5.0, E1, 0.22, 0.40);

      playGuitarNote(startTime + 5.25, E2, 0.22, 0.28);
      playBassNote(startTime + 5.25, E1, 0.22, 0.38);

      playGuitarNote(startTime + 5.5, G2, 0.22, 0.30);
      playBassNote(startTime + 5.5, G1, 0.22, 0.40);

      playGuitarNote(startTime + 5.75, Bb2, 0.22, 0.32);
      playBassNote(startTime + 5.75, Bb1, 0.22, 0.42);

      /* ============================================================
         PHASE 3: 6.0s ~ 25.0s (Heavy Rock Drums Enter: Full Band Anthem!)
      ============================================================ */
      // 6.0s Explosive Entrance Crash!
      playCrash(startTime + 6.0);

      // War Theme Measures (6.0s to 25.0s = 19 seconds of driving battle metal)
      const riffBars = [
        // Bar 1 (6.0s ~ 8.0s): Main War Riff (E -> G -> F -> E)
        { gNotes: [E2, E2, G2, F2, E2], bNotes: [E1, E1, G1, F1, E1], start: 6.0 },
        // Bar 2 (8.0s ~ 10.0s): Heroic Ascending (E -> Bb -> A -> G -> F)
        { gNotes: [E2, Bb2, A2, G2, F2], bNotes: [E1, Bb1, A1, G1, F1], start: 8.0 },
        // Bar 3 (10.0s ~ 12.0s): Spartan Power (B2 -> C3 -> B2 -> A2 -> G2)
        { gNotes: [B2, C3, B2, A2, G2], bNotes: [B1, C2, B1, A1, G1], start: 10.0 },
        // Bar 4 (12.0s ~ 14.0s): War March Gallop (E2 -> G2 -> Bb2 -> A2 -> E2)
        { gNotes: [E2, G2, Bb2, A2, E2], bNotes: [E1, G1, Bb1, A1, E1], start: 12.0 },
        // Bar 5 (14.0s ~ 16.0s): High Tension Lead (E3 -> D3 -> C3 -> B2 -> Bb2)
        { gNotes: [E3, D3, C3, B2, Bb2], bNotes: [E1, D2, C2, B1, Bb1], start: 14.0 },
        // Bar 6 (16.0s ~ 18.0s): Heroic Surge (G3 -> E3 -> D3 -> Bb2 -> A2)
        { gNotes: [G3, E3, D3, Bb2, A2], bNotes: [G1, E1, D2, Bb1, A1], start: 16.0 },
        // Bar 7 (18.0s ~ 20.0s): Heavy Heavy Chugging (E2 -> E2 -> F2 -> E2 -> G2)
        { gNotes: [E2, E2, F2, E2, G2], bNotes: [E1, E1, F1, E1, G1], start: 18.0 },
        // Bar 8 (20.0s ~ 22.0s): Resolving Cadence (Bb2 -> A2 -> G2 -> F2 -> E2)
        { gNotes: [Bb2, A2, G2, F2, E2], bNotes: [Bb1, A1, G1, F1, E1], start: 20.0 },
        // Bar 9 (22.0s ~ 25.0s): Grand Finale / Loop turnaround (E2 -> G2 -> Bb2 -> E2 power hold)
        { gNotes: [E2, G2, Bb2, F2, E2], bNotes: [E1, G1, Bb1, F1, E1], start: 22.0 },
      ];

      riffBars.forEach((bar, bIdx) => {
        const t = startTime + bar.start;

        // Crash accents on major section changes
        if (bIdx === 2 || bIdx === 4 || bIdx === 6 || bIdx === 8) {
          playCrash(t);
        }

        // Drum Beats: Driving Rock Pattern (Kick on 1 & 3, Snare on 2 & 4, 8th-note Hi-Hats)
        for (let beat = 0; beat < 4; beat++) {
          const beatTime = t + beat * 0.5;
          if (beatTime >= startTime + 25.0) break;

          // Hi-Hats on every 8th note (beat and off-beat)
          playHiHat(beatTime, beat === 0);
          playHiHat(beatTime + 0.25, false);

          // Kick Drum on beat 0 and beat 2 (with double kick roll on beat 2.5)
          if (beat === 0 || beat === 2) {
            playKick(beatTime);
            if (bIdx % 2 === 1 && beat === 2) {
              playKick(beatTime + 0.25); // Gallop kick
            }
          }

          // Snare Drum on beat 1 and beat 3
          if (beat === 1 || beat === 3) {
            playSnare(beatTime);
          }
        }

        // Guitar & Bass notes for this bar
        bar.gNotes.forEach((gFreq, nIdx) => {
          const nTime = t + nIdx * 0.38;
          if (nTime >= startTime + 25.0) return;
          const bFreq = bar.bNotes[nIdx] || bar.bNotes[0];

          playGuitarNote(nTime, gFreq, 0.35, 0.30);
          playBassNote(nTime, bFreq, 0.35, 0.40);
        });
      });

      // Schedule next 25-second loop exactly at 25.0s
      if (this.isBattleBgmActive) {
        this.bgmTimeoutId = setTimeout(() => {
          scheduleLoop(startTime + 25.0);
        }, 24800);
      }
    };

    // Begin the first cycle at current AudioContext time + 0.05s
    scheduleLoop(this.ctx.currentTime + 0.05);
  }

  public stopBattleRockBgm() {
    this.isBattleBgmActive = false;
    if (this.bgmTimeoutId) {
      clearTimeout(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }

    if (this.bgmGainNode && this.ctx) {
      try {
        this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, this.ctx.currentTime);
        this.bgmGainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      } catch {
        // Gain ramp fallback
      }
    }

    this.activeBgmOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Node already stopped
      }
    });
    this.activeBgmOscillators = [];
  }

  public playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playBloodDrain() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Pitch dropping bubbling sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playTrapTrigger() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.setValueAtTime(600, this.ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playBattleClash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playVictory() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }

  public playDefeat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [392.00, 329.63, 261.63, 196.00]; // G E C G (descending minor)
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.25, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.4);
    });
  }

  public playAttackSlash() {
    this.playBattleClash();
  }

  public playHeroCry() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  public playLordEmpower() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [300, 450, 600, 900].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  public playRansomGold() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }
}

export const soundFx = new SoundController();

