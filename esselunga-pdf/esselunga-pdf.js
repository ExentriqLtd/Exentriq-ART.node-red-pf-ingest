module.exports = function(RED) {

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
    PROCESSING: { text: 'processing', fill: 'yellow', shape: 'ring' },
    ERROR: { text: 'error', fill: 'red', shape: 'dot' }
  });

  const processPDF = async (pdf, products) => {

    try {

      const bitmapBuffer = await extractBitmapBuffer(pdf);
      const text = await recognizeText(bitmapBuffer);
      const { documentType, content } = analyzeText(text, products);  
  
      return {
        text,
        documentType,
        content
      };
        
    } catch (error) {
      throw(error);
    }

  
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

    const products = JSON.parse(config.products);

    this.on('input', async (msg, send, done) => {
      if (msg.hasOwnProperty('payload')) {
        send = send || function() { node.send.apply(node, arguments) };

        try {

          context.queue.push(msg.payload);
          setNodeStatus(node);

          if (context.status !== Status.PROCESSING) {
  
            while (context.queue.length > 0) {

              const pdf = context.queue.shift();
              context.status = Status.PROCESSING;
              setNodeStatus(node);
              const result = await processPDF(pdf, products);

              send({
                recognizedText: result.text,
                documentType: result.documentType,
                payload: result.content
              });
  
            }
            context.status = Status.AVAILABLE;
            setNodeStatus(node);
          }

        } catch (error) {
          if (done) {
            context.status = Status.ERROR;
            setNodeStatus(node);
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

  RED.nodes.registerType('esselunga-pdf', EsselungaPDFNode);
}
