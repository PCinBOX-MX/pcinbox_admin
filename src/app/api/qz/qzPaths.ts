import path from "path";

/**
 * Rutas QZ: por defecto carpeta fija del proyecto `qz-certs/`.
 * Override opcional con QZ_CERT_PATH / QZ_PRIVATE_KEY_PATH.
 */
export function resolveQzCertPath(): string {
  const fromEnv = process.env.QZ_CERT_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "qz-certs", "digital-certificate.txt");
}

export function resolveQzPrivateKeyPath(): string {
  const fromEnv = process.env.QZ_PRIVATE_KEY_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "qz-certs", "private-key.pem");
}
