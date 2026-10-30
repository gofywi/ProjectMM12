package astrax.sumz

import android.net.Uri
import com.facebook.react.bridge.*
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.InputStream

/**
 * Native module for extracting text from PDF files using Apache PDFBox.
 * Supports both content:// URIs (from document picker) and file:// paths.
 */
class PdfTextExtractorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "PdfTextExtractor"
        private var isInitialized = false
    }

    override fun getName(): String = NAME

    private fun ensureInitialized() {
        if (!isInitialized) {
            PDFBoxResourceLoader.init(reactContext)
            isInitialized = true
        }
    }

    @ReactMethod
    fun extractText(uriString: String, promise: Promise) {
        try {
            ensureInitialized()

            val inputStream: InputStream = openStream(uriString)
            val document: PDDocument = PDDocument.load(inputStream)

            try {
                val stripper = PDFTextStripper()
                val text = stripper.getText(document)
                promise.resolve(text)
            } finally {
                document.close()
                inputStream.close()
            }
        } catch (e: Exception) {
            promise.reject("PDF_EXTRACT_ERROR", "Failed to extract text: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getPageCount(uriString: String, promise: Promise) {
        try {
            ensureInitialized()

            val inputStream: InputStream = openStream(uriString)
            val document: PDDocument = PDDocument.load(inputStream)

            try {
                promise.resolve(document.numberOfPages)
            } finally {
                document.close()
                inputStream.close()
            }
        } catch (e: Exception) {
            promise.reject("PDF_COUNT_ERROR", "Failed to get page count: ${e.message}", e)
        }
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
