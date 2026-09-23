# Plan: bloquear estatus terminal en reservas

## Objetivo
En pcinbox_admin `/reservas`, si una reserva pasa a `completed` o `cancelled`, el select de estatus queda bloqueado.

## Estado
Hecho.

## Cambios
- `reservas/page.tsx`: select deshabilitado + tooltip para `completed` y `cancelled`
- `reservas/useReservas.tsx`: guard que rechaza cambios si el estatus actual ya es terminal

## Fuera de alcance
- Validación extra en API de reservas (si el backend está en otro repo)
