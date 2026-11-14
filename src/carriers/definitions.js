// -----------------------------------------------------------------------------
// Carrier definitions: the DATA of the integration.
//
// A carrier is recognized by the SENDER of its notification emails, then the
// status of the parcel is read from the SUBJECT (and, for a few carriers whose
// subjects say nothing, from the body). Adding a carrier is adding an entry
// here: the devices, the manifest options, the scene filters and the widgets
// all derive from this list (run `npm run manifest` afterwards).
//
// Shape of an entry:
//   - key          : stable identifier ([a-z0-9_]). FOREVER: it is part of the
//                    device external ids and of the values scenes store.
//   - name         : brand name, shown as is in every language.
//   - senders      : RegExp list tested against the lowercased sender address.
//   - rules        : carrier-specific status rules, tried in order BEFORE the
//                    generic multilingual rules (src/carriers/generic.js).
//                    `{ status, subject?: RegExp, body?: RegExp }`; both must
//                    match when both are given.
//   - tracking     : RegExp list (first match wins) extracting the tracking
//                    number from the subject, then from the body.
//   - trackingUrl  : public https tracking page, `{tracking}` substituted.
//   - mail         : (USPS only) rule recognizing the daily digest of scanned
//                    letter mail.
//
// The sender patterns and subjects of USPS, UPS, FedEx, DHL, Amazon, Canada
// Post, Hermes/Evri, Royal Mail, Australia Post, Poczta Polska, InPost, DPD and
// GLS come from the Home Assistant "Mail and Packages" project (MIT):
// https://github.com/moralmunky/Home-Assistant-Mail-And-Packages
// -----------------------------------------------------------------------------

import { STATUS } from '../constants.js';

// Sender on `domain` or any of its sub-domains (`a.b.ups.com`).
const domain = (...domains) =>
  new RegExp(`@(?:[a-z0-9-]+\\.)*(?:${domains.map((d) => d.replaceAll('.', '\\.')).join('|')})$`);

// Sender on `<name>.<any tld>` or one of its sub-domains (`amazon.co.uk`).
const brand = (...names) =>
  new RegExp(`@(?:[a-z0-9-]+\\.)*(?:${names.join('|')})\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);

// UPU S10 international format, shared by most postal operators.
const S10 = /\b[A-Z]{2}\d{9}[A-Z]{2}\b/;

export const CARRIER_DEFINITIONS = [
  {
    key: 'amazon',
    name: 'Amazon',
    senders: [brand('amazon')],
    rules: [
      {
        status: STATUS.EXCEPTION,
        subject:
          /delivery update|running late|delivery attempt|retard|tentative de livraison|versp[äa]tet|zustellversuch|retraso|intento de entrega|ritardo/i,
      },
      {
        status: STATUS.PICKUP,
        subject:
          /ready for pickup|package to pick up|hub locker|pr[êe]t à être retiré|à retirer|abholbereit|zur abholung|listo para recoger|pronto per il ritiro/i,
      },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        subject:
          /out for delivery|arriving today|en cours de livraison|arrive aujourd|livraison aujourd|wird heute|kommt heute|zustellung heute|en reparto|llega hoy|in consegna|arriva oggi/i,
      },
      {
        status: STATUS.DELIVERED,
        subject:
          /^(?:delivered|livré|geliefert|zugestellt|entregado|consegna effettuata|consegnato|dostarczono|bezorgd)\b/i,
      },
      {
        status: STATUS.IN_TRANSIT,
        subject:
          /^(?:shipped|dispatched|expédié|versandt|versendet|enviado|spedito|verzonden|wysłano)\b|has shipped|has been dispatched|a été expédié|wurde versandt|ha sido enviado|è stato spedito/i,
      },
    ],
    // The order number: Amazon notifications rarely carry a carrier tracking
    // number, and the order number is what links "shipped" to "delivered".
    tracking: [/\b\d{3}-\d{7}-\d{7}\b/],
    pickupCode: [/pick ?up code\D{0,40}(\d{6})/i, /package to pick up.*?(\d{6})/i],
  },
  {
    key: 'ups',
    name: 'UPS',
    senders: [domain('ups.com')],
    rules: [
      { status: STATUS.EXCEPTION, subject: /new scheduled delivery date|delivery attempt/i },
      { status: STATUS.DELIVERED, subject: /your ups packages? (?:was|were) delivered/i },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        subject: /scheduled for delivery today|follow your delivery on a live map|arriving soon/i,
      },
    ],
    tracking: [/\b1Z[0-9A-Z]{16}\b/],
    trackingUrl: 'https://www.ups.com/track?tracknum={tracking}',
  },
  {
    key: 'fedex',
    name: 'FedEx',
    senders: [domain('fedex.com')],
    rules: [
      { status: STATUS.DELIVERED, subject: /your packages? ha(?:s|ve) been delivered/i },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        subject: /delivery scheduled for today|scheduled for delivery today|out for delivery/i,
      },
    ],
    tracking: [/\b(?:\d{20}|\d{15}|\d{12})\b/],
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
  },
  {
    key: 'usps',
    name: 'USPS',
    senders: [domain('usps.com', 'usps.gov')],
    // Informed Delivery: the daily digest carries one scanned image per letter.
    mail: { subject: /daily digest/i },
    rules: [
      { status: STATUS.EXCEPTION, subject: /delivery exception/i },
      { status: STATUS.DELIVERED, subject: /item delivered/i },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        subject: /expected delivery on|out for delivery/i,
      },
      { status: STATUS.OUT_FOR_DELIVERY, body: /your item is out for delivery/i },
    ],
    tracking: [/\b9[2345]\d{15,26}\b/, S10],
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
  },
  {
    key: 'dhl',
    name: 'DHL',
    senders: [brand('dhl', 'dhlparcel', 'dhl-paket', 'dhlecommerce'), domain('deutschepost.de')],
    rules: [
      // "DHL On Demand Delivery" and the Polish notifications use the same
      // subject for every step: the body tells them apart.
      { status: STATUS.DELIVERED, body: /has been delivered|została doręczona|wurde zugestellt/i },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        body: /scheduled for delivery today|zostanie dziś do państwa doręczona/i,
      },
      { status: STATUS.OUT_FOR_DELIVERY, subject: /paket kommt heute/i },
    ],
    tracking: [/\bJJD\d{16,22}\b/, /\b00340\d{15}\b/, /\b\d{10,11}\b/],
    trackingUrl: 'https://www.dhl.com/global-en/home/tracking.html?tracking-id={tracking}',
  },
  {
    key: 'dpd',
    name: 'DPD',
    senders: [brand('dpd', 'dpdgroup', 'dpdlocal')],
    rules: [
      { status: STATUS.DELIVERED, subject: /została doręczona/i },
      { status: STATUS.OUT_FOR_DELIVERY, body: /dziś doręczamy/i },
      { status: STATUS.IN_TRANSIT, subject: /bezpieczne doręczenie|przesyłka została nadana/i },
    ],
    tracking: [/\b\d{14}[A-Z0-9]?\b/],
    trackingUrl: 'https://tracking.dpd.de/status/en_US/parcel/{tracking}',
  },
  {
    key: 'gls',
    name: 'GLS',
    senders: [/@(?:[a-z0-9-]+\.)*gls(?:-[a-z]+)?\.[a-z]{2,3}$/],
    rules: [
      { status: STATUS.DELIVERED, body: /została dzisiaj dostarczona/i },
      { status: STATUS.IN_TRANSIT, subject: /paczka w drodze/i },
    ],
    tracking: [/\b\d{11,12}\b/],
    trackingUrl: 'https://gls-group.com/track/{tracking}',
  },
  {
    key: 'tnt',
    name: 'TNT',
    senders: [brand('tnt')],
    tracking: [/\b(?:GE)?\d{9}(?:[A-Z]{2})?\b/],
    trackingUrl:
      'https://www.tnt.com/express/en_gb/site/shipping-tools/tracking.html?searchType=con&cons={tracking}',
  },
  // --- France / Belgium / Netherlands / Switzerland ---------------------------
  {
    key: 'colissimo',
    name: 'Colissimo / La Poste',
    senders: [
      domain(
        'colissimo.fr',
        'laposte.fr',
        'laposte.info',
        'notif-colissimo-laposte.info',
        'notif-laposte.info',
      ),
    ],
    rules: [
      {
        status: STATUS.EXCEPTION,
        subject: /n'a pas pu (?:être|etre) (?:livré|distribué)|avis de passage|en votre absence/i,
      },
      {
        status: STATUS.PICKUP,
        subject:
          /vous attend|est disponible|à retirer|mis en instance|en bureau de poste|point de retrait/i,
      },
    ],
    tracking: [/\b\d[A-Z]\d{11}\b/, S10, /\b\d{13,15}\b/],
    trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}',
  },
  {
    key: 'chronopost',
    name: 'Chronopost',
    senders: [brand('chronopost'), domain('pickup.fr')],
    rules: [
      { status: STATUS.PICKUP, subject: /vous attend|est disponible|à retirer|point pickup/i },
    ],
    tracking: [S10, /\b[A-Z]{2}\d{11}\b/, /\b\d{13,15}\b/],
    trackingUrl: 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={tracking}',
  },
  {
    key: 'mondial_relay',
    name: 'Mondial Relay',
    senders: [brand('mondialrelay', 'mondial-relay')],
    rules: [
      {
        status: STATUS.PICKUP,
        subject:
          /vous attend|est disponible|est arrivé|bien arrivé|à retirer|ligt klaar|listo para recoger|te espera/i,
      },
    ],
    tracking: [/\b\d{12}\b/, /\b\d{10}\b/, /\b\d{8}\b/],
    trackingUrl: 'https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition={tracking}',
  },
  {
    key: 'relais_colis',
    name: 'Relais Colis',
    senders: [brand('relaiscolis', 'relais-colis')],
    rules: [{ status: STATUS.PICKUP, subject: /vous attend|est disponible|est arrivé|à retirer/i }],
    tracking: [/\b[A-Z0-9]{10,16}\b/],
    trackingUrl: 'https://www.relaiscolis.com/suivi-de-colis/index/tracking/reference/{tracking}/',
  },
  {
    key: 'colis_prive',
    name: 'Colis Privé',
    senders: [brand('colisprive', 'colis-prive')],
    tracking: [/\b[A-Z0-9]{2}\d{13,15}\b/, /\b\d{17}\b/],
    trackingUrl: 'https://www.colisprive.com/moncolis/pages/detailColis.aspx?numColis={tracking}',
  },
  {
    key: 'bpost',
    name: 'bpost',
    senders: [brand('bpost')],
    rules: [
      {
        status: STATUS.PICKUP,
        subject: /vous attend|ligt klaar|ready for pick ?up|point d'enlèvement|afhaalpunt/i,
      },
    ],
    tracking: [/\b3232\d{20}\b/, /\b[A-Z]{2}\d{9}BE\b/],
    trackingUrl: 'https://track.bpost.cloud/btr/web/#/search?itemCode={tracking}',
  },
  {
    key: 'postnl',
    name: 'PostNL',
    senders: [brand('postnl')],
    tracking: [/\b3S[A-Z0-9]{9,13}\b/, S10],
  },
  {
    key: 'swiss_post',
    name: 'Swiss Post',
    senders: [domain('post.ch', 'swisspost.ch', 'poste.ch')],
    tracking: [/\b99\.?\d{2}\.?\d{6}\.?\d{8}\b/, S10],
    trackingUrl: 'https://service.post.ch/ekp-web/ui/entry/search/{tracking}',
  },
  // --- Germany / Austria -------------------------------------------------------
  {
    key: 'hermes',
    name: 'Hermes',
    senders: [domain('myhermes.de', 'hermesworld.com', 'hermes-europe.de')],
    tracking: [/\b\d{14}\b/, /\b\d{20}\b/],
    trackingUrl:
      'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#{tracking}',
  },
  {
    key: 'post_at',
    name: 'Österreichische Post',
    senders: [domain('post.at')],
    tracking: [/\b\d{22}\b/, S10],
    trackingUrl: 'https://www.post.at/sv/sendungsdetails?snr={tracking}',
  },
  // --- United Kingdom ----------------------------------------------------------
  {
    key: 'royal_mail',
    name: 'Royal Mail',
    senders: [domain('royalmail.com')],
    rules: [
      { status: STATUS.OUT_FOR_DELIVERY, subject: /to be delivered today/i },
      { status: STATUS.IN_TRANSIT, subject: /is on its way/i },
    ],
    tracking: [/\b[A-Z]{2}\d{9}GB\b/],
    trackingUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/{tracking}',
  },
  {
    key: 'evri',
    name: 'Evri',
    senders: [domain('evri.com', 'myhermes.co.uk')],
    rules: [
      { status: STATUS.DELIVERED, subject: /successfully delivered/i },
      {
        status: STATUS.OUT_FOR_DELIVERY,
        subject: /is now with your local (?:hermes|evri) courier/i,
      },
    ],
    tracking: [/\b[A-Z]?\d{15,16}\b/],
    trackingUrl: 'https://www.evri.com/track/parcel/{tracking}',
  },
  // --- Spain / Italy -----------------------------------------------------------
  {
    key: 'correos',
    name: 'Correos',
    senders: [domain('correos.es', 'correos.com')],
    tracking: [S10, /\b[A-Z0-9]{23}\b/],
    trackingUrl:
      'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number={tracking}',
  },
  {
    key: 'correos_express',
    name: 'Correos Express',
    senders: [domain('correosexpress.com', 'correosexpress.es')],
    tracking: [/\b\d{16}\b/],
    trackingUrl: 'https://s.correosexpress.com/c?n={tracking}',
  },
  {
    key: 'seur',
    name: 'SEUR',
    senders: [brand('seur')],
    tracking: [/\b[A-Z0-9]{2}\d{10,12}\b/, /\b\d{10,14}\b/],
    trackingUrl: 'https://www.seur.com/livetracking/?segOnlineIdentificador={tracking}',
  },
  {
    key: 'mrw',
    name: 'MRW',
    senders: [domain('mrw.es', 'mrw.pt')],
    tracking: [/\b\d{12}\b/],
  },
  {
    key: 'brt',
    name: 'BRT',
    senders: [domain('brt.it')],
    tracking: [/\b\d{12,19}\b/],
  },
  {
    key: 'poste_italiane',
    name: 'Poste Italiane',
    senders: [domain('poste.it', 'posteitaliane.it')],
    tracking: [S10, /\b[A-Z0-9]{12,13}\b/],
    trackingUrl: 'https://www.poste.it/cerca/index.html#/risultati-spedizioni/{tracking}',
  },
  // --- Poland / Nordics --------------------------------------------------------
  {
    key: 'inpost',
    name: 'InPost',
    senders: [brand('inpost'), domain('paczkomaty.pl')],
    rules: [
      { status: STATUS.DELIVERED, subject: /potwierdzenie odbioru/i },
      {
        status: STATUS.PICKUP,
        subject: /umieszczona w paczkomacie|czeka na odbiór|gotowa do odbioru|ready to collect/i,
      },
      { status: STATUS.OUT_FOR_DELIVERY, subject: /jest w drodze|prawie u ciebie/i },
    ],
    tracking: [/\b\d{24}\b/],
    pickupCode: [/kod odbioru\D{0,20}(\d{6})/i],
    trackingUrl: 'https://inpost.pl/sledzenie-przesylek?number={tracking}',
  },
  {
    key: 'poczta_polska',
    name: 'Poczta Polska',
    senders: [domain('poczta-polska.pl')],
    rules: [{ status: STATUS.IN_TRANSIT, subject: /einfo/i }],
    tracking: [/\b\d{20}\b/, S10],
    trackingUrl: 'https://emonitoring.poczta-polska.pl/?numer={tracking}',
  },
  {
    key: 'postnord',
    name: 'PostNord',
    senders: [brand('postnord')],
    tracking: [S10, /\b\d{18,20}\b/],
    trackingUrl: 'https://tracking.postnord.com/en/?id={tracking}',
  },
  // --- North America / Oceania -------------------------------------------------
  {
    key: 'canada_post',
    name: 'Canada Post',
    senders: [domain('canadapost.ca', 'postescanada.ca', 'canadapost.postescanada.ca')],
    rules: [{ status: STATUS.DELIVERED, subject: /delivery notification|avis de livraison/i }],
    tracking: [/\b\d{16}\b/, S10],
    trackingUrl:
      'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={tracking}',
  },
  {
    key: 'purolator',
    name: 'Purolator',
    senders: [domain('purolator.com')],
    tracking: [/\b[A-Z]{3}\d{9}\b/, /\b\d{12}\b/],
    trackingUrl: 'https://www.purolator.com/en/shipping/tracker?pin={tracking}',
  },
  {
    key: 'intelcom',
    name: 'Intelcom / Dragonfly',
    senders: [domain('intelcom.ca', 'intelcomexpress.com', 'dragonflyshipping.ca')],
    tracking: [/\bINTLCM[A-Z0-9]{6,12}\b/],
  },
  {
    key: 'ontrac',
    name: 'OnTrac / LaserShip',
    senders: [domain('ontrac.com', 'lasership.com')],
    tracking: [/\b[CD]\d{14}\b/, /\b1LS[A-Z0-9]{12,}\b/],
    trackingUrl: 'https://www.ontrac.com/tracking/?number={tracking}',
  },
  {
    key: 'auspost',
    name: 'Australia Post',
    senders: [domain('auspost.com.au')],
    rules: [
      { status: STATUS.DELIVERED, subject: /your shipment has been delivered/i },
      { status: STATUS.OUT_FOR_DELIVERY, subject: /is coming today/i },
      { status: STATUS.IN_TRANSIT, subject: /is on its way/i },
    ],
    tracking: [/\b[A-Z]{2}\d{9}AU\b/, /\b\d{12}\b/],
    trackingUrl: 'https://auspost.com.au/mypost/track/#/details/{tracking}',
  },
  // --- Marketplaces that notify the delivery steps themselves -------------------
  {
    key: 'aliexpress',
    name: 'AliExpress / Cainiao',
    senders: [brand('aliexpress', 'cainiao')],
    tracking: [S10, /\b[A-Z]{2}\d{14,18}\b/],
    trackingUrl: 'https://global.cainiao.com/newDetail.htm?mailNoList={tracking}',
  },
  {
    key: 'vinted',
    name: 'Vinted',
    senders: [brand('vinted')],
    tracking: [],
  },
];

// Catch-all carrier of the user's own senders (`custom_senders` config): a
// shop or a local carrier this list does not know, read with the generic
// multilingual rules only.
export const OTHER_CARRIER = {
  key: 'other',
  name: 'Other',
  senders: [],
  tracking: [S10],
};
