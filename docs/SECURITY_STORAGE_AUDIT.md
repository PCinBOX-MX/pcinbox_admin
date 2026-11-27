# Auditoría localStorage — pcinbox_admin

## Sensitive
- `token` — Bearer (dual cookie httpOnly en server)
- `email` — display
- `adminRole` — **solo UI**; verdad = `GET /user/session` + middlewares DB

## Keep / UX
- Sidebar, scroll memory, PWA dismiss, POS draft, branch, QZ settings

## Controles
- `usePermissions` hidrata desde `/user/session` y corrige `adminRole`
- Mutaciones admin/POS: `MiddleAdminRoute` / `MiddlePosRoute` (role en DB)
- Logout: `POST /user/logout` limpia cookie + storage local
