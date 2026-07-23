class CallAudioEffects {
  private audioCtx: AudioContext | null = null;
  private intervalId: any = null;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => console.error('AudioContext resume failed:', err));
    }
  }

  // Dialing Tone: 440Hz + 480Hz dual frequency pulsing (2 seconds on, 4 seconds off)
  public startDialingTone() {
    this.stop();
    this.initContext();
    if (!this.audioCtx) return;

    const playTone = () => {
      if (!this.audioCtx) return;
      
      const now = this.audioCtx.currentTime;
      const duration = 2.0;

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gainNode.gain.setValueAtTime(0.08, now + duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);

      this.activeOscillators.push({ osc: osc1, gain: gainNode });
      this.activeOscillators.push({ osc: osc2, gain: gainNode });

      // Clean up reference after it stops
      setTimeout(() => {
        this.activeOscillators = this.activeOscillators.filter(
          (o) => o.osc !== osc1 && o.osc !== osc2
        );
      }, (duration + 0.2) * 1000);
    };

    playTone();
    this.intervalId = setInterval(playTone, 6000); // 6s cycle (2s play + 4s silent)
  }

  // Ringtone: Pleasant, electronic chime ringtone sequence pulsing (double ring every 2.5 seconds)
  public startRingtone() {
    this.stop();
    this.initContext();
    if (!this.audioCtx) return;

    const playRingCycle = () => {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      // Two quick pulses
      const pulses = [0, 0.5];
      pulses.forEach((delay) => {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        // Electronic bell sound: triangle wave, starting at 750Hz and sliding up to 900Hz
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, now + delay);
        osc.frequency.exponentialRampToValueAtTime(900, now + delay + 0.35);

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.05);
        gainNode.gain.setValueAtTime(0.12, now + delay + 0.3);
        gainNode.gain.linearRampToValueAtTime(0, now + delay + 0.35);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.4);

        this.activeOscillators.push({ osc, gain: gainNode });

        setTimeout(() => {
          this.activeOscillators = this.activeOscillators.filter((o) => o.osc !== osc);
        }, (delay + 0.5) * 1000);
      });
    };

    playRingCycle();
    this.intervalId = setInterval(playRingCycle, 2500); // 2.5s cycle
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeOscillators.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch (err) {
        // Already stopped
      }
    });
    this.activeOscillators = [];
  }
}

export const callAudio = new CallAudioEffects();
export default CallAudioEffects;
