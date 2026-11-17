# Plan: comentarios de cotización → Notas de venta (POS)

## Objetivo
Al importar una cotización en Cobro, llevar `comments` a «Notas de venta».

## Archivos
- Server: `pos.controller.ts` (`getPosQuoteByNumber`)
- Admin: `usePos.tsx` (applyQuoteToCart / payload)

## Pasos
1. Devolver `comments` en el import POS. ✅
2. Aplicarlos a «Notas de venta»: si vacío → set; si hay texto → append (máx 2000). ✅
3. Solo cotizaciones nuevas con comments en linesJson.

## Fuera de alcance
- Transferencia del PDF.
- Extraer comments de cotizaciones viejas sin linesJson.comments.
