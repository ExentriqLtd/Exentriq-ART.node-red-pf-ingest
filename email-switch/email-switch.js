module.exports = function(RED) {

  function EmailSwitchNode(config) {
    RED.nodes.createNode(this, config);

    const customers = [
      { name: 'Esselunga', domains: [ 'esselunga.it' ] },
      { name: 'Ortofin',   domains: [ 'ortofin.it' ] }
    ];

    const node = this;
    const numberOfOutputs = config.outputs;

    const getOutputFromAddress = (address) => {

      if (address.indexOf('@') > -1) {
        const domain = address.split('@')[1];
        const customer = customers.find(x => {
          return x.domains.map(y => y.split('.')).find(y => JSON.stringify(y) == JSON.stringify(domain.split('.').slice(-y.length)));
        });

        // const customer = customers.find(x => x.domains.indexOf(address.split('@')[1]) > -1);
        return customer ? customers.indexOf(customer) : null;
      }
      return null;
    };

    this.on('input', async (msg, send, done) => {
        // send = send || function() { node.send.apply(node, arguments) };
        try {

          node.send({
            payload: {
              address: msg.from,
              output: getOutputFromAddress(msg.from),
              outputs: numberOfOutputs
            }
          });

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
