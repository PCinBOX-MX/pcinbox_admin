# Certificados QZ Tray (local)

Copia aquí los dos archivos generados por QZ Tray (Site Manager → Create New):

- `digital-certificate.txt`
- `private-key.pem`

No hace falta poner rutas absolutas en `.env.local`. El admin las busca solo en esta carpeta.

```
pcinbox_admin/qz-certs/digital-certificate.txt
pcinbox_admin/qz-certs/private-key.pem
```

Opcional: si quieres otra ubicación, define `QZ_CERT_PATH` y `QZ_PRIVATE_KEY_PATH` en `.env.local`.

**Importante:** estos archivos no se suben a git. En cada PC de desarrollo (o en el servidor donde corre el admin) hay que copiarlos una vez.

Las PCs de mostrador solo necesitan QZ Tray instalado; el certificado/llave viven donde corre Next (esta carpeta o el servidor).
