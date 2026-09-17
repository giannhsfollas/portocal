"use strict";

/**
 * Thermal print layout for delivery-note documents (Refactor / Sunmi).
 *
 * Affected types (GitHub #2):
 * - Δελτίο Αποστολής (delivery note)
 * - Αντίστροφο Δελτίο Αποστολής (reverse delivery note)
 * - Συγκεντρωτικό (consolidated)
 *
 * Main (iMin) prints the series/number line ABOVE customer details.
 * Refactor previously printed it BELOW customer details.
 */

var DELIVERY_NOTE_TYPES = {
  DELIVERY_NOTE: "DELIVERY_NOTE",
  REVERSE_DELIVERY_NOTE: "REVERSE_DELIVERY_NOTE",
  CONSOLIDATED: "CONSOLIDATED",
};

var TYPE_LABELS = {};
TYPE_LABELS[DELIVERY_NOTE_TYPES.DELIVERY_NOTE] = "ΔΕΛΤΙΟ ΑΠΟΣΤΟΛΗΣ";
TYPE_LABELS[DELIVERY_NOTE_TYPES.REVERSE_DELIVERY_NOTE] = "ΑΝΤΙΣΤΡΟΦΟ ΔΕΛΤΙΟ ΑΠΟΣΤΟΛΗΣ";
TYPE_LABELS[DELIVERY_NOTE_TYPES.CONSOLIDATED] = "ΣΥΓΚΕΝΤΡΩΤΙΚΟ";

function isDeliveryNoteType(type) {
  return Object.prototype.hasOwnProperty.call(TYPE_LABELS, type);
}

function formatSeriesNumber(doc) {
  var label = (doc && (TYPE_LABELS[doc.type] || doc.typeLabel)) || "";
  var series = (doc && doc.series) || label;
  var number = doc && doc.number != null ? String(doc.number) : "";
  if (series && number) return series + "-" + number;
  return series || number;
}

function customerDetailLines(customer) {
  var c = customer || {};
  var lines = [];
  if (c.name) lines.push("Επωνυμία: " + c.name);
  if (c.vat) lines.push("ΑΦΜ: " + c.vat);
  if (c.city) lines.push("Πόλη: " + c.city);
  if (c.address) lines.push("Διεύθυνση: " + c.address);
  if (c.streetNumber) lines.push("Αριθμός: " + c.streetNumber);
  if (c.postalCode) lines.push("ΤΚ: " + c.postalCode);
  return lines;
}

/**
 * Ordered print blocks for a document.
 * For delivery-note types, series/number is placed immediately above
 * customer details to match Main (iMin) behavior.
 */
function buildPrintBlocks(doc) {
  doc = doc || {};
  var blocks = [];

  if (doc.issuer) {
    blocks.push({ id: "issuer", lines: [].concat(doc.issuer.lines || doc.issuer.name || []) });
  }

  var seriesNumberBlock = {
    id: "seriesNumber",
    lines: [formatSeriesNumber(doc)],
  };
  var customerBlock = {
    id: "customerDetails",
    lines: customerDetailLines(doc.customer),
  };

  if (isDeliveryNoteType(doc.type)) {
    // Main order: series/number, then customer details.
    blocks.push(seriesNumberBlock);
    blocks.push(customerBlock);
  } else {
    blocks.push(seriesNumberBlock);
    if (doc.customer) blocks.push(customerBlock);
  }

  if (doc.transport) {
    blocks.push({ id: "transport", lines: [].concat(doc.transport.lines || []) });
  }
  if (doc.items && doc.items.length) {
    blocks.push({
      id: "items",
      lines: doc.items.map(function (item) {
        return item.line || item.name || String(item);
      }),
    });
  }

  return blocks;
}

function renderPrintText(doc) {
  return buildPrintBlocks(doc)
    .map(function (block) {
      return block.lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");
}

function printBlockOrder(doc) {
  return buildPrintBlocks(doc).map(function (block) {
    return block.id;
  });
}

module.exports = {
  DELIVERY_NOTE_TYPES: DELIVERY_NOTE_TYPES,
  TYPE_LABELS: TYPE_LABELS,
  isDeliveryNoteType: isDeliveryNoteType,
  formatSeriesNumber: formatSeriesNumber,
  customerDetailLines: customerDetailLines,
  buildPrintBlocks: buildPrintBlocks,
  renderPrintText: renderPrintText,
  printBlockOrder: printBlockOrder,
};
