import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMessage } from '../src/classifier.js';
import { CARRIER_KEYS, findCarrierBySender, parseCustomSenders } from '../src/carriers/index.js';
import { STATUS } from '../src/constants.js';

const ALL = { carriers: CARRIER_KEYS, customSenders: [] };
const date = new Date('2026-11-14T09:00:00Z');

const classify = (from, subject, text = '', options = ALL) =>
  classifyMessage({ id: `<${from}|${subject}>`, from, subject, date, text }, options);

// [sender, subject, body, expected carrier, expected status, expected tracking]
const CASES = [
  // --- From the Home Assistant Mail and Packages patterns ---
  [
    'auto-reply@usps.com',
    'USPS® Item Delivered, Front Door/Porch 9400111899223100000000',
    '',
    'usps',
    STATUS.DELIVERED,
    '9400111899223100000000',
  ],
  [
    'auto-reply@usps.com',
    'USPS® Expected Delivery on Friday',
    'Your item is out for delivery',
    'usps',
    STATUS.OUT_FOR_DELIVERY,
    null,
  ],
  [
    'auto-reply@usps.com',
    'USPS® Delivery Exception 9205590164917312751089',
    '',
    'usps',
    STATUS.EXCEPTION,
    '9205590164917312751089',
  ],
  [
    'mcinfo@ups.com',
    'UPS Update: Package Scheduled for Delivery Today',
    'Tracking Number: 1Z999AA10123456784',
    'ups',
    STATUS.OUT_FOR_DELIVERY,
    '1Z999AA10123456784',
  ],
  [
    'mcinfo@ups.com',
    'Your UPS Package was delivered',
    '1Z999AA10123456784',
    'ups',
    STATUS.DELIVERED,
    '1Z999AA10123456784',
  ],
  ['mcinfo@ups.com', 'UPS Update: New Scheduled Delivery Date', '', 'ups', STATUS.EXCEPTION, null],
  [
    'TrackingUpdates@fedex.com',
    'Your package has been delivered',
    'Tracking # 771234567890',
    'fedex',
    STATUS.DELIVERED,
    '771234567890',
  ],
  [
    'TrackingUpdates@fedex.com',
    'Your package is now out for delivery',
    '',
    'fedex',
    STATUS.OUT_FOR_DELIVERY,
    null,
  ],
  [
    'shipment-tracking@amazon.com',
    'Shipped: "Echo Dot (5th Gen)"',
    'Order #112-1234567-1234567',
    'amazon',
    STATUS.IN_TRANSIT,
    '112-1234567-1234567',
  ],
  [
    'order-update@amazon.com',
    'Delivered: Your Amazon.com order #112-1234567-1234567',
    '',
    'amazon',
    STATUS.DELIVERED,
    '112-1234567-1234567',
  ],
  [
    'order-update@amazon.fr',
    'Livré : votre commande Amazon.fr',
    '',
    'amazon',
    STATUS.DELIVERED,
    null,
  ],
  [
    'versandbestaetigung@amazon.de',
    'Versandt: Ihre Amazon.de-Bestellung',
    '',
    'amazon',
    STATUS.IN_TRANSIT,
    null,
  ],
  [
    'confirmar-envio@amazon.es',
    'Enviado: tu pedido de Amazon.es',
    '',
    'amazon',
    STATUS.IN_TRANSIT,
    null,
  ],
  [
    'thehub@amazon.com',
    'You have a package to pick up 123456',
    'Your pickup code is <b>654321',
    'amazon',
    STATUS.PICKUP,
    null,
  ],
  [
    'order-update@amazon.co.uk',
    'Delivery update: your parcel is running late',
    '',
    'amazon',
    STATUS.EXCEPTION,
    null,
  ],
  [
    'noreply@dhl.de',
    'DHL Paket kommt heute',
    'Sendungsnummer JJD000390007827812345',
    'dhl',
    STATUS.OUT_FOR_DELIVERY,
    'JJD000390007827812345',
  ],
  [
    'donotreply_odd@dhl.com',
    'DHL On Demand Delivery',
    'Your shipment 1234567890 has been delivered',
    'dhl',
    STATUS.DELIVERED,
    '1234567890',
  ],
  [
    'no-reply@royalmail.com',
    'Your item AB123456789GB is on its way',
    '',
    'royal_mail',
    STATUS.IN_TRANSIT,
    'AB123456789GB',
  ],
  [
    'donotreply@myhermes.co.uk',
    'Hermes has successfully delivered your parcel',
    '',
    'evri',
    STATUS.DELIVERED,
    null,
  ],
  [
    'noreply@notifications.auspost.com.au',
    'Your shipment has been delivered',
    '',
    'auspost',
    STATUS.DELIVERED,
    null,
  ],
  [
    'donotreply@canadapost.postescanada.ca',
    'Delivery Notification',
    '',
    'canada_post',
    STATUS.DELIVERED,
    null,
  ],
  [
    'powiadomienia@inpost.pl',
    'InPost - Paczka umieszczona w Paczkomacie',
    'Kod odbioru: 123456',
    'inpost',
    STATUS.PICKUP,
    null,
  ],
  // --- Carriers and languages added by this integration ---
  [
    'noreply@notif-colissimo-laposte.info',
    'Votre colis 6A12345678901 est en cours de livraison',
    '',
    'colissimo',
    STATUS.OUT_FOR_DELIVERY,
    '6A12345678901',
  ],
  [
    'noreply@notif-colissimo-laposte.info',
    'Votre colis a été livré',
    'Colis 6A12345678901',
    'colissimo',
    STATUS.DELIVERED,
    '6A12345678901',
  ],
  [
    'noreply@notif-colissimo-laposte.info',
    "Votre colis n'a pas pu être livré",
    '',
    'colissimo',
    STATUS.EXCEPTION,
    null,
  ],
  [
    'noreply@notif-colissimo-laposte.info',
    'Votre colis vous attend en bureau de poste',
    '',
    'colissimo',
    STATUS.PICKUP,
    null,
  ],
  [
    'suivi@chronopost.fr',
    "Votre colis XY123456789FR sera livré aujourd'hui",
    '',
    'chronopost',
    STATUS.OUT_FOR_DELIVERY,
    'XY123456789FR',
  ],
  [
    'noreply@mondialrelay.fr',
    'Votre colis est disponible dans votre Point Relais',
    'Code de retrait : 4821',
    'mondial_relay',
    STATUS.PICKUP,
    null,
  ],
  ['noreply@dpd.de', 'Ihr Paket wurde zugestellt', '', 'dpd', STATUS.DELIVERED, null],
  ['noreply@gls-group.eu', 'Ihr GLS Paket ist unterwegs', '', 'gls', STATUS.IN_TRANSIT, null],
  [
    'noreply@myhermes.de',
    'Ihre Sendung wurde erfolgreich zugestellt',
    '',
    'hermes',
    STATUS.DELIVERED,
    null,
  ],
  [
    'noreply@dhl.de',
    'Ihr Paket liegt in der Packstation zur Abholung bereit',
    '',
    'dhl',
    STATUS.PICKUP,
    null,
  ],
  ['noreply@correos.es', 'Tu envío está en reparto', '', 'correos', STATUS.OUT_FOR_DELIVERY, null],
  ['noreply@seur.com', 'Tu pedido ha sido entregado', '', 'seur', STATUS.DELIVERED, null],
  ['noreply@seur.com', 'No hemos podido entregar tu envío', '', 'seur', STATUS.EXCEPTION, null],
  ['info@bpost.be', 'Uw pakje ligt klaar in het afhaalpunt', '', 'bpost', STATUS.PICKUP, null],
  [
    'noreply@postnl.nl',
    'Je pakket wordt vandaag bezorgd',
    '',
    'postnl',
    STATUS.OUT_FOR_DELIVERY,
    null,
  ],
];

for (const [from, subject, body, carrier, status, tracking] of CASES) {
  test(`${carrier}: "${subject}" -> ${status}`, () => {
    const event = classify(from, subject, body);
    assert.ok(event, 'the email must be recognized');
    assert.equal(event.kind, 'package');
    assert.equal(event.carrier, carrier);
    assert.equal(event.status, status);
    if (tracking !== null) {
      assert.equal(event.tracking, tracking);
    }
  });
}

test('pickup codes are extracted', () => {
  assert.equal(
    classify(
      'thehub@amazon.com',
      'Your package is ready for pickup from Amazon Hub Locker',
      'Your pickup code is <b>654321</b>',
    ).pickupCode,
    '654321',
  );
  assert.equal(
    classify('noreply@mondialrelay.fr', 'Votre colis vous attend', 'Votre code de retrait : 4821')
      .pickupCode,
    '4821',
  );
});

test('USPS Informed Delivery digest counts the letters', () => {
  const event = classifyMessage(
    {
      id: 'digest',
      from: 'USPSInformeddelivery@email.informeddelivery.usps.com',
      subject: 'Your Daily Digest for Fri, 11/13',
      date,
      imageCount: 4,
    },
    ALL,
  );
  assert.deepEqual(
    { kind: event.kind, carrier: event.carrier, count: event.count },
    { kind: 'mail', carrier: 'usps', count: 4 },
  );
});

test('unknown senders, look-alike domains and marketing emails are ignored', () => {
  assert.equal(classify('newsletter@example.com', 'Your package has been delivered'), null);
  assert.equal(classify('phishing@ups.com.evil.io', 'Your UPS Package was delivered'), null);
  assert.equal(classify('deals@amazon.com', 'Black Friday: 40% off Echo devices'), null);
});

test('a disabled carrier is ignored', () => {
  assert.equal(
    classify('mcinfo@ups.com', 'Your UPS Package was delivered', '', { carriers: ['fedex'] }),
    null,
  );
});

test('custom senders are read with the generic rules, under "other"', () => {
  const options = {
    carriers: CARRIER_KEYS,
    customSenders: parseCustomSenders('shop.example.com; orders@example.org'),
  };
  assert.equal(
    classify('noreply@shop.example.com', 'Your order has shipped', '', options).carrier,
    'other',
  );
  assert.equal(
    classify('orders@example.org', 'Votre commande a été expédiée', '', options).status,
    STATUS.IN_TRANSIT,
  );
  assert.equal(classify('someone@example.org', 'Your order has shipped', '', options), null);
});

test('sender matching covers sub-domains and country domains', () => {
  const options = { carriers: CARRIER_KEYS };
  assert.equal(findCarrierBySender('noreply@mail.ups.com', options).key, 'ups');
  assert.equal(findCarrierBySender('auto-confirm@amazon.co.uk', options).key, 'amazon');
  assert.equal(findCarrierBySender('noreply@dhl.com', options).key, 'dhl');
  assert.equal(findCarrierBySender('not an address', options), undefined);
});

test('parseCustomSenders keeps addresses and domains only', () => {
  assert.deepEqual(parseCustomSenders(' Shop.Example.com, @foo.org ; bar@baz.net  nonsense '), [
    'shop.example.com',
    'foo.org',
    'bar@baz.net',
  ]);
});
