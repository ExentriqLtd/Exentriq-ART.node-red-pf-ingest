const { Readable } = require('stream');
const readXlsxFile = require('read-excel-file/node')

const matchingProductByEAN = (ean, products) => {
  const product = products.find(x => x.ean === ean);
  return product ? product : null;
};

const matchingProductByCustomerCode = (customerCode, products) => {
  const product = products.find(x => x.customer_code === customerCode);
  return product ? product : null;
};

const matchingWarehouseByName = (name, warehouses) => {
  const warehouse = warehouses.find(x => x.name === name);
  return warehouse ? warehouse : null;
};

const parseOldExcel = async (excelBuffer, products, warehouses) => {

  const rows = await readXlsxFile(Readable.from(excelBuffer));

  const orders = rows.slice(1).reduce((acc, obj) => {

    if (acc.map(x => x.name).indexOf(obj[0]) === -1) {

      const warehouse = matchingWarehouseByName(obj[0], warehouses);
      let address;
      if (warehouse) {
        address = `${warehouse.address} - ${warehouse.city}`;
      }

      acc.push({
        name: obj[0],
        address,
        products: []
      });
    }

    const index = acc.map(x => x.name).findIndex(x => x === obj[0]);
    if (index > -1) {

      const product = matchingProductByEAN(obj[2].toString(), products);

      if (product) {
        const boxes = obj[4];
        if (!isNaN(boxes)) {
          acc[index].products.push({
            code: product.code,
            ean: product.ean,
            customer_code: product.customer_code,
            descrition: product.description,
            boxes,
            items: boxes * product.boxItems
          });  
        }
      }
    }
    return acc;
  }, []);

  return orders;
};

const parseNewExcel = async (excelBuffer, products, warehouses) => {

  const rows = await readXlsxFile(Readable.from(excelBuffer));

  const orders = rows.slice(1).reduce((acc, obj) => {
    if (acc.map(x => x.name).indexOf(obj[2]) === -1) {
      const warehouse = matchingWarehouseByName(obj[2], warehouses);
      let address;
      if (warehouse) {
        address = `${warehouse.address} - ${warehouse.city}`;
      }
      acc.push({
        name: obj[2],
        address,
        products: []
      });
    }

    const index = acc.map(x => x.name).findIndex(x => x === obj[2]);
    if (index > -1) {

      const product = matchingProductByCustomerCode(obj[3].toString(), products);

      if (product) {
        const boxes = obj[4];
        if (!isNaN(boxes)) {
          acc[index].products.push({
            code: product.code,
            ean: product.ean,
            customer_code: product.customer_code,
            descrition: product.description,
            boxes,
            items: boxes * product.boxItems
          });  
        }
      }
    }
    return acc;

  }, []);

  return orders;

};

const parseExcel = async (xlsx, products, warehouses, date) => {

  const switchDate = new Date(2021, 10, 10);
  const orders = [];

  let results;
  if (date < switchDate) {
    results = await parseOldExcel(xlsx, products, warehouses);
  } else {
    results = await parseNewExcel(xlsx, products, warehouses);
  }

  for (const result of results) {

    const { boxes, items } = result.products.reduce((acc, obj) => {
      acc.boxes += obj.boxes;
      acc.items += obj.items;
      return acc;
    }, { boxes: 0, items: 0 });

    orders.push({
      anomalies: [],
      overrides: false,
      destination: {
        address: result.address,
        from: null,
        to: null
      },
      products: result.products,
      totals: {
        boxes,
        items
      }
    });
  }

  return orders;

};

module.exports = {
  parseExcel
};


