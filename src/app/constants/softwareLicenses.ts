export const LICENSE_TYPE_OPTIONS = [
  { value: "windows", label: "Windows" },
  { value: "antivirus", label: "Antivirus" },
  { value: "office", label: "Paquetería Office" },
] as const;

export const LICENSE_SELECT_OPTIONS = {
  coverageUnit: [
    { value: "Dispositivos", label: "Dispositivos" },
    { value: "Usuarios", label: "Usuarios" },
  ],
  modality: [
    { value: "OEM", label: "OEM" },
    { value: "Retail", label: "Retail" },
    { value: "ESD", label: "ESD (entrega digital)" },
    { value: "Volumen", label: "Licenciamiento por volumen" },
  ],
  duration: [
    { value: "Permanente", label: "Permanente" },
    { value: "1 mes", label: "1 mes" },
    { value: "1 año", label: "1 año" },
    { value: "2 años", label: "2 años" },
    { value: "3 años", label: "3 años" },
  ],
  language: [
    { value: "Español", label: "Español" },
    { value: "Inglés", label: "Inglés" },
    { value: "Multilenguaje", label: "Multilenguaje" },
  ],
  architecture: [
    { value: "32 bits", label: "32 bits" },
    { value: "64 bits", label: "64 bits" },
    { value: "32/64 bits", label: "32 y 64 bits" },
    { value: "No aplica", label: "No aplica" },
  ],
} as const;

export type LicenseSelectField = keyof typeof LICENSE_SELECT_OPTIONS;
