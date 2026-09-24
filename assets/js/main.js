/* Les Anciens de Callo — scripts communes à toutes les pages */
(function () {
  var C = window.CALLO || {};
  var demo = !C.ENDPOINT || C.ENDPOINT.indexOf("http") !== 0;

  // Adresse de contact partout où elle apparaît
  document.querySelectorAll("[data-contact]").forEach(function (el) {
    if (C.CONTACT_EMAIL) { el.textContent = C.CONTACT_EMAIL; if (el.tagName === "A") el.href = "mailto:" + C.CONTACT_EMAIL; }
  });

  // Apparition au défilement
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });

  // Compte à rebours
  var cd = document.getElementById("cd");
  if (cd) {
    var target = new Date(C.AG_DATE || "2026-12-18T18:30:00+01:00").getTime();
    var tick = function () {
      var s = Math.max(0, target - Date.now()) / 1000;
      document.getElementById("cd-d").textContent = Math.floor(s / 86400);
      document.getElementById("cd-h").textContent = Math.floor(s % 86400 / 3600);
      document.getElementById("cd-m").textContent = Math.floor(s % 3600 / 60);
    };
    tick(); setInterval(tick, 30000);
  }

  // Visionneuse des archives
  var lb = document.getElementById("lb");
  if (lb) {
    var lbImg = lb.querySelector("img"), lbTxt = lb.querySelector("p");
    document.querySelectorAll(".arch").forEach(function (f) {
      f.setAttribute("tabindex", "0");
      var open = function () { var i = f.querySelector("img"); lbImg.src = i.src; lbImg.alt = i.alt; lbTxt.textContent = f.querySelector("figcaption").textContent; lb.classList.add("open"); };
      f.addEventListener("click", open);
      f.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); });
    });
    var close = function () { lb.classList.remove("open"); };
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "BUTTON") close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  // Envoi vers Google Apps Script (partagé par les deux formulaires)
  window.calloSend = function (payload) {
    if (demo) { console.log("Mode démonstration — données qui seraient envoyées :", payload); return new Promise(function (r) { setTimeout(r, 500); }); }
    return fetch(C.ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  };

  // Formulaire de contact (pages d'accueil)
  var cf = document.getElementById("cf");
  if (cf) {
    var box = document.getElementById("c-msgbox"), go = document.getElementById("c-go");
    var show = function (t, m) { box.className = "msg " + t; box.textContent = m; };
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!cf.checkValidity()) {
        var bad = cf.querySelector(":invalid");
        show("err", bad && bad.id === "c-rgpd" ? "Merci de cocher la case d'accord pour l'utilisation de vos données." : "Merci de compléter les champs obligatoires (*).");
        if (bad) bad.focus(); return;
      }
      var d = Object.fromEntries(new FormData(cf).entries());
      if (d.site_web) return;
      var payload = { type: "contact", site: cf.dataset.site, nom: d.nom.trim().toUpperCase(), prenom: d.prenom.trim(), email: d.email.trim().toLowerCase(), tel: d.tel || "", promo: d.promo || "", message: d.message.trim(), rgpd: "Oui", optin: d.optin ? "Oui" : "Non" };
      go.disabled = true; go.textContent = "Envoi…";
      window.calloSend(payload).then(function () {
        cf.reset(); show("ok", "Merci " + payload.prenom + " ! Votre message est bien parti. Nous revenons vers vous très vite.");
      }).catch(function () { show("err", "L'envoi n'a pas abouti, merci de réessayer."); })
        .then(function () { go.disabled = false; go.textContent = "Envoyer"; });
    });
  }
})();
