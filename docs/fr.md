# Mail and Packages (Courrier et colis)

Mail and Packages lit les notifications d'expédition qui arrivent dans votre
boîte mail et indique à Gladys quels colis sont en route, arrivent
aujourd'hui, attendent d'être retirés, sont livrés ou bloqués. Elle comprend
36 transporteurs et places de marché (Colissimo, Chronopost, Mondial Relay,
Relais Colis, Colis Privé, DPD, GLS, DHL, UPS, FedEx, Amazon, Vinted, bpost…)
en français, anglais, allemand, espagnol, italien, néerlandais et polonais.
Avec USPS Informed Delivery, elle compte aussi le courrier annoncé pour la
journée.

Elle s'inspire de l'intégration Home Assistant
[Mail and Packages](https://github.com/moralmunky/Home-Assistant-Mail-And-Packages).

## Confidentialité

- La boîte est lue en IMAP, **en lecture seule** : rien n'est déplacé,
  marqué, passé en lu ou supprimé.
- Seuls les e-mails des transporteurs activés sont téléchargés ; les autres ne
  sont vus que par leur expéditeur et leur objet, et jamais conservés.
- Rien ne sort de votre Gladys : aucun service tiers, aucune API de suivi.
- L'intégration conserve un petit fichier (`/data/state.json`) : les
  identifiants des notifications déjà annoncées à vos scènes, pour qu'un
  redémarrage ne les déclenche jamais deux fois. Aucun contenu d'e-mail, aucun
  mot de passe.

## Configuration

1. Ouvrez l'onglet **Configuration** de l'intégration.
2. Renseignez le **serveur IMAP**, le **port** et la **sécurité** de votre
   fournisseur (voir le tableau ci-dessous), puis votre **identifiant**
   (généralement votre adresse e-mail) et votre **mot de passe**.
3. Choisissez les **dossiers** à analyser : `INBOX` par défaut. Séparez
   plusieurs dossiers par des virgules, par exemple `INBOX, Achats`. Les
   libellés Gmail sont aussi des dossiers.
4. Décochez si vous le souhaitez les **transporteurs** que vous n'utilisez
   jamais. Les boutiques ou transporteurs locaux absents de la liste
   s'ajoutent dans **Autres expéditeurs**, sous forme d'adresses
   (`commandes@boutique.example`) ou de domaines (`boutique.example`).
5. Enregistrez, puis cliquez sur **Tester la connexion** : le message sous le
   bouton indique combien d'e-mails de la période sont lisibles.
6. Ouvrez l'onglet **Découverte** et ajoutez les appareils souhaités.

### Paramètres par fournisseur

| Fournisseur            | Serveur IMAP          | Port | Sécurité | Mot de passe                                                                       |
| ---------------------- | --------------------- | ---- | -------- | ---------------------------------------------------------------------------------- |
| Gmail                  | `imap.gmail.com`      | 993  | TLS      | [mot de passe d'application](https://support.google.com/accounts/answer/185833)    |
| iCloud                 | `imap.mail.me.com`    | 993  | TLS      | [mot de passe d'application](https://support.apple.com/fr-fr/102654)               |
| Yahoo                  | `imap.mail.yahoo.com` | 993  | TLS      | mot de passe d'application (Sécurité du compte)                                    |
| Outlook / Hotmail      | —                     | —    | —        | Microsoft n'accepte plus de mot de passe en IMAP : transférez vers une autre boîte |
| Orange                 | `imap.orange.fr`      | 993  | TLS      | votre mot de passe                                                                 |
| Free                   | `imap.free.fr`        | 993  | TLS      | votre mot de passe                                                                 |
| SFR                    | `imap.sfr.fr`         | 993  | TLS      | votre mot de passe                                                                 |
| La Poste (laposte.net) | `imap.laposte.net`    | 993  | TLS      | votre mot de passe                                                                 |
| Votre propre serveur   | son nom ou son IP     | 993  | TLS      | activez **Accepter un certificat auto-signé** uniquement pour un certificat maison |

**Astuce : une boîte dédiée.** Inutile de donner à Gladys l'accès à votre boîte
principale : créez une boîte gratuite réservée à Gladys et ajoutez, dans votre
boîte principale, une règle de transfert pour les e-mails de vos
transporteurs. La plupart des règles de transfert conservent l'expéditeur
d'origine (« rediriger » dans certains webmails) ; sinon, ajoutez votre propre
adresse dans **Autres expéditeurs**.

### Réglages avancés

- **Intervalle d'analyse** : la boîte est lue toutes les 5 minutes par défaut.
- **Jours d'e-mails à lire** : un colis est suivi tant que ses e-mails ont
  moins de ce nombre de jours (10 par défaut). Archiver ou supprimer les
  e-mails d'un colis le retire des compteurs à l'analyse suivante.
- **Langue des noms d'appareils** : les noms que Gladys donne aux appareils à
  leur création. Vous pouvez les renommer ensuite.
- **Fuseau horaire** : détermine quand commence « aujourd'hui ». Vide : le
  fuseau du serveur Gladys.

## Appareils

- **Courrier et colis** : le récapitulatif de tous les transporteurs :
  - _En transit_ : chaque colis encore en route ;
  - _Arrive aujourd'hui_ : colis annoncés « en cours de livraison » aujourd'hui ;
  - _Livrés aujourd'hui_ ;
  - _À retirer_ : colis en consigne, en point relais ou au bureau de poste ;
  - _Incidents de livraison_ : retards, passages manqués, retours ;
  - _Courrier attendu aujourd'hui_ : les lettres annoncées par USPS Informed
    Delivery ;
  - _Dernière mise à jour_ : le dernier évènement de colis, en texte.
- **Colis – _transporteur_** : les cinq mêmes compteurs pour un transporteur.

Les compteurs sont recalculés à partir de la boîte à chaque analyse : une
deuxième analyse ne compte jamais deux fois le même colis.

## Scènes

### Déclencheurs

Dans l'éditeur de scènes, catégorie **Intégrations** :

| Déclencheur                  | Quand                                             |
| ---------------------------- | ------------------------------------------------- |
| Colis expédié                | une confirmation d'expédition arrive              |
| Colis en cours de livraison  | un transporteur annonce une livraison aujourd'hui |
| Colis à retirer              | un colis attend en consigne ou en point relais    |
| Colis livré                  | un transporteur confirme une livraison            |
| Incident de livraison        | retard, passage manqué, retour à l'expéditeur     |
| Courrier attendu aujourd'hui | le résumé USPS Informed Delivery arrive           |

Chaque déclencheur de colis peut être filtré sur un ou plusieurs
transporteurs et met à disposition des actions suivantes :
`{{triggerEvent.data.carrier_name}}`, `{{triggerEvent.data.tracking}}`,
`{{triggerEvent.data.tracking_url}}`, `{{triggerEvent.data.pickup_code}}` et
`{{triggerEvent.data.subject}}`. Chaque étape d'un colis se déclenche une
seule fois, redémarrages compris ; les e-mails déjà présents dans la boîte à
l'installation ne déclenchent rien.

Exemple : _Colis à retirer_ → envoyer le message « Votre colis
{{triggerEvent.data.carrier_name}} vous attend, code
{{triggerEvent.data.pickup_code}} ».

### Actions

- **Analyser la boîte mail (colis)** : lit la boîte maintenant, puis renvoie
  les compteurs.
- **Obtenir les compteurs de colis** : immédiat, les compteurs de la dernière
  analyse.

Les deux peuvent cibler un transporteur et renvoient `arriving_today`,
`in_transit`, `pickup`, `delivered`, `exception`, `mail`, `expected_today`
(vrai si un colis arrive aujourd'hui ou attend d'être retiré) et `summary`,
une phrase prête à envoyer (« Colis : 2 arrive(nt) aujourd'hui, 1 à
retirer. »), dans la langue de la configuration. Exemple : chaque matin à 8 h,
_Obtenir les compteurs de colis_, puis « Continuer seulement si »
`expected_today` est vrai, puis envoyer le `summary` à la famille.

## Widgets du tableau de bord

- **Colis du jour** : les compteurs en tuiles, l'état de la boîte mail,
  l'heure de la dernière analyse et un bouton **Analyser**.
- **Suivi des colis** : les colis en route et les livraisons du jour, avec le
  numéro de suivi, le code de retrait et un lien vers la page de suivi du
  transporteur.

Les deux peuvent afficher tous les transporteurs ou un seul (réglages du
widget).

## Dépannage

- **« Le serveur de messagerie a refusé l'identifiant ou le mot de passe »** :
  Gmail, iCloud et Yahoo exigent un mot de passe d'application, et la
  validation en deux étapes doit être activée pour en créer un.
- **« Le dossier … n'existe pas »** : les noms de dossiers respectent la
  casse ; le dossier « Tous les messages » de Gmail s'appelle
  `[Gmail]/Tous les messages`.
- **Un colis n'est pas détecté** : vérifiez que son transporteur est coché,
  que l'e-mail est dans un dossier analysé et plus récent que la période lue.
  Les transporteurs changent parfois leurs formulations : ouvrez un ticket sur
  [GitHub](https://github.com/gboulvin/Gladys-Mail-and-Packages/issues) avec
  l'adresse de l'expéditeur et l'objet de l'e-mail (retirez vos données
  personnelles).
- **Journaux** : dans Gladys, ouvrez la page **Supervision** de l'intégration.
  Passez la variable `LOG_LEVEL` à `debug` pour plus de détails ; le mot de
  passe n'est jamais journalisé.
