const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const extractTextFromPDF = async (pdfData, pages, groupByRow = false) => {

  
  try {
    let text = '';
    const loadingTask = pdfjsLib.getDocument({ data: pdfData, verbosity: 0 });
    const pdfDocument = await loadingTask.promise;
    if (!pages) {
      pages = Array.from({length: pdfDocument.numPages}, (_, i) => i + 1);
    }
    for (let index = pages[0]; index <= Math.min(pages.slice(-1)[0], pdfDocument.numPages); index++) {
      const pdfPage = await pdfDocument.getPage(index);
      const pageContent = await pdfPage.getTextContent();

      let pageText;
      if (groupByRow) {
        const rows = pageContent.items.reduce((acc, obj) => {
          let row = acc.find(x => x.y === obj.transform[5]);
          if (!row) {
            row = {
              y: obj.transform[5],
              text: [{
                str: obj.str,
                x: obj.transform[4]
              }]
            };
            acc.push(row);
          } else {
            row.text.push({
              str: obj.str,
              x: obj.transform[4]
            });
          }
          return acc;
        }, []);
        rows.map(x => {
          x.text.sort((a, b) => {
            return a.x - b.x;
          })
          x.str = x.text.map(y => y.str).join(' ');
        });
        pageText = rows.map(x => x.str.trim()).filter(x => x !== '').join('\n');
      } else {
        pageText = pageContent.items.map(x => x.str.trim()).filter(x => x !== '').join('\n');
      }
      text += pageText;
    }
    return text;
  } catch (error) {
    throw(error)
  }

};

module.exports = function(RED) {

  function PDFExtractNode(config) {
    RED.nodes.createNode(this, config);

    this.pageMode = config.pagemode;
    this.pageFrom = parseInt(config.pagefrom);
    this.pageTo = parseInt(config.pageto);
    this.groupByRow = config.groupbyrow;

    const node = this;

    this.on('input', async (msg, send, done) => {

      if (msg.hasOwnProperty('payload')) {
        try {
          const pdf = msg.payload;
          let pages = null;
          switch (node.pageMode) {
            case 'all':
              break;
            case 'first':
              pages = [1];
              break;
            case 'range':
              pages = Array.from({length: node.pageTo - node.pageFrom + 1}, (_, i) => i + node.pageFrom);
              break;
            default:
              break;
          }

          const result = await extractTextFromPDF(pdf, pages, node.groupByRow);
          msg.payload = result;
          send(msg);

        } catch (error) {
          if (done) {
            done(error);
          } else {
            node.error(err, msg);
          }
        }
        if (done) {
          done();
        }
      }
    });

  }
  RED.nodes.registerType('pdf-extract', PDFExtractNode);
}
