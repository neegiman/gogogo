(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const LEVEL = 0.62;
  const MELODY = [523.25, 659.25, 783.99, 659.25, 440, 523.25, 659.25, 523.25];

  // Render rounded attacks, decaying resonances and silent tails once. Reusing
  // these tiny samples avoids oscillator clicks and keeps beat scheduling exact.
  function renderSample(kind, frequency = 440, sampleRate = 44100) {
    const duration = { wood: 0.15, drum: 0.24, marimba: 0.4, pop: 0.23 }[kind];
    if (!duration) throw new Error(`Unknown sound: ${kind}`);
    const samples = new Float32Array(Math.ceil(duration * sampleRate));
    let phase = 0;
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = 1 - Math.exp(-t / (kind === 'marimba' ? 0.003 : 0.0015));
      const tail = Math.min(1, (samples.length - 1 - i) / (sampleRate * 0.012));
      let value;
      if (kind === 'wood') {
        value = Math.sin(TAU * frequency * t) * Math.exp(-t / 0.031)
          + 0.38 * Math.sin(TAU * frequency * 2.76 * t) * Math.exp(-t / 0.016)
          + 0.09 * Math.sin(TAU * frequency * 5.4 * t) * Math.exp(-t / 0.009);
      } else if (kind === 'drum') {
        const pitch = 85 + 80 * Math.exp(-t / 0.018);
        phase += TAU * pitch / sampleRate;
        value = Math.sin(phase) * Math.exp(-t / 0.055)
          + 0.16 * Math.sin(TAU * 230 * t) * Math.exp(-t / 0.018);
      } else if (kind === 'marimba') {
        value = Math.sin(TAU * frequency * t) * Math.exp(-t / 0.1)
          + 0.22 * Math.sin(TAU * frequency * 4 * t) * Math.exp(-t / 0.027)
          + 0.025 * Math.sin(TAU * frequency * 9.5 * t) * Math.exp(-t / 0.012);
      } else {
        const pitch = frequency * (1 - 0.35 * Math.exp(-t / 0.019));
        phase += TAU * pitch / sampleRate;
        value = (Math.sin(phase) + 0.1 * Math.sin(phase * 2)) * Math.exp(-t / 0.045);
      }
      samples[i] = value * attack * tail;
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    if (peak > 0) for (let i = 0; i < samples.length; i++) samples[i] *= 0.85 / peak;
    return samples;
  }

  function createPlayer(context, destination) {
    const cache = new Map();
    const voices = new Set();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 5800;
    filter.Q.value = 0.5;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 16;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;
    filter.connect(limiter);
    limiter.connect(destination);

    function play(kind, pitch, at, volume) {
      const key = `${kind}:${pitch}`;
      if (!cache.has(key)) {
        const data = renderSample(kind, pitch, context.sampleRate);
        const buffer = context.createBuffer(1, data.length, context.sampleRate);
        buffer.getChannelData(0).set(data);
        cache.set(key, buffer);
      }
      const source = context.createBufferSource();
      const envelope = context.createGain();
      source.buffer = cache.get(key);
      const start = Math.max(at, context.currentTime + 0.002);
      envelope.gain.setValueAtTime(volume, start);
      source.connect(envelope);
      envelope.connect(filter);
      const voice = { source, envelope, start };
      voices.add(voice);
      source.onended = () => { voices.delete(voice); source.disconnect(); envelope.disconnect(); };
      source.start(start);
    }

    function beat(index, at) {
      const downbeat = index % 4 === 0;
      play('wood', downbeat ? 440 : 520, at, downbeat ? 0.31 : 0.23);
      if (downbeat || (index >= 0 && index % 4 === 2)) play('drum', 85, at, downbeat ? 0.42 : 0.2);
      // Melody lands on the same quarter-note pulse that the child should tap.
      if (index >= 0) play('marimba', MELODY[index % MELODY.length], at, 0.14);
    }

    function jump(at, perfect) {
      play('pop', 783.99, at, 0.21);
      if (perfect) play('marimba', 1046.5, at + 0.045, 0.09);
    }

    function finish(at) {
      [523.25, 659.25, 783.99, 1046.5].forEach((pitch, i) => play('marimba', pitch, at + i * 0.13, 0.23));
      play('marimba', 523.25, at + 0.39, 0.1);
    }

    function stop() {
      for (const { source, envelope, start } of voices) {
        // Cancel queued beats immediately; fade audible tails to prevent a click.
        if (start > context.currentTime) source.stop();
        else {
          envelope.gain.cancelScheduledValues(context.currentTime);
          envelope.gain.setTargetAtTime(0, context.currentTime, 0.004);
          source.stop(context.currentTime + 0.025);
        }
      }
    }

    function preview(at) {
      stop();
      for (let i = 0; i < 4; i++) beat(i, at + i * 0.6);
      jump(at + 0.6, false);
      jump(at + 1.8, true);
    }
    return { beat, jump, finish, stop, preview };
  }
  globalThis.KongkongSound = Object.freeze({ createPlayer, renderSample, LEVEL });
})();
