// -----------------------------------------------------------------------------
// Runtime texts, in the four languages of the Gladys UI.
//
// `t(key, params)` returns a multi-language object `{ en, fr, de, es }`: the
// format Gladys expects for action messages, connection statuses and widget
// contents (the core picks the language of the user looking at the screen).
// `tl(language, key, params)` returns one string, for the texts Gladys stores
// as is (device and feature names, the summary sentence of a scene action).
//
// The manifest texts live in scripts/manifest-source.mjs.
// -----------------------------------------------------------------------------

import { COUNTER, LANGUAGES, STATUS, SUMMARY_FEATURE } from './constants.js';

const TEXTS = {
  // --- Devices -----------------------------------------------------------------
  'device.summary': {
    en: 'Mail and Packages',
    fr: 'Courrier et colis',
    de: 'Post und Pakete',
    es: 'Correo y paquetes',
  },
  'device.carrier': {
    en: 'Packages – {carrier}',
    fr: 'Colis – {carrier}',
    de: 'Pakete – {carrier}',
    es: 'Paquetes – {carrier}',
  },
  [`feature.${COUNTER.IN_TRANSIT}`]: {
    en: 'In transit',
    fr: 'En transit',
    de: 'Unterwegs',
    es: 'En tránsito',
  },
  [`feature.${COUNTER.ARRIVING_TODAY}`]: {
    en: 'Arriving today',
    fr: "Arrive aujourd'hui",
    de: 'Kommt heute',
    es: 'Llega hoy',
  },
  [`feature.${COUNTER.DELIVERED}`]: {
    en: 'Delivered today',
    fr: "Livrés aujourd'hui",
    de: 'Heute zugestellt',
    es: 'Entregados hoy',
  },
  [`feature.${COUNTER.PICKUP}`]: {
    en: 'To pick up',
    fr: 'À retirer',
    de: 'Abholbereit',
    es: 'Por recoger',
  },
  [`feature.${COUNTER.EXCEPTION}`]: {
    en: 'Delivery problems',
    fr: 'Incidents de livraison',
    de: 'Zustellprobleme',
    es: 'Incidencias',
  },
  [`feature.${SUMMARY_FEATURE.MAIL}`]: {
    en: 'Mail expected today',
    fr: "Courrier attendu aujourd'hui",
    de: 'Heute erwartete Post',
    es: 'Correo previsto hoy',
  },
  [`feature.${SUMMARY_FEATURE.LAST_UPDATE}`]: {
    en: 'Last update',
    fr: 'Dernière mise à jour',
    de: 'Letzte Aktualisierung',
    es: 'Última actualización',
  },

  // --- Parcel steps ---------------------------------------------------------------
  [`status.${STATUS.IN_TRANSIT}`]: {
    en: 'In transit',
    fr: 'En transit',
    de: 'Unterwegs',
    es: 'En tránsito',
  },
  [`status.${STATUS.OUT_FOR_DELIVERY}`]: {
    en: 'Arriving today',
    fr: "Arrive aujourd'hui",
    de: 'Kommt heute',
    es: 'Llega hoy',
  },
  [`status.${STATUS.PICKUP}`]: {
    en: 'To pick up',
    fr: 'À retirer',
    de: 'Abholbereit',
    es: 'Por recoger',
  },
  [`status.${STATUS.DELIVERED}`]: {
    en: 'Delivered',
    fr: 'Livré',
    de: 'Zugestellt',
    es: 'Entregado',
  },
  [`status.${STATUS.EXCEPTION}`]: {
    en: 'Problem',
    fr: 'Incident',
    de: 'Problem',
    es: 'Incidencia',
  },

  // Badges of the parcel list: 16 characters at most.
  [`badge.${STATUS.IN_TRANSIT}`]: {
    en: 'In transit',
    fr: 'En transit',
    de: 'Unterwegs',
    es: 'En tránsito',
  },
  [`badge.${STATUS.OUT_FOR_DELIVERY}`]: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  [`badge.${STATUS.PICKUP}`]: {
    en: 'To pick up',
    fr: 'À retirer',
    de: 'Abholbereit',
    es: 'Por recoger',
  },
  [`badge.${STATUS.DELIVERED}`]: {
    en: 'Delivered',
    fr: 'Livré',
    de: 'Zugestellt',
    es: 'Entregado',
  },
  [`badge.${STATUS.EXCEPTION}`]: { en: 'Problem', fr: 'Incident', de: 'Problem', es: 'Incidencia' },

  // --- Connection status & actions ----------------------------------------------
  'status.not_configured': {
    en: 'Fill in the IMAP server, the user name and the password.',
    fr: "Renseignez le serveur IMAP, l'identifiant et le mot de passe.",
    de: 'IMAP-Server, Benutzername und Passwort eintragen.',
    es: 'Indica el servidor IMAP, el usuario y la contraseña.',
  },
  'status.auth_failed': {
    en: 'The mail server refused the user name or the password (an app password may be required).',
    fr: "Le serveur de messagerie a refusé l'identifiant ou le mot de passe (un mot de passe d'application peut être nécessaire).",
    de: 'Der Mailserver hat Benutzername oder Passwort abgelehnt (evtl. ist ein App-Passwort nötig).',
    es: 'El servidor de correo rechazó el usuario o la contraseña (puede hacer falta una contraseña de aplicación).',
  },
  'status.folder_not_found': {
    en: 'Folder "{folder}" does not exist on the mail server.',
    fr: "Le dossier « {folder} » n'existe pas sur le serveur de messagerie.",
    de: 'Der Ordner „{folder}“ existiert nicht auf dem Mailserver.',
    es: 'La carpeta «{folder}» no existe en el servidor de correo.',
  },
  'status.unreachable': {
    en: 'Cannot reach the mail server: {reason}',
    fr: 'Serveur de messagerie injoignable : {reason}',
    de: 'Mailserver nicht erreichbar: {reason}',
    es: 'No se puede conectar con el servidor de correo: {reason}',
  },
  'action.test_ok': {
    en: 'Connection OK: {folders} folder(s) readable, {messages} message(s) in the last {days} day(s).',
    fr: 'Connexion OK : {folders} dossier(s) lisible(s), {messages} message(s) sur les {days} dernier(s) jour(s).',
    de: 'Verbindung OK: {folders} Ordner lesbar, {messages} Nachricht(en) in den letzten {days} Tag(en).',
    es: 'Conexión correcta: {folders} carpeta(s) legible(s), {messages} mensaje(s) en los últimos {days} día(s).',
  },
  'action.scan_ok': {
    en: 'Mailbox scanned: {summary}',
    fr: 'Boîte analysée : {summary}',
    de: 'Postfach geprüft: {summary}',
    es: 'Buzón analizado: {summary}',
  },
  'widget.refreshed': {
    en: 'Mailbox scanned',
    fr: 'Boîte analysée',
    de: 'Postfach geprüft',
    es: 'Buzón analizado',
  },

  // --- Widgets --------------------------------------------------------------------
  'widget.last_scan': {
    en: 'Last scan',
    fr: 'Dernière analyse',
    de: 'Letzte Prüfung',
    es: 'Último análisis',
  },
  'widget.never': { en: 'Never', fr: 'Jamais', de: 'Nie', es: 'Nunca' },
  'widget.mailbox': { en: 'Mailbox', fr: 'Boîte mail', de: 'Postfach', es: 'Buzón' },
  'widget.connected': { en: 'Connected', fr: 'Connectée', de: 'Verbunden', es: 'Conectado' },
  'widget.error': { en: 'Error', fr: 'Erreur', de: 'Fehler', es: 'Error' },
  'widget.not_configured': {
    en: 'Not configured',
    fr: 'Non configurée',
    de: 'Nicht eingerichtet',
    es: 'Sin configurar',
  },
  'widget.refresh': { en: 'Scan now', fr: 'Analyser', de: 'Jetzt prüfen', es: 'Analizar ahora' },
  'widget.mail': {
    en: 'Mail today',
    fr: 'Courrier du jour',
    de: 'Post heute',
    es: 'Correo de hoy',
  },
  'widget.no_package': {
    en: 'No package on its way.',
    fr: 'Aucun colis en cours.',
    de: 'Kein Paket unterwegs.',
    es: 'Ningún paquete en camino.',
  },
  'widget.track': {
    en: 'Track the package',
    fr: 'Suivre le colis',
    de: 'Paket verfolgen',
    es: 'Seguir el paquete',
  },
  'widget.tracking_number': {
    en: 'Tracking number: {tracking}',
    fr: 'Numéro de suivi : {tracking}',
    de: 'Sendungsnummer: {tracking}',
    es: 'Número de seguimiento: {tracking}',
  },
  'widget.pickup_code': {
    en: 'Pickup code: {code}',
    fr: 'Code de retrait : {code}',
    de: 'Abholcode: {code}',
    es: 'Código de recogida: {code}',
  },

  // --- Summary sentence -------------------------------------------------------------
  'summary.none': {
    en: 'No package expected.',
    fr: 'Aucun colis attendu.',
    de: 'Kein Paket erwartet.',
    es: 'Ningún paquete previsto.',
  },
  [`summary.${COUNTER.IN_TRANSIT}`]: {
    en: '{n} in transit',
    fr: '{n} en transit',
    de: '{n} unterwegs',
    es: '{n} en tránsito',
  },
  [`summary.${COUNTER.ARRIVING_TODAY}`]: {
    en: '{n} arriving today',
    fr: "{n} arrive(nt) aujourd'hui",
    de: '{n} kommt/kommen heute',
    es: '{n} llega(n) hoy',
  },
  [`summary.${COUNTER.DELIVERED}`]: {
    en: '{n} delivered today',
    fr: "{n} livré(s) aujourd'hui",
    de: '{n} heute zugestellt',
    es: '{n} entregado(s) hoy',
  },
  [`summary.${COUNTER.PICKUP}`]: {
    en: '{n} to pick up',
    fr: '{n} à retirer',
    de: '{n} abholbereit',
    es: '{n} por recoger',
  },
  [`summary.${COUNTER.EXCEPTION}`]: {
    en: '{n} with a delivery problem',
    fr: '{n} avec un incident',
    de: '{n} mit Zustellproblem',
    es: '{n} con incidencia',
  },
  'summary.mail': {
    en: '{n} letter(s) expected',
    fr: '{n} courrier(s) attendu(s)',
    de: '{n} Brief(e) erwartet',
    es: '{n} carta(s) prevista(s)',
  },
  'summary.packages': { en: 'Packages: ', fr: 'Colis : ', de: 'Pakete: ', es: 'Paquetes: ' },
};

const fill = (text, params) =>
  text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));

export function normalizeLanguage(language) {
  const short = String(language ?? '')
    .toLowerCase()
    .slice(0, 2);
  return LANGUAGES.includes(short) ? short : 'en';
}

/** One string, in one language (English when the language is unknown). */
export function tl(language, key, params = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    throw new Error(`Unknown text key: ${key}`);
  }
  return fill(entry[normalizeLanguage(language)], params);
}

/** Multi-language object `{ en, fr, de, es }`. */
export function t(key, params = {}) {
  return Object.fromEntries(LANGUAGES.map((language) => [language, tl(language, key, params)]));
}

/** Apply a function to every language: `{ en: fn('en'), fr: fn('fr'), ... }`. */
export function eachLanguage(fn) {
  return Object.fromEntries(LANGUAGES.map((language) => [language, fn(language)]));
}

export const TEXT_KEYS = Object.keys(TEXTS);
export const TEXT_ENTRIES = TEXTS;
