module.exports = function(RED) {

  const elasticsearchConfig = {
    node: 'http://localhost:9200',
    index: 'sales',
    types: {
      order: 'order',
      confirmation: 'confirmation'
    },
    body: {
      service: 'sales',
      plant: 'pf'
    }
  };

  function ElasticsearchCreateNode(config) {
    RED.nodes.createNode(this, config);

    const { Client } = require('@elastic/elasticsearch');
    const { v4: uuidv4 } = require('uuid');

    const node = this;

    this.on('input', async (msg, send, done) => {

      try {
        const client = new Client({ node: elasticsearchConfig.node });
        const elasticSearchMessage = {
          index: 'sales',
          body: {
            uuid: uuidv4(),
            plant: elasticsearchConfig.body.plant,
            service: elasticsearchConfig.body.service,
            type: elasticsearchConfig.types[msg.documentType],
            timestamp: Math.floor(+new Date() / 1000),
            entity: msg.payload
          }
        };
        // await client.index(message);
        node.send(elasticSearchMessage);
        done();
      } catch (error) {
        done(error);
      }

    });

  }
  RED.nodes.registerType('elasticsearch-create', ElasticsearchCreateNode);
}  