// =====================================================
//  2曲目「星座」（約1分）。星空のディスコ：4つ打ち・オクターブのベース・キラキラのベル
//  112 BPM・28小節（1曲目と同じ）：イントロ4 → Aメロ8 → ブレイク4（最後の一拍は無音＝星座の形の音）→ サビ8 → アウトロ4
// =====================================================
const SONG2 = (() => {
  const BPM = 112, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 28, DUR = BAR * BARS;
  const SECTIONS = [
    { key: 'intro', from: 0, to: 4 }, { key: 'verse', from: 4, to: 12 }, { key: 'break', from: 12, to: 16 },
    { key: 'drop', from: 16, to: 24 }, { key: 'outro', from: 24, to: 28 },
  ];
  const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
  const GAP = T(15, 3);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // 1小節ごと：Dmaj7 – Bm7 – Gmaj7 – A
  const CH = [
    { root: 38, pad: [62, 66, 69, 73], arp: [62, 66, 69, 73, 74] }, { root: 35, pad: [59, 62, 66, 69], arp: [59, 62, 66, 69, 71] },
    { root: 31, pad: [59, 62, 66, 67], arp: [55, 59, 62, 66, 67] }, { root: 33, pad: [57, 61, 64, 69], arp: [57, 61, 64, 69, 71] },
  ];
  const LEAD = [   // サビのメロディー [拍, 長さ, 音]
    [[0, 1, 74], [1, .5, 76], [1.5, 1, 78], [2.5, .5, 76], [3, 1, 81]], [[0, 1.5, 78], [1.5, .5, 76], [2, 2, 74]],
    [[0, 1, 71], [1, .5, 74], [1.5, 1, 78], [2.5, 1.5, 76]], [[0, 1, 76], [1, 1, 73], [2, 1, 76], [3, 1, 81]],
    [[0, 1, 86], [1, .5, 85], [1.5, 1, 83], [2.5, .5, 81], [3, 1, 78]], [[0, 1.5, 83], [1.5, .5, 81], [2, 1, 78], [3, 1, 74]],
    [[0, 1, 79], [1, .5, 78], [1.5, 1, 76], [2.5, .5, 74], [3, 1, 76]], [[0, 3, 74], [3, 1, 73]],
  ];
  const HOOK = [[0, 86], [0.75, 85], [1.5, 81], [2.5, 78], [3, 81]];   // Aメロ後半の短いベルのフレーズ

  function render(sr) {
    const TAIL = 3, len = Math.ceil((DUR + TAIL) * sr);
    const oc = new OfflineAudioContext(2, len, sr);
    let seed = 24680; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noiseBuf = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
    const ir = (sec, damp) => { const n = Math.floor(sr * sec), b = oc.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * damp + (rnd() * 2 - 1) * (1 - damp); d[i] = lp * Math.pow(1 - i / n, 3); } } return b; };

    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const master = oc.createGain(); master.gain.value = 0.85; master.connect(comp).connect(oc.destination);
    const gate = oc.createGain(); gate.connect(master);
    const music = oc.createGain(); music.connect(gate);
    const pump = oc.createGain(); pump.connect(music);
    const rv = oc.createConvolver(); rv.buffer = ir(3.2, 0.55); const rvR = oc.createGain(); rvR.gain.value = 0.32; rv.connect(rvR).connect(music);
    const dl = oc.createDelay(2); dl.delayTime.value = BEAT * 0.75; const fb = oc.createGain(); fb.gain.value = 0.34;
    const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 4200; dl.connect(dlp).connect(fb).connect(dl);
    const dlR = oc.createGain(); dlR.gain.value = 0.26; dlp.connect(dlR).connect(music); dlR.connect(rv);
    const send = (node, wet, del) => { const g = oc.createGain(); g.gain.value = wet; node.connect(g).connect(rv); if (del) { const h = oc.createGain(); h.gain.value = del; node.connect(h).connect(dl); } };
    const sec = bar => SECTIONS.find(s => bar >= s.from && bar < s.to).key;
    const env = (g, t0, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); return t0 + a + hold + rel; };
    const lpf = (fq, q) => { const b = oc.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = fq; b.Q.value = q || 0.7; return b; };
    const flt = (type, fq, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = fq; if (q) b.Q.value = q; return b; };
    const noise = (t0, dur) => { const n = oc.createBufferSource(); n.buffer = noiseBuf; n.start(t0, rnd() * 1.5); n.stop(t0 + dur); return n; };
    const pan = v => { const p = oc.createStereoPanner(); p.pan.value = v; return p; };

    // ---- ドラム（ディスコの4つ打ち）
    const kick = (t0, v = 1) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(48, t0 + 0.1);
      const g = oc.createGain(); const end = env(g, t0, 0.002, 1.0 * v, 0.04, 0.28); o.connect(g).connect(music); o.start(t0); o.stop(end);
      const c = oc.createGain(); env(c, t0, 0.001, 0.22 * v, 0, 0.02); noise(t0, 0.03).connect(flt('highpass', 2800)).connect(c).connect(music);
      pump.gain.setValueAtTime(1, t0); pump.gain.linearRampToValueAtTime(0.42, t0 + 0.012); pump.gain.setTargetAtTime(1, t0 + 0.03, 0.09);
    };
    const clap = (t0, v = 1) => {
      [0, 0.011, 0.022].forEach((d, k) => { const g = oc.createGain(); env(g, t0 + d, 0.001, (k === 2 ? 0.4 : 0.22) * v, 0, k === 2 ? 0.16 : 0.012);
        noise(t0 + d, 0.2).connect(flt('bandpass', 1500, 1.1)).connect(g).connect(music); if (k === 2) send(g, 0.4); });
    };
    const snare = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.001, 0.36 * v, 0.01, 0.16); noise(t0, 0.25).connect(flt('bandpass', 2000, 0.8)).connect(g).connect(music); send(g, 0.35); };
    const hat = (t0, open, v = 1) => {
      const g = oc.createGain(); env(g, t0, 0.001, (open ? 0.13 : 0.08) * v, 0, open ? 0.2 : 0.03);
      noise(t0, open ? 0.3 : 0.05).connect(flt('highpass', 7500)).connect(flt('peaking', 11000, 1)).connect(g).connect(pan(open ? 0.18 : -0.2)).connect(music);
    };
    const shaker = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.008, 0.05 * v, 0, 0.04); noise(t0, 0.08).connect(flt('bandpass', 6500, 1.5)).connect(g).connect(pan(0.35)).connect(music); };
    const crash = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.002, 0.15 * v, 0, 2.6); noise(t0, 3).connect(flt('highpass', 4500)).connect(g).connect(music); send(g, 0.5); };

    // ---- 音色
    const pad = (bar, ch, cut0, cut1, v = 1) => {
      const t0 = T(bar), dur = BAR, f = lpf(cut0, 0.8); f.frequency.setValueAtTime(cut0, t0); f.frequency.linearRampToValueAtTime(cut1, t0 + dur);
      const g = oc.createGain(); env(g, t0, 0.3, 0.055 * v, dur - 0.3, 0.8); f.connect(g).connect(pump); send(g, 0.6);
      ch.pad.forEach((m, i) => [-8, 8].forEach((cents, j) => {
        const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents + (i - 1.5) * 2;
        o.connect(pan((j ? 0.4 : -0.4) * (i % 2 ? 1 : 0.6))).connect(f); o.start(t0); o.stop(t0 + dur + 0.9);
      }));
    };
    const bass = (bar, ch, v = 1, mode = 'oct') => {   // ディスコのオクターブ：下・上・下・上
      for (let k = 0; k < 8; k++) {
        if (mode === 'sparse' && k % 2) continue;
        const t0 = T(bar, k / 2), m = ch.root + (mode === 'oct' && k % 2 ? 12 : 0);
        const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
        const s = oc.createOscillator(); s.type = 'sine'; s.frequency.value = hz(k % 2 ? m - 12 : m);
        const f = lpf(1000, 3); f.frequency.setValueAtTime(2200, t0); f.frequency.exponentialRampToValueAtTime(320, t0 + 0.14);
        const g = oc.createGain(); const e = env(g, t0, 0.003, 0.26 * v, 0.1, 0.07);
        const sg = oc.createGain(); env(sg, t0, 0.003, 0.34 * v, 0.12, 0.06);
        o.connect(f).connect(g).connect(pump); s.connect(sg).connect(pump); o.start(t0); o.stop(e + 0.02); s.start(t0); s.stop(e + 0.02);
      }
    };
    const bell = (t0, m, v = 1, p = 0) => {   // チェレスタのような澄んだベル
      [[1, 1, 1.6], [2, 0.38, 0.9], [3.01, 0.16, 0.55], [4.2, 0.09, 0.35]].forEach(([r, a, d]) => {
        const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.002, 0.06 * a * v, 0, d);
        o.connect(g).connect(pan(p)).connect(music); send(g, 0.5, 0.35); o.start(t0); o.stop(e + 0.02);
      });
    };
    const arp = (bar, ch, v = 1, step = 0.25) => {   // 16分のきらきら（上がって下がる）
      const seq = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let k = 0; k < 4 / step; k++) bell(T(bar, k * step), ch.arp[seq[k % 8]] + 12, (k % 4 ? 0.55 : 0.85) * v, k % 2 ? 0.45 : -0.45);
    };
    const pluck = (bar, ch, v = 1) => {   // ギターのカッティング風：裏拍のコード
      for (let b = 0; b < 4; b++) {
        const t0 = T(bar, b + 0.5), f = lpf(2600, 1.5); f.frequency.setValueAtTime(3200, t0); f.frequency.exponentialRampToValueAtTime(700, t0 + 0.12);
        const g = oc.createGain(); const e = env(g, t0, 0.002, 0.05 * v, 0.03, 0.08); f.connect(g).connect(pump); send(g, 0.15);
        ch.pad.forEach(m => { const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = hz(m); o.connect(f); o.start(t0); o.stop(e + 0.02); });
      }
    };
    const lead = (t0, dur, m, v = 1) => {   // 明るいシンセのリード（ベルを重ねる）
      const f = lpf(4200, 1.2); f.frequency.setValueAtTime(2600, t0); f.frequency.linearRampToValueAtTime(5200, t0 + 0.06);
      const g = oc.createGain(); const e = env(g, t0, 0.012, 0.075 * v, Math.max(0.05, dur - 0.06), 0.18);
      const vib = oc.createOscillator(); vib.frequency.value = 5.8; const vg = oc.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(12, t0 + 0.3); vib.connect(vg);
      [-8, 8].forEach(c => { const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = c; vg.connect(o.detune); o.connect(f); o.start(t0); o.stop(e + 0.05); });
      const sq = oc.createOscillator(); sq.type = 'square'; sq.frequency.value = hz(m + 12); const sqg = oc.createGain(); sqg.gain.value = 0.18; sq.connect(sqg).connect(f); sq.start(t0); sq.stop(e + 0.05);
      vib.start(t0); vib.stop(e + 0.05); f.connect(g).connect(music); send(g, 0.35, 0.4);
      bell(t0, m + 12, 0.7 * v);
    };
    const star = (t0, v = 1) => {   // 流れ星：高いところから落ちてくる「ひゅーん」
      const bp = flt('bandpass', 9000, 6); bp.frequency.setValueAtTime(9000, t0); bp.frequency.exponentialRampToValueAtTime(1200, t0 + 0.9);
      const g = oc.createGain(); env(g, t0, 0.02, 0.12 * v, 0.2, 0.7); noise(t0, 1.2).connect(bp).connect(g).connect(pan(0.5)).connect(music); send(g, 0.5, 0.4);
    };
    const riser = (t0, t1, v = 1) => {
      const bp = flt('bandpass', 400, 2.2); bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(10000, t1);
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1);
      noise(t0, t1 - t0 + 0.05).connect(bp).connect(g).connect(music); send(g, 0.3);
    };
    const subDrop = t0 => { const o = oc.createOscillator(); o.frequency.setValueAtTime(74, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + 1.3);
      const g = oc.createGain(); const e = env(g, t0, 0.005, 0.65, 0.1, 1.3); o.connect(g).connect(music); o.start(t0); o.stop(e); };

    // ---- 曲の組み立て
    for (let bar = 0; bar < BARS; bar++) {
      const s = sec(bar), ch = CH[bar % 4], inS = bar - SECTIONS.find(x => x.key === s).from;
      if (s === 'intro') {
        pad(bar, ch, 500 + inS * 400, 900 + inS * 450, 1.3);
        arp(bar, ch, 0.45 + inS * 0.15, inS < 2 ? 0.5 : 0.25);
        if (inS >= 2) { for (let b = 0; b < 4; b++) kick(T(bar, b), 0.55 + inS * 0.1); for (let b = 0; b < 4; b++) hat(T(bar, b + 0.5), true, 0.5); }
        if (bar === 0) star(T(0, 1), 0.8);
        if (bar === 3) riser(T(3, 0), T(4, 0), 0.6);
      } else if (s === 'verse') {
        pad(bar, ch, 1400, 1700, 0.9);
        bass(bar, ch, 0.95, inS < 2 ? 'sparse' : 'oct');
        pluck(bar, ch, 0.9);
        for (let b = 0; b < 4; b++) { kick(T(bar, b)); hat(T(bar, b + 0.5), true, 0.75); }
        clap(T(bar, 1)); clap(T(bar, 3));
        for (let k = 0; k < 16; k++) shaker(T(bar, k / 4), k % 2 ? 1 : 0.5);
        if (inS >= 4) arp(bar, ch, 0.55, 0.5);
        if (inS === 3 || inS === 7) HOOK.forEach(([b, m]) => bell(T(bar, b), m, 0.9));
        if (inS === 0) crash(T(bar), 0.7);
        if (inS === 4) star(T(bar, 2), 0.7);
      } else if (s === 'break') {
        pad(bar, ch, 2000 - inS * 250, 1800 - inS * 250, 1.15);
        arp(bar, ch, 0.75, 0.25);
        if (inS < 2) bass(bar, ch, 0.5, 'sparse');
        if (inS === 1) star(T(bar, 0.5), 0.9);
        if (inS === 2) riser(T(14, 0), T(15, 3), 1.0);
        if (inS >= 2) for (let b = 0; b < 4; b++) kick(T(bar, b), 0.5 + inS * 0.1);
        if (inS === 3) { for (let k = 0; k < 12; k++) snare(T(15, k / 4), 0.15 + k * 0.04); }
      } else if (s === 'drop') {
        pad(bar, ch, 2400, 2700, 1.0);
        bass(bar, ch, 1.05, 'oct');
        pluck(bar, ch, 1.0);
        arp(bar, ch, 0.45, 0.25);
        LEAD[inS].forEach(([b, l, m]) => lead(T(bar, b), l * BEAT, m));
        for (let b = 0; b < 4; b++) { kick(T(bar, b)); hat(T(bar, b + 0.5), true, 0.9); }
        clap(T(bar, 1)); clap(T(bar, 3));
        for (let k = 0; k < 16; k++) hat(T(bar, k / 4), false, k % 2 ? 0.55 : 0.9);
        if (inS === 0) { crash(T(bar), 1); subDrop(T(bar)); star(T(bar, 0.25), 1); }
        if (inS === 4) { crash(T(bar), 0.7); star(T(bar, 2), 0.7); }
      } else {   // outro：イントロへつながるように、少しずつ静かに
        pad(bar, ch, 2000 - inS * 400, 1600 - inS * 350, 1.0 - inS * 0.1);
        arp(bar, ch, 0.6 - inS * 0.08, inS < 2 ? 0.25 : 0.5);
        if (inS < 2) bass(bar, ch, 0.8 - inS * 0.25, 'oct');
        if (inS < 3) { for (let b = 0; b < 4; b++) { kick(T(bar, b), 0.9 - inS * 0.15); hat(T(bar, b + 0.5), true, 0.6); } if (inS < 2) { clap(T(bar, 1), 0.8); clap(T(bar, 3), 0.8); } }
        if (inS === 0) { lead(T(bar), BEAT * 3.5, 74, 0.8); crash(T(bar), 0.6); }
        if (inS === 3) star(T(bar, 1), 0.6);
      }
    }
    // ブレイク最後の一拍：全部の音（残響も）を止める（ここに星座の形の音が入る）
    gate.gain.setValueAtTime(1, GAP - 0.03); gate.gain.linearRampToValueAtTime(0, GAP);
    gate.gain.setValueAtTime(0, T(16) - 0.004); gate.gain.linearRampToValueAtTime(1, T(16));

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
      const i0 = Math.round(GAP * sr), i1 = Math.round((T(16) - 0.01) * sr);   // 無音の一拍はきっちり0に
      for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = i0; i < i1; i++) d[i] = 0; }
      return out;
    });
  }
  return { BPM, BEAT, BAR, BARS, DUR, SECTIONS, GAP, T, render };
})();
