module.exports = function(RED) {
  "use strict";

  const path = require('path');
  const { createWorker } = require('tesseract.js');
  const { extractBitmapBuffer } = require('./bitmap.js');
  const { recognizeText } = require('./ocr.js');
  const { analyzeText } = require('./text.js');

  function EsselungaNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    this.on('input', async (msg, send, done) => {
      if (msg.hasOwnProperty('payload')) {
        send = send || function() { node.send.apply(node, arguments) };

        try {
          const bitmapBuffer = await extractBitmapBuffer(msg.payload);
          const text = await recognizeText(bitmapBuffer);
          msg.payload = analyzeText(text);
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

  RED.nodes.registerType('esselunga', EsselungaNode);
}
