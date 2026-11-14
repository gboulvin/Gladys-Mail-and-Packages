// -----------------------------------------------------------------------------
// Generic multilingual status rules.
//
// Tried on the SUBJECT of an email whose sender is a known carrier, after the
// carrier's own rules. They are what makes a carrier work out of the box in
// English, French, German, Spanish, Italian, Dutch and Polish without a
// hand-written rule per country.
//
// ORDER MATTERS: "could not be delivered" is an exception, not a delivery;
// "will be delivered today" is an announcement, not a delivery. The most
// specific wordings are therefore tried first.
// -----------------------------------------------------------------------------

import { STATUS } from '../constants.js';

const any = (...parts) => new RegExp(parts.join('|'), 'i');

export const GENERIC_RULES = [
  {
    status: STATUS.EXCEPTION,
    subject: any(
      // en
      'delay',
      'running late',
      'delivery (?:attempt|exception|problem|failed)',
      "could ?n[o’']t (?:be )?deliver",
      'unable to deliver',
      'not (?:been )?delivered',
      'missed (?:you|delivery)',
      'sorry we missed',
      'new (?:scheduled )?delivery date',
      'returned to sender',
      // fr
      'retard',
      "n['’]a pas (?:pu|été)",
      'échec de (?:la )?livraison',
      'tentative de livraison',
      'en votre absence',
      'avis de passage',
      'livraison reportée',
      "retour à l[’']expéditeur",
      // de
      'verzögert',
      'verspätet',
      'verspätung',
      'nicht zugestellt',
      'konnte(?:n)? (?:leider )?nicht',
      'zustellversuch',
      'zustellhindernis',
      // es
      'retras',
      'no (?:se )?(?:ha|hemos) podido',
      'intento de entrega',
      'incidencia',
      'entrega fallida',
      // it / nl / pl
      'ritardo',
      'mancata consegna',
      'vertraagd',
      'vertraging',
      'niet thuis',
      'opóźni',
      'nieudana próba',
    ),
  },
  {
    status: STATUS.PICKUP,
    subject: any(
      // en
      'ready (?:for|to) (?:pick ?up|collect)',
      'awaiting (?:collection|pick ?up)',
      'available for (?:pick ?up|collection)',
      'pick ?up code',
      'waiting for you',
      // fr
      'pr[êe]t à être retiré',
      'disponible (?:en|dans|au|à|chez)',
      'vous attend',
      'à retirer',
      'bien arrivé',
      'code de retrait',
      'mis en instance',
      // de
      'abholbereit',
      'zur abholung',
      'liegt (?:für sie )?bereit',
      'wartet auf (?:sie|dich)',
      'in (?:der|ihrer) (?:packstation|filiale)',
      'abholcode',
      // es
      'listo para (?:recoger|ser recogido)',
      'disponible para (?:recoger|su recogida)',
      'ya puedes recoger',
      'te (?:está )?espera',
      'código de recogida',
      // it / nl / pl
      'pronto per il ritiro',
      'ligt (?:voor je )?klaar',
      'klaar om af te halen',
      'gotowa do odbioru',
      'czeka na odbiór',
      'w paczkomacie',
    ),
  },
  {
    status: STATUS.OUT_FOR_DELIVERY,
    subject: any(
      // en
      'out for delivery',
      'arriving (?:today|soon)',
      '(?:delivery|arrive|arrives|coming) today',
      '(?:will|to) be delivered today',
      'scheduled for delivery today',
      'driver is (?:arriving|on (?:the|their) way)',
      // fr
      'en cours de livraison',
      'en cours de distribution',
      "(?:livraison|arrive|arrivera|prévue?) aujourd['’]hui",
      "sera livrée? (?:aujourd['’]hui|ce jour)",
      'en tournée',
      // de
      'kommt heute',
      'wird heute',
      'zustellung heute',
      'in zustellung',
      // es
      'en reparto',
      'llega hoy',
      '(?:entregará|entregaremos|se entrega|entrega prevista para) hoy',
      // it / nl / pl
      'in consegna',
      '(?:arriva|consegna) oggi',
      '(?:wordt|komt) vandaag',
      'dziś doręcz',
      'w doręczeniu',
    ),
  },
  {
    status: STATUS.DELIVERED,
    subject: any(
      // en
      '(?:was|were|has been|have been|been|successfully|is) delivered',
      '^delivered\\b',
      'item delivered',
      'delivery (?:complete|completed|confirmation|notification|confirmed)',
      'has arrived',
      // fr
      '(?:a été|ont été|est|bien|colis|commande) (?:bien )?(?:livré|remis|distribué)',
      'livraison (?:effectuée|réussie|confirmée)',
      'confirmation de livraison',
      '^livré',
      // de
      'wurden? (?:erfolgreich )?(?:zugestellt|geliefert|übergeben)',
      'erfolgreich zugestellt',
      'ist (?:zugestellt|angekommen|da)\\b',
      '^(?:zugestellt|geliefert)',
      'zustellbestätigung',
      // es
      '(?:ha sido|han sido|fue|se ha|ya está) entregad',
      '^entregado',
      '(?:paquete|pedido|envío) entregado',
      'entrega (?:realizada|completada|confirmada)',
      // it / nl / pl
      'consegnat[oa]',
      'consegna effettuata',
      'bezorgd',
      'afgeleverd',
      'dostarczon',
      'doręczon',
    ),
  },
  {
    status: STATUS.IN_TRANSIT,
    subject: any(
      // en
      'shipped',
      'has been sent',
      'on (?:its|the|their) way',
      'in transit',
      'dispatched',
      'shipment (?:notification|confirmation|update)',
      'shipping confirmation',
      'tracking (?:number|update|information)',
      'track your (?:parcel|package|order|shipment)',
      // fr
      'expédié',
      'a été (?:envoyé|remis au transporteur)',
      'en route',
      'en chemin',
      "en cours d['’]acheminement",
      'pris(?:e)? en charge',
      'suivi de (?:votre |ton )?(?:colis|commande|envoi)',
      'suivez (?:votre|ton) (?:colis|commande)',
      // de
      'versandt',
      'versendet',
      'verschickt',
      'unterwegs',
      'auf dem weg',
      'versandbestätigung',
      'sendungsverfolgung',
      // es
      'enviado',
      'en camino',
      'en tránsito',
      'ha salido',
      'confirmación de envío',
      'sigue tu (?:pedido|envío|paquete)',
      // it / nl / pl
      'spedit[oa]',
      'in (?:viaggio|transito)',
      'verzonden',
      'onderweg',
      'wysłan',
      'w drodze',
      'nadana',
    ),
  },
];

// Pickup / locker code announced with a parcel waiting to be collected.
export const GENERIC_PICKUP_CODE = [
  /(?:pick ?up code|collection code|code de retrait|code de retrait est|abholcode|código de recogida|codice di ritiro|afhaalcode|kod odbioru)\D{0,30}(\d{4,8})\b/i,
];
