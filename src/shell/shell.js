/* 所有页面共用：滚动进度、入场动画、数字滚动
   深色 / 浅色跟随系统，没有手动开关；系统主题变了要通知图表重画。
   注：window.onThemeChange 由 <head> 里的内联桩函数提前定义，页面脚本先于本文件执行 */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var dark = window.matchMedia("(prefers-color-scheme: dark)");
  var onSchemeChange = function () {
    (window.__themeHooks || []).forEach(function (fn) { fn(); });
  };
  if (dark.addEventListener) dark.addEventListener("change", onSchemeChange);
  else if (dark.addListener) dark.addListener(onSchemeChange);

  var bar = document.getElementById("progress");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });

  /* 点菜：把用户写的内容作为 prefill 参数拼进飞书表单
     用户打开时字已经填好，只需点一次提交，不用复制粘贴 */
  var askInput = document.getElementById("ask-input");
  if (askInput) {
    var FORM_URL = "https://soloent-ai.feishu.cn/share/base/shrcnhbBteCGWNksTgo6qf1NyZg";
    // 这两个必须和表单里的字段名逐字一致（含全角括号），改了表单字段名就要同步改这里，
    // 否则 prefill 参数匹配不上，会静默地填不进去
    var F_WANT = "你还想看什么测评？";
    var F_FROM = "来源页面（自动填写）";
    var askMsg = document.getElementById("ask-msg");
    var askBtn = document.getElementById("ask-btn");
    var source = askInput.getAttribute("data-source") || document.title;

    var submitAsk = function () {
      var v = askInput.value.trim();
      if (!v) {
        askMsg.className = "ask-msg warn";
        askMsg.textContent = "先写一句想看的方向，再点提交。";
        askInput.focus();
        return;
      }
      var url = FORM_URL +
        "?prefill_" + encodeURIComponent(F_WANT) + "=" + encodeURIComponent(v) +
        "&prefill_" + encodeURIComponent(F_FROM) + "=" + encodeURIComponent(source);
      window.open(url, "_blank", "noopener");
      askMsg.className = "ask-msg";
      askMsg.textContent = "表单已在新标签页打开，你写的内容已经填好，点一下提交就行。";
    };

    askBtn.addEventListener("click", submitAsk);
    askInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submitAsk(); }
    });
  }

  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var target = +e.target.getAttribute("data-count");
      if (reduceMotion) { e.target.textContent = target; return; }
      var t0 = performance.now(), dur = 900;
      (function step(t) {
        var p = Math.min(1, (t - t0) / dur);
        e.target.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach(function (n) { cio.observe(n); });
})();
