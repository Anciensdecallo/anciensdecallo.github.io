/* =====================================================================
   LES ANCIENS DE CALLO — CONSENTEMENT ET MESURE D'AUDIENCE
   ---------------------------------------------------------------------
   Règle appliquée : AUCUNE requête n'est envoyée à Google (gtag.js)
   avant un accord explicite du visiteur. Le refus est aussi simple que
   l'acceptation et n'empêche rien sur le site.

   La mesure maison (origine des visites, voir outils/apps-script) ne
   dépose aucun cookie : elle reste active sans consentement.
   ===================================================================== */
(function () {
  var GA_ID = "G-Z9DCCNGT00";
  var CLE = "callo-consent";
  var choix = null;
  try { choix = localStorage.getItem(CLE); } catch (e) {}

  window.calloGaId = GA_ID;

  function chargerGa() {
    if (window.__calloGa) return;
    window.__calloGa = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  window.calloGaGranted = function () { return choix === "granted"; };

  /* Envoi d'un événement GA : sans accord, la fonction ne fait rien.
     Les formulaires l'appellent donc sans avoir à vérifier quoi que ce soit. */
  window.calloTrack = function (nom, params) {
    if (choix !== "granted" || !window.gtag) return;
    try { window.gtag("event", nom, params || {}); } catch (e) {}
  };

  function lienMentions() {
    var d = location.pathname.indexOf("/lycee/") > -1 || location.pathname.indexOf("/polesup/") > -1;
    return d ? "mentions-legales.html" : "lycee/mentions-legales.html";
  }

  /* Styles du bandeau, injectés par ce script : la page d'inscription et la page
     404 ne chargent pas style.css, et certaines pages ont une règle générale
     « button{width:100%} » qui écraserait les boutons. Le bandeau doit donc être
     autonome, avec !important sur les propriétés sensibles. */
  var CSS = [
    "#callo-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#fff;",
    "border-top:4px solid var(--primary,#454F56);box-shadow:0 -10px 34px rgba(0,0,0,.22);",
    "padding:16px 18px;text-align:left;font-family:Arial,Helvetica,sans-serif;color:var(--ink,#232A2E)}",
    "#callo-consent .cc-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;",
    "justify-content:space-between;gap:18px;flex-wrap:wrap}",
    "#callo-consent .cc-txt{margin:0;padding:0;font-size:15px;line-height:1.45;flex:1 1 440px;",
    "color:var(--ink,#232A2E);font-weight:normal;text-align:left}",
    "#callo-consent .cc-txt b{font-weight:bold}",
    "#callo-consent .cc-txt a{color:var(--primary,#454F56);font-weight:bold;text-decoration:underline}",
    "#callo-consent .cc-btns{display:flex;gap:12px;flex:0 0 auto;align-items:center}",
    "#callo-consent button{box-sizing:border-box;width:auto !important;margin:0 !important;",
    "padding:14px 26px !important;font-family:inherit;font-size:16px !important;font-weight:bold !important;",
    "line-height:1.2;border-radius:12px;cursor:pointer;text-align:center}",
    "#callo-consent .cc-no{background:#fff !important;color:var(--ink,#232A2E) !important;",
    "border:3px solid var(--primary,#454F56) !important}",
    "#callo-consent .cc-yes{background:var(--primary,#454F56) !important;color:#fff !important;",
    "border:3px solid var(--primary,#454F56) !important}",
    "#callo-consent .cc-no:hover{background:var(--soft,#F5F7EA) !important}",
    "@media (max-width:640px){#callo-consent .cc-btns{width:100%}",
    "#callo-consent button{flex:1 1 0;padding:14px 10px !important}}"
  ].join("");

  function injecterStyles() {
    if (document.getElementById("callo-consent-css")) return;
    var s = document.createElement("style");
    s.id = "callo-consent-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function enregistrer(v) {
    choix = v;
    try { localStorage.setItem(CLE, v); } catch (e) {}
    var b = document.getElementById("callo-consent");
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (v === "granted") chargerGa();
  }

  function afficherBandeau() {
    if (document.getElementById("callo-consent")) return;
    injecterStyles();
    var b = document.createElement("div");
    b.id = "callo-consent";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-label", "Mesure d'audience et cookies");
    b.innerHTML =
      '<div class="cc-in">' +
        '<p class="cc-txt"><b>Mesure d\u2019audience.</b> La fréquentation du site est comptée sans cookie, ' +
        'de façon anonyme. Avec votre accord, nous ajoutons <b>Google Analytics</b> pour mieux comprendre ' +
        'quelles pages servent au réseau. <a href="' + lienMentions() + '">En savoir plus</a></p>' +
        '<div class="cc-btns">' +
          '<button type="button" class="cc-no" data-cc="denied">Refuser</button>' +
          '<button type="button" class="cc-yes" data-cc="granted">Accepter</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(b);
    b.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-cc]") : null;
      if (t) enregistrer(t.getAttribute("data-cc"));
    });
  }

  if (choix === "granted") {
    chargerGa();
  } else if (choix !== "denied") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", afficherBandeau);
    } else {
      afficherBandeau();
    }
  }

  /* Lien « gérer mes préférences » (mentions légales, pied de page). */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-consent-reset]") : null;
    if (!t) return;
    e.preventDefault();
    choix = null;
    try { localStorage.removeItem(CLE); } catch (err) {}
    afficherBandeau();
  });
})();
