const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
// const PDFParser = require('pdf-parse');

const extractTextFromPDF = async (pdfData) => {

  const loadingTask = pdfjsLib.getDocument({ data: pdfData, verbosity: 0 });
  const pdfDocument = await loadingTask.promise;
  const pdfPage = await pdfDocument.getPage(1);
  const text = await pdfPage.getTextContent();

  return text;

};

module.exports = {
  extractTextFromPDF
};
