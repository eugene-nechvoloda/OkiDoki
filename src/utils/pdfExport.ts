import jsPDF from "jspdf";

// Convert markdown to clean text for PDF
function markdownToText(markdown: string): string {
  return markdown
    // Remove headers markers but keep text
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code backticks
    .replace(/`(.+?)`/g, "$1")
    // Remove links but keep text
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    // Remove images
    .replace(/!\[.*?\]\(.+?\)/g, "")
    // Remove blockquotes marker
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, "---")
    // Clean up list markers
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (match) => match);
}

// Parse markdown into structured sections for better PDF layout
interface Section {
  type: "h1" | "h2" | "h3" | "h4" | "paragraph" | "list" | "code";
  content: string;
  level?: number;
}

function parseMarkdown(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentParagraph = "";
  let inCodeBlock = false;
  let codeContent = "";

  for (const line of lines) {
    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        sections.push({ type: "code", content: codeContent.trim() });
        codeContent = "";
        inCodeBlock = false;
      } else {
        if (currentParagraph.trim()) {
          sections.push({ type: "paragraph", content: currentParagraph.trim() });
          currentParagraph = "";
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Headers
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);
    const h4Match = line.match(/^####\s+(.+)$/);

    if (h1Match) {
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      sections.push({ type: "h1", content: h1Match[1] });
    } else if (h2Match) {
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      sections.push({ type: "h2", content: h2Match[1] });
    } else if (h3Match) {
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      sections.push({ type: "h3", content: h3Match[1] });
    } else if (h4Match) {
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      sections.push({ type: "h4", content: h4Match[1] });
    } else if (line.match(/^\s*[-*+]\s+/) || line.match(/^\s*\d+\.\s+/)) {
      // List items
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
      const listContent = line.replace(/^\s*[-*+]\s+/, "• ").replace(/^\s*\d+\.\s+/, (m) => m);
      sections.push({ type: "list", content: listContent });
    } else if (line.trim() === "") {
      if (currentParagraph.trim()) {
        sections.push({ type: "paragraph", content: currentParagraph.trim() });
        currentParagraph = "";
      }
    } else {
      currentParagraph += (currentParagraph ? " " : "") + line;
    }
  }

  if (currentParagraph.trim()) {
    sections.push({ type: "paragraph", content: currentParagraph.trim() });
  }

  return sections;
}

export async function exportToPDF(markdown: string, title: string): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const sections = parseMarkdown(markdown);

  // Helper to add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Add title
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  const titleLines = pdf.splitTextToSize(title, contentWidth);
  checkNewPage(titleLines.length * 10);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 5;

  // Add separator line
  pdf.setDrawColor(200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Process sections
  for (const section of sections) {
    let fontSize: number;
    let fontStyle: "normal" | "bold" = "normal";
    let lineHeight: number;
    let spaceBefore: number;
    let spaceAfter: number;

    switch (section.type) {
      case "h1":
        fontSize = 18;
        fontStyle = "bold";
        lineHeight = 8;
        spaceBefore = 8;
        spaceAfter = 4;
        break;
      case "h2":
        fontSize = 16;
        fontStyle = "bold";
        lineHeight = 7;
        spaceBefore = 6;
        spaceAfter = 3;
        break;
      case "h3":
        fontSize = 14;
        fontStyle = "bold";
        lineHeight = 6;
        spaceBefore = 5;
        spaceAfter = 2;
        break;
      case "h4":
        fontSize = 12;
        fontStyle = "bold";
        lineHeight = 5;
        spaceBefore = 4;
        spaceAfter = 2;
        break;
      case "list":
        fontSize = 11;
        lineHeight = 5;
        spaceBefore = 1;
        spaceAfter = 1;
        break;
      case "code":
        fontSize = 9;
        lineHeight = 4;
        spaceBefore = 3;
        spaceAfter = 3;
        break;
      default:
        fontSize = 11;
        lineHeight = 5;
        spaceBefore = 2;
        spaceAfter = 3;
    }

    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", fontStyle);

    // Clean content for PDF (remove markdown formatting)
    let content = section.content
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    const textLines = pdf.splitTextToSize(content, section.type === "list" ? contentWidth - 5 : contentWidth);
    const neededHeight = spaceBefore + textLines.length * lineHeight + spaceAfter;

    checkNewPage(neededHeight);
    yPosition += spaceBefore;

    if (section.type === "code") {
      // Draw code background
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPosition - 2, contentWidth, textLines.length * lineHeight + 4, "F");
      pdf.setFont("courier", "normal");
    }

    const xOffset = section.type === "list" ? margin + 5 : margin;
    pdf.text(textLines, xOffset, yPosition);
    yPosition += textLines.length * lineHeight + spaceAfter;

    if (section.type === "code") {
      pdf.setFont("helvetica", "normal");
    }
  }

  // Save the PDF
  pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
