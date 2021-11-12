module.exports = function(RED) {

  function ElasticsearchSearchNode(config) {
    RED.nodes.createNode(this, config);

    const { Client } = require('@elastic/elasticsearch');
    const { v4: uuidv4 } = require('uuid');

    this.elasticsearch = RED.nodes.getNode(config.elasticsearch);
    this.query = config.query;
    this.queryType = config.queryType;

    const node = this;

    this.on('input', async (msg, send, done) => {

      try {
        const client = new Client({ node: node.elasticsearch.endpoint });
        const elasticsearchMessage = {
          index: node.elasticsearch.index,
          body: node.queryType === 'msg' ? msg[node.query] : node.query
        };
        const { body } = await client.search(elasticsearchMessage);
        if (body) {
          msg.results = body;
        }
        delete msg.query;
        node.send(msg);
        done();
      } catch (error) {
        done(error);
      }
    });

  }
  RED.nodes.registerType('elasticsearch-search', ElasticsearchSearchNode);
}
