/* Les Anciens de Callo — scripts communs à toutes les pages */
(function () {
  var C = window.CALLO || {};
  var demo = !C.ENDPOINT || C.ENDPOINT.indexOf("http") !== 0;

  /* ---------- Adresses de contact ------------------------------------- */
  var contacts = (C.CONTACT_EMAILS || []).map(function (c) { return c.email; });
  var contactList = contacts.join(",");     // pour les liens mailto
  var contactText = contacts.join(" · ");   // pour l'affichage à l'écran

  document.querySelectorAll("[data-contact]").forEach(function (el) {
    if (!contacts.length) return;
    el.textContent = contactText;
    if (el.tagName === "A") el.href = "mailto:" + contactList;
  });

  /* ---------- Préparation d'un courriel dans la messagerie du visiteur - */
  var LIBELLES = {
    type: "Type de demande", site: "Site", ecole: "École", ag: "Présence à l'AG",
    nom: "Nom", prenom: "Prénom", adresse: "Adresse", cp: "Code postal", ville: "Ville",
    tel: "Téléphone", email: "E-mail", promo: "Promotion", filiere: "Filière",
    precision: "Précision", fonction: "Fonction", entreprise: "Entreprise", lieu: "Lieu",
    message: "Message", optin: "Actualités par e-mail", source: "Origine de la visite"
  };

  window.calloMailto = function (payload) {
    var lignes = [];
    Object.keys(payload).forEach(function (k) {
      if (k === "rgpd" || k === "site_web") return;   // technique / anti-spam
      var v = payload[k];
      if (v === "" || v === null || v === undefined) return;
      lignes.push((LIBELLES[k] || k) + " : " + v);
    });
    var sujet = (payload.type === "inscription" ? "Inscription AG du 18/12" : "Message depuis le site")
      + (payload.site ? " — " + payload.site : payload.ecole ? " — " + payload.ecole : "");
    return "mailto:" + contactList
      + "?subject=" + encodeURIComponent(sujet)
      + "&body=" + encodeURIComponent(lignes.join("\n") + "\n");
  };

  /* ---------- Apparition au défilement -------------------------------- */
  var els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("in"); });

  /* ---------- Compte à rebours ---------------------------------------- */
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

  /* ---------- Visionneuse des archives -------------------------------- */
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

  /* ---------- Envoi vers Google Apps Script (partagé par les formulaires) */
  window.calloSend = function (payload) {
    if (demo) return Promise.reject(new Error("ENDPOINT non configuré"));
    return fetch(C.ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
  };

  /* ---------- Formulaire de contact (pages d'accueil) ------------------ */
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

      /* Aucun serveur configuré : on prépare le message dans la messagerie
         du visiteur pour que la demande arrive réellement aux destinataires. */
      if (demo) {
        window.location.href = window.calloMailto(payload);
        show("ok", "Votre logiciel de messagerie s'ouvre avec votre message déjà rempli, adressé à "
          + contacts.join(" et à ") + ". Il ne vous reste qu'à cliquer sur « Envoyer ». "
          + "Si rien ne s'ouvre, écrivez-nous directement à cette adresse.");
        return;
      }

      go.disabled = true; go.textContent = "Envoi…";
      window.calloSend(payload).then(function () {
        cf.reset(); show("ok", "Merci " + payload.prenom + " ! Votre message est bien parti. Nous revenons vers vous très vite.");
      }).catch(function () { show("err", "L'envoi n'a pas abouti, merci de réessayer."); })
        .then(function () { go.disabled = false; go.textContent = "Envoyer"; });
    });
  }
})();
