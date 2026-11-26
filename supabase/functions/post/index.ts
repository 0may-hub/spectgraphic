// AudioSpectGraphic — 投稿の受付
//   POST multipart/form-data { title, w, h, full, thumb }  → 投稿
//   POST application/json { action: "remove", id } + x-admin-key → 非表示にして画像を消す（管理者のみ）
//   POST application/json { action: "purge" } → 非表示にした投稿の画像を片付ける（誰が呼んでも安全）
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); } catch { return {}; }
})();
const SERVICE_KEY: string = secretKeys["default"] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const BUCKET = "posts";
const MAX_FULL = 650_000;      // 拡大用（長辺1200px程度）
const MAX_THUMB = 150_000;     // 一覧用
const MAX_TITLE = 24;
const PER_IP_10MIN = 15;       // 会場のWi-Fiで同じIPになる人がいても困らない程度
const GLOBAL_PER_MIN = 60;
const TOTAL_CAP = 8000;        // 無料枠（1GB）を守るための上限

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-admin-key, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (code: string, message: string, status = 400) => json({ ok: false, code, message }, status);

// ---------- NGワード ----------
const NG_WORDS = [
  // 暴力・脅し
  "死ね", "氏ね", "しねよ", "殺す", "殺せ", "ころすぞ", "ころしてやる", "ぶっころ", "死んでくれ", "しんでくれ",
  // 性的
  "ちんこ", "ちんぽ", "まんこ", "せっくす", "おっぱい", "ぱいずり", "ふぇら", "おなに", "射精", "精液", "せいえき",
  "れいぷ", "強姦", "援交", "売春", "sex", "porn", "hentai", "xvideos", "nude",
  // 差別
  "きちがい", "気違い", "基地外", "がいじ", "めくら", "つんぼ", "支那", "しなじん",
  "nigger", "nigga", "faggot", "retard",
  // 罵倒（英語）
  "fuck", "shit", "bitch", "cunt", "whore",
];
const kataToHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const squash = (s: string) =>
  kataToHira(s.normalize("NFKC").toLowerCase()).replace(/[\s\p{P}\p{S}]/gu, "");
const NG_NORM = NG_WORDS.map(squash);
function isNG(title: string) {
  const low = title.normalize("NFKC").toLowerCase();
  if (/https?:|www\.|:\/\/|\.(com|net|org|jp|io|me|xyz|co)\b/.test(low)) return true;   // リンクの宣伝
  const t = squash(title);
  return NG_NORM.some((w) => w && t.includes(w));
}

// ---------- 画像の中身を確認 ----------
function sniff(b: Uint8Array): "webp" | "jpg" | null {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  return null;
}

async function ipHash(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
  const data = new TextEncoder().encode("spectgraphic:" + ip);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(d.slice(0, 16), (x) => x.toString(16).padStart(2, "0")).join("");
}

async function purge() {
  const { data } = await sb.from("posts").select("id, ext").eq("removed", true).eq("purged", false).limit(100);
  if (!data?.length) return 0;
  const paths = data.flatMap((p) => [`${p.id}.${p.ext}`, `${p.id}_t.${p.ext}`]);
  await sb.storage.from(BUCKET).remove(paths);
  await sb.from("posts").update({ purged: true }).in("id", data.map((p) => p.id));
  return data.length;
}

async function createPost(req: Request) {
  // 会期
  const { data: st } = await sb.from("settings").select("open_at, close_at").eq("id", 1).single();
  const now = Date.now();
  if (!st || now < Date.parse(st.open_at)) return fail("not_open", "投稿は会期中にできます", 403);
  if (now >= Date.parse(st.close_at)) return fail("closed", "投稿の受付は終了しました", 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("bad_request", "送信内容を読み取れませんでした"); }
  const full = form.get("full"), thumb = form.get("thumb");
  if (!(full instanceof File) || !(thumb instanceof File)) return fail("bad_request", "画像がありません");
  if (full.size > MAX_FULL || thumb.size > MAX_THUMB) return fail("too_large", "画像が大きすぎます");
  const fullBytes = new Uint8Array(await full.arrayBuffer());
  const thumbBytes = new Uint8Array(await thumb.arrayBuffer());
  const ext = sniff(fullBytes);
  if (!ext || sniff(thumbBytes) !== ext) return fail("bad_image", "画像の形式が正しくありません");
  const w = Math.round(Number(form.get("w"))), h = Math.round(Number(form.get("h")));
  if (!(w >= 100 && w <= 2400 && h >= 100 && h <= 2400)) return fail("bad_request", "画像のサイズが正しくありません");

  let title = String(form.get("title") ?? "").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  title = Array.from(title).slice(0, MAX_TITLE).join("");
  if (title && isNG(title)) return fail("ng_word", "タイトルに使えない言葉が含まれています");

  // 連投・上限
  const ip_hash = await ipHash(req);
  const since10 = new Date(now - 10 * 60_000).toISOString();
  const since1 = new Date(now - 60_000).toISOString();
  const [mine, burst, total] = await Promise.all([
    sb.from("posts").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).gte("created_at", since10),
    sb.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since1),
    sb.from("posts").select("id", { count: "exact", head: true }).eq("removed", false),
  ]);
  if ((mine.count ?? 0) >= PER_IP_10MIN) return fail("rate_limited", "続けて投稿しすぎています。少し時間をおいてください", 429);
  if ((burst.count ?? 0) >= GLOBAL_PER_MIN) return fail("busy", "混み合っています。少し時間をおいてください", 429);
  if ((total.count ?? 0) >= TOTAL_CAP) return fail("full", "ギャラリーがいっぱいになりました", 403);

  const id = crypto.randomUUID();
  const type = ext === "webp" ? "image/webp" : "image/jpeg";
  const up = (path: string, bytes: Uint8Array) =>
    sb.storage.from(BUCKET).upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  const [a, b] = await Promise.all([up(`${id}.${ext}`, fullBytes), up(`${id}_t.${ext}`, thumbBytes)]);
  if (a.error || b.error) {
    await sb.storage.from(BUCKET).remove([`${id}.${ext}`, `${id}_t.${ext}`]);
    return fail("upload_failed", "画像を保存できませんでした", 500);
  }
  const ins = await sb.from("posts").insert({ id, title, ext, w, h, ip_hash });
  if (ins.error) {
    await sb.storage.from(BUCKET).remove([`${id}.${ext}`, `${id}_t.${ext}`]);
    return fail("insert_failed", "投稿を保存できませんでした", 500);
  }
  return json({ ok: true, id, ext });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method", "POST only", 405);
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.startsWith("multipart/form-data")) return await createPost(req);

    const body = await req.json().catch(() => ({}));
    if (body.action === "purge") return json({ ok: true, purged: await purge() });
    if (body.action === "remove") {
      const admin = Deno.env.get("ADMIN_KEY") ?? "";
      if (!admin || req.headers.get("x-admin-key") !== admin) return fail("forbidden", "管理者のパスワードが違います", 403);
      if (typeof body.id !== "string") return fail("bad_request", "id がありません");
      const { error } = await sb.from("posts").update({ removed: true }).eq("id", body.id);
      if (error) return fail("remove_failed", "消せませんでした", 500);
      await purge();
      return json({ ok: true });
    }
    if (body.action === "check-admin") {
      const admin = Deno.env.get("ADMIN_KEY") ?? "";
      return json({ ok: !!admin && req.headers.get("x-admin-key") === admin });
    }
    return fail("bad_request", "unknown action");
  } catch (e) {
    console.error(e);
    return fail("server_error", "サーバーでエラーが起きました", 500);
  }
});
