module.exports = function(RED) {

  function EmailSwitchNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    const getOutputPortFromAddress = (address, rules) => {

      if (address.indexOf('@') > -1) {
        const domain = address.split('@')[1];
        const rule = rules.find(x => {
          return x.domains.map(y => y.split('.')).find(y => JSON.stringify(y) == JSON.stringify(domain.split('.').slice(-y.length)));
        });
        return rule ? rules.indexOf(rule) : null;
      }
      return null;
    };

    const extractPDFAttachment = (attachments) => {
      return attachments.find(x => (x.contentType === 'application/pdf' && x.size > 0));
    };

    this.on('input', async (msg, send, done) => {
        // send = send || function() { node.send.apply(node, arguments) };
        try {

          const rules = config.rules.map(x => JSON.parse(x));
          const port = getOutputPortFromAddress(msg.from, rules);
          if (port) {
            const attachment = extractPDFAttachment(msg.attachments);
            if (attachment) {
              const messages = new Array(rules.length);
              messages[port] = {
                payload: attachment.content,
                filename: attachment.filename
              };
              node.send(messages);
            }
          }

        } catch (error) {
          console.log(error);
        }

        if (done) {
          done();
        }
    });
  }

  RED.nodes.registerType('email-switch', EmailSwitchNode);
}
