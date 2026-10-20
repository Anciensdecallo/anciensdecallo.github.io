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

  function enregistrer(v) {
    choix = v;
    try { localStorage.setItem(CLE, v); } catch (e) {}
    var b = document.getElementById("callo-consent");
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (v === "granted") chargerGa();
  }

  function afficherBandeau() {
    if (document.getElementById("callo-consent")) return;
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
          '<button type="button" class="btn cc-no" data-cc="denied">Refuser</button>' +
          '<button type="button" class="btn btn-main cc-yes" data-cc="granted">Accepter</button>' +
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
