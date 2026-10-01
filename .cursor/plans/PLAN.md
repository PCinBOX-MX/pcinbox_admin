# Plan: Cajón no abre al Cobrar (solo botón naranja)

## Objetivo
Que al cobrar con método **Efectivo en caja** el cajón se abra en automático, con el mismo comando raw que ya funciona en el botón naranja «Abrir cajón de dinero».

## Causa probable
En `executeCharge`, si «Imprimir ticket al cobrar» está activo, el kick del cajón solo va **embebido al final del ticket ESC/POS (después del corte)**. En muchas térmicas ese byte se pierde. El botón naranja llama `openCashDrawerQz()` en un job raw aparte y sí abre.

## Archivos a tocar
- `src/app/punto-de-venta/usePos.tsx` — flujo post-cobro
- `src/app/punto-de-venta/page.tsx` — texto de ayuda (opcional, aclarar job aparte)
- `src/app/punto-de-venta/qz/escposTicket.ts` — kick **antes** del corte por si algún reprint usa `openDrawer`

## Pasos
1. En cobro con efectivo + `openDrawerOnCash`: siempre `openCashDrawerQz()` aparte (como el botón naranja).
2. Al imprimir ticket en cobro: `openDrawer: false` (evitar doble pulse).
3. En `buildEscPosTicket`: poner drawer kick antes del cut.
4. Ajustar copy de hardware si hace falta.

## Fuera de alcance
- Cambiar dialéctica Epson/Star, certificados QZ, UI de métodos de pago.
- Backend `/pos/sales`.
