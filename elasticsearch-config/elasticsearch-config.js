module.exports = function(RED) {
  function ElasticsearchConfigNode(config) {
      RED.nodes.createNode(this, config);
      this.endpoint = config.endpoint;
      this.index = config.index;
  }
  RED.nodes.registerType('elasticsearch-config', ElasticsearchConfigNode);
}