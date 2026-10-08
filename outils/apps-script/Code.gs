// =====================================================================
//  LES ANCIENS DE CALLO — réception des formulaires du site
//  Google Apps Script · à coller dans un projet sur script.google.com
//  Procédure complète : voir INSTALLATION.md (dossier outils/apps-script)
// =====================================================================
//
//  Ce script reçoit les données envoyées par les formulaires du site
//  (page d'accueil des deux versions + page d'inscription), envoie un
//  courriel aux destinataires ci-dessous et enregistre chaque demande
//  dans une feuille Google (créée automatiquement).
//
//  Onglets créés : « Inscriptions » (une ligne par inscription),
//  « Messages » (une ligne par message de contact) et « KPI » (synthèse
//  visites / inscriptions par origine de campagne).

// ----------------------------- RÉGLAGES -----------------------------

// Destinataires de tous les messages du site.
var DESTINATAIRES = [
  "d.bougreau@lyceemarcelcallo.org",
  "anciensdecallo@gmail.com"
];

// Noms des onglets de la feuille de calcul (ne pas modifier).
var TITRE_FEUILLE = "Inscriptions anciens Callo (site)";
var ONGLET_INSCRIPTIONS = "Inscriptions";
var ONGLET_MESSAGES = "Messages";
var ONGLET_VISITES = "Visites";
var ONGLET_KPI = "KPI";

// Mettre true pour conserver une trace de chaque inscription dans la feuille.
var ENREGISTRER_DANS_FEUILLE = true;

// Facultatif : envoyer un accusé de réception à la personne inscrite.
var ACCUSER_RECEPTION = false;

// Facultatif : mot de passe partagé. S'il est renseigné ici, il doit être
// identique dans le site (assets/js/config.js, champ « secret »).
// Laisser vide tant qu'aucun mot de passe n'est utilisé.
var CODE_PARTAGE = "";

// --------------------------- POINTS D'ENTRÉE ------------------------

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

    // 1) Enregistrement dans la feuille Google (trace indépendante du courriel).
    var enregistre = false;
    if (ENREGISTRER_DANS_FEUILLE) {
      try {
        if (type === "inscription") { enregistrerInscription(d); enregistre = true; }
        else { enregistrerMessage(d); enregistre = true; }
      } catch (err) {
        // Un problème de feuille ne doit pas empêcher l'envoi du courriel.
        enregistre = "erreur : " + String(err);
      }
    }

    // 2) Envoi du courriel aux destinataires.
    MailApp.sendEmail({
      to: DESTINATAIRES.join(","),
      subject: sujet(type, d),
      body: corpsTexte(d),
      htmlBody: corpsHtml(d),
      replyTo: d.email || DESTINATAIRES[0],
      name: "Site Les Anciens de Callo"
    });

    if (ACCUSER_RECEPTION && d.email) accuser(d);

    return reponse({ ok: true, type: type, enregistre: enregistre });
  } catch (err) {
    return reponse({ ok: false, erreur: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// Permet de vérifier l'adresse dans un navigateur (doit renvoyer ok:true).
// Sert aussi de « compteur de visites » : le site appelle /exec?action=visite&…
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "visite") {
    try { enregistrerVisite(p); } catch (err) { /* ne jamais bloquer le visiteur */ }
    return reponse({ ok: true });
  }
  // Diagnostic : renvoie les destinataires réellement configurés dans ce
  // déploiement. Sert à vérifier à distance que la bonne liste est active.
  // (Ce sont des adresses de contact publiques du site.)
  if (p.action === "config") {
    return reponse({ ok: true, destinataires: DESTINATAIRES, feuille: TITRE_FEUILLE,
      onglets: [ONGLET_INSCRIPTIONS, ONGLET_MESSAGES, ONGLET_VISITES, ONGLET_KPI] });
  }
  // Contrôle du KPI : recalcule la synthèse et la renvoie. Permet de vérifier
  // à distance que le tableau se construit (aucune donnée personnelle).
  if (p.action === "kpi") {
    try {
      var t = construireKpi();
      return reponse({ ok: true, onglet: ONGLET_KPI, lignes: t.length, tableau: t });
    } catch (err) {
      return reponse({ ok: false, erreur: String(err) });
    }
  }
  return reponse({ ok: true, service: "Les Anciens de Callo", heure: new Date().toISOString() });
}

// ------------------------------ COURRIEL ----------------------------

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

// ------------------------------ FEUILLE -----------------------------

// Renvoie le classeur Google (créé et mémorisé au premier appel).
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

// Retrouve un onglet par son nom, ou le crée. Les onglets sont toujours
// identifiés PAR LEUR NOM : la position des onglets n'a donc aucune importance
// (c'est ce qui garantissait le bon fonctionnement du KPI).
function onglet(nom, entetes) {
  var f = classeur();
  var s = f.getSheetByName(nom);
  if (!s) s = f.insertSheet(nom);
  if (s.getLastRow() === 0) {
    s.appendRow(entetes);
    s.setFrozenRows(1);
  }
  return s;
}

// Onglet des inscriptions. Reprend l'onglet historique s'il existe déjà,
// afin de ne perdre aucune donnée déjà collectée.
function feuille() {
  var f = classeur();
  var s = f.getSheetByName(ONGLET_INSCRIPTIONS);
  if (!s) {
    var cands = f.getSheets();
    for (var i = 0; i < cands.length; i++) {
      if (String(cands[i].getRange(1, 1).getValue()) === "Date") { s = cands[i]; break; }
    }
    if (!s) {
      for (var j = 0; j < cands.length; j++) {
        var n = cands[j].getName();
        if (n !== ONGLET_KPI && n !== ONGLET_MESSAGES && n !== ONGLET_VISITES
            && cands[j].getLastRow() === 0) { s = cands[j]; break; }
      }
    }
    if (!s) s = f.insertSheet(ONGLET_INSCRIPTIONS);
    s.setName(ONGLET_INSCRIPTIONS);
  }
  if (s.getLastRow() === 0) {
    s.appendRow(["Date", "Type", "École", "Présence AG", "Nom", "Prénom", "E-mail",
      "Téléphone", "Adresse", "Code postal", "Ville", "Promotion", "Filière",
      "Précision", "Fonction", "Entreprise", "Lieu", "Actualités", "Origine"]);
    s.setFrozenRows(1);
  }
  return s;
}

function enregistrerInscription(d) {
  feuille().appendRow([
    new Date(), d.type || "inscription", d.ecole || "", d.ag || "", d.nom || "", d.prenom || "",
    d.email || "", d.tel || "", d.adresse || "", d.cp || "", d.ville || "",
    d.promo || "", d.filiere || "", d.precision || "", d.fonction || "", d.entreprise || "",
    d.lieu || "", d.optin || "Non", d.source || ""
  ]);
}

// Onglet des messages de contact (tout ce qui n'est pas une inscription).
function enregistrerMessage(d) {
  onglet(ONGLET_MESSAGES, ["Date", "Site", "Nom", "Prénom", "E-mail", "Téléphone",
    "Promotion", "Message", "Actualités", "Origine"]).appendRow([
    new Date(), d.site || "", d.nom || "", d.prenom || "", d.email || "", d.tel || "",
    d.promo || "", d.message || "", d.optin || "Non", d.source || ""
  ]);
}

// ------------------------------- OUTILS -----------------------------

function reponse(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}

// À lancer une fois depuis l'éditeur (menu « Exécuter ») pour vérifier
// l'envoi : le courriel doit arriver aux deux destinataires ci-dessus.
function testEnvoi() {
  MailApp.sendEmail({
    to: DESTINATAIRES.join(","),
    subject: "Test — formulaires du site des Anciens de Callo",
    body: "Ce courriel de test confirme que le script peut envoyer les formulaires du site.\n\n"
      + "Destinataires : " + DESTINATAIRES.join(", ") + "\nQuota restant : "
      + MailApp.getRemainingDailyQuota() + " courriels aujourd'hui."
  });
}

// ====================================================================
//  KPI DE PROVENANCE DES VISITEURS
// ====================================================================
//
//  Principe : à chaque page vue, le site appelle /exec?action=visite&…
//  Une ligne est ajoutée dans l'onglet « Visites ». Les inscriptions sont
//  enregistrées dans « Inscriptions » avec leur « Origine ».
//  construireKpi() réunit les deux dans l'onglet « KPI ».
//  Aucun cookie, aucune donnée personnelle n'est stockée pour la mesure.

function feuilleVisites() {
  return onglet(ONGLET_VISITES, ["Date", "Page", "Origine", "Site référent", "Support"]);
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

// Réunit visites + inscriptions par origine dans l'onglet « KPI ».
// Renvoie le tableau construit (utilisé aussi par ?action=kpi).
function construireKpi() {
  var f = classeur();
  var visites = {};
  var sv = f.getSheetByName(ONGLET_VISITES);
  if (sv && sv.getLastRow() > 1) {
    sv.getRange(2, 3, sv.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var o = (r[0] || "direct") + ""; visites[o] = (visites[o] || 0) + 1;
    });
  }
  var insc = {};
  // Onglet des inscriptions, identifié par son NOM (voir feuille()).
  var si = feuille();
  if (si.getLastRow() > 1) {
    // colonne « Origine » = 19e colonne (voir enregistrerInscription)
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
  var s = f.getSheetByName(ONGLET_KPI);
  if (s) f.deleteSheet(s);
  s = f.insertSheet(ONGLET_KPI, 0);
  s.appendRow(["Origine / campagne", "Visites", "Inscriptions", "Taux de conversion"]);
  lignes.forEach(function (l) { s.appendRow(l); });
  s.getRange(1, 1, 1, 4).setFontWeight("bold");
  s.setFrozenRows(1);
  s.autoResizeColumns(1, 4);
  return lignes;
}
