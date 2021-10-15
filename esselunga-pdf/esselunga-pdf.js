module.exports = function(RED) {
  "use strict";

  const { extractBitmapBuffer } = require('./bitmap.js');
  const { recognizeText } = require('./ocr.js');
  const { analyzeText } = require('./text.js');

  function EsselungaPDFNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    this.on('input', async (msg, send, done) => {
      if (msg.hasOwnProperty('payload')) {
        send = send || function() { node.send.apply(node, arguments) };

        try {
          const bitmapBuffer = await extractBitmapBuffer(msg.payload);
          const text = await recognizeText(bitmapBuffer);
          const { documentType, content } = analyzeText(text);
          msg.documentType = documentType;
          msg.payload = content;
          send(msg);      
        } catch (error) {
          console.log(error);
        }

        if (done) {
          done();
        }
      }
    });
  }

  RED.nodes.registerType('esselunga-pdf', EsselungaPDFNode);
}
