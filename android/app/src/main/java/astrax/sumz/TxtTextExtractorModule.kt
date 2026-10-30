package astrax.sumz

import android.net.Uri
import com.facebook.react.bridge.*
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.nio.charset.Charset

/**
 * Native module for reading plain-text (.txt) files.
 *
 * TXT files require no parsing — we just read the raw bytes and decode them.
 * The module attempts UTF-8 first, then falls back to ISO-8859-1 so that
 * files with Windows-1252 / Latin-1 encoding are still readable.
 *
 * Supports content:// URIs (from document picker), file:// URIs, and
 * absolute paths — mirrors PdfTextExtractorModule and DocxTextExtractorModule.
 */
class TxtTextExtractorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "TxtTextExtractor"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun extractText(uriString: String, promise: Promise) {
        try {
            val inputStream: InputStream = openStream(uriString)
            val text = readText(inputStream)
            inputStream.close()

            if (text.isBlank()) {
                promise.reject(
                    "TXT_EMPTY",
                    "The text file is empty or contains no readable content."
                )
            } else {
                promise.resolve(text)
            }
        } catch (e: Exception) {
            promise.reject("TXT_EXTRACT_ERROR", "Failed to read text file: ${e.message}", e)
        }
    }

    /**
     * Reads the full content of an InputStream as a String.
     * Tries UTF-8 first; falls back to ISO-8859-1 if the result contains
     * replacement characters (U+FFFD), which indicates a mis-matched encoding.
     */
    private fun readText(inputStream: InputStream): String {
        val bytes = inputStream.readBytes()

        val utf8Text = String(bytes, Charsets.UTF_8)
        if (!utf8Text.contains('\uFFFD')) {
            return utf8Text.trim()
        }

        // Fallback for Latin-1 / Windows-1252 encoded files
        return String(bytes, Charset.forName("ISO-8859-1")).trim()
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
