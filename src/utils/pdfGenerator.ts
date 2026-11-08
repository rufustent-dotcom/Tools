import { jsPDF } from "jspdf";
import { Session } from "../types";

export function generateAppletPDF(session: Session) {
  if (!session.generatedApplet) {
    throw new Error("No generated applet to export.");
  }

  const applet = session.generatedApplet;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2); // 180mm
  
  let currentY = 15;
  let pageNumber = 1;

  // Helper inside to draw page header & footer borders
  const drawPageDecorations = (pageNum: number) => {
    // Header line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, 10, pageWidth - margin, 10);
    
    // Header title
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("STUDIO APPLET PROTOTYPER • PDF SPECIFICATION BUNDLE", margin, 7);

    // Footer line
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
    // Footer details
    const dateStr = new Date().toLocaleString();
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated: ${dateStr}`, margin, pageHeight - 8);
    doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 8);
  };

  const checkPageOverflow = (heightNeeded: number) => {
    // Leave some margin at top and bottom
    if (currentY + heightNeeded > pageHeight - 18) {
      doc.addPage();
      pageNumber++;
      currentY = 20; // reset y to top of new page
      drawPageDecorations(pageNumber);
      return true;
    }
    return false;
  };

  // --- START PDF PAGE 1 ---
  drawPageDecorations(pageNumber);

  // Big Header Bar
  doc.setFillColor(15, 23, 42); // slate-900 / blackish accent
  doc.rect(margin, currentY, contentWidth, 18, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("APPLET ARCHITECTURE & SCHEMA SPECIFICATION", margin + 6, currentY + 11);
  currentY += 26;

  // Applet Overview Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(applet.name, margin, currentY);
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  const splitDesc = doc.splitTextToSize(applet.description, contentWidth);
  doc.text(splitDesc, margin, currentY);
  currentY += (splitDesc.length * 4.5) + 6;

  // Prompt configuration metadata banner
  checkPageOverflow(30);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  
  // Custom height box for user prompt details
  const promptLines = doc.splitTextToSize(`"${session.prompt}"`, contentWidth - 10);
  const promptBoxHeight = (promptLines.length * 4.5) + 16;
  doc.rect(margin, currentY, contentWidth, promptBoxHeight, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("ORIGINAL COMPILER GENERATION PROMPT", margin + 5, currentY + 6);
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(promptLines, margin + 5, currentY + 12);
  currentY += promptBoxHeight + 8;

  // Hyperparameters
  checkPageOverflow(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("PROTOTYPE ENGINE SETTINGS", margin, currentY);
  currentY += 5;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  const modelSettings = [
    { label: "Sampling Temperature:", val: session.temperature.toFixed(2) },
    { label: "Top-P Parameter Limit:", val: session.topP.toFixed(2) },
    { label: "System Instruction Directives:", val: session.systemInstruction || "None set" }
  ];

  modelSettings.forEach(s => {
    checkPageOverflow(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, margin, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    
    if (s.label.includes("Instruction")) {
      const splitInst = doc.splitTextToSize(s.val, contentWidth - 55);
      doc.text(splitInst, margin + 55, currentY);
      currentY += (splitInst.length * 4.2) + 2;
    } else {
      doc.text(s.val, margin + 55, currentY);
      currentY += 5.5;
    }
  });
  currentY += 4;

  // Applet Schema Core Design Components
  checkPageOverflow(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("APPLET SCHEMA DESCRIPTOR & COMPONENTS MAP", margin, currentY);
  currentY += 5;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Cycle components
  applet.components.forEach((comp, idx) => {
    // Box height prediction
    let blockHeight = 22;
    if (comp.data && comp.data.length > 0) {
      blockHeight += (comp.data.length * 5) + 4;
    }
    checkPageOverflow(blockHeight);

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, contentWidth, blockHeight, "FD");

    // Component Name / Index Badge
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 4, currentY + 4, 25, 5, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`COMP #${String(idx + 1).padStart(2, '0')}`, margin + 6, currentY + 7.5);

    // Component Title / Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(comp.label, margin + 33, currentY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID:`, margin + 33, currentY + 13);
    doc.setFont("courier", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(comp.id, margin + 38, currentY + 13);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Type:`, margin + 75, currentY + 13);
    doc.setFont("courier", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(comp.type.toUpperCase(), margin + 84, currentY + 13);

    if (comp.value) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Value:`, margin + 115, currentY + 13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const splitVal = doc.splitTextToSize(String(comp.value), contentWidth - 120);
      doc.text(splitVal, margin + 125, currentY + 13);
    }

    if (comp.data && comp.data.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("SUB-DATA SET / RECORDS SEQUENCE:", margin + 33, currentY + 19);

      let innerY = currentY + 23;
      comp.data.forEach((valObj) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`• ${valObj.key}:`, margin + 36, innerY);
        doc.setFont("courier", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(String(valObj.val), margin + 120, innerY);
        innerY += 4.5;
      });
    }

    currentY += blockHeight + 6;
  });

  // Code Blueprint Section
  checkPageOverflow(30);
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("SOLID REACT SOURCE BLUEPRINT CODE", margin, currentY);
  currentY += 5;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Let's print out the code snippet line by line with auto wrap if long
  const rawCode = applet.codeSnippet || "";
  const codeLines = rawCode.split("\n");

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  codeLines.forEach((line) => {
    const subLines = doc.splitTextToSize(line, contentWidth - 10);
    subLines.forEach((subLine: string) => {
      checkPageOverflow(4.5);
      doc.text(subLine, margin + 5, currentY);
      currentY += 4.2;
    });
  });

  // Save the PDF
  const sanitizedTitle = applet.name ? applet.name.replace(/[^a-zA-Z0-9]/g, "_") : "Applet_Blueprint";
  doc.save(`${sanitizedTitle}_Specification_Matrix.pdf`);
}
