import { Mistral } from "@mistralai/mistralai";
import { env } from "../config/env.js";
import { BadRequestError } from "./errors.js";

export const processDocumentOCR = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
  const client = new Mistral({
    apiKey: env.MISTRAL_API_KEY,
  });

  const uploadedFile = await client.files.upload({
    file: {
      fileName,
      content: fileBuffer,
    },
    purpose: "ocr",
  });

  try {
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedFile.id,
    });

    const response = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
      },
      tableFormat: "markdown",
    });

    return (response.pages || []).map((page) => page.markdown).join("\n\n");
  } catch (error: any) {
    throw new BadRequestError(`OCR processing failed: ${error.message}`);
  } finally {
    await client.files.delete({ fileId: uploadedFile.id }).catch(() => {});
  }
};
