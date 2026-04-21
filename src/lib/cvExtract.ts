import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

function rtfToText(rtf: string): string {
  let s = rtf;
  // Drop binary picture data
  s = s.replace(/\\pict[\s\S]*?(?=\})/g, "");
  // Convert hex-escaped chars (e.g. \'F5 -> õ) using Windows-1257 fallback to latin1
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  // Convert unicode escapes \uNNNN
  s = s.replace(/\\u(-?\d+)\??/g, (_m, n) => {
    const code = parseInt(n, 10);
    return String.fromCharCode(code < 0 ? code + 65536 : code);
  });
  // Paragraph / line breaks
  s = s.replace(/\\par[d]?\b/g, "\n").replace(/\\line\b/g, "\n").replace(/\\tab\b/g, "\t");
  // Remove control words like \rtf1, \fs24, \cf2 (with optional numeric arg)
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, "");
  // Remove remaining braces and stray backslashes
  s = s.replace(/[{}]/g, "").replace(/\\\*/g, "").replace(/\\/g, "");
  // Collapse whitespace
  s = s.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ");
  return s.trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    return text.trim();
  }

  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value.trim();
  }

  if (name.endsWith(".rtf") || file.type === "application/rtf" || file.type === "text/rtf") {
    const raw = new TextDecoder("latin1").decode(buf);
    return rtfToText(raw);
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return new TextDecoder().decode(buf).trim();
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, RTF, or TXT.");
}
