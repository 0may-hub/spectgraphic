// =====================================================
//  3曲目「和」（約1分）。和風のダンス：4つ打ちに太鼓・締太鼓、琴のリフ、笛のメロディー（都節の音階）
//  112 BPM・28小節（1曲目と同じ）：イントロ4 → Aメロ8 → ブレイク4（最後の一拍は無音＝和の形の音）→ サビ8 → アウトロ4
// =====================================================
const SONG3 = (() => {
  const BPM = 112, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 28, DUR = BAR * BARS;
  const SECTIONS = [
    { key: 'intro', from: 0, to: 4 }, { key: 'verse', from: 4, to: 12 }, { key: 'break', from: 12, to: 16 },
    { key: 'drop', from: 16, to: 24 }, { key: 'outro', from: 24, to: 28 },
  ];
  const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
  const GAP = T(15, 3);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // 1小節ごと：D – B♭ – G – A（低い音と、笙のような和音）
  const CH = [
    { root: 38, sho: [57, 62, 67, 69, 74] }, { root: 34, sho: [58, 62, 65, 70, 74] },
    { root: 31, sho: [55, 62, 67, 70, 74] }, { root: 33, sho: [57, 62, 64, 69, 70] },
  ];
  const KOTO = [62, 63, 67, 69, 70, 74, 75, 79, 81, 82, 86];   // 都節：レ・ミ♭・ソ・ラ・シ♭
  const RIFF = [[5, 3, 4, 3, 5, 6, 7, 6], [4, 2, 3, 2, 4, 5, 6, 5], [2, 3, 4, 7, 4, 3, 2, 3], [3, 4, 5, 6, 8, 6, 5, 4]];
  const LEAD = [   // サビの笛 [拍, 長さ, 音]
    [[0, .5, 74], [.5, .5, 75], [1, 1, 79], [2, .5, 81], [2.5, .5, 79], [3, 1, 75]], [[0, 1.5, 74], [1.5, .5, 70], [2, 2, 74]],
    [[0, .5, 79], [.5, .5, 81], [1, 1, 82], [2, .5, 81], [2.5, .5, 79], [3, 1, 81]], [[0, 2, 81], [2, 1, 79], [3, 1, 75]],
    [[0, .5, 86], [.5, .5, 82], [1, 1, 81], [2, .5, 82], [2.5, .5, 81], [3, 1, 79]], [[0, 1.5, 82], [1.5, .5, 81], [2, 2, 79]],
    [[0, .5, 75], [.5, .5, 79], [1, 1, 81], [2, 1, 79], [3, 1, 75]], [[0, 3, 74], [3, 1, 69]],
  ];

  function render(sr) {
    const TAIL = 3, len = Math.ceil((DUR + TAIL) * sr);
    const oc = new OfflineAudioContext(2, len, sr);
    let seed = 8642; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noiseBuf = (() => { const b = oc.createBuffer(1, sr * 2, sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return b; })();
    const ir = (sec, damp) => { const n = Math.floor(sr * sec), b = oc.createBuffer(2, n, sr);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp = lp * damp + (rnd() * 2 - 1) * (1 - damp); d[i] = lp * Math.pow(1 - i / n, 2.8); } } return b; };

    const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.18;
    const master = oc.createGain(); master.gain.value = 0.85; master.connect(comp).connect(oc.destination);
    const gate = oc.createGain(); gate.connect(master);
    const music = oc.createGain(); music.connect(gate);
    const pump = oc.createGain(); pump.connect(music);
    const rv = oc.createConvolver(); rv.buffer = ir(2.6, 0.62); const rvR = oc.createGain(); rvR.gain.value = 0.3; rv.connect(rvR).connect(music);
    const dl = oc.createDelay(2); dl.delayTime.value = BEAT * 0.75; const fb = oc.createGain(); fb.gain.value = 0.3;
    const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3600; dl.connect(dlp).connect(fb).connect(dl);
    const dlR = oc.createGain(); dlR.gain.value = 0.24; dlp.connect(dlR).connect(music); dlR.connect(rv);
    const send = (node, wet, del) => { const g = oc.createGain(); g.gain.value = wet; node.connect(g).connect(rv); if (del) { const h = oc.createGain(); h.gain.value = del; node.connect(h).connect(dl); } };
    const sec = bar => SECTIONS.find(s => bar >= s.from && bar < s.to).key;
    const env = (g, t0, a, peak, hold, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); return t0 + a + hold + rel; };
    const flt = (type, fq, q) => { const b = oc.createBiquadFilter(); b.type = type; b.frequency.value = fq; if (q) b.Q.value = q; return b; };
    const noise = (t0, dur) => { const n = oc.createBufferSource(); n.buffer = noiseBuf; n.start(t0, rnd() * 1.5); n.stop(t0 + dur); return n; };
    const pan = v => { const p = oc.createStereoPanner(); p.pan.value = v; return p; };

    // ---- ドラム：4つ打ち＋太鼓・締太鼓・拍子木・ちゃっぱ
    const kick = (t0, v = 1) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(46, t0 + 0.11);
      const g = oc.createGain(); const end = env(g, t0, 0.002, 1.0 * v, 0.04, 0.3); o.connect(g).connect(music); o.start(t0); o.stop(end);
      pump.gain.setValueAtTime(1, t0); pump.gain.linearRampToValueAtTime(0.45, t0 + 0.012); pump.gain.setTargetAtTime(1, t0 + 0.03, 0.09);
    };
    const taiko = (t0, v = 1) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(58, t0 + 0.18);
      const g = oc.createGain(); const e = env(g, t0, 0.003, 0.7 * v, 0.04, 0.45); o.connect(g).connect(music); send(g, 0.3); o.start(t0); o.stop(e);
      const ng = oc.createGain(); env(ng, t0, 0.002, 0.3 * v, 0, 0.1); noise(t0, 0.13).connect(flt('lowpass', 1100)).connect(ng).connect(music);
    };
    const shime = (t0, v = 1, p = 0) => {
      const o = oc.createOscillator(); o.frequency.setValueAtTime(360, t0); o.frequency.exponentialRampToValueAtTime(240, t0 + 0.05);
      const g = oc.createGain(); const e = env(g, t0, 0.001, 0.11 * v, 0, 0.07); o.connect(g).connect(pan(p)).connect(music); o.start(t0); o.stop(e);
      const ng = oc.createGain(); env(ng, t0, 0.001, 0.07 * v, 0, 0.035); noise(t0, 0.05).connect(flt('bandpass', 2200, 2)).connect(ng).connect(pan(p)).connect(music);
    };
    const hyoshigi = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.001, 0.32 * v, 0, 0.06); noise(t0, 0.08).connect(flt('bandpass', 3000, 8)).connect(g).connect(music); send(g, 0.45); };
    const clap = (t0, v = 1) => {
      [0, 0.012].forEach((d, k) => { const g = oc.createGain(); env(g, t0 + d, 0.001, (k ? 0.34 : 0.2) * v, 0, k ? 0.14 : 0.012);
        noise(t0 + d, 0.18).connect(flt('bandpass', 1700, 1)).connect(g).connect(music); if (k) send(g, 0.35); });
      hyoshigi(t0, 0.45 * v);
    };
    const chappa = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.001, 0.09 * v, 0, 0.12);   // 小さなシンバル（裏拍）
      noise(t0, 0.2).connect(flt('bandpass', 6200, 3)).connect(g).connect(pan(0.2)).connect(music); };
    const crash = (t0, v = 1) => { const g = oc.createGain(); env(g, t0, 0.002, 0.14 * v, 0, 2.4); noise(t0, 2.8).connect(flt('highpass', 4200)).connect(g).connect(music); send(g, 0.5); };

    // ---- 音色
    const sho = (bar, ch, v = 1) => {   // 笙のような、すきとおった和音
      const t0 = T(bar), dur = BAR, g = oc.createGain(); env(g, t0, 0.25, 0.03 * v, dur - 0.25, 0.8); const f = flt('lowpass', 3600, 0.6); f.connect(g).connect(pump); send(g, 0.6);
      ch.sho.forEach((m, i) => [[1, 1], [2, 0.32], [3, 0.15]].forEach(([r, a]) => {
        const o = oc.createOscillator(); o.type = r === 1 ? 'triangle' : 'sine'; o.frequency.value = hz(m) * r; o.detune.value = (i - 2) * 2.5;
        const og = oc.createGain(); og.gain.value = a; o.connect(og).connect(pan((i - 2) * 0.22)).connect(f); o.start(t0); o.stop(t0 + dur + 1);
      }));
    };
    const koto = (t0, m, v = 1, p = 0) => {   // 琴：はじいた瞬間に明るく、押し手で少し高く入って落ち着く
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz(m) * 1.01, t0); o.frequency.exponentialRampToValueAtTime(hz(m), t0 + 0.05);
      const o2 = oc.createOscillator(); o2.type = 'triangle'; o2.frequency.value = hz(m) * 2.003;
      const f = flt('lowpass', 5600, 1.4); f.frequency.setValueAtTime(5600, t0); f.frequency.exponentialRampToValueAtTime(900, t0 + 0.35);
      const g = oc.createGain(); const e = env(g, t0, 0.002, 0.1 * v, 0, 0.75); const g2 = oc.createGain(); g2.gain.value = 0.35;
      o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(pan(p)).connect(pump); send(g, 0.3, 0.3); o.start(t0); o.stop(e + 0.02); o2.start(t0); o2.stop(e + 0.02);
    };
    const flute = (t0, dur, m, v = 1) => {   // 笛（篠笛・尺八ふう）：息の音まじり。シンセを少し重ねて芯を出す
      const o = oc.createOscillator(); o.frequency.setValueAtTime(hz(m) * 0.975, t0); o.frequency.exponentialRampToValueAtTime(hz(m), t0 + 0.06);
      const vib = oc.createOscillator(); vib.frequency.value = 5.2; const vg = oc.createGain(); vg.gain.setValueAtTime(0, t0); vg.gain.linearRampToValueAtTime(16, t0 + Math.min(0.4, dur * 0.7)); vib.connect(vg).connect(o.detune);
      const o3 = oc.createOscillator(); o3.type = 'triangle'; o3.frequency.value = hz(m) * 2; const g3 = oc.createGain(); g3.gain.value = 0.22; o3.connect(g3);
      const sy = oc.createOscillator(); sy.type = 'sawtooth'; sy.frequency.value = hz(m); const sf = flt('lowpass', 2400, 1); const sg = oc.createGain(); sg.gain.value = 0.18; sy.connect(sf).connect(sg);
      const g = oc.createGain(); const e = env(g, t0, 0.025, 0.12 * v, Math.max(0.04, dur - 0.06), 0.16);
      o.connect(g); g3.connect(g); sg.connect(g); g.connect(pan(-0.1)).connect(music); send(g, 0.4, 0.35);
      const br = oc.createGain(); env(br, t0, 0.02, 0.04 * v, Math.max(0.04, dur - 0.05), 0.12); noise(t0, dur + 0.3).connect(flt('bandpass', hz(m) * 2, 1.4)).connect(br).connect(music);
      for (const x of [o, o3, vib, sy]) { x.start(t0); x.stop(e + 0.05); }
    };
    const furin = (t0, v = 1) => { const m = KOTO[5 + Math.floor(rnd() * 6)] + 12, p = rnd() * 1.6 - 0.8;   // 風鈴
      [[1, 1, 1.4], [2.76, 0.3, 0.7], [5.4, 0.12, 0.4]].forEach(([r, a, d]) => { const o = oc.createOscillator(); o.frequency.value = hz(m) * r; const g = oc.createGain(); const e = env(g, t0, 0.002, 0.03 * a * v, 0, d);
        o.connect(g).connect(pan(p)).connect(music); send(g, 0.5, 0.35); o.start(t0); o.stop(e + 0.02); }); };
    const bass = (bar, ch, v = 1, mode = 'groove') => {   // はねるベース
      const hits = mode === 'groove' ? [[0, 0], [0.75, 0], [1.5, 12], [2, 0], [2.75, 7], [3.5, 12]] : [[0, 0], [2, 0]];
      for (const [b, iv] of hits) {
        const t0 = T(bar, b), m = ch.root + iv, len = mode === 'groove' ? 0.16 : BEAT * 1.6;
        const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
        const s = oc.createOscillator(); s.type = 'sine'; s.frequency.value = hz(iv === 12 ? m - 12 : m);
        const f = flt('lowpass', 900, 3); f.frequency.setValueAtTime(1800, t0); f.frequency.exponentialRampToValueAtTime(300, t0 + 0.15);
        const g = oc.createGain(); const e = env(g, t0, 0.003, 0.24 * v, len, 0.07); const sg = oc.createGain(); env(sg, t0, 0.003, 0.34 * v, len, 0.06);
        o.connect(f).connect(g).connect(pump); s.connect(sg).connect(pump); o.start(t0); o.stop(e + 0.02); s.start(t0); s.stop(e + 0.02);
      }
    };
    const gliss = (t0, up, v = 1) => { const seq = up ? KOTO : KOTO.slice().reverse(); seq.forEach((m, k) => koto(t0 + k * 0.035, m, 0.5 * v, (k / seq.length - 0.5) * 1.2)); };
    const riser = (t0, t1, v = 1) => {
      const bp = flt('bandpass', 400, 2.2); bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(9000, t1);
      const g = oc.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0.0001, t1);
      noise(t0, t1 - t0 + 0.05).connect(bp).connect(g).connect(music); send(g, 0.3);
    };
    const subDrop = t0 => { const o = oc.createOscillator(); o.frequency.setValueAtTime(74, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + 1.3);
      const g = oc.createGain(); const e = env(g, t0, 0.005, 0.65, 0.1, 1.3); o.connect(g).connect(music); o.start(t0); o.stop(e); };

    // ---- 曲の組み立て
    for (let bar = 0; bar < BARS; bar++) {
      const s = sec(bar), ch = CH[bar % 4], inS = bar - SECTIONS.find(x => x.key === s).from, rf = RIFF[bar % 4];
      if (s === 'intro') {
        sho(bar, ch, 1.6 + inS * 0.15);
        rf.forEach((ix, k) => { if (inS >= 1 || k % 2 === 0) koto(T(bar, k / 2), KOTO[ix], 0.95 + inS * 0.1, k % 2 ? 0.35 : -0.35); });
        if (inS >= 2) { for (let b = 0; b < 4; b++) kick(T(bar, b), 0.5 + inS * 0.1); for (let k = 0; k < 4; k++) shime(T(bar, k + 0.5), 0.5, 0.3); }
        if (bar === 0) { hyoshigi(T(0), 0.9); hyoshigi(T(0, 0.25), 0.7); furin(T(0, 1)); }
        if (bar === 3) { gliss(T(3, 2), true, 0.8); taiko(T(3, 3.5), 0.6); }
      } else if (s === 'verse') {
        sho(bar, ch, 0.8);
        bass(bar, ch, 0.95, 'groove');
        rf.forEach((ix, k) => koto(T(bar, k / 2), KOTO[ix], k % 2 ? 0.65 : 0.9, k % 2 ? 0.35 : -0.35));
        for (let b = 0; b < 4; b++) { kick(T(bar, b)); chappa(T(bar, b + 0.5), 0.8); }
        clap(T(bar, 1)); clap(T(bar, 3));
        for (let k = 0; k < 16; k++) shime(T(bar, k / 4), k % 4 === 2 ? 0.7 : k % 2 ? 0.3 : 0.45, k % 2 ? 0.3 : -0.3);
        if (inS % 2 === 1) taiko(T(bar, 3.5), 0.55);
        if (inS === 0) { crash(T(bar), 0.6); taiko(T(bar), 0.8); }
        if (inS === 7) gliss(T(bar, 2), false, 0.7);
        if (inS % 4 === 2) furin(T(bar, 1.5), 0.8);
      } else if (s === 'break') {
        sho(bar, ch, 1.15);
        [0, 1.5, 2, 3].forEach((b, k) => koto(T(bar, b), KOTO[rf[k * 2] + 2], 0.85, 0));
        furin(T(bar, rnd() * 3), 0.9);
        if (inS < 2) bass(bar, ch, 0.5, 'long');
        if (inS === 2) riser(T(14, 0), T(15, 3), 1.0);
        if (inS >= 2) for (let b = 0; b < 4; b++) kick(T(bar, b), 0.5 + inS * 0.1);
        if (inS === 3) { for (let k = 0; k < 12; k++) shime(T(15, k / 4), 0.35 + k * 0.06, k % 2 ? 0.3 : -0.3); taiko(T(15, 0), 0.8); taiko(T(15, 2), 0.9); }
      } else if (s === 'drop') {
        sho(bar, ch, 0.9);
        bass(bar, ch, 1.05, 'groove');
        for (let k = 0; k < 16; k++) koto(T(bar, k / 4), KOTO[rf[k % 8] + (k >= 8 ? 2 : 0)], (k % 4 ? 0.42 : 0.7), ((k % 4) - 1.5) * 0.25);
        LEAD[inS].forEach(([b, l, m]) => flute(T(bar, b), l * BEAT, m, 1.05));
        for (let b = 0; b < 4; b++) { kick(T(bar, b)); chappa(T(bar, b + 0.5), 1); }
        clap(T(bar, 1)); clap(T(bar, 3));
        taiko(T(bar, 0), 0.75); taiko(T(bar, 2.5), 0.6);
        for (let k = 0; k < 16; k++) shime(T(bar, k / 4), k % 4 === 2 ? 0.8 : k % 2 ? 0.35 : 0.5, k % 2 ? 0.3 : -0.3);
        if (inS === 0) { crash(T(bar), 1); subDrop(T(bar)); gliss(T(bar), false, 0.8); }
        if (inS === 4) { crash(T(bar), 0.7); gliss(T(bar, 0), true, 0.6); }
      } else {   // outro：イントロへつながるように、少しずつ静かに
        sho(bar, ch, 1 - inS * 0.15);
        rf.forEach((ix, k) => koto(T(bar, k / 2), KOTO[ix], 0.7 - inS * 0.1, k % 2 ? 0.35 : -0.35));
        if (inS < 2) bass(bar, ch, 0.8 - inS * 0.25, 'groove');
        if (inS < 3) { for (let b = 0; b < 4; b++) { kick(T(bar, b), 0.9 - inS * 0.15); chappa(T(bar, b + 0.5), 0.6); } if (inS < 2) { clap(T(bar, 1), 0.8); clap(T(bar, 3), 0.8); } }
        if (inS === 0) { flute(T(bar), BEAT * 3.5, 74, 0.9); crash(T(bar), 0.6); taiko(T(bar), 0.7); }
        if (inS === 3) furin(T(bar, 1), 0.8);
      }
    }
    // ブレイク最後の一拍：全部の音（残響も）を止める（ここに和の形の音が入る）
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
      const i0 = Math.round(GAP * sr), i1 = Math.round((T(16) - 0.01) * sr);
      for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = i0; i < i1; i++) d[i] = 0; }
      return out;
    });
  }
  return { BPM, BEAT, BAR, BARS, DUR, SECTIONS, GAP, T, render };
})();
