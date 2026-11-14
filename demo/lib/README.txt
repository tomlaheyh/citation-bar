Third-party libraries used by the AI pack's "Convert PDF" button.
Unmodified files from the npm packages named below.

pdf.min.js, pdf.worker.min.js
  pdf.js (pdfjs-dist) 3.11.174 - Mozilla - Apache License 2.0
  https://github.com/mozilla/pdf.js
  From pdfjs-dist@3.11.174, build/. Reads the text out of the PDF.
  3.11.174 is the last release built as plain scripts; later ones are ES
  modules only, which chrome.scripting.executeScript cannot inject as files.
  pdfConvert.js only extracts text, never draws a page, and sets
  isEvalSupported: false.

pdf-lib.min.js
  pdf-lib 1.17.1 - Andrew Dillon - MIT License
  https://github.com/Hopding/pdf-lib
  From pdf-lib@1.17.1, dist/. Copies the table pages into a new PDF.

Loaded by background.js (action "pcbLoadPdfTools"), only when the button is used.
