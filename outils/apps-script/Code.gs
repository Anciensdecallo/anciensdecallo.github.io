/**
 * =====================================================================
 *  LES ANCIENS DE CALLO — réception des formulaires du site
 *  Google Apps Script · à coller dans un projet sur script.google.com
 *  Procédure complète : voir INSTALLATION.md (dossier outils/apps-script)
 * =====================================================================
 *
 *  Ce script reçoit les données envoyées par les formulaires du site
 *  (page d'accueil des deux versions + page d'inscription), envoie un
 *  courriel aux destinataires ci-dessous et, pour les inscriptions,
 *  ajoute une ligne dans une feuille Google (créée automatiquement).
 */

/* ----------------------------- RÉGLAGES ----------------------------- */

// Destinataires de tous les messages du site.
var DESTINATAIRES = [
  "d.bougreau@lyceemarcelcallo.org",
  "anciensdecallo@gmail.com"
];

// Nom de la feuille Google créée automatiquement pour les inscriptions.
var TITRE_FEUILLE = "Inscriptions anciens Callo (site)";

// Mettre true pour conserver une trace de chaque inscription dans la feuille.
var ENREGISTRER_DANS_FEUILLE = true;

// Facultatif : envoyer un accusé de réception à la personne inscrite.
var ACCUSER_RECEPTION = false;

// Facultatif : mot de passe partagé. S'il est renseigné ici, il doit être
// identique dans le site (assets/js/config.js, champ « secret »).
// Laisser vide tant qu'aucun mot de passe n'est utilisé.
var CODE_PARTAGE = "";

/* --------------------------- POINTS D'ENTRÉE ------------------------ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return reponse({ ok: false, erreur: "corps de requête vide" });
    }

    var d = JSON.parse(e.postData.contents);

    // Piège anti-spam : champ invisible rempli par un robot.
    if (d.site_web) return reponse({ ok: true, ignore: true });
    if (CODE_PARTAGE && d.secret !== CODE_PARTAGE) {
      return reponse({ ok: false, erreur: "mot de passe invalide" });
    }

    var type = d.type === "inscription" ? "inscription" : "contact";

    MailApp.sendEmail({
      to: DESTINATAIRES.join(","),
      subject: sujet(type, d),
      body: corpsTexte(d),
      htmlBody: corpsHtml(d),
      replyTo: d.email || DESTINATAIRES[0],
      name: "Site Les Anciens de Callo"
    });

    if (ENREGISTRER_DANS_FEUILLE && type === "inscription") enregistrer(d);

    if (ACCUSER_RECEPTION && d.email) accuser(d);

    return reponse({ ok: true, type: type });
  } catch (err) {
    return reponse({ ok: false, erreur: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// Permet de vérifier l'adresse dans un navigateur (doit renvoyer ok:true).
// Sert aussi de « compteur de visites » : le site appelle /exec?action=visite&…
// → une ligne est ajoutée dans la feuille « Visites » (voir construireKpi).
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "visite") {
    try { enregistrerVisite(p); } catch (err) { /* ne jamais bloquer le visiteur */ }
    return reponse({ ok: true });
  }
  return reponse({ ok: true, service: "Les Anciens de Callo", heure: new Date().toISOString() });
}

/* ------------------------------ COURRIEL ---------------------------- */

function sujet(type, d) {
  var qui = [d.nom, d.prenom].filter(String).join(" ").trim() || "visiteur";
  if (type === "inscription") {
    var ou = d.ecole || d.site || "";
    return "Inscription AG du 18/12 — " + qui + (ou ? " (" + ou + ")" + presence(d.ag) : "");
  }
  return "Message du site" + (d.site ? " — " + d.site : "") + " — " + qui;
}

function presence(ag) {
  if (ag === "Oui") return " · sera présent";
  if (ag === "Peut-être") return " · peut-être";
  if (ag === "Non") return " · ne viendra pas";
  return "";
}

var LIBELLES = {
  type: "Type de demande", site: "Site", ecole: "École", ag: "Présence à l'AG",
  nom: "Nom", prenom: "Prénom", adresse: "Adresse", cp: "Code postal", ville: "Ville",
  tel: "Téléphone", email: "E-mail", promo: "Promotion", filiere: "Filière",
  precision: "Précision", fonction: "Fonction", entreprise: "Entreprise", lieu: "Lieu",
  message: "Message", optin: "Actualités par e-mail", source: "Origine de la visite"
};

function lignes(d) {
  var out = [];
  Object.keys(d).forEach(function (k) {
    if (k === "rgpd" || k === "site_web" || k === "secret") return;
    var v = d[k];
    if (v === "" || v === null || v === undefined) return;
    out.push([LIBELLES[k] || k, String(v)]);
  });
  return out;
}

function corpsTexte(d) {
  var l = lignes(d).map(function (p) { return p[0] + " : " + p[1]; });
  l.push("");
  l.push("Message reçu via le site des Anciens de Callo.");
  return l.join("\n");
}

function corpsHtml(d) {
  var r = lignes(d).map(function (p) {
    return '<tr><td style="padding:6px 14px 6px 0;color:#5E676C;vertical-align:top;white-space:nowrap">'
      + echapper(p[0]) + '</td><td style="padding:6px 0;color:#232A2E">'
      + echapper(p[1]).replace(/\n/g, "<br>") + '</td></tr>';
  }).join("");
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#232A2E">'
    + '<p style="margin:0 0 14px;font-size:16px"><b>'
    + (d.type === "inscription" ? "Nouvelle inscription — AG du 18 décembre 2026" : "Nouveau message depuis le site")
    + '</b></p><table style="border-collapse:collapse">' + r + '</table>'
    + '<p style="margin:18px 0 0;font-size:12px;color:#5E676C">'
    + 'Répondre à ce courriel écrit directement à la personne si son adresse est renseignée.<br>'
    + 'Les Anciens de Callo — Lycée Marcel Callo ' + AMP() + ' Pôle Sup Callo, 21 avenue Étienne Gascon, 35600 Redon</p></div>';
}

// Construit l'esperluette HTML sans écrire la séquence littérale, pour que
// cette fonction reste intacte quel que soit le canal de copier-coller.
function AMP() {
  return String.fromCharCode(38);
}

function echapper(t) {
  var a = AMP();
  return String(t)
    .replace(/&/g, a + "amp;")
    .replace(/</g, a + "lt;")
    .replace(/>/g, a + "gt;");
}

function accuser(d) {
  MailApp.sendEmail({
    to: d.email,
    subject: d.type === "inscription" ? "Votre inscription à l'AG du 18 décembre — Les Anciens de Callo" : "Nous avons reçu votre message — Les Anciens de Callo",
    body: "Bonjour " + (d.prenom || "") + ",\n\n"
      + (d.type === "inscription"
        ? "Nous avons bien enregistré votre inscription à l'assemblée générale constitutive du vendredi 18 décembre 2026. Nous vous recontacterons avant cette date.\n\n"
        : "Nous avons bien reçu votre message et vous répondrons rapidement.\n\n")
      + "À bientôt,\nLes Anciens de Callo\n21 avenue Étienne Gascon, 35600 Redon",
    name: "Les Anciens de Callo"
  });
}

/* ------------------------------ FEUILLE ----------------------------- */

/** Renvoie le classeur Google (créé et mémorisé au premier appel). */
function classeur() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("FEUILLE_ID");
  var f = null;
  if (id) {
    try { f = SpreadsheetApp.openById(id); } catch (err) { f = null; }
  }
  if (!f) {
    f = SpreadsheetApp.create(TITRE_FEUILLE);
    props.setProperty("FEUILLE_ID", f.getId());
  }
  return f;
}

function feuille() {
  var f = classeur();
  var s = f.getSheets()[0];
  if (s.getLastRow() === 0) {
    s.appendRow(["Date", "Type", "École", "Présence AG", "Nom", "Prénom", "E-mail",
      "Téléphone", "Adresse", "Code postal", "Ville", "Promotion", "Filière",
      "Précision", "Fonction", "Entreprise", "Lieu", "Actualités", "Origine"]);
    s.setFrozenRows(1);
  }
  return s;
}

function enregistrer(d) {
  feuille().appendRow([
    new Date(), d.type || "inscription", d.ecole || "", d.ag || "", d.nom || "", d.prenom || "",
    d.email || "", d.tel || "", d.adresse || "", d.cp || "", d.ville || "",
    d.promo || "", d.filiere || "", d.precision || "", d.fonction || "", d.entreprise || "",
    d.lieu || "", d.optin || "Non", d.source || ""
  ]);
}

/* ------------------------------- OUTILS ----------------------------- */

function reponse(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * À lancer une fois depuis l'éditeur (menu « Exécuter ») pour vérifier
 * l'envoi : le courriel doit arriver aux deux destinataires ci-dessus.
 */
function testEnvoi() {
  MailApp.sendEmail({
    to: DESTINATAIRES.join(","),
    subject: "Test — formulaires du site des Anciens de Callo",
    body: "Ce courriel de test confirme que le script peut envoyer les formulaires du site.\n\n"
      + "Destinataires : " + DESTINATAIRES.join(", ") + "\nQuota restant : "
      + MailApp.getRemainingDailyQuota() + " courriels aujourd'hui."
  });
}

/* ==================================================================== */
/*  KPI DE PROVENANCE DES VISITEURS                                     */
/* ==================================================================== */
/*
  Principe : à chaque page vue, le site appelle /exec?action=visite&…
  Une ligne est ajoutée dans la feuille « Visites ». Les inscriptions, elles,
  sont déjà enregistrées dans la feuille « Inscriptions » avec leur « Origine ».
  La fonction construireKpi() réunit les deux dans une feuille « KPI » :

     Origine | Visites | Inscriptions | Taux de conversion
     (la campagne « AC-0123 » = un ancien contacté nominativement)

  Aucun cookie, aucune donnée personnelle n'est stockée pour la mesure :
  on ne garde que la page, l'origine et, si présent, le site référent.
*/

function feuilleVisites() {
  var f = classeur();
  var nom = "Visites";
  var s = f.getSheetByName(nom);
  if (!s) {
    s = f.insertSheet(nom);
    s.appendRow(["Date", "Page", "Origine", "Site référent", "Support"]);
    s.setFrozenRows(1);
  }
  return s;
}

function enregistrerVisite(p) {
  feuilleVisites().appendRow([
    new Date(),
    String(p.page || "").slice(0, 120),
    String(p.ref || p.origine || "direct").slice(0, 60),
    String(p.referer || "").slice(0, 160),
    String(p.ua || "").slice(0, 60)
  ]);
}

/** Réunit visites + inscriptions par origine dans une feuille « KPI ». */
function construireKpi() {
  var f = classeur();
  var visites = {};
  var sv = f.getSheetByName("Visites");
  if (sv && sv.getLastRow() > 1) {
    sv.getRange(2, 3, sv.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var o = (r[0] || "direct") + ""; visites[o] = (visites[o] || 0) + 1;
    });
  }
  var insc = {};
  var si = f.getSheets()[0];
  if (si.getLastRow() > 1) {
    // colonne « Origine » = 19e colonne (voir enregistrer)
    si.getRange(2, 19, si.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var o = (r[0] || "direct") + ""; insc[o] = (insc[o] || 0) + 1;
    });
  }
  var origines = {};
  Object.keys(visites).forEach(function (k) { origines[k] = 1; });
  Object.keys(insc).forEach(function (k) { origines[k] = 1; });
  var lignes = Object.keys(origines).sort().map(function (o) {
    var v = visites[o] || 0, i = insc[o] || 0;
    return [o, v, i, v ? (Math.round(i / v * 1000) / 10) + " %" : "—"];
  });
  var s = f.getSheetByName("KPI");
  if (s) f.deleteSheet(s);
  s = f.insertSheet("KPI", 0);
  s.appendRow(["Origine / campagne", "Visites", "Inscriptions", "Taux de conversion"]);
  lignes.forEach(function (l) { s.appendRow(l); });
  s.getRange(1, 1, 1, 4).setFontWeight("bold");
  s.setFrozenRows(1);
  s.autoResizeColumns(1, 4);
  return lignes.length;
}
