export class Ringtone {
  private ctx: AudioContext | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.ctx) return;
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        try {
          if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.35);
        } catch {
          // Ignore audio node errors
        }
      };

      playBeep();
      this.interval = setInterval(playBeep, 1200);
    } catch {
      // AudioContext creation failed or blocked by autoplay policy
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignore
      }
      this.ctx = null;
    }
  }
}

export const ringtone = new Ringtone();
