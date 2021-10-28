module.exports = function(RED) {

  // const elasticsearchConfig = {
  //   types: {
  //     order: 'order',
  //     confirmation: 'confirmation'
  //   },
  //   body: {
  //     service: 'sales',
  //     plant: 'pf'
  //   }
  // };

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

    const node = this;

    this.on('input', async (msg, send, done) => {

      try {
        const client = new Client({ node: node.elasticsearch.endpoint });
        const elasticsearchMessage = {
          index: node.elasticsearch.index,
          body: {
            uuid: uuidv4(),
            plant: node.plant.toLowerCase(),
            service: node.service.toLowerCase(),
            type: node.doctypeType === 'msg' ? msg[node.doctype] : node.doctype,
            timestamp: Math.floor(+new Date()),
            entity: node.entityType === 'msg' ? msg[node.entity] : node.entity
          }
        };
        await client.index(elasticsearchMessage);
        node.send(elasticsearchMessage);
        done();
      } catch (error) {
        done(error);
      }

    });

  }
  RED.nodes.registerType('elasticsearch-create', ElasticsearchCreateNode);
}