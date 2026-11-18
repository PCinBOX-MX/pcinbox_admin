# Plan: orden alfabético Categorías y Marcas

## Objetivo
Que los Select de Categoría y Marca listen opciones en orden alfabético (A→Z).

## Archivos
- `src/app/hooks/global.hook.tsx` (ordenar al cargar catálogo)
- FormProduct / RegisterProduct (mantener sort en el Select)

## Pasos
1. Ordenar `dataCategoria` y `dataMarca` al setearlos desde la API.
2. Confirmar Select de alta/edición usan lista ordenada.

## Fuera de alcance
- Otros selects (tipo PC, proveedores, etc.).
