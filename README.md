# pf-ingest

Node-RED nodes for Planet Farms business document ingestion automation.

## Managed Customers

* Esselunga
* Ortofin (Iper)
* Rialto (Il Gigante)

## Elasticsearch configuration

Two indices are used:

* `orders`
* `confirmations`

The `confirmations` index must be configured with the following mapping:

~~~http
PUT /confirmations/_mapping
{
  "properties": {
    "timestamp": {
      "type": "date"
    },
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

~~~http
PUT /orders/_mapping
{
  "properties": {
    "timestamp": {
      "type": "date"
    }
  }
}
~~~

~~~http
PUT /orders-flat/_mapping
{
  "properties": {
    "timestamp": {
      "type": "date"
    }
  }
}
~~~
