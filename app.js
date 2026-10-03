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

  // ───────── 打字作答 ─────────
  // 比對時忽略空白與標點
  const norm = t => String(t).replace(/[\s，。、；：！？「」『』（）()／\/,.;:!?]/g, "");
  function typeHTML(id, rows, ph) {
    return rows > 1
      ? `<textarea class="typein" id="${id}" rows="${rows}" placeholder="${ph}" autocomplete="off" spellcheck="false"></textarea>`
      : `<input class="typein one" id="${id}" placeholder="${ph}" autocomplete="off" spellcheck="false">`;
  }
  // 單行按 Enter、多行按 Ctrl/⌘+Enter 送出；注音選字中的 Enter 不算
  function onSubmit(el, fn) {
    el.addEventListener("keydown", e => {
      if (e.key !== "Enter" || e.isComposing || e.keyCode === 229) return;
      if (el.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); fn();
    });
    setTimeout(() => el.focus({ preventScroll: true }), 50);
  }
  function needInput(el, msg) {
    if (norm(el.value)) return false;
    el.classList.add("shake"); setTimeout(() => el.classList.remove("shake"), 400); toast(msg); el.focus(); return true;
  }
  // 逐字比對（LCS）：回傳錯字數，以及標出錯字的「你打的」
  function diff(typed, ans) {
    const a = [...norm(typed)], b = [...norm(ans)];
    const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0, html = "";
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { html += esc(a[i]); i++; j++; }
      else if (i < a.length && j < b.length && L[i + 1][j + 1] === L[i][j]) { html += `<del>${esc(a[i])}</del><ins>${esc(b[j])}</ins>`; i++; j++; }
      else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) { html += `<ins class="miss">${esc(b[j])}</ins>`; j++; }
      else { html += `<del>${esc(a[i])}</del>`; i++; }
    }
    return { errors: Math.max(a.length, b.length) - L[0][0], html };
  }
  const mineHTML = (d, ok) => `<div class="mine ${ok ? "ok" : ""}"><span class="lbl">你打的</span>${d.html || "（空白）"}</div>`;
  const lock = el => { el.readOnly = true; el.blur(); };

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
          <p>依老師的複習單分四天，點日期直接練那一天的注釋。</p>
          <div class="days">${days}</div>
        </div>
      </div>
      <div class="grid">
        <button class="tile main" data-go="gloss/exam"><span class="ic">✍️</span><span><b>注釋練習</b><br><small>考試指定 19 則｜先自己打字作答，再對答案、打分數，不熟的會一直回來</small></span></button>
      </div>
      <div class="grid" style="margin-top:12px">
        <button class="tile main" data-go="poem" style="background:linear-gradient(135deg,#2b7bb9,#5b5bd1)"><span class="ic">🏮</span><span><b>五言絕句默寫</b><br><small>範圍：5 獨坐敬亭山・6 勞勞亭・7 八陣圖・8 尋隱者不遇｜整首默寫、接下句、賞析</small></span></button>
      </div>
      <div class="section-title">字音字形</div>
      <div class="grid">
        <button class="tile" data-go="sound"><span class="ic">🔤</span><b>字音大考驗</b><small>看國字選注音，聲調陷阱多</small></button>
        <button class="tile" data-go="write"><span class="ic">🖊️</span><b>看注音寫國字</b><small>看注音，打出正確的國字</small></button>
        <button class="tile" data-go="typo"><span class="ic">🔍</span><b>錯字偵探</b><small>單元卷改錯題，點出藏起來的錯字</small></button>
      </div>
      <div class="section-title">課文與閱讀</div>
      <div class="grid">
        <button class="tile" data-go="quiz/ALL"><span class="ic">📝</span><b>選擇題闖關</b><small>單元卷精選＋解析，每關 10 題</small></button>
        <button class="tile" data-go="gift"><span class="ic">🎁</span><b>十二樣禮物</b><small>每樣禮物象徵什麼？</small></button>
        <button class="tile" data-go="recite"><span class="ic">📜</span><b>論語默寫</b><small>打字填空，背熟原文</small></button>
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
    $("#reset").onclick = () => { if (confirmReset()) { S = { gloss: {}, wrongQ: [], stars: 0, poem: {} }; save(); renderStreak(); render(); } };
  };
  let resetArmed = 0;
  function confirmReset() { // 按兩次才重設，不用 confirm 對話框
    if (Date.now() - resetArmed < 3000) return true;
    resetArmed = Date.now(); toast("再按一次「重設進度」確認"); return false;
  }

  // ───────── 注釋練習 ─────────
  routes.gloss = arg => {
    let pool, title;
    if (arg === "more") { pool = GLOSS.filter(g => !g.exam); title = "延伸注釋"; }
    else if (arg && arg.startsWith("day-")) { const d = arg.slice(4); pool = EXAM.filter(g => g.day === d); title = `注釋練習 ${d}`; }
    else { pool = EXAM; title = "注釋練習"; }
    setTitle(title);
    // 不熟的排前面
    let queue = shuffle(pool).sort((a, b) => lvl(a.id) - lvl(b.id));
    const total = queue.length; let done = 0, right = 0;
    const firstTry = new Set();
    let inp;

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
          ${typeHTML("inp", 3, "把意思打在這裡…")}
          <div id="ans"></div>
          <div class="btns" id="act"><button class="btn" id="reveal">打好了，對答案</button></div>
        </div>`;
      inp = $("#inp");
      if ($("#zy")) $("#zy").onclick = e => { e.target.outerHTML = `<span>${g.zhuyin}</span>`; };
      const reveal = () => {
        if (inp.readOnly || needInput(inp, "先打打看喔 ⌨️")) return;
        lock(inp);
        const typed = norm(inp.value);
        $("#ans").innerHTML = `<div class="answer pop">
          <div class="a">${esc(g.ans)}</div>
          ${g.keys.length ? `<div class="keys">關鍵詞（綠色＝你有打到）：${g.keys.map(k => `<span class="${typed.includes(norm(k)) ? "hit" : ""}">${k}</span>`).join("")}</div>` : ""}
          ${g.zhuyin ? `<div class="tip" style="margin-top:6px">注音：${g.zhuyin}</div>` : ""}
          ${g.tip ? `<div class="tip">${esc(g.tip)}</div>` : ""}
        </div>`;
        $("#act").innerHTML = `
          <button class="btn good" data-s="2">✅ 寫對了</button>
          <button class="btn warn" data-s="1">🟡 差一點</button>
          <button class="btn bad" data-s="0">❌ 不會</button>`;
        $("#act").querySelectorAll("[data-s]").forEach(b => b.onclick = () => grade(g, +b.dataset.s));
      };
      $("#reveal").onclick = reveal; onSubmit(inp, reveal);
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
        toast(s === 1 ? "差一點！等一下再考一次 💪" : "沒關係，照著答案打一次，等一下再考 📌");
        if (s === 0) { save(); return copyOnce(g); }
      }
      save(); show();
    }
    function copyOnce(g) { // 不會的話先照著答案打一遍再繼續
      inp.readOnly = false; inp.value = ""; inp.placeholder = "看著上面的答案打一遍"; inp.focus();
      $("#act").innerHTML = `<button class="btn" id="next">打完了，下一題</button>`;
      const next = () => {
        if (diff(inp.value, g.ans).errors > 2) { toast("再對照答案打一次喔 👀"); return; }
        show();
      };
      $("#next").onclick = next; onSubmit(inp, next);
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

  // ───────── 看注音寫國字 ─────────
  routes.write = () => {
    setTitle("看注音寫國字");
    const qs = shuffle(SOUNDS).slice(0, 10);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "write");
      const s = qs[i];
      const word = [...s.w].map(c => c === s.t ? `<span class="blank"><small>${s.z}</small></span>` : c).join("");
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag(s.l)}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <p style="text-align:center;color:var(--muted);margin:0">打出框框裡的國字（打整個詞也可以）</p>
        <div class="word-show">${word}</div>
        <div class="type-center">${typeHTML("inp", 1, "打字…")}</div>
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">對答案</button></div></div>`;
      const inp = $("#inp");
      const check = () => {
        if (inp.readOnly || needInput(inp, "先打打看喔 ⌨️")) return;
        lock(inp);
        const t = norm(inp.value), ok = t === s.t || t === norm(s.w);
        if (ok) { score++; addStar(); cheer(); } else { qs.push(s); toast("等一下再考一次 📌"); }
        const mark = [...s.w].map(c => c === s.t ? `<b class="${ok ? "hit" : "miss"}">${c}</b>` : c).join("");
        $("#ans").innerHTML = `<div class="answer pop ${ok ? "" : "no"}" style="text-align:center">
          ${ok ? "" : mineHTML({ html: esc(inp.value.trim()) }, false)}
          <span class="a" style="font-size:40px">${mark}</span>
          ${ok ? "" : `<div class="tip">注意「${s.t}」的寫法，等一下會再考一次</div>`}</div>`;
        $("#act").innerHTML = `<button class="btn" id="nx">${i + 1 < qs.length ? "下一題" : "看結果"}</button>`;
        const nx = $("#nx"); nx.onclick = () => { i++; show(); }; setTimeout(() => nx.focus(), 50);
      };
      $("#reveal").onclick = check; onSubmit(inp, check);
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
    const keys = ["ALL", "L1", "L2", "L3", "L4", "CS", "ZS", "LY", "SH"];
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
    const qs = shuffle(RECITE.filter(r => r.l === "LY"));
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "recite");
      const r = qs[i];
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag("LY")}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <div class="ctx" style="font-size:24px">${esc(r.s)}</div>
        <p style="color:var(--muted);margin:0">把空格的字依序打出來（多個空格可用空白或「／」隔開）</p>
        ${typeHTML("inp", 1, "打字…")}
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">對答案</button></div></div>`;
      const inp = $("#inp");
      const check = () => {
        if (inp.readOnly || needInput(inp, "先默寫看看 ⌨️")) return;
        lock(inp);
        const d = diff(inp.value, r.a), ok = !d.errors;
        if (ok) { score++; addStar(); cheer(); } else { qs.push(r); toast("等一下再默一次 📌"); }
        // 把答案依序填回句子
        const parts = r.a.split("／"); let n = 0;
        const full = r.s.replace(/＿+/g, () => parts[n++] || "");
        $("#ans").innerHTML = `<div class="answer pop ${ok ? "" : "no"}">${mineHTML(d, ok)}<div class="a">${esc(r.a)}</div><div class="tip">完整句：${esc(full)}</div></div>`;
        $("#act").innerHTML = `<button class="btn" id="nx">${i + 1 < qs.length ? "下一題" : "看結果"}</button>`;
        const nx = $("#nx"); nx.onclick = () => { i++; show(); }; setTimeout(() => nx.focus(), 50);
      };
      $("#reveal").onclick = check; onSubmit(inp, check);
    }
    show();
  };

  // ───────── 五言絕句 ─────────
  S.poem ||= {}; // n -> 默寫成功次數
  const poemPool = arg => arg === "all" ? POEMS : arg && /^\d+$/.test(arg) ? POEMS.filter(p => p.n === +arg) : POEMS.filter(p => p.exam);
  const poemText = p => p.lines.map((l, k) => l + (k % 2 ? "。" : "，")).join("");

  routes.poem = arg => {
    const p = POEMS.find(x => x.n === +arg);
    if (p) return poemDetail(p);
    setTitle("五言絕句");
    app.innerHTML = `
      <div class="grid">
        <button class="tile" data-go="poemw/exam"><span class="ic">✍️</span><b>整首默寫</b><small>範圍 5–8，四句全部打出來</small></button>
        <button class="tile" data-go="poemline/exam"><span class="ic">🔗</span><b>接下句</b><small>看一句，打出下一句或上一句</small></button>
        <button class="tile" data-go="quiz/SH"><span class="ic">📝</span><b>詩詞選擇題</b><small>作者、修辭、賞析</small></button>
        <button class="tile" data-go="cards/SH"><span class="ic">📚</span><b>詩人重點卡</b><small>詩仙、詩聖、詩佛…</small></button>
      </div>
      <div class="section-title">點一首詩看賞析（🔥 = 段考範圍）</div>
      ${POEMS.map(p => `<button class="card" data-go="poem/${p.n}" style="display:block;width:100%;text-align:left;border:0;${p.exam ? "" : "opacity:.75"}">
        <div class="meta"><span>${p.exam ? "🔥 " : ""}${p.n}. <b style="color:var(--ink);font-size:18px">${p.title}</b>　${p.author}</span><span>${"✔".repeat(Math.min(3, S.poem[p.n] || 0))}</span></div>
        <div style="font-family:var(--kai);font-size:20px;letter-spacing:2px">${poemText(p)}</div></button>`).join("")}
      <div class="btns"><button class="btn ghost-btn" data-go="poemw/all">全部 8 首都默寫</button></div>`;
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  };

  function poemDetail(p) {
    setTitle(`${p.title}`);
    app.innerHTML = `<div class="card pop" style="text-align:center">
        <div class="meta"><span>${p.exam ? "🔥 段考範圍" : "補充"}</span><span>五言絕句 ${p.n}</span></div>
        <div class="term" style="font-size:34px">${p.title}</div><div class="term-sub">${p.author}</div>
        <div style="font-family:var(--kai);font-size:30px;line-height:1.9;margin:10px 0">${p.lines.map((l, k) => l + (k % 2 ? "。" : "，")).join("<br>")}</div>
      </div>
      <div class="card kp"><h3>語譯</h3><p>${esc(p.tr)}</p></div>
      <div class="card kp"><h3>意旨與賞析</h3><p>${esc(p.idea)}</p></div>
      ${p.hint ? `<div class="card kp" style="border-left-color:var(--warn)"><h3>💡 記憶小撇步</h3><p>${esc(p.hint)}</p></div>` : ""}
      <div class="card kp"><h3>注釋</h3>${p.notes.map(([t, a]) => `<p><b>${t}</b>　${esc(a)}</p>`).join("")}</div>
      <div class="btns"><button class="btn" data-go="poemw/${p.n}">✍️ 默寫這首</button><button class="btn ghost-btn" data-go="poem">回詩單</button></div>`;
    app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  }

  // 整首默寫：四句打字，逐字比對
  routes.poemw = arg => {
    setTitle("整首默寫");
    const qs = shuffle(poemPool(arg));
    const total = qs.length; let done = 0, right = 0; const missed = new Set();
    function show() {
      if (!qs.length) return result(right, total, "poemw/" + (arg || "exam"));
      const p = qs[0];
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag("SH")} ${p.exam ? "🔥" : ""}</span><span>${done + 1} / ${total}</span></div>
        <div class="bar"><i style="width:${done / total * 100}%"></i></div>
        <div class="term" style="font-size:34px">${p.title}</div>
        <div class="term-sub">${p.author}　<button class="hint-btn" id="hint">提示每句第一個字</button></div>
        <p style="color:var(--muted);margin:8px 0 0;text-align:center">一行打一句，四句都要打（標點可省略）</p>
        <div id="hintbox"></div>
        <textarea class="typein poem" id="inp" rows="4" placeholder="第一句&#10;第二句&#10;第三句&#10;第四句" autocomplete="off" spellcheck="false"></textarea>
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">打好了，對答案</button></div></div>`;
      const inp = $("#inp");
      $("#hint").onclick = () => {
        $("#hintbox").innerHTML = `<div class="tip" style="text-align:center;font-family:var(--kai);font-size:20px">${p.lines.map(l => l[0] + "＿＿＿＿").join("　")}</div>`;
        missed.add(p.n); toast("提示用掉了，這首會算「差一點」喔");
      };
      const check = () => {
        if (inp.readOnly || needInput(inp, "先默寫看看 ⌨️")) return;
        lock(inp);
        const d = diff(inp.value, p.lines.join("")), ok = !d.errors;
        if (ok) {
          if (!missed.has(p.n)) right++;
          S.poem[p.n] = (S.poem[p.n] || 0) + 1; save();
          qs.shift(); done++; addStar(2); cheer();
        } else {
          missed.add(p.n);
          qs.shift(); qs.splice(Math.min(qs.length, 1), 0, p);
          toast(d.errors <= 2 ? `差一點！錯 ${d.errors} 個字，等一下再默一次 💪` : "還不熟，看清楚答案，等一下再默一次 📌");
        }
        $("#ans").innerHTML = `<div class="answer pop ${ok ? "" : "no"}">
          ${mineHTML(d, ok)}
          <div class="a" style="font-size:26px;line-height:1.8">${p.lines.map((l, k) => l + (k % 2 ? "。" : "，")).join("<br>")}</div>
          <div class="tip">${ok ? "全對！" : "紅色劃掉的是錯字，綠色是正確的字（虛線框＝漏掉的字）。"}特別注意 ${hardChars(p)}</div></div>`;
        $("#act").innerHTML = `<button class="btn" id="nx">${qs.length ? "繼續" : "看結果"}</button>`;
        const nx = $("#nx"); nx.onclick = show; setTimeout(() => nx.focus(), 50);
      };
      $("#reveal").onclick = check; onSubmit(inp, check);
    }
    show();
  };
  // 容易寫錯的字（筆畫多或同音字）
  const HARD = "篁嘯柴返景苔綺著澗閒桂驚厭敬勞遣蓋陣恨吞吳隱採藥";
  const hardChars = p => [...new Set(p.lines.join("").split("").filter(c => HARD.includes(c)))].map(c => `「${c}」`).join("") || "每個字";

  // 接下句
  routes.poemline = arg => {
    setTitle("接下句");
    const pool = poemPool(arg);
    const qs = shuffle(pool.flatMap(p => p.lines.map((l, k) => ({ p, k })))).slice(0, 10);
    let i = 0, score = 0;
    function show() {
      if (i >= qs.length) return result(score, qs.length, "poemline/" + (arg || "exam"));
      const { p, k } = qs[i];
      // 0、2 句問下一句；1、3 句問上一句
      const askNext = k % 2 === 0, target = askNext ? k + 1 : k - 1;
      const shown = askNext ? `${p.lines[k]}，<span class="blank" style="width:5.4em"></span>。` : `<span class="blank" style="width:5.4em"></span>，${p.lines[k]}。`;
      app.innerHTML = `<div class="card pop">
        <div class="meta"><span>${tag("SH")} 〈${p.title}〉${p.author}</span><span>${i + 1} / ${qs.length}</span></div>
        <div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
        <p style="text-align:center;color:var(--muted);margin:0">打出${askNext ? "下" : "上"}一句</p>
        <div class="word-show" style="font-size:30px;letter-spacing:3px">${shown}</div>
        <div class="type-center">${typeHTML("inp", 1, "打字…")}</div>
        <div id="ans"></div>
        <div class="btns" id="act"><button class="btn" id="reveal">對答案</button></div></div>`;
      const inp = $("#inp");
      const check = () => {
        if (inp.readOnly || needInput(inp, "先打打看 ⌨️")) return;
        lock(inp);
        const d = diff(inp.value, p.lines[target]), ok = !d.errors;
        if (ok) { score++; addStar(); cheer(); } else { qs.push(qs[i]); toast("等一下再考一次 📌"); }
        $("#ans").innerHTML = `<div class="answer pop ${ok ? "" : "no"}">${mineHTML(d, ok)}<div class="a">${p.lines[target]}</div><div class="tip">全詩：${poemText(p)}</div></div>`;
        $("#act").innerHTML = `<button class="btn" id="nx">${i + 1 < qs.length ? "下一題" : "看結果"}</button>`;
        const nx = $("#nx"); nx.onclick = () => { i++; show(); }; setTimeout(() => nx.focus(), 50);
      };
      $("#reveal").onclick = check; onSubmit(inp, check);
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
