module.exports = function(RED) {

  function AttachmentSwitchNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    const getCustomerFromAddress = (address, rules) => {

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
          if (rule) {
            return {
              port: rules.indexOf(rule),
              customer: rule.name,
              attachmentType: rule.attachment_type
            };  
          } else {
            return null;
          }
        } else {
          throw(new Error('Sender address not found'));
        }   
      } catch (error) {
        throw(error);
      }

      return null;
    };

    const extractAttachment = (attachments, attachmentType) => {
      let attachment;
      switch (attachmentType.toLowerCase()) {
        case 'pdf':
          attachment = attachments.find(x => (x.contentType === 'application/pdf' && x.size > 0));
          break;
        case 'xslx':
          attachment = attachments.find(x => (x.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && x.size > 0));
          break;
        default:
          break;
      }
      return attachment;
    };


    this.on('input', async (msg, send, done) => {

      try {

          const rules = config.rules.map(x => JSON.parse(x));
          const customer = getCustomerFromAddress(msg.from, rules);
          if (customer && customer.attachmentType) {
            const attachment = extractAttachment(msg.attachments, customer.attachmentType);
            if (attachment) {
              const messages = new Array(rules.length);
              messages[customer.port] = {
                payload: attachment.content,
                filename: attachment.filename,
                subject: msg.topic,
                date: +new Date(msg.date),
                messageID: msg.header['message-id']
              };
              node.send(messages);
            }
          } else {
            throw(new Error(`Message with subject "${msg.topic}" received on ${msg.date} from an unknown sender: ${msg.from}`));
          }

        } catch (error) {
          if (done) {
            done(error);
          } else {
            node.error(error, msg);
          }
        }

        if (done) {
          done();
        }
    });
  }

  RED.nodes.registerType('attachment-switch', AttachmentSwitchNode);
}
