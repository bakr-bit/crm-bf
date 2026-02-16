export interface License {
  code: string;
  name: string;
}

export const LICENSES: License[] = [
  { code: "MGA", name: "Malta Gaming Authority" },
  { code: "UKGC", name: "UK Gambling Commission" },
  { code: "GIB", name: "Gibraltar Regulatory Authority" },
  { code: "CUR", name: "Curacao eGaming" },
  { code: "ANJ", name: "France (ANJ)" },
  { code: "KAN", name: "Kahnawake Gaming Commission" },
  { code: "IOM", name: "Isle of Man GSC" },
  { code: "ALG", name: "Alderney Gambling Control" },
  { code: "SWE", name: "Swedish Gambling Authority" },
  { code: "DEN", name: "Danish Gambling Authority" },
  { code: "EST", name: "Estonian Tax & Customs Board" },
  { code: "ITA", name: "Italy (ADM)" },
  { code: "ESP", name: "Spain (DGOJ)" },
  { code: "POR", name: "Portugal (SRIJ)" },
  { code: "GRE", name: "Greece (HGC)" },
  { code: "ROM", name: "Romania (ONJN)" },
  { code: "CRO", name: "Croatia (MF)" },
  { code: "CZE", name: "Czech Republic (MF)" },
  { code: "LTU", name: "Lithuania (GCC)" },
  { code: "LVA", name: "Latvia (IAUI)" },
  { code: "PHI", name: "Philippines (PAGCOR)" },
  { code: "BRA", name: "Brazil (SPA/MF)" },
];

export const LICENSE_MAP: Record<string, string> = Object.fromEntries(
  LICENSES.map((l) => [l.code, l.name])
);
