# pf-ingest

Node-RED nodes for Planet Farms business document ingestion automation.


## Elasticsearch configuration

Two indices are used:

* `orders`
* `confirmations`

The `confirmations` index must be configured with the following mapping:

~~~http
PUT /confirmations/_mapping
{
  "properties": {
    "entity": {
      "properties": {
        "products": {
          "properties": {
            "total_cost": {
              "type": "float"
            },
            "unit_cost": {
              "type": "float"
            }
          }
        },
        "totals": {
          "properties": {
            "cost": {
              "type": "float"
            }
          }
        }
      }
    }
  }
}
~~~

