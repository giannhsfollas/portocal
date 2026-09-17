const {
  DELIVERY_NOTE_TYPES,
  TYPE_LABELS,
  formatSeriesNumber,
  buildPrintBlocks,
  printBlockOrder,
  renderPrintText,
} = require("../static/print-layout");

function sampleDoc(type, overrides) {
  return Object.assign(
    {
      type: type,
      number: "83248923898",
      customer: {
        name: "ΠΑΠΑΔΟΠΟΥΛΟΣ ΑΕ",
        vat: "123456789",
        city: "Αθήνα",
        address: "Σταδίου",
        streetNumber: "10",
        postalCode: "10564",
      },
    },
    overrides || {}
  );
}

const AFFECTED_TYPES = [
  DELIVERY_NOTE_TYPES.DELIVERY_NOTE,
  DELIVERY_NOTE_TYPES.REVERSE_DELIVERY_NOTE,
  DELIVERY_NOTE_TYPES.CONSOLIDATED,
];

describe("delivery-note print layout (series/number vs customer details)", () => {
  test.each(AFFECTED_TYPES)(
    "%s prints series/number above customer details",
    (type) => {
      const order = printBlockOrder(sampleDoc(type));
      const seriesIdx = order.indexOf("seriesNumber");
      const customerIdx = order.indexOf("customerDetails");

      expect(seriesIdx).toBeGreaterThanOrEqual(0);
      expect(customerIdx).toBeGreaterThanOrEqual(0);
      expect(seriesIdx).toBeLessThan(customerIdx);
    }
  );

  test.each(AFFECTED_TYPES)(
    "%s series/number line appears before customer text in rendered print",
    (type) => {
      const text = renderPrintText(sampleDoc(type));
      const seriesPos = text.indexOf(TYPE_LABELS[type] + "-83248923898");
      const customerPos = text.indexOf("Επωνυμία: ΠΑΠΑΔΟΠΟΥΛΟΣ ΑΕ");

      expect(seriesPos).toBeGreaterThanOrEqual(0);
      expect(customerPos).toBeGreaterThanOrEqual(0);
      expect(seriesPos).toBeLessThan(customerPos);
    }
  );

  test("Δελτίο Αποστολής series line matches Main format", () => {
    const doc = sampleDoc(DELIVERY_NOTE_TYPES.DELIVERY_NOTE);
    expect(formatSeriesNumber(doc)).toBe("ΔΕΛΤΙΟ ΑΠΟΣΤΟΛΗΣ-83248923898");
  });

  test("customer details remain present below the series/number block", () => {
    const blocks = buildPrintBlocks(sampleDoc(DELIVERY_NOTE_TYPES.DELIVERY_NOTE));
    const customer = blocks.find((b) => b.id === "customerDetails");
    expect(customer.lines).toEqual(
      expect.arrayContaining([
        "Επωνυμία: ΠΑΠΑΔΟΠΟΥΛΟΣ ΑΕ",
        "ΑΦΜ: 123456789",
        "Πόλη: Αθήνα",
        "Διεύθυνση: Σταδίου",
        "Αριθμός: 10",
        "ΤΚ: 10564",
      ])
    );
  });
});
