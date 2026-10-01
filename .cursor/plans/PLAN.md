# Plan: Spinner en botones del modal + aviso refresh

## Hecho
- Sin overlay centrado
- Al `loading`: barra de acciones visible, Cancelar/Aceptar disabled, Confirm con spinner + “Procesando…”
- Alert warning: no actualizar/cerrar navegador
- `beforeunload` nativo del navegador sigue activo durante la petición
- Contenido atenuado y no interactivo

## Fuera de alcance
- Spinner global de página
