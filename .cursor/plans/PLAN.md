# Plan: montos grandes en el detalle

## Objetivo
En el detalle de la venta, un importe largo no debe partir las tarjetas. El resumen de inversión y cada domicilio conservan su estructura cuando el monto o la dirección son largos.

## Archivos a tocar
- `src/app/punto-de-venta/page.tsx` — resumen compacto y dirección en una sola lectura
- `src/app/punto-de-venta/punto-de-venta.module.css` — el monto del domicilio en su propia fila

## Pasos
1. En el detalle, usar el resumen de inversión en filas: texto a la izquierda y monto a la derecha.
2. En cada domicilio del detalle, dejar la dirección a todo el ancho y el costo de envío abajo, de lado a lado.
3. Escribir colonia, CP y ciudad como una sola línea, para que los puntos no queden sueltos.

## Fuera de alcance
- No cambia las tarjetas de domicilio del cobro.
- No cambia el ticket ni los datos guardados.
