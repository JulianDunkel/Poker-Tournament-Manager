(() => {
  let audioCtx = null;

  function ensureAudioContext() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended")
      return audioCtx.resume();
    return Promise.resolve();
  }

  function createNoiseBuffer(ctx, durationSec = 0.4) {
    const sr = ctx.sampleRate;
    const len = Math.floor(durationSec * sr);
    const buffer = ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buffer;
  }

  async function playLevelUp(intensity = 1.0) {
    await ensureAudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.connect(ctx.destination);

    // main envelope
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.8 * intensity, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    // rising sweep
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1200 * intensity, now + 0.35);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.9 * intensity, now + 0.03);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.linearRampToValueAtTime(1200 * intensity, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(filter);
    filter.connect(master);
    osc.start(now);
    osc.stop(now + 1);

    // arpeggio sparkles
    const notes = [880, 660, 990, 1320];
    notes.forEach((base, i) => {
      const t = now + 0.18 + i * 0.06;
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = "triangle";
      bell.frequency.setValueAtTime(base * (1 + 0.05 * i * intensity), t);
      bellGain.gain.setValueAtTime(0.001, t);
      bellGain.gain.linearRampToValueAtTime(0.7 * intensity / (1 + i * 0.15), t + 0.008);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + i * 0.03);
      bell.connect(bellGain);
      bellGain.connect(master);
      bell.start(t);
      bell.stop(t + 0.35 + i * 0.05);
    });

    // noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.5);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now + 0.05);
    nGain.gain.exponentialRampToValueAtTime(0.7 * intensity, now + 0.07);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 900 * intensity;
    nFilter.Q.value = 0.7;
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(master);
    noise.start(now + 0.05);
    noise.stop(now + 0.6);
  }

  // 🌟 Export global function
  window.playSound = (intensity = 1.0) => playLevelUp(intensity);
})();