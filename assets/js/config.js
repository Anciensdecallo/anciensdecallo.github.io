/* =====================================================================
   LES ANCIENS DE CALLO — RÉGLAGES DU SITE (le seul fichier à modifier)
   ===================================================================== */
window.CALLO = {
  /* URL de l'application web Google Apps Script (se termine par /exec).
     Tant qu'elle n'est pas renseignée, les formulaires ouvrent le logiciel
     de messagerie du visiteur avec le message déjà prêt à envoyer.
     Une fois l'URL renseignée, l'envoi devient automatique et silencieux. */
  ENDPOINT: "",

  /* Adresses de contact : destinataires des messages du site.
     Elles servent aussi d'adresse publique pour les questions et
     l'exercice des droits RGPD (accès, rectification, suppression). */
  CONTACT_EMAILS: [
    { nom: "David Bougreau",            email: "d.bougreau@lyceemarcelcallo.org" },
    { nom: "Timothée de Magnienville",  email: "t.demagnienville@lyceemarcelcallo.org" }
  ],

  /* Date et heure de l'AG (compte à rebours). */
  AG_DATE: "2026-12-18T18:30:00+01:00"
};

/* Adresses dérivées — ne pas modifier. */
window.CALLO.CONTACT_EMAIL = window.CALLO.CONTACT_EMAILS
  .map(function (c) { return c.email; })
  .join(",");

/* Version lisible pour les messages affichés aux visiteurs. */
window.CALLO.ContactEmailsTexte = window.CALLO.CONTACT_EMAILS
  .map(function (c) { return c.email; })
  .join(" et à ");
