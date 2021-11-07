const regexes = {
  warehouse: /(?<delivery>\d{1,2}\/\d{1,2}\/\d{2}) dalle ore (?<from>\d{1,2}:\d{2}) alle ore (?<to>\d{1,2}:\d{2})/
};

const getDateFromString = (dateString) => {

  try {
    const match = dateString.match(/(?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{2})/);
    if (match) {
      const parsedDate = {
        day:  parseInt(match.groups.day),
        month: parseInt(match.groups.month),
        year: parseInt(match.groups.year) + 2000
      };
      return new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, 10, 00).toISOString().slice(0, 10);
    }
  } catch (error) {
    throw ('Invalid date');
  }
};

const getTimeFromString = (timeString) => {
  try {
    const match = timeString.match(/(?<hour>\d{1,2}):(?<minute>\d{2})/);
    if (match) {
      return `${match.groups.hour.padStart(2, 0)}:${match.groups.minute.padStart(2, 0)}`;
    }
  } catch (error) {
    throw ('Invalid time');
  }
};

const analyzeOrder = (items, products, filename) => {

  const order = {
    customer: 'Rialto',
    anomalies: [],
    number: null,
    overrides: false,
    date: null,
    delivery: null,
    destination: {
      address: null,
      from: null,
      to: null
    },
    products: [],
    totals: {
      boxes: 0,
      items: 0
    }
  };

  // if (items.find(x => x.indexOf('Il Presente Annulla e Sostituisce il Precedente') > -1)) {
  //   order.overrides = true;
  // }

  const detailsStart = items.map(x => x.slice(0, 9)).indexOf('Ordine n.');
  const productsStart = items.indexOf('-'.repeat(132));
  const productsEnd = items.indexOf('**** FINE ORDINE ****');

  order.number = items[detailsStart + 7];

  try {
    order.date = getDateFromString(items[detailsStart + 9]);
  } catch (error) {
    order.anomalies.push('Order date is not valid');
  }

  order.destination.address = items[detailsStart + 11];

  const warehouse = items[detailsStart + 14];

  try {
    const match = warehouse.match(regexes.warehouse);
    if (match) {
      order.delivery = getDateFromString(match.groups.delivery);
      order.destination.from = getTimeFromString(match.groups.from);
      order.destination.to = getTimeFromString(match.groups.to);
    }
  } catch (error) {
    order.anomalies.push('Delivery date is not valid');
  }



  // try {
  //   order.delivery = getDateFromString(deliveryDate);
  // } catch (error) {
  //   order.anomalies.push('Delivery date is not valid');
  // }


  if (productsStart > -1 && productsEnd > productsStart) {

    for (const product of products) {

      const index = items.indexOf(product.customer_code);
      if (index > -1) {

        let lastIndex = 0;

        for (let i = 1; i < 20; i++) {
          if (items[index + i].match(/\d{2}\/\d{2}\/\d{2}/)) {
            lastIndex = i;
            break;
          }
        }

        if (lastIndex === 0) {
          order.anomalies.push(`Product "${product.description}": cannot parse details`);
        } else {
          const orderProduct = {
            code: product.code,
            customer_code: product.customer_code,
            ean: product.ean,
            description: product.description,
            boxes: parseInt(items[index + lastIndex - 6]),
            items: parseInt(items[index + lastIndex - 6] * items[index + lastIndex - 8])
          }
          if (orderProduct.items !== orderProduct.boxes * product.boxItems) {
            order.anomalies.push(`Product "${product.description}": number of items (${orderProduct.items}) is not equal to number of boxes (${orderProduct.boxes}) multiplied by ${product.boxItems}`);
          }
          order.totals.boxes += orderProduct.boxes;
          order.totals.items += orderProduct.items;
          order.products.push(orderProduct);  
        }
      }
    }  
  } else {
    order.anomalies.push('Product table not recognized');
  }

  return order;
};

const analyzeConfirmation = (items, products, filename) => {

  const confirmation = {
    customer: 'Ortofin',
    anomalies: [],
    date: null,
    order: null,
    shipping: {
      code: null,
      date: null
    },
    products: [],
    totals: {
      boxes: 0,
      items: 0,
      cost: 0
    }
  };

  if (filename) {
    confirmation.date = getDateFromFilename(filename);
  }

  for (const product of products) {
    const index = items.indexOf(product.customer_code);
    if (index > -1) {

      // sometimes "lotto" and "scadenza" are missing...
      let offset;
      if (items[index + 4] === 'C212') {
        offset = 0;
      } else if (items[index + 6] === 'C212') {
        offset = 2;
      } else {
        offset = 3;
      }

      const orderProduct = {
        code: product.code,
        customer_code: product.customer_code,
        ean: product.ean,
        description: product.description,
        boxes: parseInt(items[index + 6 + offset]),
        items: parseInt(items[index + 7 + offset]),
        unit_cost: parseFloat(items[index + 8 + offset].replace(',', '.'))
      }
      if (orderProduct.items !== orderProduct.boxes * product.boxItems) {
        confirmation.anomalies.push(`Product "${product.description}": number of items (${orderProduct.items}) is not equal to number of boxes (${orderProduct.boxes}) multiplied by ${product.boxItems}`);
      }
      orderProduct.total_cost = parseFloat((orderProduct.unit_cost * orderProduct.items).toFixed(4));
      confirmation.totals.boxes += orderProduct.boxes;
      confirmation.totals.items += orderProduct.items;
      confirmation.totals.cost += orderProduct.total_cost;
      confirmation.products.push(orderProduct);
    }
  }
  confirmation.totals.cost = parseFloat(confirmation.totals.cost.toFixed(4));

  const index = items.indexOf('Vostro D.D.T. di consegna numero');
  if (index > -1) {
    try {
      confirmation.shipping.code = items[index + 1];
    } catch (error) {
      confirmation.anomalies.push('Shipping code not recognized');
    }

    try {
      confirmation.shipping.date = getDateFromString(items[index + 2]);
    } catch (error) {
      confirmation.anomalies.push('Shipping date is not valid');
    }
  }


  return confirmation;
};

const documentTypes = [
  {
    name: 'order',
    needle: 'Ordine n.',
    analyzer: analyzeOrder
  },
  {
    name: 'confirmation',
    needle: 'Riscontro n.',  // ??? to be confirmed
    analyzer: analyzeConfirmation
  }
];

const analyzeText = (text, products, filename = null) => {

  try {

    let result = {
      documentType: 'unknown',
      content: undefined
    };

    for (const documentType of documentTypes) {
      if (text.items.filter(x => x.str.startsWith(documentType.needle)).length === 1) {
        result = {
          documentType: documentType.name,
          content: documentType.analyzer(text.items.map(x => x.str.trim()), products, filename)
        };
        break;
      }
    }
  
    return result;
  
  } catch (error) {
    throw(error);
  }

};

module.exports = {
  analyzeText
};
