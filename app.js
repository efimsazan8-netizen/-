(() => {
  const spinButton = document.querySelector('#spin');
  const reels = [...document.querySelectorAll('.reel')];
  const result = document.querySelector('#result');
  const cabinet = document.querySelector('.cabinet');
  const lastWin = document.querySelector('#last-win');
  const audio = Object.fromEntries(['roulette','spin','lose','win','coins','song'].map(name => [name, document.querySelector(`#${name}-audio`)]));
  const symbols = ['🐈','🔔','🌸','🐠','🎴','7️⃣','🪭','🍒'];
  const spinDuration = 7000;
  let busy = false;
  let rouletteFade;

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
      reel.replaceChildren(...Array.from({length: 5}, () => {
        const icon = document.createElement('span'); icon.className = 'symbol'; icon.textContent = symbols[Math.floor(Math.random() * symbols.length)]; return icon;
      }));
      reel.classList.add('spinning');
      reel.style.animationDelay = `${i * 35}ms`;
    });

    audio.song.pause();
    clearInterval(rouletteFade);
    play(audio.roulette, 0.25);
    play(audio.spin, 0.33);

    // Independent result each spin: a modest jackpot chance, with no score or persistent state.
    const jackpot = Math.random() < 0.035;
    const resultSymbols = jackpot
      ? [symbols[Math.floor(Math.random() * symbols.length)]]
      : [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
    if (jackpot) resultSymbols[1] = resultSymbols[2] = resultSymbols[0];

    const stops = [5100, 6000, 6900];
    for (let i = 0; i < reels.length; i++) {
      await wait(stops[i] - (i ? stops[i - 1] : 0));
      reels[i].classList.remove('spinning');
      reels[i].classList.add('stopping');
      showSymbol(reels[i], resultSymbols[i]);
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
        const start = performance.now();
        const rise = now => { audio.song.volume = Math.min(0.72, (now - start) / 1600 * 0.72); if (audio.song.volume < 0.72) requestAnimationFrame(rise); };
        requestAnimationFrame(rise);
      }).catch(() => {}); }, 1200);
    } else {
      result.textContent = 'ЕЩЁ ОДИН СПИН?';
      lastWin.textContent = '—';
      play(audio.lose, 0.8);
    }
    busy = false;
    spinButton.disabled = false;
  }

  spinButton.addEventListener('click', spin);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { audio.song.pause(); } });
})();
