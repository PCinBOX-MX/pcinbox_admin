declare module "qz-tray" {
  const qz: {
    websocket: {
      isActive: () => boolean;
      connect: (opts?: { retries?: number; delay?: number }) => Promise<void>;
      disconnect: () => Promise<void>;
    };
    printers: {
      find: (query?: string) => Promise<string | string[]>;
      getDefault?: () => Promise<string>;
    };
    configs: {
      create: (printer: string, opts?: Record<string, unknown>) => unknown;
    };
    print: (config: unknown, data: unknown[]) => Promise<void>;
    security?: {
      setCertificatePromise: (
        fn: (
          resolve: (v: string) => void,
          reject: (e: unknown) => void,
        ) => void,
      ) => void;
      setSignatureAlgorithm?: (alg: string) => void;
      setSignaturePromise: (
        fn: (
          toSign: string,
        ) => (
          resolve: (v: string) => void,
          reject: (e: unknown) => void,
        ) => void,
      ) => void;
    };
  };
  export default qz;
}
