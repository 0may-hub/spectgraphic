// =====================================================
//  オリジナル曲（シンセウェイブ風・約1分）。ブラウザの中で一度だけ書き出して、くり返し再生する
//  112 BPM・28小節：イントロ4 → Aメロ8 → ブレイク4（最後の一拍に「かくれた山」）→ サビ8 → アウトロ4
// =====================================================
const SONG = (() => {
  const BPM = 112, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 28, DUR = BAR * BARS;
  const SECTIONS = [
    { key: 'intro', from: 0, to: 4 }, { key: 'verse', from: 4, to: 12 }, { key: 'break', from: 12, to: 16 },
    { key: 'drop', from: 16, to: 24 }, { key: 'outro', from: 24, to: 28 },
  ];
  const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
  const GAP = T(15, 3);                 // ブレイク最後の一拍は無音にして、
  const FUJI_T = GAP + 0.07;            // そこに一瞬だけ「山の形の音」を入れる（ポスターと同じ形）
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // コード（1小節ごと）：Am – F – C – G
  const CH = [
    { root: 33, pad: [57, 60, 64, 69] }, { root: 29, pad: [53, 57, 60, 65] },
    { root: 36, pad: [55, 60, 64, 67] }, { root: 31, pad: [55, 59, 62, 67] },
  ];
  const ARP = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]];
  // サビのメロディー [拍, 長さ, 音]
  const LEAD = [
    [[0, 1.5, 76], [1.5, .5, 74], [2, 1, 72], [3, 1, 74]], [[0, 1.5, 72], [1.5, .5, 69], [2, 2, 72]],
    [[0, 1, 67], [1, 1, 72], [2, 1.5, 76], [3.5, .5, 74]], [[0, 2, 74], [2, 1, 71], [3, 1, 74]],
    [[0, 1.5, 76], [1.5, .5, 79], [2, 1, 81], [3, 1, 79]], [[0, 1.5, 77], [1.5, .5, 76], [2, 2, 72]],
    [[0, 1, 76], [1, 1, 79], [2, 1.5, 76], [3.5, .5, 74]], [[0, 3, 74], [3, 1, 71]],
  ];
  const BELL = [[[0, 81], [1.5, 84], [3, 88]], [[0, 84], [1.5, 81], [3, 77]], [[0, 79], [1.5, 84], [3, 86]], [[0, 83], [1.5, 86]]];

  function render(sr, fujiShape) {
    const TAIL = 3, len = Math.ceil((DUR + TAIL) * sr);
    const oc = new OfflineAudioContext(2, len, sr);
    let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noiseBuf = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
    const ir = (sec, damp) => { const n = Math.floor(sr * sec), b = oc.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * damp + (rnd() * 2 - 1) * (1 - damp); d[i] = lp * Math.pow(1 - i / n, 3); } } return b; };

    // ---- ミックス：楽器 → (ポンプ) → 曲 → ゲート → マスター → コンプ
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const master = oc.createGain(); master.gain.value = 0.85; master.connect(comp).connect(oc.destination);
    const gate = oc.createGain(); gate.connect(master);
    const music = oc.createGain(); music.connect(gate);
    const pump = oc.createGain(); pump.connect(music);                    // キックに合わせて息をする（シンセウェイブらしさ）
    const rv = oc.createConvolver(); rv.buffer = ir(2.8, 0.6); const rvR = oc.createGain(); rvR.gain.value = 0.3; rv.connect(rvR).connect(music);
    const dl = oc.createDelay(2); dl.delayTime.value = BEAT * 0.75; const fb = oc.createGain(); fb.gain.value = 0.36;
    const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200; dl.connect(dlp).connect(fb).connect(dl);
    const dlR = oc.createGain(); dlR.gain.value = 0.28; dlp.connect(dlR).connect(music); dlR.connect(rv);
    const send = (node, wet, del) => { const g = oc.createGain(); g.gain.value = wet; node.connect(g).connect(rv); if (del) { const h = oc.createGain(); h.gain.value = del; node.connect(h).connect(dl); } };
    const sec = bar => SECTIONS.find(s => bar >= s.from && bar < s.to).key;
    const env = (g, t0, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); return t0 + a + hold + rel; };
    const lpf = (fq, q) => { const b = oc.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = fq; b.Q.value = q || 0.7; return b; };
    const flt = (type, fq, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = fq; if (q) b.Q.value = q; return b; };
    const noise = (t0, dur) => { const n = oc.createBufferSource(); n.buffer = noiseBuf; n.start(t0, rnd() * 1.5); n.stop(t0 + dur); return n; };
    const pan = v => { const p = oc.createStereoPanner(); p.pan.value = v; return p; };

    // ---- ドラム
    const kick = t0 => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(46, t0 + 0.11);
      const g = oc.createGain(); const end = env(g, t0, 0.002, 1.0, 0.04, 0.32); o.connect(g).connect(music); o.start(t0); o.stop(end);
      const c = oc.createGain(); env(c, t0, 0.001, 0.25, 0, 0.02); noise(t0, 0.03).connect(flt('highpass', 2500)).connect(c).connect(music);
      pump.gain.setValueAtTime(1, t0); pump.gain.linearRampToValueAtTime(0.38, t0 + 0.012); pump.gain.setTargetAtTime(1, t0 + 0.03, 0.1);
    };
    const snare = (t0, v = 1) => {
      const g = oc.createGain(); env(g, t0, 0.001, 0.42 * v, 0.01, 0.2); const n = noise(t0, 0.3); n.connect(flt('bandpass', 1900, 0.7)).connect(g); g.connect(music); send(g, 0.45);
      const o = oc.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t0); o.frequency.exponentialRampToValueAtTime(160, t0 + 0.08);
      const og = oc.createGain(); const e = env(og, t0, 0.001, 0.3 * v, 0, 0.1); o.connect(og).connect(music); o.start(t0); o.stop(e);
    };
    const hat = (t0, open, v = 1) => {
      const g = oc.createGain(); env(g, t0, 0.001, (open ? 0.12 : 0.1) * v, 0, open ? 0.22 : 0.035);
      noise(t0, open ? 0.3 : 0.06).connect(flt('highpass', 7200)).connect(flt('peaking', 10500, 1)).connect(g).connect(pan(open ? 0.2 : -0.15)).connect(music);
    };
    const crash = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.002, 0.16 * v, 0, 2.6); const n = noise(t0, 3); n.connect(flt('highpass', 4200)).connect(g).connect(music); send(g, 0.5); };

    // ---- 音色
    const pad = (bar, ch, cut0, cut1, v = 1) => {
      const t0 = T(bar), dur = BAR, f = lpf(cut0, 0.9); f.frequency.setValueAtTime(cut0, t0); f.frequency.linearRampToValueAtTime(cut1, t0 + dur);
      const g = oc.createGain(); env(g, t0, 0.35, 0.065 * v, dur - 0.35, 0.9); f.connect(g).connect(pump); send(g, 0.55);
      ch.pad.forEach((m, i) => [-9, 9].forEach((cents, j) => {
        const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents + (i - 1.5) * 2;
        const p = pan((j ? 0.35 : -0.35) * (i % 2 ? 1 : 0.6)); o.connect(p).connect(f); o.start(t0); o.stop(t0 + dur + 1.0);
      }));
    };
    const bass = (bar, ch, v = 1, octaves = true) => {
      for (let k = 0; k < 8; k++) {
        const t0 = T(bar, k / 2), m = ch.root + (octaves && (k % 4 === 2 || k === 7) ? 12 : 0);
        const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
        const s = oc.createOscillator(); s.type = 'sine'; s.frequency.value = hz(m - 12 < 24 ? m : m - 12);
        const f = lpf(1100, 2); f.frequency.setValueAtTime(1600, t0); f.frequency.exponentialRampToValueAtTime(260, t0 + 0.16);
        const g = oc.createGain(); const e = env(g, t0, 0.004, 0.32 * v, 0.12, 0.08);
        const sg = oc.createGain(); env(sg, t0, 0.004, 0.32 * v, 0.14, 0.06);
        o.connect(f).connect(g).connect(pump); s.connect(sg).connect(pump);
        o.start(t0); o.stop(e + 0.02); s.start(t0); s.stop(e + 0.02);
      }
    };
    const arp = (bar, notes, v = 1, cut = 3800, step = 0.25) => {
      const seq = [0, 1, 2, 3, 2, 1, 3, 4];
      for (let k = 0; k < 4 / step; k++) {
        const t0 = T(bar, k * step), idx = seq[k % seq.length], m = idx < 3 ? notes[idx] + 12 : notes[idx - 3 + (idx === 4 ? 1 : 0)] + 24;
        const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = hz(m);
        const f = lpf(cut, 1.2); const g = oc.createGain(); const e = env(g, t0, 0.003, 0.05 * v, 0.03, 0.12);
        o.connect(f).connect(g).connect(pan(k % 2 ? 0.4 : -0.4)).connect(pump); send(g, 0.2, 0.7); o.start(t0); o.stop(e + 0.02);
      }
    };
    const lead = (t0, dur, m, v = 1) => {
      const f = lpf(3400, 1.4); f.frequency.setValueAtTime(2200, t0); f.frequency.linearRampToValueAtTime(4200, t0 + 0.08);
      const g = oc.createGain(); const e = env(g, t0, 0.02, 0.085 * v, Math.max(0.05, dur - 0.08), 0.22);
      const vib = oc.createOscillator(); vib.frequency.value = 5.6; const vg = oc.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(14, t0 + 0.35); vib.connect(vg);
      [-7, 7].forEach(c => { const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = c; vg.connect(o.detune); o.connect(f); o.start(t0); o.stop(e + 0.05); });
      const sq = oc.createOscillator(); sq.type = 'square'; sq.frequency.value = hz(m - 12); const sqg = oc.createGain(); sqg.gain.value = 0.35; sq.connect(sqg).connect(f); sq.start(t0); sq.stop(e + 0.05);
      vib.start(t0); vib.stop(e + 0.05); f.connect(g).connect(music); send(g, 0.35, 0.45);
    };
    const bell = (t0, m, v = 1) => {
      [[1, 1, 2.2], [2.01, 0.45, 1.4], [3.02, 0.22, 0.9], [4.17, 0.15, 0.6], [5.43, 0.08, 0.4]].forEach(([r, a, d]) => {
        const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.003, 0.07 * a * v, 0, d);
        o.connect(g).connect(music); send(g, 0.6, 0.4); o.start(t0); o.stop(e + 0.02);
      });
    };
    const riser = (t0, t1, v = 1) => {
      const bp = flt('bandpass', 300, 2.2); bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1);
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1);
      noise(t0, t1 - t0 + 0.05).connect(bp).connect(g).connect(music); send(g, 0.3);
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(1760, t1);
      const og = oc.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.035 * v, t1 - 0.02); og.gain.linearRampToValueAtTime(0.0001, t1);
      const of = lpf(2500); o.connect(of).connect(og).connect(music); o.start(t0); o.stop(t1 + 0.02);
    };
    const subDrop = t0 => { const o = oc.createOscillator(); o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(32, t0 + 1.4);
      const g = oc.createGain(); const e = env(g, t0, 0.005, 0.7, 0.1, 1.4); o.connect(g).connect(music); o.start(t0); o.stop(e); };

    // ---- 曲の組み立て
    for (let bar = 0; bar < BARS; bar++) {
      const s = sec(bar), ch = CH[bar % 4], an = ARP[bar % 4], inS = bar - SECTIONS.find(x => x.key === s).from;
      if (s === 'intro') {
        pad(bar, ch, 420 + inS * 380, 800 + inS * 420, 1.35);
        arp(bar, an, 0.65 + inS * 0.15, 1000 + inS * 650);
        if (bar === 3) riser(T(3, 0), T(4, 0), 0.6);
      } else if (s === 'verse') {
        pad(bar, ch, 1500, 1800);
        bass(bar, ch, 0.9, inS >= 4);
        arp(bar, an, 0.8, 3200);
        for (let b = 0; b < 4; b++) kick(T(bar, b));
        snare(T(bar, 1)); snare(T(bar, 3));
        for (let k = 0; k < 8; k++) hat(T(bar, k / 2), false, k % 2 ? 1 : 0.6);
        if (inS === 0) crash(T(bar), 0.7);
      } else if (s === 'break') {
        pad(bar, ch, 2200 - inS * 300, 1900 - inS * 300, 1.05);
        BELL[inS].forEach(([b, m]) => bell(T(bar, b), m));
        if (inS < 2) arp(bar, an, 0.35, 1800, 0.5);
        if (inS === 2) riser(T(14, 0), T(15, 3), 1.0);
        if (inS === 3) { for (let b = 0; b < 3; b++) snare(T(15, b), 0.25 + b * 0.25); for (let k = 0; k < 12; k++) snare(T(15, k / 4), 0.15 + k * 0.03); }
      } else if (s === 'drop') {
        pad(bar, ch, 2400, 2600, 1.1);
        bass(bar, ch, 1.05, true);
        arp(bar, an, 0.75, 4200);
        LEAD[inS].forEach(([b, l, m]) => lead(T(bar, b), l * BEAT, m));
        for (let b = 0; b < 4; b++) kick(T(bar, b));
        snare(T(bar, 1)); snare(T(bar, 3));
        for (let k = 0; k < 16; k++) hat(T(bar, k / 4), false, k % 2 ? 0.55 : 0.9);
        for (let b = 0; b < 4; b++) hat(T(bar, b + 0.5), true, 0.8);
        if (inS === 0) { crash(T(bar), 1); subDrop(T(bar)); }
        if (inS === 4) crash(T(bar), 0.7);
      } else {   // outro：だんだん静かに、イントロへつながる
        pad(bar, ch, 2200 - inS * 450, 1800 - inS * 400, 1.0 - inS * 0.12);
        if (inS < 2) bass(bar, ch, 0.8 - inS * 0.25, false);
        arp(bar, an, 0.6 - inS * 0.1, 2600 - inS * 450);
        if (inS === 0) { lead(T(bar), BEAT * 3.5, 69, 0.9); crash(T(bar), 0.6); }
        if (inS < 3) { for (let b = 0; b < 4; b++) kick(T(bar, b)); if (inS < 2) { snare(T(bar, 1), 0.8); snare(T(bar, 3), 0.8); } }
        for (let k = 0; k < 8; k++) hat(T(bar, k / 2), false, (k % 2 ? 0.8 : 0.5) * (1 - inS * 0.2));
      }
    }
    // ブレイク最後の一拍：全部の音（残響も）を止める
    gate.gain.setValueAtTime(1, GAP - 0.03); gate.gain.linearRampToValueAtTime(0, GAP);
    gate.gain.setValueAtTime(0, T(16) - 0.004); gate.gain.linearRampToValueAtTime(1, T(16));

    return oc.startRendering().then(buf => {
      // 最後の残響を曲の頭に重ねて、くり返しの継ぎ目をなくす
      const n = Math.round(DUR * sr), out = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr });
      let peak = 0;
      for (let c = 0; c < 2; c++) {
        const src = buf.getChannelData(c), d = out.getChannelData(c); d.set(src.subarray(0, n));
        for (let i = 0; i < src.length - n; i++) d[i] += src[n + i];
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      }
      const k = 0.89 / (peak || 1);
      for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= k; }
      // 「かくれた山」：無音の一拍のはじめに、山の形をした音を0.12秒だけ（左右同じ）
      if (fujiShape) {
        const L = fujiShape.length, r = 0.012, h = 0.12, i0 = Math.round(FUJI_T * sr), i1 = Math.round((FUJI_T + 2 * r + h) * sr);
        for (let c = 0; c < 2; c++) { const d = out.getChannelData(c);
          for (let i = i0; i < i1; i++) { const t = (i - i0) / sr, e = t < r ? t / r : t > r + h ? Math.max(0, 1 - (t - r - h) / r) : 1; d[i] = fujiShape[(i - i0) % L] * 0.62 * e; } }
      }
      return out;
    });
  }
  return { BPM, BEAT, BAR, BARS, DUR, SECTIONS, FUJI_T, GAP, T, render };
})();
