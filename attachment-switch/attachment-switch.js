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
              name: rule.name,
              attachmentType: rule.attachment_type ? rule.attachment_type : null,
              regex: rule.regex ? rule.regex : null
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

    const extractAttachments = (attachments, attachmentType) => {
      let validAttachments;
      switch (attachmentType.toLowerCase()) {
        case 'pdf':
          validAttachments = attachments.filter(x => (x.contentType === 'application/pdf' && x.size > 0));
          break;
        case 'xlsx':
          validAttachments = attachments.filter(x => (x.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && x.size > 0));
          break;
        default:
          break;
      }
      return validAttachments;
    };


    this.on('input', async (msg, send, done) => {

      try {

          const rules = config.rules.map(x => JSON.parse(x));
          const customer = getCustomerFromAddress(msg.from, rules);
          if (customer) {

            if (customer.regex) {
              if (!msg.topic.match(customer.regex)) {
                throw(`Customer ${customer.name} detected but the subject "${msg.topic}" doesn't match the regular expression "${customer.regex}".`);
              }
            }

            const messages = new Array(rules.length);
            if (customer.attachmentType) {
              const attachments = extractAttachments(msg.attachments, customer.attachmentType);
              if (attachments.length > 0) {
                messages[customer.port] = [];
                for (const attachment of attachments) {
                  messages[customer.port].push({
                    payload: attachment.content,
                    filename: attachment.filename,
                    subject: msg.topic,
                    date: +new Date(msg.date),
                    messageID: msg.header['message-id']
                  });
                }
              } else {
                throw(`Message with subject "${msg.topic}" received on ${msg.date} from ${msg.from} has no attachments`);
              }
            } else {
              messages[customer.port].push({
                payload: msg.payload ? msg.payload : msg.html,
                subject: msg.topic,
                date: +new Date(msg.date),
                messageID: msg.header['message-id']
              });
            }

            node.send(messages);
          } else {
            throw(`Message with subject "${msg.topic}" received on ${msg.date} from an unknown sender: ${msg.from}`);
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
