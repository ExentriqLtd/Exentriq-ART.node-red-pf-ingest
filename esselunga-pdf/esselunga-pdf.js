module.exports = function(RED) {
  "use strict";

  const { extractBitmapBuffer } = require('./bitmap.js');
  const { recognizeText } = require('./ocr.js');
  const { analyzeText } = require('./text.js');

  /**
   * Enum for status.
   * @readonly
   * @enum {{text: string, fill: string, shape: string}}
   */
  const Status = Object.freeze({
    AVAILABLE: { text: 'available', fill: 'green', shape: 'dot' },
    PROCESSING: { text: 'processing', fill: 'yellow', shape: 'ring' }
  });

  const processPDF = async (pdf) => {

    const startTime = process.hrtime();

    const bitmapBuffer = await extractBitmapBuffer(pdf);
    const text = await recognizeText(bitmapBuffer);
    const { documentType, content } = analyzeText(text);

    const elapsedTime = process.hrtime(startTime)[0];

    return {
      elapsedTime,
      text,
      documentType,
      content
    };
  
  };

  const setNodeStatus = (node) => {

    const context = node.context();
    let { text, fill, shape } = context.status;
    
    if (context.queue.length > 0) {
      text += ` - ${context.queue.length} waiting`;
    }

    node.status({
      text,
      fill,
      shape
    });

  };

  function EsselungaPDFNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    const context = node.context();
    context.queue = context.queue || [];

    context.status = context.queue.length === 0 ? Status.AVAILABLE : Status.PROCESSING;

    setNodeStatus(node);

    this.on('input', async (msg, send, done) => {
      if (msg.hasOwnProperty('payload')) {
        send = send || function() { node.send.apply(node, arguments) };

        try {

          context.queue.push(msg.payload);
          setNodeStatus(node);

          if (context.status === Status.AVAILABLE) {
  
            while (context.queue.length > 0) {

              const pdf = context.queue.shift();
              context.status = Status.PROCESSING;
              setNodeStatus(node);
              const result = await processPDF(pdf);

              send({
                recognizedText: result.text,
                executionTime: `${result.documentType} processed in ${result.elapsedTime} seconds`,
                documentType: result.documentType,
                payload: result.content
              });
  
            }
            context.status = Status.AVAILABLE;
            setNodeStatus(node);
          }

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
