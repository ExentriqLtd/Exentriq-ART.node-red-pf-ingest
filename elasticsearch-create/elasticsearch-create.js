module.exports = function(RED) {

  function ElasticsearchCreateNode(config) {
    RED.nodes.createNode(this, config);

    const { Client } = require('@elastic/elasticsearch');
    const { v4: uuidv4 } = require('uuid');

    this.elasticsearch = RED.nodes.getNode(config.elasticsearch);
    this.plant = config.plant;
    this.service = config.service;
    this.doctype = config.doctype;
    this.doctypeType = config.doctypeType;
    this.entity= config.entity;
    this.entityType = config.entityType;
    this.body = config.body;
    this.bodyType = config.bodyType;
    this.mode = config.mode;

    const node = this;

    this.on('input', async (msg, send, done) => {

      try {
        const client = new Client({ node: node.elasticsearch.endpoint });
        let elasticsearchMessage;

        switch (node.mode) {
          case 'flat':
            elasticsearchMessage = {
              id: uuidv4(),
              index: node.elasticsearch.index,
              refresh: false,
              body: node.bodyType === 'msg' ? msg[node.body] : node.body
            }
            break;
          case 'structured':
            elasticsearchMessage = {
              id: msg.messageID,
              index: node.elasticsearch.index,
              refresh: false,
              body: {
                uuid: uuidv4(),
                plant: node.plant.toLowerCase(),
                service: node.service.toLowerCase(),
                type: node.doctypeType === 'msg' ? msg[node.doctype] : node.doctype,
                timestamp: msg.date,
                entity: node.entityType === 'msg' ? msg[node.entity] : node.entity
              }
            };
            break;
          default:
            break;
        }
        if (elasticsearchMessage) {
          await client.create(elasticsearchMessage);
          // await client.index(elasticsearchMessage);
          node.send(msg);  
        }
        done();
      } catch (error) {
        done(error);
      }

    });

  }
  RED.nodes.registerType('elasticsearch-create', ElasticsearchCreateNode);
}
