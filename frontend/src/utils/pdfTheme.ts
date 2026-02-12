import jsPDF from "jspdf";

export const getProfessionalTableTheme = (
  doc: jsPDF,
  title: string,
  companyName: string,
  orientation: "p" | "l" = "l"
) => {
  const pageWidth = orientation === "l" ? 297 : 210;

  return {
    startY: 34,
    margin: { top: 34, left: 10, right: 10, bottom: 14 },
    theme: "grid" as const,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [220, 220, 220] as [number, number, number],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [22, 78, 99] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 8,
      fontStyle: "bold" as const,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    didDrawPage: () => {
      doc.setFillColor(22, 78, 99);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(companyName || "Company", 10, 10);
      doc.setFontSize(11);
      doc.text(title, 10, 18);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 10, 10, { align: "right" });
      doc.setTextColor(0, 0, 0);
    },
  };
};

export const addPdfPageNumbers = (doc: jsPDF, orientation: "p" | "l" = "l") => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = orientation === "l" ? 297 : 210;
  const pageHeight = orientation === "l" ? 210 : 297;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, pageHeight - 6, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
};
