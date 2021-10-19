module.exports = function(RED) {

  const { extractTextFromPDF } = require('./extract.js');
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

  const processPDF = async (pdf, products, filename = null) => {

    const startTime = process.hrtime();

    const text = await extractTextFromPDF(pdf);
    const { documentType, content } = analyzeText(text, products, filename);

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

  function OrtofinPDFNode(config) {
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

        const filename = msg.hasOwnProperty('filename') ? msg.filename : null;

        try {

          context.queue.push(msg.payload);
          setNodeStatus(node);

          if (context.status === Status.AVAILABLE) {
  
            while (context.queue.length > 0) {

              const pdf = context.queue.shift();
              context.status = Status.PROCESSING;
              setNodeStatus(node);
              const result = await processPDF(pdf, products, filename);

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

  RED.nodes.registerType('ortofin-pdf', OrtofinPDFNode);
}
