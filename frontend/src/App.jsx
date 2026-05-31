import { useMemo, useRef, useState } from 'react'
import './index.css'

const languages = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  'zh-cn': 'Chinese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi'
}

const languageFlags = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  'zh-cn': '🇨🇳',
  ru: '🇷🇺',
  ar: '🇸🇦',
  hi: '🇮🇳'
}

function App() {
  const [inputText, setInputText] = useState('')
  const [targetLang, setTargetLang] = useState('es')
  const [translation, setTranslation] = useState('')
  const [audioSrc, setAudioSrc] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [selectedFile, setSelectedFile] = useState(null)
  const [fileTranslation, setFileTranslation] = useState('')
  const [fileDownloadUrl, setFileDownloadUrl] = useState('')
  const [fileTranslatedName, setFileTranslatedName] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')

  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  const stats = useMemo(() => {
    const words = inputText.trim() ? inputText.trim().split(/\s+/).length : 0

    return {
      chars: inputText.length,
      words
    }
  }, [inputText])

  const startRecording = () => {
    setError('')

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsRecording(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInputText(transcript)
    }

    recognition.onerror = (event) => {
      setError(event.error || 'Speech recognition error.')
      setIsRecording(false)
    }

    recognition.onend = () => setIsRecording(false)

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleTranslate = async () => {
    setError('')
    setTranslation('')
    setAudioSrc('')
    setCopied(false)

    if (!inputText.trim()) {
      setError('Please enter text or record speech first.')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, target: targetLang })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Translation failed.')
        return
      }

      setTranslation(data.translation)
      setAudioSrc(`data:audio/mpeg;base64,${data.audio}`)
    } catch (err) {
      setError('Unable to reach the translation server.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!translation) return

    await navigator.clipboard.writeText(translation)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  const handleClear = () => {
    setInputText('')
    setTranslation('')
    setAudioSrc('')
    setError('')
    setCopied(false)
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]

    setFileError('')
    setFileTranslation('')
    setFileDownloadUrl('')
    setFileTranslatedName('')

    if (!file) {
      setSelectedFile(null)
      return
    }

    const allowedExtensions = ['txt', 'pdf', 'docx']
    const extension = file.name.split('.').pop().toLowerCase()

    if (!allowedExtensions.includes(extension)) {
      setSelectedFile(null)
      setFileError('Only .txt, .pdf, and .docx files are supported.')
      return
    }

    const maxSize = 5 * 1024 * 1024

    if (file.size > maxSize) {
      setSelectedFile(null)
      setFileError('File size must be under 5 MB.')
      return
    }

    setSelectedFile(file)
  }

  const handleFileTranslate = async () => {
    setFileError('')
    setFileTranslation('')
    setFileDownloadUrl('')
    setFileTranslatedName('')

    if (!selectedFile) {
      setFileError('Please select a .txt, .pdf, or .docx file first.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('target', targetLang)

    try {
      setFileLoading(true)

      const response = await fetch('/api/translate-file', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setFileError(data.error || 'File translation failed.')
        return
      }

      setFileTranslation(data.translation)
      setFileTranslatedName(data.translatedFilename || `translated_${targetLang}.txt`)
      setFileDownloadUrl(`data:text/plain;charset=utf-8;base64,${data.download}`)
    } catch (err) {
      setFileError('Unable to reach the file translation server.')
    } finally {
      setFileLoading(false)
    }
  }

  const handleFileClear = () => {
    setSelectedFile(null)
    setFileTranslation('')
    setFileDownloadUrl('')
    setFileTranslatedName('')
    setFileError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <main className="app-shell">
      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      <section className="hero">
        <div className="hero-badge">
          <span className="live-dot"></span>
          AI Translation Workspace
        </div>

        <h1>Speech, Text & File Translator</h1>

        <p>
          Record your voice, translate text, upload documents, and listen to
          translated speech with a modern AI-powered workspace.
        </p>
      </section>

      <section className="translator-card">
        <div className="card-header">
          <div>
            <span className="section-label">Input</span>
            <h2>Enter source text</h2>
          </div>

          <button className="ghost-btn" type="button" onClick={handleClear}>
            Clear
          </button>
        </div>

        <div className="editor-grid">
          <div className="text-box input-box">
            <div className="box-top">
              <span>Source text</span>
              <span>
                {stats.words} words · {stats.chars} chars
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here or use voice recording..."
            />

            <div className="box-actions">
              <button
                type="button"
                className={isRecording ? 'record-btn active' : 'record-btn'}
                onClick={isRecording ? stopRecording : startRecording}
              >
                <span className="mic-icon">{isRecording ? '■' : '●'}</span>
                {isRecording ? 'Stop recording' : 'Record speech'}
              </button>
            </div>
          </div>

          <div className="language-panel">
            <span className="section-label">Translate to</span>

            <div className="language-select-wrap">
              <span className="selected-flag">{languageFlags[targetLang]}</span>

              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {Object.entries(languages).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="language-chips">
              {Object.entries(languages).slice(0, 6).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  className={targetLang === code ? 'chip active' : 'chip'}
                  onClick={() => setTargetLang(code)}
                >
                  {languageFlags[code]} {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="translate-btn"
              onClick={handleTranslate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Translating...
                </>
              ) : (
                <>
                  Translate Now
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="message error-message">
            <span>⚠</span>
            {error}
          </div>
        )}
      </section>

      <section className="file-card">
        <div className="card-header">
          <div>
            <span className="section-label">File Translation</span>
            <h2>Upload and translate documents</h2>
          </div>

          <button className="ghost-btn" type="button" onClick={handleFileClear}>
            Clear File
          </button>
        </div>

        <div className="file-upload-box">
          <div className="upload-icon">📄</div>

          <div>
            <h3>Choose a document</h3>
            <p>Supported formats: TXT, PDF, DOCX · Maximum size: 5 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileSelect}
          />

          {selectedFile && (
            <div className="file-info">
              <span>Selected file</span>
              <strong>{selectedFile.name}</strong>
              <small>{(selectedFile.size / 1024).toFixed(1)} KB</small>
            </div>
          )}

          <button
            type="button"
            className="translate-btn"
            onClick={handleFileTranslate}
            disabled={fileLoading}
          >
            {fileLoading ? (
              <>
                <span className="spinner"></span>
                Translating file...
              </>
            ) : (
              <>
                Translate File
                <span>→</span>
              </>
            )}
          </button>
        </div>

        {fileError && (
          <div className="message error-message">
            <span>⚠</span>
            {fileError}
          </div>
        )}

        {fileTranslation && (
          <div className="file-result">
            <div className="card-header">
              <div>
                <span className="section-label">File Output</span>
                <h2>
                  {languageFlags[targetLang]} {languages[targetLang]} File Translation
                </h2>
              </div>

              {fileDownloadUrl && (
                <a
                  className="download-btn"
                  href={fileDownloadUrl}
                  download={fileTranslatedName || `translated_${targetLang}.txt`}
                >
                  Download TXT
                </a>
              )}
            </div>

            <div
              className="translation-output"
              dir={targetLang === 'ar' ? 'rtl' : 'ltr'}
            >
              {fileTranslation}
            </div>
          </div>
        )}
      </section>

      <section className={translation ? 'result-card show' : 'result-card'}>
        <div className="card-header">
          <div>
            <span className="section-label">Output</span>
            <h2>
              {languageFlags[targetLang]} {languages[targetLang]} Translation
            </h2>
          </div>

          {translation && (
            <button className="ghost-btn" type="button" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>

        {!translation ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <p>Your translated text will appear here.</p>
          </div>
        ) : (
          <>
            <div
              className="translation-output"
              dir={targetLang === 'ar' ? 'rtl' : 'ltr'}
            >
              {translation}
            </div>

            {audioSrc && (
              <div className="audio-box">
                <span>Audio preview</span>
                <audio controls src={audioSrc}></audio>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default App