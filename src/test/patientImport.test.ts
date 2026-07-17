import { describe, expect, it } from "vitest";
import {
  detectCsvDelimiter,
  parseBirthDate,
  parsePatientCsv,
  PATIENT_CSV_TEMPLATE,
} from "@/lib/patientImport";

describe("patientImport", () => {
  it("parseBirthDate aceita BR e ISO", () => {
    expect(parseBirthDate("15/03/1990")).toBe("1990-03-15");
    expect(parseBirthDate("1990-03-15")).toBe("1990-03-15");
    expect(parseBirthDate("invalid")).toBeNull();
  });

  it("detecta delimitador ; do Excel BR", () => {
    expect(
      detectCsvDelimiter(
        "nome;telefone;email;cpf;data_nascimento;endereco;observacoes;alergias",
      ),
    ).toBe(";");
    expect(detectCsvDelimiter("nome,telefone,email")).toBe(",");
  });

  it("parsePatientCsv lê modelo com ; e endereço com vírgula", () => {
    const { rows, errors } = parsePatientCsv(PATIENT_CSV_TEMPLATE);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("maria");
    expect(rows[0].phone).toBe("(85)99998-1111");
    expect(rows[0].cpf).toBe("12312365488");
    expect(rows[0].birth_date).toBe("2023-01-01");
    expect(rows[0].address).toBe("Rua A, 100 - Fortaleza/CE");
    expect(rows[0].allergies).toEqual(["penicilina"]);
    expect(rows[1].name).toBe("joao sousa");
    expect(rows[1].allergies).toEqual(["latex"]);
  });

  it("ainda aceita CSV com vírgula", () => {
    const csv = [
      "nome,telefone,email,cpf,data_nascimento,endereco,observacoes,alergias",
      "Maria Silva,(85) 99999-0001,maria@email.com,12345678900,15/03/1990,Rua A,nota,Penicilina",
      ",,,,",
    ].join("\n");
    const { rows, errors } = parsePatientCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Maria Silva");
    expect(rows[0].birth_date).toBe("1990-03-15");
    expect(rows[0].allergies).toEqual(["Penicilina"]);
    expect(errors.some((e) => e.message.includes("Nome"))).toBe(true);
  });
});
