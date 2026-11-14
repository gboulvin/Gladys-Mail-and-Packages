# Mail and Packages (Post und Pakete)

Mail and Packages liest die Versandbenachrichtigungen in Ihrem Postfach und
teilt Gladys mit, welche Pakete unterwegs sind, heute ankommen, auf Abholung
warten, zugestellt wurden oder feststecken. Die Integration versteht 36
Versanddienste und Marktplätze (DHL, Deutsche Post, Hermes, DPD, GLS, UPS,
FedEx, Amazon, Österreichische Post, Swiss Post…) auf Deutsch, Englisch,
Französisch, Spanisch, Italienisch, Niederländisch und Polnisch.

## Datenschutz

- Das Postfach wird per IMAP **nur lesend** geöffnet: nichts wird verschoben,
  markiert, als gelesen gesetzt oder gelöscht.
- Nur die E-Mails der aktivierten Versanddienste werden heruntergeladen; alle
  anderen werden nur anhand von Absender und Betreff gesehen und nie
  gespeichert.
- Nichts verlässt Ihr Gladys: kein Drittanbieter, keine Tracking-API.
- Die Integration speichert eine kleine Datei (`/data/state.json`) mit den
  bereits gemeldeten Benachrichtigungen, damit ein Neustart sie nie doppelt
  auslöst. Kein E-Mail-Inhalt, kein Passwort.

## Einrichtung

1. Öffnen Sie den Tab **Konfiguration** der Integration.
2. Tragen Sie **IMAP-Server**, **Port** und **Sicherheit** Ihres Anbieters
   ein (siehe Tabelle), dann **Benutzername** (meist die E-Mail-Adresse) und
   **Passwort**.
3. Wählen Sie die zu prüfenden **Ordner**: standardmäßig `INBOX`. Mehrere
   Ordner durch Kommas trennen, z. B. `INBOX, Einkäufe`.
4. Deaktivieren Sie bei Bedarf **Versanddienste**, die Sie nie nutzen. Fehlende
   Shops oder Versanddienste tragen Sie unter **Andere Absender** ein
   (Adressen oder Domains).
5. Speichern und **Verbindung testen** klicken.
6. Im Tab **Erkennung** die gewünschten Geräte hinzufügen.

| Anbieter          | IMAP-Server              | Port | Sicherheit | Passwort                                                          |
| ----------------- | ------------------------ | ---- | ---------- | ----------------------------------------------------------------- |
| Gmail             | `imap.gmail.com`         | 993  | TLS        | [App-Passwort](https://support.google.com/accounts/answer/185833) |
| iCloud            | `imap.mail.me.com`       | 993  | TLS        | [App-Passwort](https://support.apple.com/de-de/102654)            |
| GMX               | `imap.gmx.net`           | 993  | TLS        | IMAP in den GMX-Einstellungen aktivieren                          |
| WEB.DE            | `imap.web.de`            | 993  | TLS        | IMAP in den WEB.DE-Einstellungen aktivieren                       |
| T-Online          | `secureimap.t-online.de` | 993  | TLS        | E-Mail-Passwort (nicht das Kundencenter-Passwort)                 |
| Outlook / Hotmail | —                        | —    | —          | Microsoft akzeptiert keine Passwörter mehr per IMAP: weiterleiten |

**Tipp:** Legen Sie ein eigenes Postfach nur für Gladys an und leiten Sie die
E-Mails Ihrer Versanddienste dorthin weiter.

## Geräte

- **Post und Pakete**: Zusammenfassung aller Versanddienste — _Unterwegs_,
  _Kommt heute_, _Heute zugestellt_, _Abholbereit_, _Zustellprobleme_, _Heute
  erwartete Post_ (USPS Informed Delivery) und _Letzte Aktualisierung_ (Text).
- **Pakete – _Versanddienst_**: dieselben fünf Zähler je Versanddienst.

## Szenen

**Auslöser** (Kategorie „Integrationen“): _Paket versandt_, _Paket in
Zustellung_, _Paket abholbereit_, _Paket zugestellt_, _Zustellproblem_, _Heute
Briefpost erwartet_. Filterbar nach Versanddienst; Variablen:
`{{triggerEvent.data.carrier_name}}`, `tracking`, `tracking_url`,
`pickup_code`, `subject`. Jeder Schritt löst genau einmal aus.

**Aktionen**: _Postfach nach Paketen prüfen_ (liest jetzt) und _Paketzähler
abrufen_ (sofort, letzte Prüfung). Ausgaben: `arriving_today`, `in_transit`,
`pickup`, `delivered`, `exception`, `mail`, `expected_today` und `summary`
(fertiger Satz zum Versenden).

## Dashboard-Widgets

- **Pakete heute**: Zähler als Kacheln, Postfachstatus, letzte Prüfung,
  Schaltfläche **Jetzt prüfen**.
- **Sendungsverfolgung**: Pakete unterwegs mit Sendungsnummer, Abholcode und
  Link zur Verfolgungsseite.

## Fehlerbehebung

- **Benutzername oder Passwort abgelehnt**: Gmail, iCloud und Yahoo verlangen
  ein App-Passwort.
- **Ordner existiert nicht**: Groß-/Kleinschreibung beachten.
- **Paket nicht erkannt**: Melden Sie Absenderadresse und Betreff auf
  [GitHub](https://github.com/gboulvin/Gladys-Mail-and-Packages/issues).

Ausführliche Dokumentation: [English](en.md).
