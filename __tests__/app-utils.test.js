function loadUtils(lang) {
  localStorage.clear();
  localStorage.setItem("lang", lang);
  jest.resetModules();
  // app.js is written as a browser IIFE; in test it exposes selected helpers.
  // eslint-disable-next-line global-require
  return require("../static/app.js");
}

describe("static/app.js helpers", () => {
  test("dateKey formats YYYY-MM-DD with zero padding", () => {
    const { dateKey } = loadUtils("en");
    const d = new Date(2026, 2, 5); // March 5 (month is 0-based)
    expect(dateKey(d)).toBe("2026-03-05");
  });

  test("getContrastColor returns readable foreground color", () => {
    const { getContrastColor } = loadUtils("en");
    expect(getContrastColor("#000000")).toBe("#ffffff");
    expect(getContrastColor("#ffffff")).toBe("#111111");
  });

  test("escapeHtml escapes potentially dangerous markup", () => {
    const { escapeHtml } = loadUtils("en");
    const out = escapeHtml('<script>alert("x")</script>');
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&lt;/script&gt;");
    expect(out).not.toContain("<script>");
  });

  test("formatMonthTitle uses locale based on current language", () => {
    const y = 2026;
    const m = 2; // March (0-based)

    const en = loadUtils("en");
    const expectedEn = new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    expect(en.formatMonthTitle(y, m)).toBe(expectedEn);

    const el = loadUtils("el");
    const expectedEl = new Date(y, m, 1).toLocaleDateString("el-GR", { month: "long", year: "numeric" });
    expect(el.formatMonthTitle(y, m)).toBe(expectedEl);
  });

  test("formatDisplayDate uses locale based on current language", () => {
    const iso = "2026-03-20";

    const en = loadUtils("en");
    const expectedEn = new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(en.formatDisplayDate(iso)).toBe(expectedEn);

    const el = loadUtils("el");
    const expectedEl = new Date(iso + "T12:00:00").toLocaleDateString("el-GR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(el.formatDisplayDate(iso)).toBe(expectedEl);
  });

  test("t() falls back to key when translation missing", () => {
    const { t } = loadUtils("en");
    expect(t("themeDark")).toBe("Dark");
    expect(t("does_not_exist_123")).toBe("does_not_exist_123");
  });
});

