/**
 * DocumentService.ts
 * Handles document picking and text extraction for PDF, DOCX, and TXT files.
 * PDF  — native PdfTextExtractorModule  (Apache PDFBox, Kotlin)
 * DOCX — native DocxTextExtractorModule (ZipInputStream + XmlPullParser, Kotlin)
 * TXT  — native TxtTextExtractorModule  (raw byte read with UTF-8/fallback, Kotlin)
 */

import { NativeModules } from 'react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';

const { PdfTextExtractor, DocxTextExtractor, TxtTextExtractor } = NativeModules;

export interface PickedDocument {
  uri: string;
  name: string;
  type: 'pdf' | 'txt' | 'docx' | 'unknown';
  size: number | null;
}

// Maximum characters to pass as context (~7000 tokens at 4 chars/token,
// leaving room for system prompt + conversation + output in the 32K window)
const MAX_CONTEXT_CHARS = 28000;

class DocumentService {
  /**
   * Opens the native file picker filtered to PDF files.
   * Returns the picked file metadata or null if cancelled.
   */
  async pickDocument(): Promise<PickedDocument | null> {
    try {
      const [file] = await pick({
        type: [types.pdf, types.docx, types.plainText],
      });

      const fileType = this.detectFileType(file.name ?? '', file.type ?? '');

      return {
        uri: file.uri,
        name: file.name ?? 'Unknown Document',
        type: fileType,
        size: file.size ?? null,
      };
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        console.log('[DocumentService] User cancelled picker');
        return null; // User cancelled — not an error
      }
      console.error('[DocumentService] Pick failed:', err);
      throw new Error('Failed to pick document');
    }
  }

  /**
   * Extracts plain text from the document at the given URI.
   * Uses the native PdfTextExtractor module (PDFBox) for PDF files.
   */
  async extractTextFromDocument(uri: string, type: 'pdf' | 'txt' | 'docx' | 'unknown'): Promise<string> {
    console.log(`[DocumentService] Extracting text from ${type} file: ${uri}`);

    switch (type) {
      case 'pdf':
        return this.extractPdfText(uri);
      case 'docx':
        return this.extractDocxText(uri);
      case 'txt':
        return this.extractTxtText(uri);
      default:
        throw new Error(`Unsupported file type: ${type}. Only PDF, DOCX, and TXT are supported.`);
    }
  }

  /**
   * Extract text from a PDF using the native PdfTextExtractor module.
   * The native module handles content:// URIs directly.
   */
  private async extractPdfText(uri: string): Promise<string> {
    try {
      if (!PdfTextExtractor) {
        throw new Error('PDF text extraction module is not available.');
      }

      const text: string = await PdfTextExtractor.extractText(uri);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted. The PDF may be scanned/image-based.');
      }

      console.log(`[DocumentService] Extracted ${text.length} chars from PDF`);
      return text.trim();
    } catch (error: any) {
      if (error.message?.includes('No text could be extracted')) {
        throw error;
      }
      console.error('[DocumentService] PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
    }
  }

  /**
   * Extract text from a DOCX using the native DocxTextExtractor module (Apache POI).
   * The native module handles content:// URIs directly.
   */
  private async extractDocxText(uri: string): Promise<string> {
    try {
      if (!DocxTextExtractor) {
        throw new Error('DOCX text extraction module is not available.');
      }

      const text: string = await DocxTextExtractor.extractText(uri);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the DOCX file.');
      }

      console.log(`[DocumentService] Extracted ${text.length} chars from DOCX`);
      return text.trim();
    } catch (error: any) {
      if (error.message?.includes('No text could be extracted')) {
        throw error;
      }
      console.error('[DocumentService] DOCX extraction failed:', error);
      throw new Error('Failed to extract text from DOCX. The file may be corrupted or unsupported.');
    }
  }

  /**
   * Read a plain-text file using the native TxtTextExtractor module.
   * Handles UTF-8 and ISO-8859-1 / Windows-1252 encoded files.
   * The native module handles content:// URIs directly.
   */
  private async extractTxtText(uri: string): Promise<string> {
    try {
      if (!TxtTextExtractor) {
        throw new Error('TXT text extraction module is not available.');
      }

      const text: string = await TxtTextExtractor.extractText(uri);

      if (!text || text.trim().length === 0) {
        throw new Error('The text file is empty or contains no readable content.');
      }

      console.log(`[DocumentService] Read ${text.length} chars from TXT`);
      return text.trim();
    } catch (error: any) {
      if (error.message?.includes('empty') || error.message?.includes('no readable')) {
        throw error;
      }
      console.error('[DocumentService] TXT read failed:', error);
      throw new Error('Failed to read the text file. The file may be corrupted or use an unsupported encoding.');
    }
  }

  /**
   * Truncates document text to fit within the model's context window.
   * Returns the (possibly truncated) text and whether truncation occurred.
   */
  truncateForContext(text: string): { text: string; wasTruncated: boolean } {
    if (text.length <= MAX_CONTEXT_CHARS) {
      return { text, wasTruncated: false };
    }

    const truncated = text.substring(0, MAX_CONTEXT_CHARS);
    // Try to cut at a sentence boundary
    const lastPeriod = truncated.lastIndexOf('.');
    const cutPoint = lastPeriod > MAX_CONTEXT_CHARS * 0.8 ? lastPeriod + 1 : MAX_CONTEXT_CHARS;

    return {
      text: truncated.substring(0, cutPoint) + '\n\n[... Document truncated due to length ...]',
      wasTruncated: true,
    };
  }

  /**
   * Detects file type from name and MIME type.
   */
  private detectFileType(name: string, mimeType: string): 'pdf' | 'txt' | 'docx' | 'unknown' {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
    if (lower.endsWith('.txt') || mimeType === 'text/plain') return 'txt';
    if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml')) return 'docx';
    return 'unknown';
  }
}

export default new DocumentService();
