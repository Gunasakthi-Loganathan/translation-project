from flask import Flask, request, jsonify
from flask_cors import CORS
from gtts import gTTS
from deep_translator import GoogleTranslator
from pypdf import PdfReader
from docx import Document
from werkzeug.utils import secure_filename
import base64
import io

app = Flask(__name__)
CORS(app)

# Maximum upload size: 5 MB
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ja": "Japanese",
    "zh-cn": "Chinese (Simplified)",
    "ru": "Russian",
    "ar": "Arabic",
    "hi": "Hindi"
}

ALLOWED_FILE_TYPES = {"txt", "pdf", "docx"}

# Some libraries need slightly different language codes
TRANSLATOR_LANG_CODES = {
    "zh-cn": "zh-CN"
}

TTS_LANG_CODES = {
    "zh-cn": "zh-CN"
}


def get_file_extension(filename):
    return filename.rsplit(".", 1)[1].lower() if "." in filename else ""


def extract_text_from_txt(file_bytes):
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1")


def extract_text_from_pdf(file_bytes):
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes):
    document = Document(io.BytesIO(file_bytes))
    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    return "\n".join(paragraphs)


def split_text(text, max_chars=4500):
    chunks = []
    current_chunk = ""

    for paragraph in text.split("\n"):
        paragraph = paragraph.strip()

        if not paragraph:
            continue

        if len(current_chunk) + len(paragraph) + 1 <= max_chars:
            current_chunk += paragraph + "\n"
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            current_chunk = paragraph + "\n"

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def translate_long_text(text, target):
    translator_target = TRANSLATOR_LANG_CODES.get(target, target)
    chunks = split_text(text)
    translated_chunks = []

    for chunk in chunks:
        translated_text = GoogleTranslator(
            source="auto",
            target=translator_target
        ).translate(chunk)

        translated_chunks.append(translated_text)

    return "\n\n".join(translated_chunks)


@app.route("/api/translate", methods=["POST"])
def translate_text():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    target = data.get("target", "en")

    if not text:
        return jsonify({"error": "No text provided."}), 400

    if target not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported target language: {target}"}), 400

    try:
        translator_target = TRANSLATOR_LANG_CODES.get(target, target)
        tts_target = TTS_LANG_CODES.get(target, target)

        translated_text = GoogleTranslator(
            source="auto",
            target=translator_target
        ).translate(text)

        tts = gTTS(translated_text, lang=tts_target)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        audio_base64 = base64.b64encode(audio_buffer.read()).decode("utf-8")

        return jsonify({
            "translation": translated_text,
            "audio": audio_base64,
            "language": SUPPORTED_LANGUAGES[target]
        })

    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/translate-file", methods=["POST"])
def translate_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    uploaded_file = request.files["file"]
    target = request.form.get("target", "en")

    if target not in SUPPORTED_LANGUAGES:
        return jsonify({"error": f"Unsupported target language: {target}"}), 400

    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file."}), 400

    filename = secure_filename(uploaded_file.filename)
    file_extension = get_file_extension(filename)

    if file_extension not in ALLOWED_FILE_TYPES:
        return jsonify({
            "error": "Unsupported file type. Upload only .txt, .pdf, or .docx files."
        }), 400

    try:
        file_bytes = uploaded_file.read()

        if file_extension == "txt":
            extracted_text = extract_text_from_txt(file_bytes)
        elif file_extension == "pdf":
            extracted_text = extract_text_from_pdf(file_bytes)
        elif file_extension == "docx":
            extracted_text = extract_text_from_docx(file_bytes)
        else:
            return jsonify({"error": "Invalid file type."}), 400

        extracted_text = extracted_text.strip()

        if not extracted_text:
            return jsonify({
                "error": "No readable text found. Scanned PDFs need OCR support."
            }), 400

        translated_text = translate_long_text(extracted_text, target)

        translated_filename = f"{filename.rsplit('.', 1)[0]}_translated_{target}.txt"

        download_base64 = base64.b64encode(
            translated_text.encode("utf-8")
        ).decode("utf-8")

        return jsonify({
            "filename": filename,
            "translatedFilename": translated_filename,
            "language": SUPPORTED_LANGUAGES[target],
            "originalText": extracted_text,
            "translation": translated_text,
            "download": download_base64
        })

    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/languages", methods=["GET"])
def languages():
    return jsonify(SUPPORTED_LANGUAGES)


@app.errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "File is too large. Maximum file size is 5 MB."}), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)