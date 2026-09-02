import { parse } from "csv-parse/sync";
import * as xlsx from "xlsx";
import { processDocumentOCR } from "../../utils/ocr.js";
import { BadRequestError } from "../../utils/errors.js";

export type ParsedBOMPayload =
  | { type: "structured"; data: any[] }
  | { type: "unstructured"; markdown: string };

export const parseUploadedBOMFile = async (file: Express.Multer.File): Promise<ParsedBOMPayload> => {
  const ext = file.originalname.split(".").pop()?.toLowerCase() || "";

  if (ext === "json") {
    try {
      const parsed = JSON.parse(file.buffer.toString("utf-8"));
      const items = Array.isArray(parsed) ? parsed : parsed.items || [parsed];
      return { type: "structured", data: items };
    } catch {
      throw new BadRequestError("Invalid JSON file format");
    }
  }

  if (ext === "csv" || ext === "txt") {
    const rawText = file.buffer.toString("utf-8");
    const firstLine = rawText.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    try {
      const records = parse(rawText, {
        delimiter,
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      if (Array.isArray(records) && records.length > 0) {
        return { type: "structured", data: records };
      }
    } catch {}

    return { type: "unstructured", markdown: rawText };
  }

  if (ext === "xlsx" || ext === "xls") {
    try {
      const workbook = xlsx.read(file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);
      return { type: "structured", data: rows };
    } catch (err: any) {
      throw new BadRequestError(`Failed to parse Excel spreadsheet: ${err.message}`);
    }
  }

  if (["pdf", "docx", "png", "jpg", "jpeg", "webp"].includes(ext)) {
    const markdown = await processDocumentOCR(file.buffer, file.originalname);
    return { type: "unstructured", markdown };
  }

  throw new BadRequestError(`Unsupported file format '.${ext}'`);
};
