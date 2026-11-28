// =====================================================
//  3曲目「和」（約1分）。琴・尺八・笙・太鼓・風鈴。都節の音階（D・E♭・G・A・B♭）
//  80 BPM・20小節：イントロ4 → Aメロ4 → ブレイク4 → サビ6 → アウトロ2
//  イントロ・ブレイク・アウトロの最後の一拍は無音にして、そこに「和の形の音」を入れる（アプリ側で、その場で混ぜる）
// =====================================================
const SONG3 = (() => {
  const BPM = 80, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 20, DUR = BAR * BARS;
  const SECTIONS = [
    { key: 'intro', from: 0, to: 4 }, { key: 'verse', from: 4, to: 8 }, { key: 'break', from: 8, to: 12 },
    { key: 'drop', from: 12, to: 18 }, { key: 'outro', from: 18, to: 20 },
  ];
  const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
  const GAPS = [T(3, 3), T(11, 3), T(19, 3)];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // 1小節ごとの響き：D – B♭ – G – A（低い音と、笙の合竹）
  const CH = [
    { root: 38, sho: [62, 69, 74, 75, 79] }, { root: 34, sho: [58, 65, 70, 74, 75] },
    { root: 31, sho: [55, 62, 67, 70, 74] }, { root: 33, sho: [57, 62, 69, 70, 75] },
  ];
  const KOTO = [62, 63, 67, 69, 70, 74, 75, 79, 81, 82, 86];   // 琴の音（都節）
  const ARP = [[0, 2, 4, 5, 4, 2, 3, 2], [0, 3, 4, 6, 4, 3, 2, 3], [1, 2, 4, 5, 7, 5, 4, 2], [0, 2, 3, 5, 6, 5, 3, 2]];
  const LEAD = [   // サビの尺八 [拍, 長さ, 音]
    [[0, 1.5, 74], [1.5, .5, 75], [2, 2, 79]], [[0, 1.5, 82], [1.5, .5, 81], [2, 1, 79], [3, 1, 75]], [[0, 2, 74], [2, 1, 75], [3, 1, 79]],
    [[0, 3, 81], [3, 1, 79]], [[0, 1, 86], [1, 1, 82], [2, 1.5, 81], [3.5, .5, 79]], [[0, 3, 75], [3, 1, 74]],
  ];
  const INTRO = [[[0, 2.5, 69], [2.5, 1.5, 70]], [[0, 3.5, 74]], [[0, 1.5, 75], [1.5, 2.5, 74]]];
  const BREAK = [[[0, 74], [1, 75], [2, 79], [3, 81]], [[0, 82], [1.5, 81], [2, 79]], [[0, 75], [1, 74], [2, 70], [3, 69]], [[0, 67], [1.5, 62]]];

  function render(sr) {
    const TAIL = 4, len = Math.ceil((DUR + TAIL) * sr);
    const oc = new OfflineAudioContext(2, len, sr);
    let seed = 8642; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noiseBuf = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
    const ir = (sec, damp) => { const n = Math.floor(sr * sec), b = oc.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * damp + (rnd() * 2 - 1) * (1 - damp); d[i] = lp * Math.pow(1 - i / n, 2.6); } } return b; };

    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.22;
    const master = oc.createGain(); master.gain.value = 0.85; master.connect(comp).connect(oc.destination);
    const gate = oc.createGain(); gate.connect(master);
    const music = oc.createGain(); music.connect(gate);
    const rv = oc.createConvolver(); rv.buffer = ir(3.2, 0.62); const rvR = oc.createGain(); rvR.gain.value = 0.36; rv.connect(rvR).connect(music);   // 木の広間のような残響
    const dl = oc.createDelay(2); dl.delayTime.value = BEAT * 0.5; const fb = oc.createGain(); fb.gain.value = 0.3;
    const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3400; dl.connect(dlp).connect(fb).connect(dl);
    const dlR = oc.createGain(); dlR.gain.value = 0.22; dlp.connect(dlR).connect(music);
    const send = (node, wet, del) => { const g = oc.createGain(); g.gain.value = wet; node.connect(g).connect(rv); if (del) { const h = oc.createGain(); h.gain.value = del; node.connect(h).connect(dl); } };
    const sec = bar => SECTIONS.find(s => bar >= s.from && bar < s.to).key;
    const env = (g, t0, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); return t0 + a + hold + rel; };
    const flt = (type, fq, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = fq; if (q) b.Q.value = q; return b; };
    const noise = (t0, dur) => { const n = oc.createBufferSource(); n.buffer = noiseBuf; n.start(t0, rnd() * 1.5); n.stop(t0 + dur); return n; };
    const pan = v => { const p = oc.createStereoPanner(); p.pan.value = v; return p; };

    // ---- 太鼓（どん）・締太鼓・拍子木
    const taiko = (t0, v = 1) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(48, t0 + 0.22);
      const g = oc.createGain(); const e = env(g, t0, 0.004, 0.95 * v, 0.05, 0.6); o.connect(g).connect(music); send(g, 0.25); o.start(t0); o.stop(e);
      const ng = oc.createGain(); env(ng, t0, 0.002, 0.3 * v, 0, 0.12); noise(t0, 0.15).connect(flt('lowpass', 900)).connect(ng).connect(music);
    };
    const ka = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.001, 0.22 * v, 0, 0.05); noise(t0, 0.07).connect(flt('bandpass', 2600, 4)).connect(g).connect(pan(0.25)).connect(music); send(g, 0.3); };   // 太鼓のふち
    const shime = (t0, v = 1, p = 0) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(330, t0); o.frequency.exponentialRampToValueAtTime(220, t0 + 0.06);
      const g = oc.createGain(); const e = env(g, t0, 0.002, 0.16 * v, 0, 0.09); o.connect(g).connect(pan(p)).connect(music); o.start(t0); o.stop(e);
      const ng = oc.createGain(); env(ng, t0, 0.001, 0.08 * v, 0, 0.04); noise(t0, 0.06).connect(flt('bandpass', 1800, 2)).connect(ng).connect(pan(p)).connect(music);
    };
    const hyoshigi = (t0, v = 1) => { [0, 0.09].forEach(d => { const g = oc.createGain(); env(g, t0 + d, 0.001, 0.35 * v, 0, 0.07); noise(t0 + d, 0.09).connect(flt('bandpass', 3200, 9)).connect(g).connect(music); send(g, 0.6); }); };

    // ---- 音色
    const sho = (bar, ch, v = 1, bars = 1) => {   // 笙：ゆっくり立ち上がる、すきとおった和音
      const t0 = T(bar), dur = BAR * bars, g = oc.createGain(); env(g, t0, 0.9, 0.032 * v, dur - 0.9, 1.6); const f = flt('lowpass', 3800, 0.6); f.connect(g).connect(music); send(g, 0.7);
      ch.sho.forEach((m, i) => [[1, 1], [2, 0.35], [3, 0.18]].forEach(([r, a]) => {
        const o = oc.createOscillator(); o.type = r === 1 ? 'triangle' : 'sine'; o.frequency.value = hz(m) * r; o.detune.value = (i - 2) * 2;
        const og = oc.createGain(); og.gain.value = a; o.connect(og).connect(pan((i - 2) * 0.22)).connect(f); o.start(t0); o.stop(t0 + dur + 2);
      }));
    };
    const koto = (t0, m, v = 1, p = 0) => {   // 琴：はじいた瞬間に明るく、すぐ丸くなる。押し手で少し高く入って落ち着く
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m) * 1.012, t0); o.frequency.exponentialRampToValueAtTime(hz(m), t0 + 0.06);
      const o2 = oc.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(m) * 2.003;
      const f = flt('lowpass', 5200, 1.4); f.frequency.setValueAtTime(5200, t0); f.frequency.exponentialRampToValueAtTime(900, t0 + 0.5);
      const g = oc.createGain(); const e = env(g, t0, 0.002, 0.11 * v, 0, 1.3); const g2 = oc.createGain(); g2.gain.value = 0.35;
      o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(pan(p)).connect(music); send(g, 0.4, 0.35); o.start(t0); o.stop(e + 0.02); o2.start(t0); o2.stop(e + 0.02);
    };
    const shakuhachi = (t0, dur, m, v = 1) => {   // 尺八：息の音まじりのやわらかい笛。少し下から入り、あとからビブラート
      const o = oc.createOscillator(); o.frequency.setValueAtTime(hz(m) * 0.97, t0); o.frequency.exponentialRampToValueAtTime(hz(m), t0 + 0.12);
      const vib = oc.createOscillator(); vib.frequency.value = 4.6; const vg = oc.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(14, t0 + Math.min(0.6, dur * 0.6)); vib.connect(vg).connect(o.detune);
      const o3 = oc.createOscillator(); o3.frequency.value = hz(m) * 2; const g3 = oc.createGain(); g3.gain.value = 0.18; o3.connect(g3);
      const g = oc.createGain(); const e = env(g, t0, 0.09, 0.12 * v, Math.max(0.05, dur - 0.12), 0.3);
      o.connect(g); g3.connect(g); g.connect(pan(-0.15)).connect(music); send(g, 0.55, 0.3);
      const br = oc.createGain(); env(br, t0, 0.05, 0.05 * v, Math.max(0.05, dur - 0.1), 0.25); noise(t0, dur + 0.4).connect(flt('bandpass', hz(m) * 2, 1.2)).connect(br).connect(music); send(br, 0.4);
      for (const x of [o, o3, vib]) { x.start(t0); x.stop(e + 0.05); }
    };
    const furin = (t0, v = 1) => { const m = KOTO[5 + Math.floor(rnd() * 6)] + 12, p = rnd() * 1.6 - 0.8;   // 風鈴
      [[1, 1, 1.8], [2.76, 0.3, 0.9], [5.4, 0.12, 0.5]].forEach(([r, a, d]) => { const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.002, 0.035 * a * v, 0, d);
        o.connect(g).connect(pan(p)).connect(music); send(g, 0.6, 0.4); o.start(t0); o.stop(e + 0.02); }); };
    const bass = (bar, ch, mode, v = 1) => {
      const hits = mode === 'pulse' ? [0, 1.5, 2, 3.5] : mode === 'half' ? [0, 2] : [0];
      for (const b of hits) { const t0 = T(bar, b), dur = mode === 'pulse' ? BEAT * 0.9 : mode === 'half' ? BEAT * 1.9 : BAR * 0.95;
        const o = oc.createOscillator(); o.frequency.value = hz(ch.root); const o2 = oc.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(ch.root + 12);
        const g = oc.createGain(); const e = env(g, t0, 0.01, 0.34 * v, Math.max(0.02, dur - 0.12), 0.16); const g2 = oc.createGain(); g2.gain.value = 0.22;
        o.connect(g); o2.connect(flt('lowpass', 600)).connect(g2).connect(g); g.connect(music); o.start(t0); o.stop(e + 0.02); o2.start(t0); o2.stop(e + 0.02); }
    };
    const gliss = (t0, up, v = 1) => { const seq = up ? KOTO : KOTO.slice().reverse(); seq.forEach((m, k) => koto(t0 + k * 0.045, m, 0.55 * v, (k / seq.length - 0.5) * 1.2)); };   // 琴のグリッサンド
    const roll = (t0, t1, v = 1) => { for (let t = t0, k = 0; t < t1; t += 0.09 * (1 - 0.5 * (t - t0) / (t1 - t0)), k++) shime(t, v * (0.3 + 0.7 * (t - t0) / (t1 - t0)), k % 2 ? 0.3 : -0.3); };   // 締太鼓のロール

    // ---- 曲の組み立て
    for (let bar = 0; bar < BARS; bar++) {
      const s = sec(bar), ch = CH[bar % 4], inS = bar - SECTIONS.find(x => x.key === s).from;
      if (s === 'intro') {
        sho(bar, ch, 0.8 + inS * 0.15);
        if (INTRO[inS]) INTRO[inS].forEach(([b, l, m]) => shakuhachi(T(bar, b), l * BEAT, m, 0.9));
        for (let k = 0; k < 2; k++) furin(T(bar, rnd() * 3.5), 0.8);
        if (inS === 3) { gliss(T(3, 0), true, 0.9); taiko(T(3, 0), 0.6); }
        if (bar === 0) hyoshigi(T(0), 0.8);
      } else if (s === 'verse') {
        sho(bar, ch, 0.8);
        bass(bar, ch, 'half', 0.55);
        ARP[bar % 4].forEach((ix, k) => koto(T(bar, k / 2), KOTO[ix], k % 2 ? 0.7 : 0.95, k % 2 ? 0.35 : -0.35));
        taiko(T(bar, 0), 0.42); if (inS % 2) taiko(T(bar, 2.5), 0.3);
        for (let k = 0; k < 4; k++) shime(T(bar, k + 0.5), 0.45, 0.3);
        if (inS === 0) hyoshigi(T(bar), 0.7);
        furin(T(bar, rnd() * 3.5), 0.6);
      } else if (s === 'break') {
        sho(bar, ch, 1.0);
        BREAK[inS].forEach(([b, m]) => koto(T(bar, b), m, 1.0, 0));
        for (let k = 0; k < 2; k++) furin(T(bar, rnd() * 3.5), 0.7);
        if (inS === 3) { bass(bar, ch, 'whole', 0.5); roll(T(11, 1), T(11, 3), 1); }
      } else if (s === 'drop') {
        sho(bar, ch, 0.85);
        bass(bar, ch, 'pulse', 1.0);
        for (let k = 0; k < 16; k++) koto(T(bar, k / 4), KOTO[ARP[bar % 4][k % 8] + (k >= 8 ? 2 : 0)], (k % 4 ? 0.5 : 0.85) * 0.8, ((k % 4) - 1.5) * 0.25);
        LEAD[inS].forEach(([b, l, m]) => shakuhachi(T(bar, b), l * BEAT, m, 1.05));
        [[0, 1], [1, 0.7], [1.5, 0.5], [2, 0.9], [3, 0.7], [3.5, 0.55]].forEach(([b, v]) => taiko(T(bar, b), v));
        ka(T(bar, 1)); ka(T(bar, 3));
        for (let k = 0; k < 8; k++) shime(T(bar, k / 2 + 0.25), k % 2 ? 0.45 : 0.6, k % 2 ? 0.3 : -0.3);
        if (inS === 0) { hyoshigi(T(bar), 1); gliss(T(bar), false, 0.8); }
        if (inS === 3) gliss(T(bar, 2), true, 0.6);
        furin(T(bar, rnd() * 3.5), 0.7);
      } else {   // outro：笙と琴で静かに。イントロへつながる
        sho(bar, ch, 1 - inS * 0.2);
        ARP[bar % 4].slice(0, 6).forEach((ix, k) => koto(T(bar, k * 0.5), KOTO[ix], 0.7 - inS * 0.2, (k % 2 ? 0.3 : -0.3)));
        if (inS === 0) { taiko(T(bar, 0), 0.7); shakuhachi(T(bar), BEAT * 3, 74, 0.8); }
        furin(T(bar, rnd() * 3), 0.6);
      }
    }
    for (const g0 of GAPS) {   // 無音の一拍
      gate.gain.setValueAtTime(1, g0 - 0.03); gate.gain.linearRampToValueAtTime(0, g0);
      gate.gain.setValueAtTime(0, g0 + BEAT - 0.004); gate.gain.linearRampToValueAtTime(1, g0 + BEAT);
    }
    return oc.startRendering().then(buf => {
      const n = Math.round(DUR * sr), out = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr });
      let peak = 0;
      for (let c = 0; c < 2; c++) {
        const src = buf.getChannelData(c), d = out.getChannelData(c); d.set(src.subarray(0, n));
        for (let i = 0; i < src.length - n; i++) d[i] += src[n + i];
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      }
      const k = 0.89 / (peak || 1);
      for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= k; }
      for (const g0 of GAPS) { const i0 = Math.round(g0 * sr), i1 = Math.round((g0 + BEAT - 0.01) * sr);
        for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = i0; i < i1; i++) d[i] = 0; } }
      return out;
    });
  }
  return { BPM, BEAT, BAR, BARS, DUR, SECTIONS, GAPS, T, render };
})();
