// 國文段考衝刺站 — 純前端，進度存在 localStorage
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const LETTERS = ["A", "B", "C", "D"];
  const CIRCLED = [..."①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕"];

  // ───────── 進度 ─────────
  const KEY = "cn-midterm-1";
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { S = {}; }
  S.gloss ||= {};   // id -> 熟練度 0..3
  S.wrongQ ||= [];  // 選擇題錯題 index
  S.stars ||= 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const addStar = (n = 1) => { S.stars += n; save(); renderStreak(); };
  const renderStreak = () => { $("#streak").textContent = "⭐ " + S.stars; };

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tag = l => `<span class="tag" style="background:${LESSONS[l].color}">${LESSONS[l].short}</span>`;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1600); }
  const cheer = () => toast(shuffle(["太棒了！🎉", "答對了！✨", "好厲害！💪", "穩穩的！👍", "繼續保持！🔥"])[0]);

  // ───────── 路由 ─────────
  const routes = {};
  function go(hash) { location.hash = hash; }
  window.addEventListener("hashchange", render);
  $("#backBtn").onclick = () => go("");
  function setTitle(t) { $("#title").textContent = t || "國文段考衝刺站"; $("#backBtn").hidden = !t; window.scrollTo(0, 0); }
  function render() {
    const [r, arg] = location.hash.slice(1).split("/");
    (routes[r] || routes.home)(arg && decodeURIComponent(arg));
  }

  // ───────── 手寫板 ─────────
  function makePad(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    let strokes = [], cur = null, penSeen = false, eraser = false;
    const width = opts.width || 3.2;
    function size() {
      const r = canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0); redraw();
    }
    function inkColor() { return getComputedStyle(document.documentElement).getPropertyValue("--ink-pen").trim() || "#1d2a5a"; }
    function drawStroke(s) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.globalCompositeOperation = s.er ? "destination-out" : "source-over";
      ctx.strokeStyle = inkColor();
      const p = s.pts;
      if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], (s.er ? 14 : width) / 2 + .6, 0, 7); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); return; }
      for (let i = 1; i < p.length; i++) {
        ctx.beginPath();
        ctx.lineWidth = s.er ? 26 : width * (0.65 + 0.7 * (p[i][2] ?? .5));
        ctx.moveTo(p[i - 1][0], p[i - 1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
    function redraw() { const r = canvas.getBoundingClientRect(); ctx.clearRect(0, 0, r.width, r.height); strokes.forEach(drawStroke); }
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, e.pressure || .5]; };
    canvas.addEventListener("pointerdown", e => {
      if (e.pointerType === "pen") penSeen = true;
      if (penSeen && e.pointerType === "touch") return; // 有觸控筆時忽略手掌
      canvas.setPointerCapture(e.pointerId);
      cur = { pts: [pos(e)], er: eraser, id: e.pointerId }; strokes.push(cur); drawStroke(cur);
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", e => {
      if (!cur || cur.id !== e.pointerId) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) {
        const p = pos(ev), last = cur.pts[cur.pts.length - 1];
        cur.pts.push(p);
        ctx.lineCap = "round"; ctx.strokeStyle = inkColor();
        ctx.globalCompositeOperation = cur.er ? "destination-out" : "source-over";
        ctx.lineWidth = cur.er ? 26 : width * (0.65 + 0.7 * p[2]);
        ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
      e.preventDefault();
    });
    const end = e => { if (cur && cur.id === e.pointerId) cur = null; };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    const ro = new ResizeObserver(size); ro.observe(canvas);
    return {
      clear() { strokes = []; redraw(); },
      undo() { strokes.pop(); redraw(); },
      empty() { return !strokes.some(s => !s.er); },
      setEraser(v) { eraser = v; },
    };
  }

  function padHTML(id, height, ghostSize) {
    return `<div class="pad-wrap"><canvas class="pad lines" id="${id}" style="height:${height}px"></canvas><div class="ghost" id="${id}-ghost" style="font-size:${ghostSize || 30}px"></div></div>
    <div class="pad-tools">
      <button class="tool on" data-t="pen">✏️ 筆</button>
      <button class="tool" data-t="er">🧽 橡皮擦</button>
      <button class="tool" data-t="undo">↶ 復原</button>
      <button class="tool" data-t="clear">🗑️ 清除</button>
      <span class="sp"></span>
      <button class="tool" data-t="trace" hidden>👻 描寫答案</button>
    </div>`;
  }
  function wireTools(root, pads, onTrace) {
    root.querySelectorAll(".tool").forEach(b => b.onclick = () => {
      const t = b.dataset.t;
      if (t === "pen" || t === "er") {
        root.querySelectorAll('[data-t="pen"],[data-t="er"]').forEach(x => x.classList.toggle("on", x === b));
        pads.forEach(p => p.setEraser(t === "er"));
      } else if (t === "undo") pads.forEach(p => p.undo());
      else if (t === "clear") pads.forEach(p => p.clear());
      else if (t === "trace") onTrace && onTrace(b);
    });
  }

  // ───────── 首頁 ─────────
  const EXAM = GLOSS.filter(g => g.exam);
  const lvl = id => S.gloss[id] || 0;
  routes.home = () => {
    setTitle("");
    const mastered = EXAM.filter(g => lvl(g.id) >= 2).length;
    const pct = Math.round(mastered / EXAM.length * 100);
    const days = ["10/1", "10/2", "10/3", "10/4"].map(d => {
      const arr = EXAM.filter(g => g.day === d), ok = arr.filter(g => lvl(g.id) >= 2).length;
      return `<button class="day" data-day="${d}">${d}　<b>${ok}/${arr.length}</b></button>`;
    }).join("");
    app.innerHTML = `
      <div class="hero">
        <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
        <div>
          <h2>段考注釋 ${mastered} / ${EXAM.length} 已熟練</h2>
          <p>依老師的複習單分四天，點日期直接練那一天的手寫注釋。</p>
          <div class="days">${days}</div>
        </div>
      </div>
      <div class="grid">
        <button class="tile main" data-go="gloss/exam"><span class="ic">✍️</span><span><b>注釋手寫練習</b><br><small>考試指定 19 則｜先自己寫，再對答案、打分數，不熟的會一直回來</small></span></button>
      </div>
      <div class="section-title">字音字形</div>
      <div class="grid">
        <button class="tile" data-go="sound"><span class="ic">🔤</span><b>字音大考驗</b><small>看國字選注音，聲調陷阱多</small></button>
        <button class="tile" data-go="write"><span class="ic">🖊️</span><b>國字手寫</b><small>看注音，在田字格寫出國字</small></button>
        <button class="tile" data-go="typo"><span class="ic">🔍</span><b>錯字偵探</b><small>單元卷改錯題，點出藏起來的錯字</small></button>
      </div>
      <div class="section-title">課文與閱讀</div>
      <div class="grid">
        <button class="tile" data-go="quiz/ALL"><span class="ic">📝</span><b>選擇題闖關</b><small>單元卷精選＋解析，每關 10 題</small></button>
        <button class="tile" data-go="gift"><span class="ic">🎁</span><b>十二樣禮物</b><small>每樣禮物象徵什麼？</small></button>
        <button class="tile" data-go="recite"><span class="ic">📜</span><b>論語默寫</b><small>手寫填空，背熟原文</small></button>
        <button class="tile" data-go="cards/L1"><span class="ic">📚</span><b>重點卡</b><small>作者、結構、特色一次看</small></button>
        <button class="tile" data-go="gloss/more"><span class="ic">➕</span><b>延伸注釋</b><small>課本其他注釋＋論語詞語</small></button>
        <button class="tile" data-go="wrong"><span class="ic">📒</span><b>錯題本</b><small>${S.wrongQ.length} 題待複習</small></button>
      </div>
      <div class="section-title">注釋熟練度</div>
      <div class="gloss-list">${EXAM.map(g => `<div class="gl"><b>${g.term}</b><span>${esc(g.ans)}</span><span class="dots">${"●".repeat(lvl(g.id))}${"○".repeat(3 - lvl(g.id))}</span></div>`).join("")}</div>
      <p class="foot">範圍：南一版第一冊 L1–L4、語文常識一、自學一、論語第二部分<br>
      <button class="hint-btn" id="reset">重設進度</button></p>`;
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
    app.querySelectorAll("[data-day]").forEach(b => b.onclick = () => go("gloss/day-" + b.dataset.day));
    $("#reset").onclick = () => { if (confirmReset()) { S = { gloss: {}, wrongQ: [], stars: 0 }; save(); renderStreak(); render(); } };
  };
  let resetArmed = 0;
  function confirmReset() { // 按兩次才重設，不用 confirm 對話框
    if (Date.now() - resetArmed < 3000) return true;
    resetArmed = Date.now(); toast("再按一次「重設進度」確認"); return false;
  }

  // ───────── 注釋手寫 ─────────
  routes.gloss = arg => {
    let pool, title;
    if (arg === "more") { pool = GLOSS.filter(g => !g.exam); title = "延伸注釋"; }
    else if (arg && arg.startsWith("day-")) { const d = arg.slice(4); pool = EXAM.filter(g => g.day === d); title = `注釋手寫 ${d}`; }
    else { pool = EXAM; title = "注釋手寫練習"; }
    setTitle(title);
    // 不熟的排前面
    let queue = shuffle(pool).sort((a, b) => lvl(a.id) - lvl(b.id));
    const total = queue.length; let done = 0, right = 0;
    const firstTry = new Set();
    let pad;

    function show() {
      if (!queue.length) return finish();
      const g = queue[0];
      const subs = g.sub ? g.sub.map(s => `「${s.ch}」`).join("、") : "";
      const ctx = g.ctx ? g.ctx.replace(g.term, `<mark>${g.term}</mark>`) : "";
      app.innerHTML = `
        <div class="card pop">
          <div class="meta"><span>${tag(g.lesson)} ${g.no ? "注釋 " + CIRCLED[g.no - 1] : ""}</span><span>${done + 1} / ${total}</span></div>
          <div class="bar"><i style="width:${done / total * 100}%"></i></div>
          <div class="term">${g.term}</div>
          <div class="term-sub">${g.zhuyin ? `<button class="hint-btn" id="zy">看注音</button>` : ""} ${subs ? `　也要寫：${subs} 的意思` : ""}</div>
          ${ctx ? `<div class="ctx">${ctx}</div>` : ""}
          ${padHTML("pad", 240, 26)}
          <div id="ans"></div>
          <div class="btns" id="act"><button class="btn" id="reveal">寫好了，對答案</button></div>
        </div>`;
      pad = makePad($("#pad"));
      wireTools(app, [pad], b => {
        const gh = $("#pad-ghost"); const on = !gh.textContent;
        gh.textContent = on ? g.ans : ""; b.classList.toggle("on", on);
      });
      if ($("#zy")) $("#zy").onclick = e => { e.target.outerHTML = `<span>${g.zhuyin}</span>`; };
      $("#reveal").onclick = () => {
        if (pad.empty()) { $("#pad").classList.add("shake"); setTimeout(() => $("#pad").classList.remove("shake"), 400); toast("先用手寫寫寫看喔 ✍️"); return; }
        $("#ans").innerHTML = `<div class="answer pop">
          <div class="a">${esc(g.ans)}</div>
          <div class="keys">檢查有沒有寫到：${g.keys.map(k => `<span>${k}</span>`).join("")}</div>
          ${g.zhuyin ? `<div class="tip" style="margin-top:6px">注音：${g.zhuyin}</div>` : ""}
          ${g.tip ? `<div class="tip">${esc(g.tip)}</div>` : ""}
        </div>`;
        app.querySelector('[data-t="trace"]').hidden = false;
        $("#act").innerHTML = `
          <button class="btn good" data-s="2">✅ 寫對了</button>
          <button class="btn warn" data-s="1">🟡 差一點</button>
          <button class="btn bad" data-s="0">❌ 不會</button>`;
        $("#act").querySelectorAll("[data-s]").forEach(b => b.onclick = () => grade(g, +b.dataset.s));
      };
    }
    function grade(g, s) {
      const cur = lvl(g.id);
      if (s === 2) {
        S.gloss[g.id] = Math.min(3, cur + 1);
        if (!firstTry.has(g.id)) right++;
        queue.shift(); done++; addStar(); cheer();
      } else {
        firstTry.add(g.id);
        S.gloss[g.id] = s === 1 ? cur : Math.max(0, cur - 1);
        // 放回隊伍後面一點的位置，等一下再考一次
        queue.shift(); queue.splice(Math.min(queue.length, 2 + (Math.random() * 2 | 0)), 0, g);
        toast(s === 1 ? "差一點！等一下再寫一次 💪" : "沒關係，照著答案描一次，等一下再考 📌");
        if (s === 0) { save(); return traceAgain(g); }
      }
      save(); show();
    }
    function traceAgain(g) { // 不會的話先描寫一遍再繼續
      $("#pad-ghost").textContent = g.ans; pad.clear();
      app.querySelector('[data-t="trace"]').classList.add("on");
      $("#act").innerHTML = `<button class="btn" id="next">描完了，下一題</button>`;
      $("#next").onclick = show;
    }
    function finish() {
      const stars = right / total >= .9 ? 3 : right / total >= .7 ? 2 : right / total >= .4 ? 1 : 0;
      app.innerHTML = `<div class="card result pop">
        <div class="big">${stars === 3 ? "🏆" : stars ? "🎉" : "🌱"}</div>
        <h2>完成 ${total} 則注釋！</h2>
        <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <p>第一次就寫對：${right} / ${total}</p>
        <div class="btns"><button class="btn" id="again">再練一輪</button><button class="btn ghost-btn" id="home">回首頁</button></div>
      </div>`;
      $("#again").onclick = () => routes.gloss(arg); $("#home").onclick = () => go("");
    }
    show();
  };

  // ───────── 字音大考驗 ─────────
  const TONES = ["", "ˊ", "ˇ", "ˋ"];
  const SWAP = { "ㄓ": "ㄗ", "ㄗ": "ㄓ", "ㄔ": "ㄘ", "ㄘ": "ㄔ", "ㄕ": "ㄙ", "ㄙ": "ㄕ", "ㄣ": "ㄥ", "ㄥ": "ㄣ", "ㄢ": "ㄤ", "ㄤ": "ㄢ", "ㄋ": "ㄌ", "ㄌ": "ㄋ" };
  function zyOptions(z) {
    const base = z.replace(/[ˊˇˋ˙]/g, "");
    const set = new Set([z]);
    shuffle(TONES).forEach(t => set.size < 4 && set.add(base + t));
    // 聲母／韻母相近的陷阱
    for (const ch of base) if (SWAP[ch] && set.size < 5) {
      const alt = z.replace(ch, SWAP[ch]); if (!set.has(alt)) { set.delete([...set].find(x => x !== z)); set.add(alt); break; }
    }
    return shuffle([...set].slice(0, 4));
  }
  routes.sound = () => {
    setTitle("字音大考驗");
    const qs = shuffle(SOUNDS).slice(0, 12);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "sound");
      const s = qs[i], opts = zyOptions(s.z);
      const word = [...s.w].map(c => c === s.t ? `<span style="color:var(--accent);text-decoration:underline">${c}</span>` : c).join("");
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag(s.l)}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <p style="text-align:center;color:var(--muted);margin:0">畫底線的字怎麼念？</p>
        <div class="word-show">${word}</div>
        <div class="opts two">${opts.map(o => `<button class="opt zy" data-o="${o}">${o}</button>`).join("")}</div>
        <div id="ex"></div></div>`;
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.o === s.z;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (x.dataset.o === s.z) x.classList.add("right"); });
        if (ok) { score++; addStar(); cheer(); } else b.classList.add("wrong");
        $("#ex").innerHTML = `<div class="btns"><button class="btn" id="nx">${i + 1 < qs.length ? "下一題" : "看結果"}</button></div>`;
        $("#nx").onclick = () => { i++; show(); };
      });
    }
    show();
  };

  // ───────── 國字手寫（田字格）─────────
  routes.write = () => {
    setTitle("國字手寫");
    const qs = shuffle(SOUNDS).slice(0, 10);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "write");
      const s = qs[i];
      const word = [...s.w].map(c => c === s.t ? `<span class="blank"><small>${s.z}</small></span>` : c).join("");
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag(s.l)}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <p style="text-align:center;color:var(--muted);margin:0">在田字格寫出框框裡的國字</p>
        <div class="word-show">${word}</div>
        <div class="tian-row"><div class="tian-cell"><canvas id="tian"></canvas><div class="ghost" id="tian-ghost" style="font-size:150px;opacity:.15"></div></div></div>
        <div class="pad-tools" style="justify-content:center">
          <button class="tool on" data-t="pen">✏️ 筆</button><button class="tool" data-t="er">🧽</button>
          <button class="tool" data-t="undo">↶ 復原</button><button class="tool" data-t="clear">🗑️ 清除</button>
        </div>
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">對答案</button></div></div>`;
      const pad = makePad($("#tian"), { width: 6 });
      wireTools(app, [pad]);
      $("#reveal").onclick = () => {
        if (pad.empty()) { toast("先寫寫看喔 ✍️"); return; }
        $("#tian-ghost").textContent = s.t;
        $("#ans").innerHTML = `<div class="answer pop" style="text-align:center"><span class="a" style="font-size:40px">${s.w}</span><div class="tip">淡淡的字疊在你的字上，比對看看筆畫有沒有寫對</div></div>`;
        $("#act").innerHTML = `<button class="btn good" data-s="1">✅ 寫對了</button><button class="btn bad" data-s="0">❌ 寫錯了</button>`;
        $("#act").querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
          if (+b.dataset.s) { score++; addStar(); cheer(); } else { qs.push(s); toast("等一下再寫一次 📌"); }
          i++; show();
        });
      };
    }
    show();
  };

  // ───────── 錯字偵探 ─────────
  routes.typo = () => {
    setTitle("錯字偵探");
    const qs = shuffle(TYPO);
    let i = 0, score = 0, totalWrong = 0;
    function show() {
      if (i >= qs.length) return result(score, totalWrong, "typo");
      const t = qs[i];
      // 依序找出每個錯字的位置
      const wrongPos = new Map(); let from = 0;
      t.fix.forEach(([w, r]) => { const p = t.s.indexOf(w, from); wrongPos.set(p, r); from = p + 1; });
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag(t.l)}　這句有 <b>${t.fix.length}</b> 個錯字</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="sent">${[...t.s].map((c, k) => /[，。、！？；：「」]/.test(c) ? `<span class="ch">${c}</span>` : `<button class="ch" data-k="${k}">${c}</button>`).join("")}</div>
        <div id="ex"></div>
        <div class="btns" id="act"><button class="btn" id="chk">檢查</button></div></div>`;
      app.querySelectorAll("button.ch").forEach(b => b.onclick = () => b.classList.toggle("mark"));
      $("#chk").onclick = () => {
        let hit = 0;
        app.querySelectorAll("button.ch").forEach(b => {
          const k = +b.dataset.k, marked = b.classList.contains("mark"); b.disabled = true;
          if (wrongPos.has(k)) {
            b.classList.remove("mark"); b.classList.add(marked ? "hit" : "miss");
            b.insertAdjacentHTML("beforeend", `<span class="fix">${wrongPos.get(k)}</span>`);
            if (marked) hit++;
          } else if (marked) { b.classList.remove("mark"); b.classList.add("false"); }
        });
        score += hit; totalWrong += t.fix.length; addStar(hit);
        $("#ex").innerHTML = `<div class="explain"><b>找到 ${hit} / ${t.fix.length}</b>　正確寫法：${t.fix.map(([w, r]) => `${w}→<b style="color:var(--good)">${r}</b>`).join("　")}</div>`;
        if (hit === t.fix.length) cheer();
        $("#act").innerHTML = `<button class="btn" id="nx">${i + 1 < qs.length ? "下一句" : "看結果"}</button>`;
        $("#nx").onclick = () => { i++; show(); };
      };
    }
    show();
  };

  // ───────── 選擇題 ─────────
  routes.quiz = arg => {
    const key = arg || "ALL";
    setTitle("選擇題闖關");
    const keys = ["ALL", "L1", "L2", "L3", "L4", "CS", "ZS", "LY"];
    const chips = keys.map(k => `<button class="chip ${k === key ? "on" : ""}" data-k="${k}">${k === "ALL" ? "全部混合" : LESSONS[k].short}</button>`).join("");
    const pool = QUIZ.map((q, idx) => ({ ...q, idx })).filter(q => key === "ALL" || q.l === key);
    runQuiz(shuffle(pool).slice(0, 10), `<div class="chips">${chips}</div>`, () => {
      app.querySelectorAll(".chip").forEach(c => c.onclick = () => { location.hash = "quiz/" + c.dataset.k; });
    }, "quiz/" + key);
  };
  routes.wrong = () => {
    setTitle("錯題本");
    if (!S.wrongQ.length) {
      app.innerHTML = `<div class="card result"><div class="big">📒</div><h2>錯題本是空的</h2><p>選擇題答錯的題目會自動收進來，答對就會移除。</p><div class="btns"><button class="btn" onclick="location.hash='quiz/ALL'">去闖關</button></div></div>`;
      return;
    }
    runQuiz(shuffle(S.wrongQ.map(idx => ({ ...QUIZ[idx], idx }))).slice(0, 10), "", null, "wrong");
  };
  function runQuiz(qs, header, wire, again) {
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, again);
      const q = qs[i];
      const order = shuffle([0, 1, 2, 3].filter(k => q.o[k] !== undefined));
      app.innerHTML = `${header}<div class="card pop">
        <div class="meta"><span>${tag(q.l)}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="q">${esc(q.q)}</div>
        <div class="opts">${order.map((k, n) => `<button class="opt" data-k="${k}"><span class="k">(${LETTERS[n]})</span><span>${esc(q.o[k])}</span></button>`).join("")}</div>
        <div id="ex"></div></div>`;
      wire && wire();
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = +b.dataset.k === q.a;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add("right"); });
        if (ok) { score++; addStar(); cheer(); S.wrongQ = S.wrongQ.filter(x => x !== q.idx); }
        else { b.classList.add("wrong"); if (!S.wrongQ.includes(q.idx)) S.wrongQ.push(q.idx); }
        save();
        $("#ex").innerHTML = `<div class="explain"><b>${ok ? "✔ 答對！" : "✘ 再想想"}</b>　${esc(q.e)}</div>
          <div class="btns"><button class="btn" id="nx">${i + 1 < qs.length ? "下一題" : "看結果"}</button></div>`;
        $("#nx").onclick = () => { i++; show(); };
      });
    }
    show();
  }

  // ───────── 十二樣禮物 ─────────
  routes.gift = () => {
    setTitle("十二樣見面禮");
    const qs = shuffle(GIFTS);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "gift");
      const g = qs[i];
      const opts = shuffle([g, ...shuffle(GIFTS.filter(x => x !== g)).slice(0, 3)]);
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag("L2")}　老師的紙袋裡…</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="ctx" style="font-size:22px">「${g.m}」</div>
        <p style="color:var(--muted);margin:4px 0 10px">這句話是哪一樣禮物的提醒？</p>
        <div class="opts two">${opts.map(o => `<button class="opt" data-g="${o.g}" style="flex-direction:column;align-items:center"><span style="font-size:34px">${o.e}</span><span>${o.g}</span></button>`).join("")}</div>
        <div id="ex"></div></div>`;
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = b.dataset.g === g.g;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (x.dataset.g === g.g) x.classList.add("right"); });
        if (ok) { score++; addStar(); cheer(); } else b.classList.add("wrong");
        $("#ex").innerHTML = `<div class="btns"><button class="btn" id="nx">${i + 1 < qs.length ? "下一樣" : "看結果"}</button></div>`;
        $("#nx").onclick = () => { i++; show(); };
      });
    }
    show();
  };

  // ───────── 論語默寫 ─────────
  routes.recite = () => {
    setTitle("論語默寫");
    const qs = shuffle(RECITE);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "recite");
      const r = qs[i];
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag("LY")}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="ctx" style="font-size:24px">${esc(r.s)}</div>
        <p style="color:var(--muted);margin:0">把空格的字寫在下面（多個空格用「／」分開）</p>
        ${padHTML("pad", 150, 40)}
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">對答案</button></div></div>`;
      const pad = makePad($("#pad"), { width: 4 });
      wireTools(app, [pad], b => { const gh = $("#pad-ghost"); const on = !gh.textContent; gh.textContent = on ? r.a : ""; b.classList.toggle("on", on); });
      $("#reveal").onclick = () => {
        if (pad.empty()) { toast("先默寫看看 ✍️"); return; }
        // 把答案依序填回句子
        const parts = r.a.split("／"); let n = 0;
        const full = r.s.replace(/＿+/g, () => parts[n++] || "");
        $("#ans").innerHTML = `<div class="answer pop"><div class="a">${esc(r.a)}</div><div class="tip">完整句：${esc(full)}</div></div>`;
        app.querySelector('[data-t="trace"]').hidden = false;
        $("#act").innerHTML = `<button class="btn good" data-s="1">✅ 寫對了</button><button class="btn bad" data-s="0">❌ 寫錯了</button>`;
        $("#act").querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
          if (+b.dataset.s) { score++; addStar(); cheer(); } else { qs.push(r); toast("等一下再默一次 📌"); }
          i++; show();
        });
      };
    }
    show();
  };

  // ───────── 重點卡 ─────────
  routes.cards = arg => {
    const key = CARDS[arg] ? arg : "L1";
    setTitle("重點卡");
    const chips = Object.keys(CARDS).map(k => `<button class="chip ${k === key ? "on" : ""}" data-k="${k}">${LESSONS[k].short}</button>`).join("");
    const gl = GLOSS.filter(g => g.lesson === key);
    app.innerHTML = `<div class="chips">${chips}</div>
      <h2 style="margin:4px 4px 12px;font-size:20px">${LESSONS[key].name}</h2>
      ${CARDS[key].map(([h, p]) => `<div class="card kp" style="border-left-color:${LESSONS[key].color}"><h3>${h}</h3><p>${esc(p)}</p></div>`).join("")}
      ${gl.length ? `<div class="section-title">本課注釋</div><div class="gloss-list">${gl.map(g => `<div class="gl"><b>${g.exam ? "🔥" : ""}${g.term}</b><span>${esc(g.ans)}</span><span></span></div>`).join("")}</div>` : ""}
      <div class="btns"><button class="btn" onclick="location.hash='quiz/${key}'">做這課的選擇題 →</button></div>`;
    app.querySelectorAll(".chip").forEach(c => c.onclick = () => { location.hash = "cards/" + c.dataset.k; });
  };

  // ───────── 結果頁 ─────────
  function result(score, total, again) {
    const r = total ? score / total : 0;
    const stars = r >= .9 ? 3 : r >= .7 ? 2 : r >= .4 ? 1 : 0;
    const msg = ["再接再厲，錯的地方多看兩次！", "有進步空間，加油！", "很不錯喔！", "完美！可以挑戰下一關了！"][stars];
    app.innerHTML = `<div class="card result pop">
      <div class="big">${stars === 3 ? "🏆" : stars ? "🎉" : "🌱"}</div>
      <h2>${score} / ${total}</h2>
      <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
      <p>${msg}</p>
      <div class="btns"><button class="btn" id="again">再玩一次</button><button class="btn ghost-btn" id="home">回首頁</button></div></div>`;
    $("#again").onclick = () => { if (location.hash === "#" + again) render(); else go(again); };
    $("#home").onclick = () => go("");
  }

  renderStreak();
  render();
})();
