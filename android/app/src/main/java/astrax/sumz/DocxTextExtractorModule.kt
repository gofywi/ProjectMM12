package astrax.sumz

import android.net.Uri
import com.facebook.react.bridge.*
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Native module for extracting text from DOCX files.
 *
 * A .docx file is an OOXML package (ZIP archive) containing XML files.
 * The main document body lives in "word/document.xml".
 * Text content is stored inside <w:t> elements in the OOXML namespace.
 *
 * This module extracts text using Android's built-in ZipInputStream + XmlPullParser,
 * requiring zero external dependencies (no Apache POI needed).
 *
 * Supports content:// URIs (from document picker), file:// URIs, and absolute paths.
 * Mirrors the PdfTextExtractorModule pattern.
 */
class DocxTextExtractorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "DocxTextExtractor"
        // OOXML Word namespace
        private const val WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun extractText(uriString: String, promise: Promise) {
        try {
            val inputStream: InputStream = openStream(uriString)
            val text = extractDocxText(inputStream)
            inputStream.close()

            if (text.isBlank()) {
                promise.reject(
                    "DOCX_EMPTY",
                    "No text could be extracted from the DOCX file."
                )
            } else {
                promise.resolve(text)
            }
        } catch (e: Exception) {
            promise.reject("DOCX_EXTRACT_ERROR", "Failed to extract text: ${e.message}", e)
        }
    }

    /**
     * Reads the ZIP archive, finds word/document.xml, and extracts all <w:t> text content.
     * Also handles tables (<w:tc>) by joining cell text with " | " separators.
     */
    private fun extractDocxText(inputStream: InputStream): String {
        val zipStream = ZipInputStream(inputStream)
        var entry = zipStream.nextEntry
        val textBuilder = StringBuilder()

        while (entry != null) {
            if (entry.name == "word/document.xml") {
                val xmlBytes = zipStream.readBytes()
                val xmlText = parseDocumentXml(xmlBytes)
                textBuilder.append(xmlText)
                break // We only need the main document body
            }
            zipStream.closeEntry()
            entry = zipStream.nextEntry
        }

        zipStream.close()
        return textBuilder.toString().trim()
    }

    /**
     * Parses the word/document.xml using XmlPullParser.
     *
     * Structure we care about:
     *   <w:body>
     *     <w:p>           → paragraph
     *       <w:r>         → run
     *         <w:t>text</w:t>
     *       </w:r>
     *     </w:p>
     *     <w:tbl>         → table
     *       <w:tr>        → table row
     *         <w:tc>      → table cell (contains <w:p> elements)
     *
     * We accumulate text within each <w:p>, emit a newline after each paragraph,
     * and use " | " to separate table cells within a row.
     */
    private fun parseDocumentXml(xmlBytes: ByteArray): String {
        val factory = XmlPullParserFactory.newInstance()
        factory.isNamespaceAware = true
        val parser = factory.newPullParser()
        parser.setInput(xmlBytes.inputStream(), "UTF-8")

        val result = StringBuilder()
        val paragraphText = StringBuilder()
        var inTable = false
        var inTableRow = false
        var inTableCell = false
        val cellTexts = mutableListOf<String>()
        var inTextElement = false

        var eventType = parser.eventType

        while (eventType != XmlPullParser.END_DOCUMENT) {
            when (eventType) {
                XmlPullParser.START_TAG -> {
                    val localName = parser.name
                    val ns = parser.namespace ?: ""

                    when {
                        ns == WORD_NS && localName == "tbl" -> {
                            inTable = true
                        }
                        ns == WORD_NS && localName == "tr" -> {
                            inTableRow = true
                            cellTexts.clear()
                        }
                        ns == WORD_NS && localName == "tc" -> {
                            inTableCell = true
                            paragraphText.clear()
                        }
                        ns == WORD_NS && localName == "t" -> {
                            inTextElement = true
                        }
                        // Handle line breaks within a paragraph
                        ns == WORD_NS && localName == "br" -> {
                            paragraphText.append("\n")
                        }
                        // Handle tab characters
                        ns == WORD_NS && localName == "tab" -> {
                            paragraphText.append("\t")
                        }
                    }
                }

                XmlPullParser.TEXT -> {
                    if (inTextElement) {
                        paragraphText.append(parser.text)
                    }
                }

                XmlPullParser.END_TAG -> {
                    val localName = parser.name
                    val ns = parser.namespace ?: ""

                    when {
                        ns == WORD_NS && localName == "t" -> {
                            inTextElement = false
                        }
                        ns == WORD_NS && localName == "p" -> {
                            val pText = paragraphText.toString()
                            if (inTableCell) {
                                // Don't emit yet — collect for table row
                            } else if (pText.isNotBlank()) {
                                result.appendLine(pText)
                            }
                            paragraphText.clear()
                        }
                        ns == WORD_NS && localName == "tc" -> {
                            cellTexts.add(paragraphText.toString().trim())
                            paragraphText.clear()
                            inTableCell = false
                        }
                        ns == WORD_NS && localName == "tr" -> {
                            val rowText = cellTexts
                                .filter { it.isNotBlank() }
                                .joinToString(" | ")
                            if (rowText.isNotBlank()) {
                                result.appendLine(rowText)
                            }
                            cellTexts.clear()
                            inTableRow = false
                        }
                        ns == WORD_NS && localName == "tbl" -> {
                            inTable = false
                        }
                    }
                }
            }

            eventType = parser.next()
        }

        return result.toString()
    }

    /**
     * Opens an InputStream from a content:// URI, file:// URI, or absolute path.
     */
    private fun openStream(uriString: String): InputStream {
        return when {
            uriString.startsWith("content://") -> {
                val uri = Uri.parse(uriString)
                reactContext.contentResolver.openInputStream(uri)
                    ?: throw Exception("Cannot open content URI: $uriString")
            }
            uriString.startsWith("file://") -> {
                val path = uriString.removePrefix("file://")
                java.io.FileInputStream(path)
            }
            else -> {
                // Treat as absolute file path
                java.io.FileInputStream(uriString)
            }
        }
    }
}
