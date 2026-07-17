/** Parse e validação de CSV para importação de pacientes. */

export const PATIENT_IMPORT_HEADERS = [
  "nome",
  "telefone",
  "email",
  "cpf",
  "data_nascimento",
  "endereco",
  "observacoes",
  "alergias",
] as const;

export interface PatientImportRow {
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  clinical_notes: string | null;
  allergies: string[];
  status: "active";
  line: number;
}

export interface PatientImportError {
  line: number;
  message: string;
}

type CsvDelimiter = "," | ";";

function countUnquoted(line: string, separator: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === separator && !inQuotes) count++;
  }
  return count;
}

/** Excel BR usa `;`; CSV genérico usa `,`. */
export function detectCsvDelimiter(headerLine: string): CsvDelimiter {
  const semis = countUnquoted(headerLine, ";");
  const commas = countUnquoted(headerLine, ",");
  return semis >= commas && semis > 0 ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aceita YYYY-MM-DD ou DD/MM/YYYY */
export function parseBirthDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const day = br[1].padStart(2, "0");
    const month = br[2].padStart(2, "0");
    return `${br[3]}-${month}-${day}`;
  }
  return null;
}

/** Várias alergias: vírgula ou | (evita conflito com `;` do Excel BR). */
function parseAllergies(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePatientCsv(content: string): {
  rows: PatientImportRow[];
  errors: PatientImportError[];
} {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ line: 1, message: "Arquivo vazio ou sem dados. Use o modelo CSV." }],
    };
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const requiredIdx = headers.indexOf("nome");
  if (requiredIdx < 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'Cabeçalho obrigatório ausente: "nome"' }],
    };
  }

  const indexOf = (key: string) => headers.indexOf(key);
  const rows: PatientImportRow[] = [];
  const errors: PatientImportError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells = splitCsvLine(lines[i], delimiter);
    const get = (key: string) => {
      const idx = indexOf(key);
      if (idx < 0) return "";
      return (cells[idx] ?? "").trim();
    };

    const name = get("nome");
    if (!name) {
      errors.push({ line: lineNo, message: "Nome é obrigatório" });
      continue;
    }
    if (name.length < 2 || name.length > 160) {
      errors.push({ line: lineNo, message: "Nome inválido (2 a 160 caracteres)" });
      continue;
    }

    const birthRaw = get("data_nascimento") || get("nascimento");
    let birth_date: string | null = null;
    if (birthRaw) {
      birth_date = parseBirthDate(birthRaw);
      if (!birth_date) {
        errors.push({
          line: lineNo,
          message: "Data de nascimento inválida (use DD/MM/AAAA ou AAAA-MM-DD)",
        });
        continue;
      }
    }

    const cpfRaw = get("cpf");
    const cpfDigits = cpfRaw ? digitsOnly(cpfRaw) : "";
    if (cpfRaw && cpfDigits.length !== 11) {
      errors.push({ line: lineNo, message: "CPF deve ter 11 dígitos" });
      continue;
    }

    const email = get("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ line: lineNo, message: "E-mail inválido" });
      continue;
    }

    rows.push({
      name,
      phone: get("telefone") || get("phone") || null,
      email: email || null,
      cpf: cpfDigits || null,
      birth_date,
      address: get("endereco") || get("address") || null,
      clinical_notes: get("observacoes") || get("notas") || null,
      allergies: parseAllergies(get("alergias")),
      status: "active",
      line: lineNo,
    });
  }

  return { rows, errors };
}

/** Modelo Excel BR: colunas separadas por `;` (abre certo no Excel). */
export const PATIENT_CSV_TEMPLATE = [
  PATIENT_IMPORT_HEADERS.join(";"),
  "maria;(85)99998-1111;maria@email.com;123.123.654-88;01/01/2023;Rua A, 100 - Fortaleza/CE;Paciente migrada;penicilina",
  "joao sousa;;;;;;;latex",
].join("\r\n");
