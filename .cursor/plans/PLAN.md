# Plan: PWA de PCInbox Admin

## Objetivo
Que el personal pueda instalar PCInbox Admin y abrirlo como acceso directo desde el celular o la computadora.

## Archivos
- `src/app/manifest.ts` — nombre, icono, pantalla completa y página de inicio (`/dashboard`)
- `public/sw.js` — service worker mínimo, sin guardar páginas ni datos
- `public/icons/` — iconos 192, 512 y Apple, distintos al de la tienda
- `src/app/components/pwa/` — aviso con botón Instalar y guía si el navegador no lo ofrece solo
- `src/app/wrapper.tsx` — mostrar el aviso en login y dentro del panel
- `src/app/layout.tsx` — color de tema y acceso directo en iPhone
- `next.config.ts` — el service worker no se queda cacheado

## Pasos
1. Publicar el manifest y los iconos.
2. Registrar un service worker que no intercepte ni guarde peticiones.
3. Mostrar el aviso de instalación y ocultarlo si ya está instalado o si lo cierran.
4. Revisar en el navegador que el manifest, el service worker y el aviso aparezcan en el login.

## Fuera de alcance
- Notificaciones push
- Uso sin internet
- Guardar catálogo, ventas, sesión o pagos en el dispositivo
- Cambios en la tienda (`pcinbox-client`)
