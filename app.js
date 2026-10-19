(() => {
  const spinButton = document.querySelector('#spin');
  const reels = [...document.querySelectorAll('.reel')];
  const result = document.querySelector('#result');
  const cabinet = document.querySelector('.cabinet');
  const lastWin = document.querySelector('#last-win');
  const audio = Object.fromEntries(['roulette','spin','stop','lose','win','coins','song'].map(name => [name, document.querySelector(`#${name}-audio`)]));
  const symbols = ['🐈','🔔','🌸','🐠','🎴','7️⃣','🪭','🍒'];
  const spinDuration = 7000;
  let busy = false;
  const reelTimers = [];
  let audioContext;
  let analyser;
  let frequencyData;
  let glowFrame;

  function animateMusicGlow() {
    if (!analyser || !frequencyData) return;
    analyser.getByteFrequencyData(frequencyData);
    const bassBins = Math.max(1, Math.floor(160 / (audioContext.sampleRate / analyser.fftSize)));
    let bass = 0;
    for (let i = 0; i < bassBins; i++) bass += frequencyData[i];
    bass /= bassBins * 255;
    const beat = Math.min(1, bass * 2.8);
    document.documentElement.style.setProperty('--music-beat', beat.toFixed(3));
    document.documentElement.style.setProperty('--music-opacity', (0.22 + beat * 0.72).toFixed(3));
    document.documentElement.style.setProperty('--music-scale', (0.85 + beat * 0.3).toFixed(3));
    glowFrame = requestAnimationFrame(animateMusicGlow);
  }

  function startMusicGlow() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      audioContext.createMediaElementSource(audio.song).connect(analyser);
      analyser.connect(audioContext.destination);
    }
    audioContext.resume().catch(() => {});
    cancelAnimationFrame(glowFrame);
    document.querySelector('.arcade').classList.add('music-playing');
    animateMusicGlow();
  }

  function stopMusicGlow() {
    cancelAnimationFrame(glowFrame);
    document.querySelector('.arcade').classList.remove('music-playing');
    document.documentElement.style.setProperty('--music-beat', '0');
    document.documentElement.style.setProperty('--music-opacity', '0');
    document.documentElement.style.setProperty('--music-scale', '1');
  }

  function fadeOut(element, milliseconds = 900) {
    if (!element) return;
    const start = element.volume;
    const started = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - started) / milliseconds);
      element.volume = Math.max(0, start * (1 - progress));
      if (progress < 1) requestAnimationFrame(tick);
      else { element.pause(); element.currentTime = 0; element.volume = start; }
    };
    requestAnimationFrame(tick);
  }

  function play(element, volume = 1) {
    if (!element) return;
    element.volume = volume;
    element.currentTime = 0;
    element.play().catch(() => {});
  }

  function showSymbol(reel, symbol) {
    reel.classList.remove('spinning', 'stopping');
    reel.replaceChildren();
    const icon = document.createElement('span');
    icon.className = 'symbol';
    icon.textContent = symbol;
    reel.append(icon);
  }

  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function spin() {
    if (busy) return;
    busy = true;
    spinButton.disabled = true;
    result.classList.remove('jackpot');
    result.textContent = 'УДАЧА УЖЕ В ПУТИ…';
    cabinet.classList.remove('is-winning');
    reels.forEach((reel, i) => {
      clearInterval(reelTimers[i]);
      const refreshReel = () => {
        reel.replaceChildren(...Array.from({length: 3}, () => {
          const icon = document.createElement('span');
          icon.className = 'symbol';
          icon.textContent = symbols[Math.floor(Math.random() * symbols.length)];
          return icon;
        }));
      };
      refreshReel();
      reelTimers[i] = setInterval(refreshReel, 100);
      reel.classList.add('spinning');
      reel.style.animationDelay = `${i * 35}ms`;
    });

    audio.song.pause();
    play(audio.roulette, 0.25);
    play(audio.spin, 0.33);

    // Independent result each spin, with a 15% jackpot chance and no persistent state.
    const jackpot = Math.random() < 0.15;
    const jackpotSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const resultSymbols = jackpot
      ? [jackpotSymbol, jackpotSymbol, jackpotSymbol]
      : [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
    // Keep the configured jackpot rate at exactly 15% while never showing a losing triple.
    if (!jackpot && resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]) {
      resultSymbols[2] = symbols[(symbols.indexOf(resultSymbols[2]) + 1) % symbols.length];
    }

    const stops = [5100, 6000, 6900];
    for (let i = 0; i < reels.length; i++) {
      await wait(stops[i] - (i ? stops[i - 1] : 0));
      reels[i].classList.remove('spinning');
      clearInterval(reelTimers[i]);
      reels[i].classList.add('stopping');
      showSymbol(reels[i], resultSymbols[i]);
      play(audio.stop, 0.45);
    }
    await wait(Math.max(0, spinDuration - stops[2]));
    fadeOut(audio.roulette, 350);
    fadeOut(audio.spin, 350);

    if (jackpot) {
      result.textContent = 'JACKPOT! FEVER TIME!';
      result.classList.add('jackpot');
      lastWin.textContent = '777';
      cabinet.classList.add('is-winning');
      play(audio.win, 0.8);
      play(audio.coins, 0.52);
      setTimeout(() => { fadeOut(audio.win, 1000); fadeOut(audio.coins, 1200); audio.song.volume = 0; audio.song.currentTime = 0; audio.song.play().then(() => {
        startMusicGlow();
        const start = performance.now();
        const rise = now => { audio.song.volume = Math.min(0.72, (now - start) / 1600 * 0.72); if (audio.song.volume < 0.72) requestAnimationFrame(rise); };
        requestAnimationFrame(rise);
      }).catch(() => {}); }, 1200);
    } else {
      stopMusicGlow();
      result.textContent = 'ЕЩЁ ОДИН СПИН?';
      lastWin.textContent = '—';
      play(audio.lose, 0.8);
    }
    busy = false;
    spinButton.disabled = false;
  }

  spinButton.addEventListener('click', spin);
  audio.song.addEventListener('pause', stopMusicGlow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { audio.song.pause(); } });
})();
