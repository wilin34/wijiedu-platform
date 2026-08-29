import { describe, expect, it } from "vitest";
import { safeGradeFileName } from "./exportGradesPdf";

describe("exportGradesPdf", () => {
  it("crea nombres de archivo seguros y legibles", () => {
    expect(safeGradeFileName("Ana Pérez / Notas 2026")).toBe("ana-perez-notas-2026");
  });
});
