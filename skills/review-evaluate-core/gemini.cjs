// 헤드리스 Gemini 호출기 — 죽은 gemini CLI 대체.
// 사용: echo "프롬프트" | node gemini.cjs            (stdin 파이프)
//       node gemini.cjs -p "프롬프트"                 (인자)
//       GEMINI_MODEL=gemini-2.5-flash 로 모델 고정 가능
// 키: 환경변수에서 로드 → 429/403이면 다음 키로 로테이션, pro 전멸 시 flash로 폴백. 첫 성공 응답만 stdout 출력.
//   GEMINI_API_KEY            단일 키
//   GEMINI_API_KEYS           콤마(,)로 구분한 여러 키 (로테이션용)
//   GEMINI_API_KEY_FILE       위 두 값 대신, KEY=VALUE 형식 줄이 있는 .env류 파일 경로
//                             (해당 파일에서 GEMINI_API_KEY* 로 시작하는 줄을 전부 읽는다)
const fs = require('fs');

function loadKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
  if (process.env.GEMINI_API_KEYS) {
    for (const k of process.env.GEMINI_API_KEYS.split(',')) {
      const v = k.trim();
      if (v) keys.push(v);
    }
  }
  const keyFile = process.env.GEMINI_API_KEY_FILE;
  if (keyFile && fs.existsSync(keyFile)) {
    const txt = fs.readFileSync(keyFile, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^GEMINI_API_KEY[A-Z0-9_]*\s*=\s*(.+)$/);
      if (m) keys.push(m[1].trim().replace(/^"|"$/g, ''));
    }
  }
  return [...new Set(keys)].filter(Boolean);
}
function readStdin() {
  return new Promise((res) => {
    let d = ''; if (process.stdin.isTTY) return res('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (d += c));
    process.stdin.on('end', () => res(d));
  });
}
async function call(model, key, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json().catch(() => ({}));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return { ok: res.ok && !!text, status: res.status, text: text || '' };
}
(async () => {
  const i = process.argv.indexOf('-p');
  const prompt = i >= 0 ? process.argv[i + 1] : await readStdin();
  if (!prompt || !prompt.trim()) { process.stderr.write('no prompt\n'); process.exit(1); }
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : ['gemini-2.5-pro', 'gemini-2.5-flash'];
  const keys = loadKeys();
  if (!keys.length) { process.stderr.write('no keys (set GEMINI_API_KEY, GEMINI_API_KEYS, or GEMINI_API_KEY_FILE)\n'); process.exit(1); }
  let lastStatus = 0;
  for (const model of models) {
    for (const key of keys) {
      try {
        const r = await call(model, key, prompt);
        if (r.ok) { process.stdout.write(`[${model}]\n` + r.text.trim() + '\n'); return; }
        lastStatus = r.status;
        if (r.status !== 429 && r.status !== 403) break; // 쿼터 아닌 오류면 이 모델 포기, 다음 모델로
      } catch (e) { lastStatus = -1; }
    }
  }
  process.stderr.write(`all keys/models failed (last HTTP ${lastStatus})\n`);
  process.exit(1);
})();
