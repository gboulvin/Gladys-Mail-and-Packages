# Mail and Packages (Correo y paquetes)

Mail and Packages lee las notificaciones de envío que llegan a tu buzón y
le dice a Gladys qué paquetes están en camino, llegan hoy, esperan a ser
recogidos, se han entregado o tienen una incidencia. Entiende 36
transportistas y tiendas (Correos, Correos Express, SEUR, MRW, GLS, DHL, UPS,
FedEx, Amazon, Vinted…) en español, inglés, francés, alemán, italiano,
neerlandés y polaco.

## Privacidad

- El buzón se lee por IMAP, **en solo lectura**: no se mueve, marca, lee ni
  borra nada.
- Solo se descargan los correos de los transportistas activados; los demás
  solo se ven por su remitente y su asunto, y nunca se guardan.
- Nada sale de tu Gladys: ningún servicio de terceros, ninguna API de
  seguimiento.
- La integración guarda un pequeño archivo (`/data/state.json`) con las
  notificaciones ya anunciadas a tus escenas, para que un reinicio nunca las
  dispare dos veces. Ningún contenido de correo, ninguna contraseña.

## Configuración

1. Abre la pestaña **Configuración** de la integración.
2. Indica el **servidor IMAP**, el **puerto** y la **seguridad** de tu
   proveedor (ver tabla), y después tu **usuario** (normalmente tu dirección)
   y tu **contraseña**.
3. Elige las **carpetas** que analizar: `INBOX` por defecto. Separa varias con
   comas, p. ej. `INBOX, Compras`.
4. Desmarca si quieres los **transportistas** que nunca usas. Las tiendas o
   transportistas que faltan se añaden en **Otros remitentes** (direcciones o
   dominios).
5. Guarda y pulsa **Probar la conexión**.
6. En la pestaña **Descubrimiento**, añade los dispositivos que quieras.

| Proveedor         | Servidor IMAP         | Puerto | Seguridad | Contraseña                                                                    |
| ----------------- | --------------------- | ------ | --------- | ----------------------------------------------------------------------------- |
| Gmail             | `imap.gmail.com`      | 993    | TLS       | [contraseña de aplicación](https://support.google.com/accounts/answer/185833) |
| iCloud            | `imap.mail.me.com`    | 993    | TLS       | [contraseña de aplicación](https://support.apple.com/es-es/102654)            |
| Yahoo             | `imap.mail.yahoo.com` | 993    | TLS       | contraseña de aplicación                                                      |
| Outlook / Hotmail | —                     | —      | —         | Microsoft ya no acepta contraseñas por IMAP: reenvía a otro buzón             |

**Consejo:** crea un buzón solo para Gladys y reenvía a él los correos de tus
transportistas.

## Dispositivos

- **Correo y paquetes**: resumen de todos los transportistas — _En tránsito_,
  _Llega hoy_, _Entregados hoy_, _Por recoger_, _Incidencias_, _Correo previsto
  hoy_ (USPS Informed Delivery) y _Última actualización_ (texto).
- **Paquetes – _transportista_**: los mismos cinco contadores por
  transportista.

## Escenas

**Disparadores** (categoría «Integraciones»): _Paquete enviado_, _Paquete en
reparto_, _Paquete listo para recoger_, _Paquete entregado_, _Incidencia de
entrega_, _Correo postal previsto hoy_. Se pueden filtrar por transportista;
variables: `{{triggerEvent.data.carrier_name}}`, `tracking`, `tracking_url`,
`pickup_code`, `subject`. Cada paso se dispara una sola vez.

**Acciones**: _Analizar el buzón (paquetes)_ (lee ahora) y _Obtener los
contadores de paquetes_ (inmediato, último análisis). Salidas:
`arriving_today`, `in_transit`, `pickup`, `delivered`, `exception`, `mail`,
`expected_today` y `summary` (frase lista para enviar).

## Widgets del panel

- **Paquetes de hoy**: contadores, estado del buzón, último análisis y botón
  **Analizar ahora**.
- **Seguimiento**: paquetes en camino con número de seguimiento, código de
  recogida y enlace a la página del transportista.

## Solución de problemas

- **Usuario o contraseña rechazados**: Gmail, iCloud y Yahoo exigen una
  contraseña de aplicación.
- **La carpeta no existe**: respeta mayúsculas y minúsculas.
- **Un paquete no se detecta**: indica el remitente y el asunto en
  [GitHub](https://github.com/gboulvin/Gladys-Mail-and-Packages/issues).

Documentación completa: [English](en.md).
