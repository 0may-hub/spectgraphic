// =====================================================
//  2曲目「星座」（星空・約1分）。ブラウザの中で一度だけ書き出して、くり返し再生する
//  96 BPM・24小節：イントロ4 → Aメロ6 → ブレイク4 → サビ6 → アウトロ4
//  イントロ・ブレイク・アウトロの最後の一拍は無音にして、そこに「星座の形の音」を入れる（アプリ側で、その場で混ぜる）
// =====================================================
const SONG2 = (() => {
  const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 24, DUR = BAR * BARS;
  const SECTIONS = [
    { key: 'intro', from: 0, to: 4 }, { key: 'verse', from: 4, to: 10 }, { key: 'break', from: 10, to: 14 },
    { key: 'drop', from: 14, to: 20 }, { key: 'outro', from: 20, to: 24 },
  ];
  const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
  const GAPS = [T(3, 3), T(13, 3), T(23, 3)];   // 無音の一拍（星座の形の音を入れる場所）
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // コード（1小節ごと）：D – Bm – G – A（星空らしく、7th・9thを足して浮かせる）
  const CH = [
    { root: 38, pad: [62, 66, 69, 73], arp: [74, 78, 81, 85] },
    { root: 35, pad: [59, 62, 66, 69], arp: [71, 74, 78, 81] },
    { root: 31, pad: [59, 62, 66, 67], arp: [71, 74, 78, 79] },
    { root: 33, pad: [57, 61, 64, 69], arp: [73, 76, 81, 85] },
  ];
  const PENTA = [86, 88, 90, 93, 95, 98, 100, 102];   // きらめき（D メジャー・ペンタトニック）
  // サビのメロディー [拍, 長さ, 音]（コード：G A D Bm G A）
  const LEAD = [
    [[0, 1.5, 74], [1.5, .5, 76], [2, 1, 78], [3, 1, 79]], [[0, 2, 81], [2, 1, 79], [3, 1, 76]],
    [[0, 1.5, 78], [1.5, .5, 76], [2, 1, 74], [3, 1, 73]], [[0, 1.5, 74], [1.5, .5, 73], [2, 2, 71]],
    [[0, 1, 71], [1, 1, 74], [2, 1.5, 79], [3.5, .5, 78]], [[0, 3, 76], [3, 1, 73]],
  ];
  // ブレイクのオルゴール [拍, 音]
  const BOX = [[[0, 81], [1, 78], [2, 74], [3, 78]], [[0, 76], [1, 73], [2, 69], [3, 73]], [[0, 74], [1, 78], [2, 81], [3, 86]], [[0, 83], [1, 81], [2, 78]]];

  function render(sr) {
    const TAIL = 4, len = Math.ceil((DUR + TAIL) * sr);
    const oc = new OfflineAudioContext(2, len, sr);
    let seed = 24680; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noiseBuf = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
    const ir = (sec, damp) => { const n = Math.floor(sr * sec), b = oc.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * damp + (rnd() * 2 - 1) * (1 - damp); d[i] = lp * Math.pow(1 - i / n, 2.4); } } return b; };

    // ---- ミックス：楽器 → (ポンプ) → 曲 → ゲート → マスター → コンプ
    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.25;
    const master = oc.createGain(); master.gain.value = 0.85; master.connect(comp).connect(oc.destination);
    const gate = oc.createGain(); gate.connect(master);
    const music = oc.createGain(); music.connect(gate);
    const pump = oc.createGain(); pump.connect(music);
    const rv = oc.createConvolver(); rv.buffer = ir(4.2, 0.72); const rvR = oc.createGain(); rvR.gain.value = 0.42; rv.connect(rvR).connect(music);   // 夜空の広い残響
    const dl = oc.createDelay(2); dl.delayTime.value = BEAT * 0.75; const fb = oc.createGain(); fb.gain.value = 0.42;
    const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 4200; dl.connect(dlp).connect(fb).connect(dl);
    const dlR = oc.createGain(); dlR.gain.value = 0.3; dlp.connect(dlR).connect(music); dlR.connect(rv);
    const send = (node, wet, del) => { const g = oc.createGain(); g.gain.value = wet; node.connect(g).connect(rv); if (del) { const h = oc.createGain(); h.gain.value = del; node.connect(h).connect(dl); } };
    const sec = bar => SECTIONS.find(s => bar >= s.from && bar < s.to).key;
    const env = (g, t0, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); return t0 + a + hold + rel; };
    const lpf = (fq, q) => { const b = oc.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = fq; b.Q.value = q || 0.7; return b; };
    const flt = (type, fq, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = fq; if (q) b.Q.value = q; return b; };
    const noise = (t0, dur) => { const n = oc.createBufferSource(); n.buffer = noiseBuf; n.start(t0, rnd() * 1.5); n.stop(t0 + dur); return n; };
    const pan = v => { const p = oc.createStereoPanner(); p.pan.value = v; return p; };

    // ---- ドラム（やわらかめ）
    const kick = (t0, v = 1) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(44, t0 + 0.13);
      const g = oc.createGain(); const end = env(g, t0, 0.003, 0.85 * v, 0.03, 0.36); o.connect(g).connect(music); o.start(t0); o.stop(end);
      pump.gain.setValueAtTime(1, t0); pump.gain.linearRampToValueAtTime(1 - 0.5 * v, t0 + 0.015); pump.gain.setTargetAtTime(1, t0 + 0.04, 0.13);
    };
    const clap = (t0, v = 1) => {
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0);
      [0, 0.011, 0.023].forEach((d, k) => { g.gain.linearRampToValueAtTime(0.3 * v, t0 + d + 0.001); g.gain.exponentialRampToValueAtTime(0.05 * v, t0 + d + 0.01); });
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      noise(t0, 0.32).connect(flt('bandpass', 1500, 0.9)).connect(g).connect(music); send(g, 0.85);
    };
    const shaker = (t0, v = 1, p = 0) => { const g = oc.createGain(); env(g, t0, 0.004, 0.06 * v, 0, 0.05); noise(t0, 0.08).connect(flt('highpass', 6800)).connect(g).connect(pan(p)).connect(music); };
    const swell = (t0, v = 1) => { const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09 * v, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
      noise(t0, 3.4).connect(flt('highpass', 5200)).connect(g).connect(music); send(g, 0.6); };

    // ---- 音色
    const pad = (bar, ch, cut0, cut1, v = 1) => {   // ふわっと広がるパッド（三角波＋のこぎり波、ゆっくり立ち上がる）
      const t0 = T(bar), dur = BAR, f = lpf(cut0, 0.8); f.frequency.setValueAtTime(cut0, t0); f.frequency.linearRampToValueAtTime(cut1, t0 + dur);
      const g = oc.createGain(); env(g, t0, 0.7, 0.05 * v, dur - 0.7, 1.8); f.connect(g).connect(pump); send(g, 0.8);
      ch.pad.forEach((m, i) => [-11, 11].forEach((cents, j) => {
        const o = oc.createOscillator(); o.type = j ? 'triangle' : 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents + (i - 1.5) * 3;
        const og = oc.createGain(); og.gain.value = j ? 1.3 : 0.55;
        o.connect(og).connect(pan((j ? 0.45 : -0.45) * (i % 2 ? 1 : 0.7))).connect(f); o.start(t0); o.stop(t0 + dur + 2);
      }));
    };
    const celesta = (t0, m, v = 1, p = 0) => {   // チェレスタ（きらきらした鍵盤）
      [[1, 1, 1.7], [2, 0.28, 0.8], [3, 0.12, 0.45], [4.07, 0.07, 0.25]].forEach(([r, a, d]) => {
        const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.002, 0.06 * a * v, 0, d);
        o.connect(g).connect(pan(p)).connect(music); send(g, 0.5, 0.5); o.start(t0); o.stop(e + 0.02);
      });
    };
    const box = (t0, m, v = 1) => {   // オルゴール
      [[1, 1, 2.4], [2.76, 0.35, 1.2], [5.4, 0.12, 0.6], [8.93, 0.05, 0.3]].forEach(([r, a, d]) => {
        const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.002, 0.075 * a * v, 0, d);
        o.connect(g).connect(music); send(g, 0.7, 0.55); o.start(t0); o.stop(e + 0.02);
      });
    };
    const twinkle = (t0, v = 1) => { const m = PENTA[Math.floor(rnd() * PENTA.length)]; celesta(t0, m, 0.55 * v, (rnd() * 2 - 1) * 0.85); };   // 星のまたたき
    const bass = (bar, ch, mode, v = 1) => {
      const hits = mode === 'pulse' ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : mode === 'half' ? [0, 2] : [0];
      const dur = mode === 'pulse' ? BEAT * 0.45 : mode === 'half' ? BEAT * 1.9 : BAR * 0.95;
      for (const b of hits) {
        const t0 = T(bar, b), m = ch.root + (mode === 'pulse' && (b === 1.5 || b === 3.5) ? 12 : 0);
        const s = oc.createOscillator(); s.type = 'sine'; s.frequency.value = hz(m);
        const tr = oc.createOscillator(); tr.type = 'triangle'; tr.frequency.value = hz(m + 12); const f = lpf(700, 1);
        const g = oc.createGain(); const e = env(g, t0, 0.008, 0.36 * v, Math.max(0.02, dur - 0.1), 0.12);
        const tg = oc.createGain(); tg.gain.value = 0.25; s.connect(g); tr.connect(f).connect(tg).connect(g); g.connect(pump);
        s.start(t0); s.stop(e + 0.02); tr.start(t0); tr.stop(e + 0.02);
      }
    };
    const arp = (bar, ch, v = 1, step = 0.5) => {
      const seq = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let k = 0; k < 4 / step; k++) celesta(T(bar, k * step), ch.arp[seq[k % seq.length]], (k % 2 ? 0.75 : 1) * v, k % 2 ? 0.35 : -0.35);
    };
    const lead = (t0, dur, m, v = 1) => {   // サビのメロディー（やわらかい笛のような音＋鈴）
      const f = lpf(2600, 0.9);
      const g = oc.createGain(); const e = env(g, t0, 0.04, 0.1 * v, Math.max(0.05, dur - 0.1), 0.35);
      const vib = oc.createOscillator(); vib.frequency.value = 5.2; const vg = oc.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(11, t0 + 0.4); vib.connect(vg);
      [['sine', 0, 1], ['triangle', 12, 0.35], ['sine', -12, 0.3]].forEach(([tp, o12, a]) => {
        const o = oc.createOscillator(); o.type = tp; o.frequency.value = hz(m + o12); vg.connect(o.detune); const og = oc.createGain(); og.gain.value = a; o.connect(og).connect(f); o.start(t0); o.stop(e + 0.05);
      });
      vib.start(t0); vib.stop(e + 0.05); f.connect(g).connect(music); send(g, 0.45, 0.5);
      celesta(t0, m + 12, 0.45);
    };
    const shootingStar = (t0, v = 1) => {   // 流れ星：高いところから降りてくる音
      const bp = flt('bandpass', 9000, 3); bp.frequency.setValueAtTime(9500, t0); bp.frequency.exponentialRampToValueAtTime(1400, t0 + 1.3);
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2 * v, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
      const p = oc.createStereoPanner(); p.pan.setValueAtTime(-0.8, t0); p.pan.linearRampToValueAtTime(0.8, t0 + 1.5);
      noise(t0, 1.6).connect(bp).connect(g).connect(p).connect(music); send(g, 0.6);
      const o = oc.createOscillator(); o.frequency.setValueAtTime(2600, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
      const og = oc.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.03 * v, t0 + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
      o.connect(og).connect(p); o.start(t0); o.stop(t0 + 1.4);
    };
    const riser = (t0, t1, v = 1) => {
      const bp = flt('bandpass', 400, 2); bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(8000, t1);
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1);
      noise(t0, t1 - t0 + 0.05).connect(bp).connect(g).connect(music); send(g, 0.4);
    };
    const subDrop = t0 => { const o = oc.createOscillator(); o.frequency.setValueAtTime(62, t0); o.frequency.exponentialRampToValueAtTime(30, t0 + 1.6);
      const g = oc.createGain(); const e = env(g, t0, 0.01, 0.55, 0.1, 1.6); o.connect(g).connect(music); o.start(t0); o.stop(e); };

    // ---- 曲の組み立て
    for (let bar = 0; bar < BARS; bar++) {
      const s = sec(bar), ch = CH[bar % 4], inS = bar - SECTIONS.find(x => x.key === s).from;
      if (s === 'intro') {
        pad(bar, ch, 500 + inS * 300, 900 + inS * 350, 1.3);
        arp(bar, ch, 0.45 + inS * 0.12, 1);
        for (let k = 0; k < 3; k++) twinkle(T(bar, rnd() * 3.5), 0.8);
        if (bar === 0) swell(T(0), 0.8);
      } else if (s === 'verse') {
        pad(bar, ch, 1400, 1700, 1.0);
        bass(bar, ch, 'half', 0.9);
        arp(bar, ch, 0.75, 0.5);
        kick(T(bar, 0), 0.7); kick(T(bar, 2), 0.6); if (inS >= 3) clap(T(bar, 3), 0.55);
        for (let k = 0; k < 8; k++) shaker(T(bar, k / 2), k % 2 ? 1 : 0.5, k % 2 ? 0.3 : -0.3);
        for (let k = 0; k < 2; k++) twinkle(T(bar, rnd() * 3.5), 0.7);
        if (inS === 0) { shootingStar(T(bar), 0.9); swell(T(bar), 0.6); }
      } else if (s === 'break') {
        pad(bar, ch, 1800 - inS * 250, 1500 - inS * 250, 1.1);
        BOX[inS].forEach(([b, m]) => box(T(bar, b), m));
        for (let k = 0; k < 2; k++) twinkle(T(bar, rnd() * 3.5), 0.6);
        if (inS === 2) riser(T(12, 2), T(13, 3), 0.9);
        if (inS === 3) { bass(bar, ch, 'whole', 0.6); for (let k = 0; k < 6; k++) shaker(T(13, 1.5 + k / 4), 0.3 + k * 0.12); }
      } else if (s === 'drop') {
        pad(bar, ch, 2400, 2700, 1.05);
        bass(bar, ch, 'pulse', 1.0);
        arp(bar, ch, 0.7, 0.5);
        LEAD[inS].forEach(([b, l, m]) => lead(T(bar, b), l * BEAT, m));
        for (let b = 0; b < 4; b++) kick(T(bar, b), 1);
        clap(T(bar, 1)); clap(T(bar, 3));
        for (let k = 0; k < 16; k++) shaker(T(bar, k / 4), k % 2 ? 0.5 : 0.9, k % 2 ? 0.35 : -0.35);
        for (let k = 0; k < 3; k++) twinkle(T(bar, rnd() * 3.5), 0.8);
        if (inS === 0) { swell(T(bar), 1); subDrop(T(bar)); shootingStar(T(bar, 0.5), 1); }
        if (inS === 3) shootingStar(T(bar, 2), 0.7);
      } else {   // outro：静かに、イントロへつながる
        pad(bar, ch, 1900 - inS * 350, 1500 - inS * 300, 1.1 - inS * 0.1);
        if (inS < 2) bass(bar, ch, 'half', 0.7 - inS * 0.2);
        arp(bar, ch, 0.6 - inS * 0.1, inS < 2 ? 0.5 : 1);
        if (inS === 0) { lead(T(bar), BEAT * 3.5, 78, 0.8); swell(T(bar), 0.6); }
        if (inS < 2) { kick(T(bar, 0), 0.6 - inS * 0.2); kick(T(bar, 2), 0.5 - inS * 0.2); }
        for (let k = 0; k < 8; k++) shaker(T(bar, k / 2), (k % 2 ? 0.7 : 0.4) * (1 - inS * 0.22));
        for (let k = 0; k < 3; k++) twinkle(T(bar, rnd() * 3.5), 0.7);
      }
    }
    // 無音の一拍：全部の音（残響も）を止める
    for (const g0 of GAPS) {
      gate.gain.setValueAtTime(1, g0 - 0.03); gate.gain.linearRampToValueAtTime(0, g0);
      gate.gain.setValueAtTime(0, g0 + BEAT - 0.004); gate.gain.linearRampToValueAtTime(1, g0 + BEAT);
    }

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
      // 無音の一拍は、重ねた残響もふくめて完全に無音にする（星座の形の音だけが解析されるように）
      for (const g0 of GAPS) { const i0 = Math.round(g0 * sr), i1 = Math.round((g0 + BEAT - 0.01) * sr);
        for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = i0; i < i1; i++) d[i] = 0; } }
      return out;
    });
  }
  return { BPM, BEAT, BAR, BARS, DUR, SECTIONS, GAPS, T, render };
})();
