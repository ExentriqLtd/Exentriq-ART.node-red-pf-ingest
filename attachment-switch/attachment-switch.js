module.exports = function(RED) {

  function AttachmentSwitchNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    const getOutputPortFromAddress = (address, rules) => {

      if (rules.length === 0) {
        throw(new Error('No customers configured'));
      }

      for (const rule of rules) {
        if (!rule.name) {
          throw(new Error(`At least one customer has no name`));
        }
        if (!rule.domains || rule.domains.length === 0) {
          throw(new Error(`Domains are not configured for customer ${rule.name}`));
        }
      }

      try {
        if (address && address.indexOf('@') > -1) {
          const domain = address.split('@')[1];
          const rule = rules.find(x => {
            return x.domains.map(y => y.split('.')).find(y => JSON.stringify(y) == JSON.stringify(domain.split('.').slice(-y.length)));
          });
          return rule ? rules.indexOf(rule) : null;
        } else {
          throw(new Error('Sender address not found'));
        }   
      } catch (error) {
        throw(error);
      }

      return null;
    };

    const extractPDFAttachment = (attachments) => {
      return attachments.find(x => (x.contentType === 'application/pdf' && x.size > 0));
    };

    this.on('input', async (msg, send, done) => {

      try {

          const rules = config.rules.map(x => JSON.parse(x));
          const port = getOutputPortFromAddress(msg.from, rules);
          if (port !== null && port !== undefined) {
            const attachment = extractPDFAttachment(msg.attachments);
            if (attachment) {
              const messages = new Array(rules.length);
              messages[port] = {
                payload: attachment.content,
                filename: attachment.filename,
                subject: msg.topic,
                date: +new Date(msg.date),
                messageID: msg.header['message-id']
              };
              node.send(messages);
            }
          } else {
            throw(new Error(`Message with subject "${msg.topic}" received from an unknown sender: ${msg.from}`));
          }

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
    });
  }

  RED.nodes.registerType('attachment-switch', AttachmentSwitchNode);
}
