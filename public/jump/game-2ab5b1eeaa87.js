(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const scene = $('scene');
  const card = document.querySelector('.game-card');
  const action = $('action');
  const pause = $('pause');
  const feedback = $('feedback');
  const TOTAL = 24;
  const DEMO_BEATS = 8;
  const COUNTDOWN_BEATS = 5;
  const HIT_WINDOW = 0.235;
  const PERFECT_WINDOW = 0.105;
  const colors = { mint: '#78b99c', peach: '#e7a189', lavender: '#aaa1d0' };
  let phase = 'idle';
  let bpm = 72;
  let muted = false;
  let best = 0;
  let audio;
  let master;
  let sounds;
  let startAt = 0;
  let demoAt = 0;
  let scheduledIndex = -DEMO_BEATS;
  let displayedIndex = -DEMO_BEATS - 1;
  let pauseAt = 0;
  let pausedPhase = 'playing';
  let hits = new Set();
  let misses = new Set();
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let jumpAt = -10;
  let feedbackAt = -10;
  let lastTap = -10;
  let frame;
  let runToken = 0;
  let sceneWidth = scene.clientWidth;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stones = [];
  const dots = [...$('beat-dots').children];
  const interval = () => 60 / bpm;
  const now = () => audio ? audio.currentTime : performance.now() / 1000;

  const settings = {
    read() {
      try {
        const data = JSON.parse(localStorage.getItem('kongkong-v1') || '{}');
        best = Number.isFinite(data.best) ? Math.min(TOTAL, Math.max(0, data.best)) : 0;
        muted = data.muted === true;
        if ([72, 92, 112].includes(data.bpm)) bpm = data.bpm;
        if (colors[data.color]) document.documentElement.style.setProperty('--bunny', colors[data.color]);
        return data;
      } catch { return {}; }
    },
    write() {
      try {
        localStorage.setItem('kongkong-v1', JSON.stringify({ best, muted, bpm, color: document.querySelector('.friend-option.selected').dataset.color }));
      } catch { /* The game also works when browser storage is unavailable. */ }
    },
  };

  const saved = settings.read();
  $('best').textContent = best;
  document.querySelectorAll('.tempo-option').forEach((button) => {
    button.classList.toggle('selected', Number(button.dataset.tempo) === bpm);
    button.setAttribute('aria-pressed', String(Number(button.dataset.tempo) === bpm));
    button.addEventListener('click', () => {
      if (phase !== 'idle') return;
      bpm = Number(button.dataset.tempo);
      selectButton('.tempo-option', button);
      settings.write();
    });
  });
  document.querySelectorAll('.friend-option').forEach((button) => {
    if (saved.color && colors[saved.color]) {
      button.classList.toggle('selected', button.dataset.color === saved.color);
      button.setAttribute('aria-pressed', String(button.dataset.color === saved.color));
    }
    button.addEventListener('click', () => {
      selectButton('.friend-option', button);
      document.documentElement.style.setProperty('--bunny', colors[button.dataset.color]);
      settings.write();
    });
  });

  function selectButton(selector, selected) {
    document.querySelectorAll(selector).forEach((button) => {
      button.classList.toggle('selected', button === selected);
      button.setAttribute('aria-pressed', String(button === selected));
    });
  }

  function syncSound() {
    $('sound').classList.toggle('muted', muted);
    $('sound').setAttribute('aria-pressed', String(!muted));
    $('sound').setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
    $('sound').querySelector('span').textContent = muted ? '소리 꺼짐' : '소리 켜짐';
    if (master && audio) master.gain.setTargetAtTime(muted ? 0 : KongkongSound.LEVEL, audio.currentTime, 0.015);
  }
  syncSound();
  $('sound').addEventListener('click', () => { muted = !muted; syncSound(); settings.write(); });

  async function initAudio() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    if (!audio) {
      audio = new AudioEngine();
      master = audio.createGain();
      master.gain.value = muted ? 0 : KongkongSound.LEVEL;
      master.connect(audio.destination);
      sounds = KongkongSound.createPlayer(audio, master);
    }
    if (audio.state === 'suspended') await audio.resume();
  }

  function soundBeat(index, at) {
    sounds?.beat(index, at);
  }

  function stopVoices() {
    sounds?.stop();
  }

  $('preview-sound').addEventListener('click', async () => {
    if (phase !== 'idle') return;
    try {
      await initAudio();
      if (phase !== 'idle') return;
      if (muted) { muted = false; syncSound(); settings.write(); }
      sounds?.preview(now() + 0.03);
    } catch { /* The game remains playable when audio is unavailable. */ }
  });

  function renderStones(position = 0) {
    const base = sceneWidth * (sceneWidth < 420 ? 0.25 : 0.24);
    const spacing = sceneWidth < 500 ? 105 : 150;
    for (const stone of stones) {
      const x = base + (stone.index - position) * spacing;
      stone.node.style.left = `${x}px`;
      stone.node.style.display = x < -100 || x > sceneWidth + 100 ? 'none' : '';
      stone.node.classList.toggle('target', Math.abs(stone.index - position) < 0.28);
    }
  }

  for (let index = -3; index < TOTAL + 16; index++) {
    const node = document.createElement('div');
    node.className = 'stone';
    if (index > 0 && index < TOTAL) {
      const symbol = document.createElement('span');
      symbol.className = 'stone-note';
      symbol.textContent = index % 3 === 0 ? '♫' : '♪';
      node.append(symbol);
    }
    $('stones').append(node);
    stones.push({ index, node });
  }
  renderStones();
  new ResizeObserver(() => { sceneWidth = scene.clientWidth; if (phase === 'idle') renderStones(); }).observe(scene);

  function say(message, positive = true) {
    feedback.textContent = message;
    feedback.style.color = positive ? '#43866a' : '#a28a59';
    feedbackAt = now();
    feedback.classList.remove('pop');
    void feedback.offsetWidth;
    feedback.classList.add('pop');
  }

  function sparks() {
    if (reducedMotion) return;
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.textContent = i % 2 ? '✦' : '♪';
      particle.style.left = `${sceneWidth * 0.24}px`;
      particle.style.top = '51%';
      particle.style.setProperty('--dx', `${(i - 2.5) * 26}px`);
      particle.style.setProperty('--dy', `${-45 - Math.random() * 55}px`);
      particle.style.setProperty('--rot', `${(i - 2.5) * 25}deg`);
      $('particles').append(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }

  function resetVisuals() {
    cancelAnimationFrame(frame);
    card.classList.remove('is-playing', 'is-paused', 'is-demo');
    scene.classList.remove('beat-flash');
    $('demo-guide').hidden = true;
    $('demo-guide').classList.remove('handed-over');
    $('demo-countdown').classList.remove('countdown-pop');
    action.classList.remove('demo-pressed');
    $('bunny').style.transform = '';
    $('bunny-shadow').style.transform = '';
    feedback.style.opacity = '1';
    feedback.style.color = '';
    feedback.textContent = '준비됐나요?';
    $('progress').style.width = '0%';
    $('combo').textContent = '토끼와 함께 콩콩!';
    $('control-title').textContent = '박자를 듣고, 콩!';
    $('control-hint').innerHTML = '<kbd>Space</kbd> 키 또는 점프 버튼을 눌러요';
    action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor"/></svg><span>놀이 시작</span><span class="button-spark">✦</span>';
    action.disabled = false;
    pause.hidden = true;
    $('preview-sound').disabled = false;
    document.querySelector('.tempo-settings').disabled = false;
    dots.forEach((dot) => dot.classList.remove('active'));
    stones.forEach(({ node }) => node.classList.remove('hit', 'missed'));
    $('particles').replaceChildren();
    renderStones();
  }

  async function start() {
    if (phase !== 'idle' && phase !== 'result') return;
    const token = ++runToken;
    phase = 'starting';
    action.disabled = true;
    $('preview-sound').disabled = true;
    stopVoices();
    try { await initAudio(); } catch { /* Continue with visual beats if audio is blocked. */ }
    if (token !== runToken) return;
    if (document.hidden) { phase = 'idle'; action.disabled = false; $('preview-sound').disabled = false; return; }
    resetVisuals();
    hits = new Set(); misses = new Set(); score = 0; streak = 0; maxStreak = 0;
    jumpAt = -10; lastTap = -10;
    $('score').textContent = '0';
    phase = 'demo';
    $('preview-sound').disabled = true;
    demoAt = now() + 0.22;
    startAt = demoAt + DEMO_BEATS * interval();
    scheduledIndex = -DEMO_BEATS;
    displayedIndex = -DEMO_BEATS - 1;
    card.classList.add('is-playing', 'is-demo');
    $('demo-guide').hidden = false;
    $('demo-heading').textContent = '토끼를 보고 따라 해요';
    $('demo-countdown').textContent = '♪';
    $('demo-progress').textContent = '8박자 시범';
    document.querySelector('.tempo-settings').disabled = true;
    $('control-title').textContent = '토끼가 먼저 보여줄게요';
    $('control-hint').innerHTML = '<kbd>Space</kbd> · 버튼을 박자에 맞춰요';
    action.innerHTML = '<span>이렇게 콩!</span><span>↟</span>';
    action.disabled = true;
    pause.hidden = false;
    pause.textContent = 'Ⅱ';
    pause.setAttribute('aria-label', '잠깐 쉬기');
    say('먼저 봐요!');
    feedback.style.opacity = '1';
    frame = requestAnimationFrame(tick);
  }

  function updateDemoCount(beatIndex) {
    const remaining = -beatIndex;
    const countingDown = remaining <= COUNTDOWN_BEATS;
    const counter = $('demo-countdown');
    counter.textContent = countingDown ? String(remaining) : '♪';
    $('demo-progress').textContent = `${DEMO_BEATS + beatIndex + 1} / ${DEMO_BEATS}박자 시범`;
    $('demo-heading').textContent = countingDown ? '곧 내 차례예요' : '토끼를 보고 따라 해요';
    counter.classList.remove('countdown-pop');
    void counter.offsetWidth;
    counter.classList.add('countdown-pop');
  }

  function tick() {
    if (phase !== 'playing' && phase !== 'demo') return;
    const time = now();
    const beatDuration = interval();
    // Schedule sound slightly ahead on the audio clock to avoid timer drift.
    while (scheduledIndex < TOTAL && startAt + scheduledIndex * beatDuration <= time + 0.1) {
      const at = startAt + scheduledIndex * beatDuration;
      if (at >= time - 0.025) {
        const scheduledAt = Math.max(time + 0.002, at);
        soundBeat(scheduledIndex < 0 ? scheduledIndex + DEMO_BEATS : scheduledIndex, scheduledAt);
        if (scheduledIndex < 0) sounds?.jump(scheduledAt + 0.005, true);
      }
      scheduledIndex++;
    }
    const beatIndex = Math.floor((time - startAt) / beatDuration);
    if (beatIndex >= -DEMO_BEATS && beatIndex !== displayedIndex && beatIndex < TOTAL) {
      displayedIndex = beatIndex;
      const visibleBeat = beatIndex < 0 ? beatIndex + DEMO_BEATS : beatIndex;
      dots.forEach((dot, i) => dot.classList.toggle('active', i === visibleBeat % 4));
      if (beatIndex < 0) {
        updateDemoCount(beatIndex);
        jumpAt = startAt + beatIndex * beatDuration;
        stones[visibleBeat + 3].node.classList.add('hit');
        say('쿵! 이렇게 콩!');
        sparks();
        feedback.style.opacity = '1';
      }
    }
    // Keep the track moving continuously from the demo into the child's first beat.
    renderStones(Math.max(0, (time - demoAt) / beatDuration));
    animateJump(time);
    if (phase === 'demo') {
      $('combo').textContent = '시범을 보는 중 ♪';
      const beatAge = (time - demoAt) % beatDuration;
      const tapping = time >= demoAt && beatAge < 0.14;
      action.classList.toggle('demo-pressed', tapping);
      scene.classList.toggle('beat-flash', tapping);
    }
    // Accept the normal early window when the demo hands over the first beat.
    if (phase === 'demo' && time >= startAt - HIT_WINDOW) {
      phase = 'playing';
      card.classList.remove('is-demo');
      action.classList.remove('demo-pressed');
      $('demo-guide').classList.add('handed-over');
      $('demo-heading').textContent = '이제 내 차례!';
      $('demo-countdown').textContent = '시작!';
      $('demo-progress').textContent = '8박자 시범 완료';
      $('combo').textContent = '이제 함께 콩콩!';
      say('이제 내 차례!');
      $('control-title').textContent = '쿵 소리가 나면 점프!';
      $('control-hint').innerHTML = '<kbd>Space</kbd> 키 · 버튼 · 화면 터치';
      action.innerHTML = '<span>콩! 점프</span><span>↟</span>';
      action.disabled = false;
    }
    if (phase === 'playing') {
      const position = Math.max(0, (time - startAt) / beatDuration);
      $('demo-guide').hidden = position > 1.5;
      $('progress').style.width = `${Math.min(100, position / TOTAL * 100)}%`;
      const expired = Math.min(TOTAL - 1, Math.floor((time - startAt - HIT_WINDOW) / beatDuration));
      for (let index = 0; index <= expired; index++) {
        if (!hits.has(index) && !misses.has(index)) {
          misses.add(index);
          streak = 0;
          stones[DEMO_BEATS + index + 3].node.classList.add('missed');
          $('combo').textContent = '다음 박자에 다시 콩!';
          if (time - feedbackAt > 0.2) say('괜찮아, 다시 콩!', false);
        }
      }
      scene.classList.toggle('beat-flash', time >= startAt && (time - startAt) % beatDuration < 0.14);
      if (time - feedbackAt > 0.65) feedback.style.opacity = '0';
      else feedback.style.opacity = '1';
      if (time > startAt + (TOTAL - 1) * beatDuration + Math.max(HIT_WINDOW + 0.2, beatDuration * 0.75)) { finish(); return; }
    }
    frame = requestAnimationFrame(tick);
  }

  function animateJump(time) {
    const progress = (time - jumpAt) / Math.min(0.48, interval() * 0.73);
    const height = progress >= 0 && progress < 1 ? Math.sin(progress * Math.PI) : 0;
    const amount = reducedMotion ? 7 : sceneWidth < 500 ? 65 : 84;
    $('bunny').style.transform = `translate(-50%, ${-height * amount}px) rotate(${reducedMotion ? 0 : height * -7}deg)`;
    $('bunny-shadow').style.transform = `translateX(-50%) scale(${1 - height * 0.35})`;
  }

  function jump() {
    if (phase !== 'playing') return;
    const time = now();
    if (time - lastTap < 0.28) return;
    lastTap = time;
    jumpAt = time;
    const beat = Math.round((time - startAt) / interval());
    const difference = Math.abs(time - (startAt + beat * interval()));
    if (beat >= 0 && beat < TOTAL && difference <= HIT_WINDOW && !hits.has(beat) && !misses.has(beat)) {
      hits.add(beat);
      score++;
      streak++;
      maxStreak = Math.max(maxStreak, streak);
      $('score').textContent = score;
      $('combo').textContent = streak > 1 ? `${streak}번 연속 콩콩!` : '좋아요! 계속 콩콩!';
      stones[DEMO_BEATS + beat + 3].node.classList.add('hit');
      say(difference <= PERFECT_WINDOW ? '딱 맞았어요! ✦' : '좋아요, 콩!');
      sparks();
      sounds?.jump(time + 0.005, difference <= PERFECT_WINDOW);
    } else if (hits.has(beat)) {
      say('다음 쿵에 다시 콩!', false);
    } else {
      say(time < startAt + beat * interval() ? '쿵 소리를 기다려요 ♪' : '박자를 들어봐요 ♪', false);
    }
  }

  function togglePause() {
    if (phase === 'paused') {
      if (document.hidden) return;
      resume();
      return;
    }
    if (phase !== 'playing' && phase !== 'demo') return;
    pausedPhase = phase;
    phase = 'paused';
    pauseAt = now();
    stopVoices();
    cancelAnimationFrame(frame);
    card.classList.add('is-paused');
    pause.textContent = '▶';
    pause.setAttribute('aria-label', '계속 놀기');
    action.innerHTML = '<span>계속 놀기</span><span>▶</span>';
    action.disabled = false;
    $('control-title').textContent = '충분히 쉬어도 괜찮아요';
    $('control-hint').textContent = '계속 놀기를 누르면 이어서 뛰어요';
  }

  async function resume() {
    if (phase !== 'paused') return;
    phase = 'resuming';
    action.disabled = true;
    try { await initAudio(); } catch { /* Visual play remains available. */ }
    if (document.hidden) { phase = 'paused'; action.disabled = false; return; }
    const time = now();
    // Leave a short breath before continuing the saved musical position.
    const shift = time - pauseAt + 0.25;
    startAt += shift;
    demoAt += shift;
    jumpAt += shift;
    feedbackAt += shift;
    scheduledIndex = Math.max(-DEMO_BEATS, Math.ceil((time - startAt) / interval()));
    phase = pausedPhase;
    card.classList.remove('is-paused');
    pause.textContent = 'Ⅱ';
    pause.setAttribute('aria-label', '잠깐 쉬기');
    action.disabled = phase === 'demo';
    action.innerHTML = phase === 'demo' ? '<span>이렇게 콩!</span><span>↟</span>' : '<span>콩! 점프</span><span>↟</span>';
    $('control-title').textContent = phase === 'demo' ? '토끼가 먼저 보여줄게요' : '쿵 소리가 나면 점프!';
    $('control-hint').innerHTML = '<kbd>Space</kbd> 키 · 버튼 · 화면 터치';
    frame = requestAnimationFrame(tick);
  }

  function finish() {
    phase = 'result';
    cancelAnimationFrame(frame);
    stopVoices();
    $('progress').style.width = '100%';
    pause.hidden = true;
    action.disabled = true;
    action.innerHTML = '<span>리듬 여행 완료!</span><span>✦</span>';
    $('bunny').style.transform = 'translateX(-50%)';
    dots.forEach((dot) => dot.classList.remove('active'));
    scene.classList.remove('beat-flash');
    best = Math.max(best, score);
    $('best').textContent = best;
    settings.write();
    $('result-score').textContent = score;
    $('result-streak').textContent = maxStreak;
    $('result-title').textContent = score >= 20 ? '우와, 리듬을 찾았어요!' : score >= 10 ? '점점 박자와 친해져요!' : '첫걸음도 멋진 도전이에요!';
    $('result-copy').textContent = `${TOTAL}번의 박자 중 ${score}번을 함께 뛰었어요.`;
    $('result-dialog').showModal();
    if (score > 0) {
      sounds?.finish(now() + 0.015);
    }
  }

  function backToSettings() {
    ++runToken;
    $('result-dialog').close();
    stopVoices();
    phase = 'idle';
    resetVisuals();
    action.focus({ preventScroll: true });
  }

  action.addEventListener('click', () => {
    if (phase === 'paused') resume();
    else if (phase === 'idle') start();
    else if (phase === 'playing') jump();
  });

  // Suppress browser selection, native drag ghosts, and double-tap zoom without
  // swallowing scrolling or the separate taps that make up a rhythm.
  const preventGesture = (event) => event.preventDefault();
  document.addEventListener('dblclick', preventGesture);
  document.addEventListener('dragstart', preventGesture);
  document.addEventListener('dragover', preventGesture);
  document.addEventListener('drop', preventGesture);
  document.addEventListener('selectstart', preventGesture);
  document.addEventListener('click', (event) => {
    if (event.detail > 1 && event.target !== action && !action.contains(event.target) && !scene.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  scene.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (phase === 'playing') { event.preventDefault(); jump(); }
  });
  // Native buttons dispatch click for keyboard access. Handle the scene separately.
  scene.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); if (phase === 'idle') start(); else jump(); }
  });
  document.addEventListener('keydown', (event) => {
    if ($('help-dialog').open || $('result-dialog').open) return;
    if (event.code === 'Space') {
      // Preserve native Space activation on secondary controls.
      if (event.target.closest('button') && event.target !== action) return;
      event.preventDefault();
      if (event.repeat) return;
      if (phase === 'idle') start();
      else if (phase === 'paused') resume();
      else jump();
    }
    if (event.code === 'Escape' && (phase === 'playing' || phase === 'demo' || phase === 'paused')) togglePause();
  });
  pause.addEventListener('click', togglePause);
  $('help').addEventListener('click', () => {
    if (phase === 'playing' || phase === 'demo') togglePause();
    $('help-dialog').showModal();
  });
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('again').addEventListener('click', () => { $('result-dialog').close(); start(); });
  $('back').addEventListener('click', backToSettings);
  $('result-dialog').addEventListener('cancel', (event) => { event.preventDefault(); backToSettings(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (phase === 'playing' || phase === 'demo') togglePause();
    else stopVoices();
  });
  window.addEventListener('pagehide', stopVoices);
})();
