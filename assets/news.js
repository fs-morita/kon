/* お知らせを Google スプレッドシートから出す。
   読めないとき（共有前・通信の失敗）は、ページに書いてあるお知らせをそのまま見せる。
   表の列：表示先（こん整形外科／KOSMI／両方）・日付・題・本文。上の行ほど上に出る。
   本文：「■」で始まる行は見出し、「・」で始まる行は箇条書き、空行で段落、[文字](URL) とURLはリンク。 */
(function () {
  var SHEET = "1bGK8apq1uHP8G6wTH8h-XpbxEvBeq5ofoBeuSpGg3bY";
  var boxes = document.querySelectorAll(".news[data-news]");
  if (!boxes.length || SHEET.indexOf("__") === 0) return;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function link(url, label) {
    var ext = /^https?:/.test(url) && url.indexOf(location.host) < 0;
    return '<a href="' + url + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + label + "</a>";
  }
  function inline(s) {
    var out = "", re = /\[([^\]]+)\]\(((?:https?:|tel:|mailto:)[^)\s]+)\)|(https?:\/\/[^\s<>()（）「」、。]+)/g, last = 0, m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      out += m[1] ? link(esc(m[2]), esc(m[1])) : link(esc(m[3]), esc(m[3]));
      last = re.lastIndex;
    }
    return out + esc(s.slice(last));
  }
  function body(text) {
    var html = "", para = [], list = [];
    function flush() {
      if (para.length) html += "<p>" + para.join("<br>") + "</p>";
      if (list.length) html += "<ul>" + list.join("") + "</ul>";
      para = []; list = [];
    }
    String(text).replace(/\r/g, "").split("\n").forEach(function (line) {
      var t = line.trim();
      if (!t) { flush(); return; }
      if (t.charAt(0) === "■") { flush(); html += "<h5>" + inline(t.slice(1).trim()) + "</h5>"; return; }
      if (t.charAt(0) === "・" && t.charAt(1) !== "・") {
        if (para.length) { html += "<p>" + para.join("<br>") + "</p>"; para = []; }
        list.push("<li>" + inline(t.slice(1).trim()) + "</li>"); return;
      }
      if (list.length) { html += "<ul>" + list.join("") + "</ul>"; list = []; }
      para.push(inline(t));
    });
    flush();
    return html;
  }
  function cell(c) {
    if (!c) return "";
    return String(c.f != null ? c.f : c.v != null ? c.v : "").trim();
  }

  window.__konNews = function (res) {
    try {
      if (!res || res.status === "error" || !res.table) return;
      var cols = res.table.cols.map(function (c) { return (c.label || "").trim(); });
      var at = function (name) { return cols.indexOf(name); };
      var iW = at("表示先"), iD = at("日付"), iT = at("題"), iB = at("本文");
      if (iT < 0 || iB < 0 || iW < 0) return;
      var rows = res.table.rows.map(function (r) {
        return { w: cell(r.c[iW]), d: iD < 0 ? "" : cell(r.c[iD]), t: cell(r.c[iT]), b: cell(r.c[iB]) };
      }).filter(function (r) { return r.t; });
      boxes.forEach(function (box) {
        var want = box.getAttribute("data-news") === "kosmi" ? "KOSMI" : "こん整形外科";
        var limit = +box.getAttribute("data-limit") || 0;
        var list = rows.filter(function (r) { return r.w === want || r.w === "両方"; });
        if (limit) list = list.slice(0, limit);
        box.innerHTML = list.map(function (r, i) {
          var op = box.hasAttribute("data-open") && i === 0 ? " open" : "";
          return "<details" + op + '><summary><span class="t">' + esc(r.t) + '</span><span class="d">' + esc(r.d) +
            '</span><i class="pm"></i></summary><div class="body">' + body(r.b) + "</div></details>";
        }).join("");
      });
    } catch (e) {}
  };
  var s = document.createElement("script");
  s.src = "https://docs.google.com/spreadsheets/d/" + SHEET + "/gviz/tq?headers=1&tqx=responseHandler:__konNews&t=" + Date.now();
  s.async = true;
  document.head.appendChild(s);
})();
