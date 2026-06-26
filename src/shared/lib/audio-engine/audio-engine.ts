import type { AudioStatus } from './types.ts';

// Interface for tracking an active playback channel
interface AudioChannel {
  id: number; // soundId or soundPieceId
  ctx: AudioContext;
  gainNode: GainNode;
  nodes: AudioNode[]; // keeping track of active oscillators, noise sources, filters, etc.
  intervalId?: NodeJS.Timeout;
  startTime: number; // in AudioContext time
  pausedTime: number; // in seconds
  duration: number; // virtual duration in seconds
  currentTime: number; // current virtual playhead in seconds
  state: AudioStatus;
  onUpdate: (currentTime: number, duration: number, state: AudioStatus) => void;
  // Custom synth parameters
  synthType: string;
}

class AudioEngine {
  private channels: Map<number, AudioChannel> = new Map();
  private pieceChannel: AudioChannel | null = null;
  private masterContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.masterContext) {
      // @ts-ignore - support older browsers if any
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.masterContext = new AudioCtx();
    }
    if (this.masterContext.state === 'suspended') {
      this.masterContext.resume();
    }
    return this.masterContext;
  }

  // Get virtual duration for a sound
  private getSoundDuration(id: number): number {
    if (id >= 100) return 120; // Obras are 2 minutes
    return 30; // Individual sounds are 30 seconds
  }

  // Map soundIds to synthesis types
  private getSynthType(id: number): string {
    switch (id) {
      // Coquimbo
      case 11:
        return 'muelle';
      case 12:
        return 'gaviotas';
      case 13:
        return 'pregon_coquimbo';
      case 14:
        return 'tren';
      case 15:
        return 'campana_presbiteriana';
      // La Serena
      case 21:
        return 'campana_catedral';
      case 22:
        return 'murmullo_plaza';
      case 23:
        return 'pajaros';
      case 24:
        return 'lustrabotas';
      case 25:
        return 'pregon_dia';
      // Humedal
      case 31:
        return 'olas';
      case 32:
        return 'aves_humedal';
      case 33:
        return 'viento_totorales';
      case 34:
        return 'ranas';
      case 35:
        return 'rio';
      // Obras
      case 101:
        return 'obra_coquimbo';
      case 102:
        return 'obra_serena';
      case 103:
        return 'obra_elqui';
      default:
        return 'ambiente';
    }
  }

  public playSound(
    soundId: number,
    onUpdate: (curr: number, dur: number, state: AudioStatus) => void
  ) {
    // If a sound piece is currently playing, we don't play individual sounds
    if (this.pieceChannel && this.pieceChannel.state === 'playing') {
      console.warn(
        'Cannot play individual sounds while a Sound Piece is playing'
      );
      return;
    }

    const ctx = this.getAudioContext();
    let chan = this.channels.get(soundId);

    if (chan) {
      if (chan.state === 'playing') {
        this.pauseSound(soundId);
        return;
      }
      // Re-activate
      ctx.resume();
      chan.state = 'playing';
      chan.startTime = ctx.currentTime - chan.pausedTime;
      this.startSynthNode(chan);
      this.startInterval(chan);
      chan.onUpdate = onUpdate;
      chan.onUpdate(chan.currentTime, chan.duration, chan.state);
      return;
    }

    // Create new channel
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5); // smooth fade in

    chan = {
      id: soundId,
      ctx,
      gainNode,
      nodes: [],
      startTime: ctx.currentTime,
      pausedTime: 0,
      duration: this.getSoundDuration(soundId),
      currentTime: 0,
      state: 'playing',
      onUpdate,
      synthType: this.getSynthType(soundId)
    };

    this.channels.set(soundId, chan);
    this.startSynthNode(chan);
    this.startInterval(chan);
    chan.onUpdate(chan.currentTime, chan.duration, chan.state);
  }

  public pauseSound(soundId: number) {
    const chan = this.channels.get(soundId);
    if (!chan || chan.state !== 'playing') return;

    chan.state = 'paused';
    this.stopSynthNodes(chan);
    if (chan.intervalId) clearInterval(chan.intervalId);
    chan.pausedTime = chan.ctx.currentTime - chan.startTime;
    chan.currentTime = chan.pausedTime % chan.duration;
    chan.onUpdate(chan.currentTime, chan.duration, chan.state);
  }

  public seekSound(soundId: number, targetTime: number) {
    const chan = this.channels.get(soundId);
    if (!chan) return;

    chan.currentTime = Math.max(0, Math.min(chan.duration - 0.1, targetTime));
    chan.pausedTime = chan.currentTime;

    if (chan.state === 'playing') {
      this.stopSynthNodes(chan);
      chan.startTime = chan.ctx.currentTime - chan.pausedTime;
      this.startSynthNode(chan);
    }
    chan.onUpdate(chan.currentTime, chan.duration, chan.state);
  }

  public stopSound(soundId: number) {
    const chan = this.channels.get(soundId);
    if (!chan) return;

    chan.state = 'idle';
    this.stopSynthNodes(chan);
    if (chan.intervalId) clearInterval(chan.intervalId);
    this.channels.delete(soundId);
    chan.onUpdate(0, chan.duration, 'idle');
  }

  public stopAllSounds() {
    Array.from(this.channels.keys()).forEach((id) => {
      this.stopSound(id);
    });
  }

  public playPiece(
    pieceId: number,
    onUpdate: (curr: number, dur: number, state: AudioStatus) => void
  ) {
    // 1. Stop all individual sounds (Requirement: SoundPiece priority > Individual sounds)
    this.stopAllSounds();

    const ctx = this.getAudioContext();

    if (this.pieceChannel && this.pieceChannel.id === pieceId) {
      if (this.pieceChannel.state === 'playing') {
        this.pausePiece();
        return;
      }
      // Re-activate
      this.pieceChannel.state = 'playing';
      this.pieceChannel.startTime =
        ctx.currentTime - this.pieceChannel.pausedTime;
      this.startSynthNode(this.pieceChannel);
      this.startInterval(this.pieceChannel);
      this.pieceChannel.onUpdate = onUpdate;
      this.pieceChannel.onUpdate(
        this.pieceChannel.currentTime,
        this.pieceChannel.duration,
        this.pieceChannel.state
      );
      return;
    }

    // Stop current piece if any
    if (this.pieceChannel) {
      this.stopPiece();
    }

    // Create new piece channel
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 1.0); // slow elegant fade in

    this.pieceChannel = {
      id: pieceId,
      ctx,
      gainNode,
      nodes: [],
      startTime: ctx.currentTime,
      pausedTime: 0,
      duration: this.getSoundDuration(pieceId),
      currentTime: 0,
      state: 'playing',
      onUpdate,
      synthType: this.getSynthType(pieceId)
    };

    this.startSynthNode(this.pieceChannel);
    this.startInterval(this.pieceChannel);
    this.pieceChannel.onUpdate(
      this.pieceChannel.currentTime,
      this.pieceChannel.duration,
      this.pieceChannel.state
    );
  }

  public pausePiece() {
    if (!this.pieceChannel || this.pieceChannel.state !== 'playing') return;

    this.pieceChannel.state = 'paused';
    this.stopSynthNodes(this.pieceChannel);
    if (this.pieceChannel.intervalId)
      clearInterval(this.pieceChannel.intervalId);
    this.pieceChannel.pausedTime =
      this.pieceChannel.ctx.currentTime - this.pieceChannel.startTime;
    this.pieceChannel.currentTime =
      this.pieceChannel.pausedTime % this.pieceChannel.duration;
    this.pieceChannel.onUpdate(
      this.pieceChannel.currentTime,
      this.pieceChannel.duration,
      this.pieceChannel.state
    );
  }

  public seekPiece(targetTime: number) {
    if (!this.pieceChannel) return;

    this.pieceChannel.currentTime = Math.max(
      0,
      Math.min(this.pieceChannel.duration - 0.1, targetTime)
    );
    this.pieceChannel.pausedTime = this.pieceChannel.currentTime;

    if (this.pieceChannel.state === 'playing') {
      this.stopSynthNodes(this.pieceChannel);
      this.pieceChannel.startTime =
        this.pieceChannel.ctx.currentTime - this.pieceChannel.pausedTime;
      this.startSynthNode(this.pieceChannel);
    }
    this.pieceChannel.onUpdate(
      this.pieceChannel.currentTime,
      this.pieceChannel.duration,
      this.pieceChannel.state
    );
  }

  public stopPiece() {
    if (!this.pieceChannel) return;

    this.pieceChannel.state = 'idle';
    this.stopSynthNodes(this.pieceChannel);
    if (this.pieceChannel.intervalId)
      clearInterval(this.pieceChannel.intervalId);
    const oldUpdate = this.pieceChannel.onUpdate;
    const oldDur = this.pieceChannel.duration;
    this.pieceChannel = null;
    oldUpdate(0, oldDur, 'idle');
  }

  public getActiveChannel(id: number) {
    if (this.pieceChannel && this.pieceChannel.id === id)
      return this.pieceChannel;
    return this.channels.get(id) || null;
  }

  private startInterval(chan: AudioChannel) {
    if (chan.intervalId) clearInterval(chan.intervalId);
    chan.intervalId = setInterval(() => {
      if (chan.state !== 'playing') return;
      const elapsed = chan.ctx.currentTime - chan.startTime;
      chan.currentTime = elapsed;

      // Loop condition
      if (chan.currentTime >= chan.duration) {
        if (chan.id >= 100) {
          // Obras don't auto-loop, they stop
          this.stopPiece();
        } else {
          // Individual sounds loop
          chan.startTime = chan.ctx.currentTime;
          chan.currentTime = 0;
          this.stopSynthNodes(chan);
          this.startSynthNode(chan);
        }
      } else {
        chan.onUpdate(chan.currentTime, chan.duration, chan.state);
      }
    }, 100);
  }

  private stopSynthNodes(chan: AudioChannel) {
    chan.gainNode.gain.setValueAtTime(
      chan.gainNode.gain.value,
      chan.ctx.currentTime
    );
    chan.gainNode.gain.linearRampToValueAtTime(
      0.001,
      chan.ctx.currentTime + 0.3
    ); // quick clean fade out

    setTimeout(() => {
      chan.nodes.forEach((node) => {
        try {
          node.stop?.();
        } catch (e) {
          console.log(e);
        }
        try {
          node.disconnect();
        } catch (e) {
          console.log(e);
        }
      });
      chan.nodes = [];
    }, 350);
  }

  // --- Procedural Synthesis Engine ---
  private startSynthNode(chan: AudioChannel) {
    const { ctx, gainNode, synthType } = chan;
    chan.nodes = [];

    // Reset gain level
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      chan.id >= 100 ? 0.6 : 0.4,
      ctx.currentTime + 0.5
    );

    switch (synthType) {
      // 1. Wood Creaking (Muelle de Madera)
      case 'muelle': {
        const createCreak = (delay: number) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(80, ctx.currentTime + delay);

          lfo.frequency.setValueAtTime(12, ctx.currentTime + delay); // vibrating frequency for wood friction
          lfoGain.gain.setValueAtTime(40, ctx.currentTime + delay);

          filter.type = 'bandpass';
          filter.Q.setValueAtTime(10, ctx.currentTime + delay);
          filter.frequency.setValueAtTime(200, ctx.currentTime + delay);

          // Connect LFO to filter frequency
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          osc.connect(filter);
          filter.connect(gainNode);

          osc.start(ctx.currentTime + delay);
          lfo.start(ctx.currentTime + delay);

          // envelope for creak
          osc.frequency.exponentialRampToValueAtTime(
            120,
            ctx.currentTime + delay + 1.2
          );

          chan.nodes.push(osc, lfo, lfoGain, filter);
        };

        // Trigger periodic creaks
        createCreak(0);
        createCreak(4);
        createCreak(8);
        createCreak(12);
        createCreak(16);
        createCreak(20);
        createCreak(24);
        createCreak(28);
        break;
      }

      // 2. Seagulls (Gaviotas)
      case 'gaviotas': {
        const createGullCry = (time: number, pitch: number) => {
          const osc = ctx.createOscillator();
          const ampEnv = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(pitch, ctx.currentTime + time);
          // Gull pitch sweeps up then down sharply
          osc.frequency.exponentialRampToValueAtTime(
            pitch * 2.2,
            ctx.currentTime + time + 0.15
          );
          osc.frequency.exponentialRampToValueAtTime(
            pitch * 0.8,
            ctx.currentTime + time + 0.4
          );

          ampEnv.gain.setValueAtTime(0.001, ctx.currentTime + time);
          ampEnv.gain.linearRampToValueAtTime(
            0.3,
            ctx.currentTime + time + 0.08
          );
          ampEnv.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 0.4
          );

          osc.connect(ampEnv);
          ampEnv.connect(gainNode);

          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.45);

          chan.nodes.push(osc, ampEnv);
        };

        // Schedule periodic gull cries
        const intervals = [
          0.5, 1.0, 3.8, 4.3, 7.0, 11.2, 11.8, 15.0, 19.5, 20.1, 23.0, 26.5
        ];
        intervals.forEach((t, index) => {
          createGullCry(t, index % 2 === 0 ? 800 : 950);
        });
        break;
      }

      // 3. Train whistle & rumble (Tren)
      case 'tren': {
        // Dissonant minor chord for port freight train horn
        const frequencies = [311.13, 370.01, 440.0, 466.16]; // Eb minor/diminished chord

        // Rumble noise (bandpass filtered brown noise)
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02; // brownian noise approximation
          lastOut = output[i];
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(100, ctx.currentTime);
        noiseFilter.Q.setValueAtTime(2, ctx.currentTime);

        const noiseLFO = ctx.createOscillator();
        noiseLFO.frequency.setValueAtTime(4, ctx.currentTime); // traqueteo speed
        const noiseLFOGain = ctx.createGain();
        noiseLFOGain.gain.setValueAtTime(0.15, ctx.currentTime);

        noiseLFO.connect(noiseLFOGain);
        // Traqueteo amplitude modulation
        const rumbleAmp = ctx.createGain();
        rumbleAmp.gain.setValueAtTime(0.2, ctx.currentTime);
        noiseLFOGain.connect(rumbleAmp.gain);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(rumbleAmp);
        rumbleAmp.connect(gainNode);

        noiseNode.start(ctx.currentTime);
        noiseLFO.start(ctx.currentTime);

        chan.nodes.push(
          noiseNode,
          noiseFilter,
          noiseLFO,
          noiseLFOGain,
          rumbleAmp
        );

        // Schedule train horns
        const scheduleHorn = (startTime: number, duration: number) => {
          frequencies.forEach((freq) => {
            const osc = ctx.createOscillator();
            const hornEnv = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

            // Filter to make it sound muffled/distant
            const hornFilter = ctx.createBiquadFilter();
            hornFilter.type = 'lowpass';
            hornFilter.frequency.setValueAtTime(
              800,
              ctx.currentTime + startTime
            );

            hornEnv.gain.setValueAtTime(0.001, ctx.currentTime + startTime);
            hornEnv.gain.linearRampToValueAtTime(
              0.08,
              ctx.currentTime + startTime + 0.2
            );
            hornEnv.gain.setValueAtTime(
              0.08,
              ctx.currentTime + startTime + duration - 0.2
            );
            hornEnv.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + startTime + duration
            );

            osc.connect(hornFilter);
            hornFilter.connect(hornEnv);
            hornEnv.connect(gainNode);

            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + duration + 0.1);

            chan.nodes.push(osc, hornFilter, hornEnv);
          });
        };

        scheduleHorn(2, 2.5);
        scheduleHorn(12, 3.0);
        scheduleHorn(22, 2.5);
        break;
      }

      // 4. Presbyterian Church Bell (Campana Presbiteriana - historical and soft)
      case 'campana_presbiteriana': {
        const scheduleBell = (time: number, pitch: number) => {
          // Bells have inharmonic partials
          const partials = [1, 1.5, 1.95, 2.4, 3.1, 4.25];
          partials.forEach((part, index) => {
            const osc = ctx.createOscillator();
            const bellGain = ctx.createGain();

            osc.type = index === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(pitch * part, ctx.currentTime + time);

            bellGain.gain.setValueAtTime(0.001, ctx.currentTime + time);
            // Strike is instantaneous, decay is slow and depends on frequency (higher partials decay faster)
            const decay = 8 / (index + 1);
            bellGain.gain.linearRampToValueAtTime(
              0.12 / (index + 1),
              ctx.currentTime + time + 0.01
            );
            bellGain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + time + decay
            );

            osc.connect(bellGain);
            bellGain.connect(gainNode);

            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + decay + 0.1);

            chan.nodes.push(osc, bellGain);
          });
        };

        // Slow historical tolling: every 7 seconds
        scheduleBell(0, 180); // F3 approx
        scheduleBell(7, 180);
        scheduleBell(14, 180);
        scheduleBell(21, 180);
        scheduleBell(28, 180);
        break;
      }

      // 5. Cathedral Bell (Campana de la Catedral - large, majestic)
      case 'campana_catedral': {
        const scheduleCathedralBell = (time: number, pitch: number) => {
          const partials = [1, 1.2, 1.5, 1.9, 2.3, 2.7, 3.1, 4.0];
          partials.forEach((part, index) => {
            const osc = ctx.createOscillator();
            const bellGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(pitch * part, ctx.currentTime + time);

            bellGain.gain.setValueAtTime(0.001, ctx.currentTime + time);
            const decay = 12 / (index * 0.7 + 1); // very long majestic decay
            bellGain.gain.linearRampToValueAtTime(
              0.15 / (index * 0.5 + 1),
              ctx.currentTime + time + 0.02
            );
            bellGain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + time + decay
            );

            osc.connect(bellGain);
            bellGain.connect(gainNode);

            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + decay + 0.1);

            chan.nodes.push(osc, bellGain);
          });
        };

        // Solemn toll: every 8 seconds
        scheduleCathedralBell(1, 130); // C3 approx
        scheduleCathedralBell(9, 130);
        scheduleCathedralBell(17, 130);
        scheduleCathedralBell(25, 130);
        break;
      }

      // 6. Plaza Ambient Murmur (Murmullo Plaza de Armas)
      case 'murmullo_plaza': {
        // High frequency wind in palms + mid-low crowd murmur
        // We generate bandpassed white noise for the fountain/wind
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const fountainNode = ctx.createBufferSource();
        fountainNode.buffer = noiseBuffer;
        fountainNode.loop = true;

        const fountainFilter = ctx.createBiquadFilter();
        fountainFilter.type = 'bandpass';
        fountainFilter.frequency.setValueAtTime(1500, ctx.currentTime);
        fountainFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        // Slow LFO to mimic wind gusts in palm trees
        const windLFO = ctx.createOscillator();
        windLFO.frequency.setValueAtTime(0.15, ctx.currentTime);
        const windLFOGain = ctx.createGain();
        windLFOGain.gain.setValueAtTime(0.15, ctx.currentTime);

        const fountainGain = ctx.createGain();
        fountainGain.gain.setValueAtTime(0.1, ctx.currentTime);

        windLFO.connect(windLFOGain);
        windLFOGain.connect(fountainGain.gain);

        fountainNode.connect(fountainFilter);
        fountainFilter.connect(fountainGain);
        fountainGain.connect(gainNode);

        fountainNode.start(ctx.currentTime);
        windLFO.start(ctx.currentTime);

        chan.nodes.push(
          fountainNode,
          fountainFilter,
          windLFO,
          windLFOGain,
          fountainGain
        );

        // Murmur osc (subtle hums)
        const numOscs = 4;
        for (let i = 0; i < numOscs; i++) {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          const slowLFO = ctx.createOscillator();
          const slowGain = ctx.createGain();

          osc.type = 'sine';
          // human murmur pitches around 150-300 Hz
          osc.frequency.setValueAtTime(
            180 + Math.random() * 120,
            ctx.currentTime
          );

          slowLFO.frequency.setValueAtTime(
            0.1 + Math.random() * 0.2,
            ctx.currentTime
          );
          slowGain.gain.setValueAtTime(0.02, ctx.currentTime);

          oscGain.gain.setValueAtTime(0.02, ctx.currentTime);

          slowLFO.connect(slowGain);
          slowGain.connect(oscGain.gain);

          osc.connect(oscGain);
          oscGain.connect(gainNode);

          osc.start(ctx.currentTime);
          slowLFO.start(ctx.currentTime);

          chan.nodes.push(osc, oscGain, slowLFO, slowGain);
        }
        break;
      }

      // 7. San Agustín Birds (Pájaros)
      case 'pajaros': {
        const createBirdChirp = (
          time: number,
          pitch: number,
          numChirps: number
        ) => {
          let currTime = ctx.currentTime + time;
          for (let i = 0; i < numChirps; i++) {
            const osc = ctx.createOscillator();
            const chirpGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(pitch, currTime);
            // Quick sweeping pitch upwards
            osc.frequency.exponentialRampToValueAtTime(
              pitch * 1.5,
              currTime + 0.06
            );
            osc.frequency.exponentialRampToValueAtTime(
              pitch * 1.1,
              currTime + 0.12
            );

            chirpGain.gain.setValueAtTime(0.001, currTime);
            chirpGain.gain.linearRampToValueAtTime(0.12, currTime + 0.02);
            chirpGain.gain.exponentialRampToValueAtTime(0.001, currTime + 0.12);

            osc.connect(chirpGain);
            chirpGain.connect(gainNode);

            osc.start(currTime);
            osc.stop(currTime + 0.13);

            chan.nodes.push(osc, chirpGain);
            currTime += 0.2; // space between chirps
          }
        };

        // Birds chirping schedule
        const scheds = [
          { t: 0.5, p: 2500, n: 3 },
          { t: 3.0, p: 2200, n: 4 },
          { t: 6.8, p: 2800, n: 2 },
          { t: 10.2, p: 2400, n: 3 },
          { t: 13.5, p: 2600, n: 4 },
          { t: 16.0, p: 2100, n: 5 },
          { t: 19.8, p: 2500, n: 3 },
          { t: 23.0, p: 2700, n: 3 },
          { t: 26.5, p: 2300, n: 4 }
        ];

        scheds.forEach((s) => {
          createBirdChirp(s.t, s.p, s.n);
        });
        break;
      }

      // 8. Shoe shiners (Lustrabotas)
      case 'lustrabotas': {
        const createShoeBrush = (time: number) => {
          // Brush sound: white noise bandpassed to 400Hz-2000Hz with very short decay
          const bufferSize = ctx.sampleRate * 0.5;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = noiseBuffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, ctx.currentTime + time);
          filter.Q.setValueAtTime(3, ctx.currentTime + time);

          const brushGain = ctx.createGain();
          brushGain.gain.setValueAtTime(0.001, ctx.currentTime + time);
          // Quick "shhh-shhh" strokes
          brushGain.gain.linearRampToValueAtTime(
            0.18,
            ctx.currentTime + time + 0.02
          );
          brushGain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 0.12
          );

          noiseNode.connect(filter);
          filter.connect(brushGain);
          brushGain.connect(gainNode);

          noiseNode.start(ctx.currentTime + time);
          noiseNode.stop(ctx.currentTime + time + 0.15);

          chan.nodes.push(noiseNode, filter, brushGain);
        };

        // Rhythmic tapping brush: double-brush stroke, pause, single stroke
        let t = 0.5;
        while (t < 29.0) {
          createShoeBrush(t);
          createShoeBrush(t + 0.2);
          createShoeBrush(t + 0.5);
          t += 1.8; // cycle time
        }
        break;
      }

      // 9. Sea waves (Oleaje)
      case 'olas': {
        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02; // brownian noise for heavy crashing sea feel
          lastOut = output[i];
        }

        const seaNode = ctx.createBufferSource();
        seaNode.buffer = noiseBuffer;
        seaNode.loop = true;

        const seaFilter = ctx.createBiquadFilter();
        seaFilter.type = 'lowpass';
        seaFilter.frequency.setValueAtTime(250, ctx.currentTime);

        // Low frequency oscillator for wave swells (every 6 seconds)
        const waveLFO = ctx.createOscillator();
        waveLFO.frequency.setValueAtTime(0.16, ctx.currentTime); // ~6.2s per wave

        const waveLFOGain = ctx.createGain();
        waveLFOGain.gain.setValueAtTime(150, ctx.currentTime); // sweep filter frequency

        const seaGain = ctx.createGain();
        seaGain.gain.setValueAtTime(0.2, ctx.currentTime);

        const waveAmpLFO = ctx.createOscillator();
        waveAmpLFO.frequency.setValueAtTime(0.16, ctx.currentTime);
        // Phase shift: when frequency sweeps up, amplitude should also increase
        const waveAmpGain = ctx.createGain();
        waveAmpGain.gain.setValueAtTime(0.15, ctx.currentTime);

        waveLFO.connect(waveLFOGain);
        waveLFOGain.connect(seaFilter.frequency);

        waveAmpLFO.connect(waveAmpGain);
        waveAmpGain.connect(seaGain.gain);

        seaNode.connect(seaFilter);
        seaFilter.connect(seaGain);
        seaGain.connect(gainNode);

        seaNode.start(ctx.currentTime);
        waveLFO.start(ctx.currentTime);
        waveAmpLFO.start(ctx.currentTime);

        chan.nodes.push(
          seaNode,
          seaFilter,
          waveLFO,
          waveLFOGain,
          seaGain,
          waveAmpLFO,
          waveAmpGain
        );
        break;
      }

      // 10. Wind in reeds (Viento Totorales)
      case 'viento_totorales': {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const windNode = ctx.createBufferSource();
        windNode.buffer = noiseBuffer;
        windNode.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.Q.setValueAtTime(1.5, ctx.currentTime);
        windFilter.frequency.setValueAtTime(400, ctx.currentTime);

        // Sweep filter center frequency slowly to mimic howling/soughing
        const sweepLFO = ctx.createOscillator();
        sweepLFO.frequency.setValueAtTime(0.08, ctx.currentTime); // very slow gusts
        const sweepGain = ctx.createGain();
        sweepGain.gain.setValueAtTime(250, ctx.currentTime);

        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.15, ctx.currentTime);

        sweepLFO.connect(sweepGain);
        sweepGain.connect(windFilter.frequency);

        windNode.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(gainNode);

        windNode.start(ctx.currentTime);
        sweepLFO.start(ctx.currentTime);

        chan.nodes.push(windNode, windFilter, sweepLFO, sweepGain, windGain);
        break;
      }

      // 11. Four-eyed Frogs (Ranas de Cuatro Ojos)
      case 'ranas': {
        const createFrogCroak = (time: number) => {
          let currTime = ctx.currentTime + time;
          // Croaks consist of 4 rapid clicks/pulses
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator();
            const croakEnv = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            // Frog croak pitch
            osc.frequency.setValueAtTime(350, currTime);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100, currTime);
            filter.Q.setValueAtTime(5, currTime);

            croakEnv.gain.setValueAtTime(0.001, currTime);
            croakEnv.gain.linearRampToValueAtTime(0.15, currTime + 0.01);
            croakEnv.gain.exponentialRampToValueAtTime(0.001, currTime + 0.04);

            osc.connect(filter);
            filter.connect(croakEnv);
            croakEnv.connect(gainNode);

            osc.start(currTime);
            osc.stop(currTime + 0.05);

            chan.nodes.push(osc, filter, croakEnv);
            currTime += 0.07;
          }
        };

        let t = 0.5;
        while (t < 29.0) {
          createFrogCroak(t);
          createFrogCroak(t + 0.6); // answer croak
          t += 3.2 + Math.random() * 2.0; // organic interval
        }
        break;
      }

      // 12. River Flow (Río Elqui)
      case 'rio': {
        // High frequency crackles + low frequency water body rumbling
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const waterNode = ctx.createBufferSource();
        waterNode.buffer = noiseBuffer;
        waterNode.loop = true;

        const filter1 = ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(450, ctx.currentTime);
        filter1.Q.setValueAtTime(1.0, ctx.currentTime);

        const filter2 = ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.setValueAtTime(1800, ctx.currentTime);
        filter2.Q.setValueAtTime(0.6, ctx.currentTime);

        // Amplitude modulation for bubbles
        const bubLFO = ctx.createOscillator();
        bubLFO.frequency.setValueAtTime(3, ctx.currentTime);
        const bubGain = ctx.createGain();
        bubGain.gain.setValueAtTime(0.08, ctx.currentTime);

        const flowGain = ctx.createGain();
        flowGain.gain.setValueAtTime(0.12, ctx.currentTime);

        bubLFO.connect(bubGain);
        bubGain.connect(flowGain.gain);

        waterNode.connect(filter1);
        filter1.connect(flowGain);

        // Connect noise to high filter as well for bubbly texture
        const flowGain2 = ctx.createGain();
        flowGain2.gain.setValueAtTime(0.04, ctx.currentTime);
        waterNode.connect(filter2);
        filter2.connect(flowGain2);

        flowGain.connect(gainNode);
        flowGain2.connect(gainNode);

        waterNode.start(ctx.currentTime);
        bubLFO.start(ctx.currentTime);

        chan.nodes.push(
          waterNode,
          filter1,
          filter2,
          bubLFO,
          bubGain,
          flowGain,
          flowGain2
        );
        break;
      }

      // 13. Vocal murmur Coquimbo (Pregones de Pescado)
      case 'pregon_coquimbo': {
        // Melodic minor intervals resembling fishmongers calling out
        const scheduleCall = (time: number, isHigh: boolean) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const callEnv = ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'triangle';

          const baseFreq = isHigh ? 330 : 220; // E4 vs A3
          osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime + time);
          osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + time); // perfect fifth

          // Filter for voice-like formant
          const formant = ctx.createBiquadFilter();
          formant.type = 'bandpass';
          formant.frequency.setValueAtTime(1000, ctx.currentTime + time);
          formant.Q.setValueAtTime(4, ctx.currentTime + time);

          callEnv.gain.setValueAtTime(0.001, ctx.currentTime + time);
          callEnv.gain.linearRampToValueAtTime(
            0.1,
            ctx.currentTime + time + 0.3
          );
          // Modulate pitch slightly for "sing-song" effect
          osc1.frequency.linearRampToValueAtTime(
            baseFreq * 0.9,
            ctx.currentTime + time + 1.2
          );
          osc2.frequency.linearRampToValueAtTime(
            baseFreq * 1.35,
            ctx.currentTime + time + 1.2
          );

          callEnv.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 1.8
          );

          osc1.connect(formant);
          osc2.connect(formant);
          formant.connect(callEnv);
          callEnv.connect(gainNode);

          osc1.start(ctx.currentTime + time);
          osc2.start(ctx.currentTime + time);
          osc1.stop(ctx.currentTime + time + 1.9);
          osc2.stop(ctx.currentTime + time + 1.9);

          chan.nodes.push(osc1, osc2, formant, callEnv);
        };

        const times = [1, 5, 10, 14, 19, 23, 27];
        times.forEach((t, index) => {
          scheduleCall(t, index % 2 === 0);
        });
        break;
      }

      // 14. Pregonero del Diario (La Serena)
      case 'pregon_dia': {
        const schedulePregonero = (time: number) => {
          const osc = ctx.createOscillator();
          const vocalEnv = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(196, ctx.currentTime + time); // G3
          osc.frequency.linearRampToValueAtTime(
            220,
            ctx.currentTime + time + 0.3
          ); // sweep up
          osc.frequency.linearRampToValueAtTime(
            147,
            ctx.currentTime + time + 1.0
          ); // drop

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(800, ctx.currentTime + time);
          filter.Q.setValueAtTime(3, ctx.currentTime + time);

          vocalEnv.gain.setValueAtTime(0.001, ctx.currentTime + time);
          vocalEnv.gain.linearRampToValueAtTime(
            0.08,
            ctx.currentTime + time + 0.15
          );
          vocalEnv.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 1.2
          );

          osc.connect(filter);
          filter.connect(vocalEnv);
          vocalEnv.connect(gainNode);

          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 1.3);

          chan.nodes.push(osc, filter, vocalEnv);
        };

        const times = [2, 8, 14, 20, 26];
        times.forEach((t) => schedulePregonero(t));
        break;
      }

      // 15. Sound Piece Coquimbo (Generative Harbor Soundscape)
      case 'obra_coquimbo': {
        // Synthesizes a complex multi-layered ambient collage of deep port hums, seagull calls, metallic creaks, and wind chords
        const oscDrone = ctx.createOscillator();
        const droneGain = ctx.createGain();

        oscDrone.type = 'sine';
        oscDrone.frequency.setValueAtTime(55, ctx.currentTime); // deep G1 sub drone
        droneGain.gain.setValueAtTime(0.18, ctx.currentTime);

        oscDrone.connect(droneGain);
        droneGain.connect(gainNode);
        oscDrone.start(ctx.currentTime);
        chan.nodes.push(oscDrone, droneGain);

        // High sweeping wind pads
        const padOsc = ctx.createOscillator();
        const padFilter = ctx.createBiquadFilter();
        const padGain = ctx.createGain();

        padOsc.type = 'triangle';
        padOsc.frequency.setValueAtTime(110, ctx.currentTime);

        padFilter.type = 'bandpass';
        padFilter.frequency.setValueAtTime(400, ctx.currentTime);
        padFilter.Q.setValueAtTime(2.0, ctx.currentTime);

        const padSweep = ctx.createOscillator();
        padSweep.frequency.setValueAtTime(0.04, ctx.currentTime); // very slow 25-second sweep
        const padSweepGain = ctx.createGain();
        padSweepGain.gain.setValueAtTime(200, ctx.currentTime);

        padSweep.connect(padSweepGain);
        padSweepGain.connect(padFilter.frequency);

        padGain.gain.setValueAtTime(0.1, ctx.currentTime);

        padOsc.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(gainNode);

        padOsc.start(ctx.currentTime);
        padSweep.start(ctx.currentTime);

        chan.nodes.push(padOsc, padFilter, padSweep, padSweepGain, padGain);

        // Add soft rhythmic boat horns in the background (every 20s)
        const playHorn = (time: number, pitch: number) => {
          const horn1 = ctx.createOscillator();
          const horn2 = ctx.createOscillator();
          const hornGain = ctx.createGain();

          horn1.type = 'sawtooth';
          horn1.frequency.setValueAtTime(73.42, ctx.currentTime + time); // D2
          horn2.type = 'sine';
          horn2.frequency.setValueAtTime(110, ctx.currentTime + time); // A2

          const hFilter = ctx.createBiquadFilter();
          hFilter.type = 'lowpass';
          hFilter.frequency.setValueAtTime(250, ctx.currentTime + time);

          hornGain.gain.setValueAtTime(0.001, ctx.currentTime + time);
          hornGain.gain.linearRampToValueAtTime(
            0.08,
            ctx.currentTime + time + 1.0
          );
          hornGain.gain.setValueAtTime(0.08, ctx.currentTime + time + 4.0);
          hornGain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 6.0
          );

          horn1.connect(hFilter);
          horn2.connect(hFilter);
          hFilter.connect(hornGain);
          hornGain.connect(gainNode);

          horn1.start(ctx.currentTime + time);
          horn2.start(ctx.currentTime + time);
          horn1.stop(ctx.currentTime + time + 6.1);
          horn2.stop(ctx.currentTime + time + 6.1);

          chan.nodes.push(horn1, horn2, hFilter, hornGain);
        };

        playHorn(4, 75);
        playHorn(35, 65);
        playHorn(70, 75);
        playHorn(100, 65);
        break;
      }

      // 16. Sound Piece La Serena (Chatedral Bell Symphonic Drone)
      case 'obra_serena': {
        // Deep cathedral architectural atmosphere with layered inharmonic bell resonances and sweeping church choir hums
        const hum1 = ctx.createOscillator();
        const hum2 = ctx.createOscillator();
        const choirGain1 = ctx.createGain();
        const choirGain2 = ctx.createGain();

        hum1.type = 'sine';
        hum1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        hum2.type = 'sine';
        hum2.frequency.setValueAtTime(164.81, ctx.currentTime); // E3 (bright major third)

        choirGain1.gain.setValueAtTime(0.05, ctx.currentTime);
        choirGain2.gain.setValueAtTime(0.04, ctx.currentTime);

        // Modulate hums slowly
        const choirLFO = ctx.createOscillator();
        choirLFO.frequency.setValueAtTime(0.2, ctx.currentTime);
        const choirLFOGain = ctx.createGain();
        choirLFOGain.gain.setValueAtTime(0.02, ctx.currentTime);
        choirLFO.connect(choirLFOGain);
        choirLFOGain.connect(choirGain1.gain);

        hum1.connect(choirGain1);
        hum2.connect(choirGain2);
        choirGain1.connect(gainNode);
        choirGain2.connect(gainNode);

        hum1.start(ctx.currentTime);
        hum2.start(ctx.currentTime);
        choirLFO.start(ctx.currentTime);

        chan.nodes.push(
          hum1,
          hum2,
          choirGain1,
          choirGain2,
          choirLFO,
          choirLFOGain
        );

        // Majestic tolling sequence
        const playCathedralToll = (time: number, baseFreq: number) => {
          const partials = [1, 1.19, 1.43, 1.82, 2.25, 2.67, 3.2, 4.0];
          partials.forEach((part, index) => {
            const osc = ctx.createOscillator();
            const bGain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(
              baseFreq * part,
              ctx.currentTime + time
            );

            bGain.gain.setValueAtTime(0.001, ctx.currentTime + time);
            const dec = 15 / (index * 0.5 + 1);
            bGain.gain.linearRampToValueAtTime(
              0.08 / (index * 0.4 + 1),
              ctx.currentTime + time + 0.05
            );
            bGain.gain.exponentialRampToValueAtTime(
              0.001,
              ctx.currentTime + time + dec
            );

            osc.connect(bGain);
            bGain.connect(gainNode);

            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + dec + 0.1);

            chan.nodes.push(osc, bGain);
          });
        };

        // Ring a gorgeous chord toll sequence across 2 minutes
        playCathedralToll(1, 130.81); // C3
        playCathedralToll(12, 146.83); // D3
        playCathedralToll(24, 164.81); // E3
        playCathedralToll(36, 196.0); // G3
        playCathedralToll(48, 130.81); // C3
        playCathedralToll(60, 146.83); // D3
        playCathedralToll(72, 164.81); // E3
        playCathedralToll(84, 196.0); // G3
        playCathedralToll(96, 130.81); // C3
        playCathedralToll(108, 196.0); // G3
        break;
      }

      // 17. Sound Piece Elqui Humedal (Estuary Ambient Synthesizer)
      case 'obra_elqui': {
        // Procedural composition linking ocean sweeps, wetland avian chirps, and organic reed wind tones
        // Low oceanic waves rolling in
        const bufferSize = ctx.sampleRate * 3;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.015 * white) / 1.015;
          lastOut = output[i];
        }

        const seaNode = ctx.createBufferSource();
        seaNode.buffer = noiseBuffer;
        seaNode.loop = true;

        const seaFilter = ctx.createBiquadFilter();
        seaFilter.type = 'lowpass';
        seaFilter.frequency.setValueAtTime(200, ctx.currentTime);

        const seaGain = ctx.createGain();
        seaGain.gain.setValueAtTime(0.12, ctx.currentTime);

        const oceanLFO = ctx.createOscillator();
        oceanLFO.frequency.setValueAtTime(0.12, ctx.currentTime); // 8-second slow wave cycles
        const oceanGain = ctx.createGain();
        oceanGain.gain.setValueAtTime(100, ctx.currentTime);

        oceanLFO.connect(oceanGain);
        oceanGain.connect(seaFilter.frequency);

        seaNode.connect(seaFilter);
        seaFilter.connect(seaGain);
        seaGain.connect(gainNode);

        seaNode.start(ctx.currentTime);
        oceanLFO.start(ctx.currentTime);

        chan.nodes.push(seaNode, seaFilter, seaGain, oceanLFO, oceanGain);

        // Flute-like sine waves representing wind in reeds (harmonic chords blowing softly)
        const windChords = [196.0, 246.94, 293.66, 392.0]; // G major triad + octave
        windChords.forEach((note, idx) => {
          const osc = ctx.createOscillator();
          const pGain = ctx.createGain();
          const pLFO = ctx.createOscillator();
          const pLFOGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(note, ctx.currentTime);

          pLFO.frequency.setValueAtTime(0.05 + idx * 0.02, ctx.currentTime);
          pLFOGain.gain.setValueAtTime(0.03, ctx.currentTime);

          pGain.gain.setValueAtTime(0.02, ctx.currentTime);

          pLFO.connect(pLFOGain);
          pLFOGain.connect(pGain.gain);

          osc.connect(pGain);
          pGain.connect(gainNode);

          osc.start(ctx.currentTime);
          pLFO.start(ctx.currentTime);

          chan.nodes.push(osc, pGain, pLFO, pLFOGain);
        });

        // Delicate bird chirps popping up occasionally in the background
        const triggerSparseBird = (time: number, pitch: number) => {
          const osc = ctx.createOscillator();
          const amp = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(pitch, ctx.currentTime + time);
          osc.frequency.exponentialRampToValueAtTime(
            pitch * 1.6,
            ctx.currentTime + time + 0.08
          );

          amp.gain.setValueAtTime(0.001, ctx.currentTime + time);
          amp.gain.linearRampToValueAtTime(0.04, ctx.currentTime + time + 0.02);
          amp.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + time + 0.1
          );

          osc.connect(amp);
          amp.connect(gainNode);

          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.12);

          chan.nodes.push(osc, amp);
        };

        const birdTimes = [
          3, 8, 14, 22, 29, 36, 44, 51, 60, 68, 77, 85, 93, 102, 110
        ];
        birdTimes.forEach((t, i) => {
          triggerSparseBird(t, i % 2 === 0 ? 3000 : 2600);
        });
        break;
      }

      default: {
        // Simple fallback ambient noise
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        chan.nodes.push(osc);
      }
    }
  }
}

// Global single instance of audio engine
export const audioEngine = new AudioEngine();
