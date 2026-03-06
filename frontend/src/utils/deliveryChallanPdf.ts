import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface DeliveryChallanPdfItem {
  description?: string;
  hsn_code?: string;
  model_no?: string;
  model_number?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
}

export interface DeliveryChallanPdfData {
  dc_number?: string;
  dc_date?: string;
  customer_name?: string;
  reference_no?: string;
  invoice_number?: string;
  contact_person?: string;
  contact_phone?: string;
  engineer_name?: string;
  engineer_phone?: string;
  transporter_name?: string;
  vehicle_number?: string;
  eway_bill_number?: string;
  lr_number?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_gstin?: string;
  customer_gstin?: string;
  shipping_name?: string;
  shipping_gstin?: string;
  delivery_to_address?: string;
  delivery_to_city?: string;
  delivery_to_state?: string;
  delivery_to_pincode?: string;
  dispatch_from_address?: string;
  dispatch_from_city?: string;
  dispatch_from_state?: string;
  dispatch_from_pincode?: string;
  notes?: string;
  items?: DeliveryChallanPdfItem[];
}

export interface DeliveryChallanCompanyData {
  name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

type BuildOptions = {
  dc: DeliveryChallanPdfData;
  companyData: DeliveryChallanCompanyData;
  formatDate: (date: string | null | undefined) => string;
  logoDataUrl?: string | null;
  showPrices?: boolean;
};

export const buildDeliveryChallanPdf = ({
  dc,
  companyData,
  formatDate,
  logoDataUrl = null,
  showPrices = false,
}: BuildOptions): jsPDF => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR;

  const v = (value: unknown) => (value === undefined || value === null || value === "" ? "-" : String(value));
  const joinText = (...parts: Array<unknown>) => parts.filter(Boolean).map(String).join(", ");

  const billingAddress = joinText(dc.billing_address, dc.billing_city, dc.billing_state, dc.billing_pincode);
  const shippingAddress = joinText(dc.delivery_to_address, dc.delivery_to_city, dc.delivery_to_state, dc.delivery_to_pincode);
  const dispatchAddress = joinText(
    dc.dispatch_from_address || companyData.address_line1,
    companyData.address_line2,
    dc.dispatch_from_city || companyData.city,
    dc.dispatch_from_state || companyData.state,
    dc.dispatch_from_pincode || companyData.pincode
  );
  const contactInfo = [dc.contact_person, dc.contact_phone].filter(Boolean).join(" / ");
  const engineerInfo = [dc.engineer_name, dc.engineer_phone].filter(Boolean).join(" / ");

  doc.setLineWidth(0.3);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("(ORIGINAL FOR RECIPIENT)", pageW - marginR, 8, { align: "right" });

  let y = 11;

  const headerH = 26;
  doc.rect(marginL, y, contentW, headerH);
  const logoDivX = marginL + 42;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", marginL + 2, y + 3, 36, headerH - 6);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("SAVANTEC", marginL + 3, y + 14);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(v(companyData.name || "Savantec Automation Private Limited"), logoDivX + 3, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const addrStr = joinText(companyData.address_line1, companyData.address_line2, companyData.city, companyData.state, companyData.pincode);
  const wrappedAddr = doc.splitTextToSize(addrStr || "-", contentW - 47);
  doc.text(wrappedAddr.slice(0, 2), logoDivX + 3, y + 12.5);
  doc.text(`Mob.: ${v(companyData.phone)}`, logoDivX + 3, y + 20.5);
  doc.text(`Email: ${v(companyData.email)}`, logoDivX + 3, y + 24.5);
  y += headerH;

  const titleH = 8;
  doc.rect(marginL, y, contentW, titleH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DELIVERY CHALLAN", pageW / 2, y + 5.5, { align: "center" });
  y += titleH;

  const infoH = 8;
  const col1W = contentW / 3;
  const col2W = contentW / 3;
  const col3W = contentW - col1W - col2W;
  const drawInfoCell = (x: number, w: number, label: string, value: string, offset = 2) => {
    doc.rect(x, y, w, infoH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text(label, x + 2, y + 5.2);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", x + offset, y + 5.2, { maxWidth: w - offset - 2 });
  };

  drawInfoCell(marginL, col1W, "Delivery Challan No.", v(dc.dc_number), 38);
  drawInfoCell(marginL + col1W, col2W, "DC Date:", formatDate(dc.dc_date), 20);
  drawInfoCell(marginL + col1W + col2W, col3W, "Contact Person:", contactInfo || "-", 29);
  y += infoH;

  drawInfoCell(marginL, col1W, "Reference No.:", v(dc.reference_no), 24);
  drawInfoCell(marginL + col1W, col2W, "Invoice No.:", v(dc.invoice_number), 22);
  drawInfoCell(marginL + col1W + col2W, col3W, "Engineer:", engineerInfo || "-", 20);
  y += infoH;

  const addrHdrH = 6;
  const thirdW = contentW / 3;
  doc.rect(marginL, y, thirdW, addrHdrH);
  doc.rect(marginL + thirdW, y, thirdW, addrHdrH);
  doc.rect(marginL + thirdW * 2, y, contentW - thirdW * 2, addrHdrH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Customer Name & Billing Address", marginL + 2, y + 4);
  doc.text("Shipping Address", marginL + thirdW + 2, y + 4);
  doc.text("Dispatch From Address", marginL + thirdW * 2 + 2, y + 4);
  y += addrHdrH;

  const addrBodyH = 30;
  doc.rect(marginL, y, thirdW, addrBodyH);
  doc.rect(marginL + thirdW, y, thirdW, addrBodyH);
  doc.rect(marginL + thirdW * 2, y, contentW - thirdW * 2, addrBodyH);

  const drawAddressBlock = (x: number, name: string, address: string, gstin: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(name || "-", x + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const lines = doc.splitTextToSize(address || "-", thirdW - 4);
    lines.slice(0, 4).forEach((line: string, idx: number) => {
      doc.text(line, x + 2, y + 10 + idx * 3.8);
    });
    doc.text(`GST Number: ${gstin || "-"}`, x + 2, y + 26);
  };

  drawAddressBlock(marginL, dc.customer_name || "", billingAddress, dc.billing_gstin || dc.customer_gstin || "");
  drawAddressBlock(marginL + thirdW, dc.shipping_name || dc.customer_name || "", shippingAddress, dc.shipping_gstin || "");
  drawAddressBlock(marginL + thirdW * 2, companyData.name || "Dispatch Location", dispatchAddress, companyData.gstin || "");
  y += addrBodyH;

  doc.rect(marginL, y, col1W, infoH);
  doc.rect(marginL + col1W, y, col2W, infoH);
  doc.rect(marginL + col1W + col2W, y, col3W, infoH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Mode Of Transport:", marginL + 2, y + 5.2);
  doc.text("Vehicle No.:", marginL + col1W + 2, y + 5.2);
  doc.text("E-Way Bill / LR No.:", marginL + col1W + col2W + 2, y + 5.2);
  doc.setFont("helvetica", "normal");
  doc.text(v(dc.transporter_name), marginL + 31, y + 5.2, { maxWidth: col1W - 33 });
  doc.text(v(dc.vehicle_number), marginL + col1W + 21, y + 5.2, { maxWidth: col2W - 23 });
  const ewayOrLr = [dc.eway_bill_number, dc.lr_number].filter(Boolean).join(" / ");
  doc.text(ewayOrLr || "-", marginL + col1W + col2W + 36, y + 5.2, { maxWidth: col3W - 38 });
  y += infoH;

  const items = Array.isArray(dc.items) ? dc.items : [];
  const head = showPrices
    ? [["SL#", "Description of Goods", "Model No", "HSN", "Qty", "UOM", "Rate", "Amount"]]
    : [["SL#", "Description of Goods", "Model No", "HSN", "Qty", "UOM"]];

  const tableRows = items.map((item, idx) => {
    const row = [
      String(idx + 1),
      v(item.description),
      v(item.model_no || item.model_number || ""),
      v(item.hsn_code),
      item.quantity !== undefined && item.quantity !== null ? Number(item.quantity).toFixed(2) : "",
      v(item.unit),
    ];
    if (showPrices) {
      row.push(
        Number(item.unit_price || 0).toFixed(2),
        Number(item.total_amount || 0).toFixed(2)
      );
    }
    return row;
  });

  while (tableRows.length < 10) {
    tableRows.push(showPrices ? ["", "", "", "", "", "", "", ""] : ["", "", "", "", "", ""]);
  }

  autoTable(doc, {
    startY: y,
    head,
    body: tableRows,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0],
      valign: "middle",
      minCellHeight: 7,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: "center",
    },
    columnStyles: showPrices
      ? {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 66, halign: "left" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 16, halign: "right" },
          5: { cellWidth: 14, halign: "center" },
          6: { cellWidth: 20, halign: "right" },
          7: { cellWidth: 24, halign: "right" },
        }
      : {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 82, halign: "left" },
          2: { cellWidth: 26, halign: "center" },
          3: { cellWidth: 26, halign: "center" },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 22, halign: "center" },
        },
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.styles.lineWidth = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3 };
      }
      if (data.section === "body") {
        const isFirstBodyRow = data.row.index === 0;
        data.cell.styles.lineWidth = { top: isFirstBodyRow ? 0.3 : 0, right: 0.3, bottom: 0, left: 0.3 };
      }
    },
    margin: { left: marginL, right: marginR },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y;

  const totalH = 8;
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  if (showPrices) {
    const totalLabelW = contentW - 16 - 14 - 20 - 24;
    const totalQtyW = 16;
    const totalUomW = 14;
    const totalRateW = 20;
    const totalAmountW = 24;
    const dominantUom = items.find((item) => item.unit)?.unit || "";
    const grandTotal = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);

    doc.rect(marginL, y, totalLabelW, totalH);
    doc.rect(marginL + totalLabelW, y, totalQtyW, totalH);
    doc.rect(marginL + totalLabelW + totalQtyW, y, totalUomW, totalH);
    doc.rect(marginL + totalLabelW + totalQtyW + totalUomW, y, totalRateW, totalH);
    doc.rect(marginL + totalLabelW + totalQtyW + totalUomW + totalRateW, y, totalAmountW, totalH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total", marginL + totalLabelW / 2, y + 5.2, { align: "center" });
    doc.text(totalQty.toFixed(2), marginL + totalLabelW + totalQtyW - 2, y + 5.2, { align: "right" });
    doc.text(v(dominantUom), marginL + totalLabelW + totalQtyW + totalUomW / 2, y + 5.2, { align: "center" });
    doc.text("-", marginL + totalLabelW + totalQtyW + totalUomW + totalRateW / 2, y + 5.2, { align: "center" });
    doc.text(grandTotal.toFixed(2), marginL + totalLabelW + totalQtyW + totalUomW + totalRateW + totalAmountW - 2, y + 5.2, { align: "right" });
  } else {
    const totalLabelW = contentW - 22 - 22;
    const totalQtyW = 22;
    const totalUomW = 22;
    const dominantUom = items.find((item) => item.unit)?.unit || "";

    doc.rect(marginL, y, totalLabelW, totalH);
    doc.rect(marginL + totalLabelW, y, totalQtyW, totalH);
    doc.rect(marginL + totalLabelW + totalQtyW, y, totalUomW, totalH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total", marginL + totalLabelW / 2, y + 5.2, { align: "center" });
    doc.text(totalQty.toFixed(2), marginL + totalLabelW + totalQtyW - 2, y + 5.2, { align: "right" });
    doc.text(v(dominantUom), marginL + totalLabelW + totalQtyW + totalUomW / 2, y + 5.2, { align: "center" });
  }
  y += totalH;

  const remarksH = 12;
  doc.rect(marginL, y, contentW, remarksH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Remarks:", marginL + 2, y + 4.8);
  doc.setFont("helvetica", "normal");
  const remarksText = v(dc.notes)
    .replace(/\s*\n+\s*/g, " | ")
    .replace(/(\d)\s+(?=\d)/g, "$1")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const remarkLines = doc.splitTextToSize(remarksText, contentW - 25).slice(0, 2);
  remarkLines.forEach((line: string, idx: number) => {
    doc.text(line, marginL + 22, y + 4.8 + idx * 4);
  });
  y += remarksH;

  const bottomH = 28;
  const bCol1 = contentW * 0.46;
  const bCol2 = contentW * 0.27;
  const bCol3 = contentW - bCol1 - bCol2;
  doc.rect(marginL, y, bCol1, bottomH);
  doc.rect(marginL + bCol1, y, bCol2, bottomH);
  doc.rect(marginL + bCol1 + bCol2, y, bCol3, bottomH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Terms & Conditions:", marginL + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text("1. Materials to be checked at delivery and acknowledged.", marginL + 2, y + 10);
  doc.text("2. Company is not responsible for delay due to transporter.", marginL + 2, y + 14);
  doc.text("3. Subject to Chennai jurisdiction.", marginL + 2, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Receiver's Signature", marginL + bCol1 + bCol2 / 2, y + bottomH - 3, { align: "center" });
  doc.text(`for ${v(companyData.name)}`, marginL + bCol1 + bCol2 + bCol3 - 2, y + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Authorised Signatory", marginL + bCol1 + bCol2 + bCol3 - 2, y + bottomH - 3, { align: "right" });

  return doc;
};
