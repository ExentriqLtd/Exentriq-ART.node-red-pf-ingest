const getDateFromString = (stringDate) => {

  try {
    return new Date(parseInt(stringDate.slice(6, 10)), parseInt(stringDate.slice(3, 5)) - 1, parseInt(stringDate.slice(0, 2)), 10, 00).toISOString().slice(0, 10);
  } catch (error) {
    throw ('Invalid date');
  }

};

const getDateFromFilename = (filename) => {

  const chunks = filename.split('_');
  if (chunks.length === 3) {
    const stringDate = chunks[1];
    try {
      return new Date(parseInt(stringDate.slice(0, 4)), parseInt(stringDate.slice(4, 6)) - 1, parseInt(stringDate.slice(6, 8)), 10, 00).toISOString().slice(0, 10);
    } catch (error) {
      throw('Invalid date');
    }

  }
};

const analyzeOrder = (items, products, filename) => {

  const order = {
    customer: 'Ortofin',
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
      banks: 0,
      items: 0
    }
  };

  if (items.find(x => x.indexOf('Il Presente Annulla e Sostituisce il Precedente') > -1)) {
    order.overrides = true;
  }

  let index = items.indexOf('Origine');

  if (index > -1 && items[index + 1] === '') {
    const productCount = ((items.length - (index + 2)) / 9);

    for (const product of products) {
      const index = items.indexOf(product.code);
      if (index > -1) {
        const orderProduct = {
          code: product.code,
          description: product.description,
          banks: parseInt(items[index + 8]),
          items: parseInt(items[index + 5])
        }
        if (orderProduct.items !== orderProduct.banks * product.bankItems) {
          order.anomalies.push(`Product "${product.description}": number of items (${orderProduct.items}) is not equal to number of banks (${orderProduct.banks}) multiplied by ${product.bankItems}`);
        }
        order.totals.banks += orderProduct.banks;
        order.totals.items += orderProduct.items;
        order.products.push(orderProduct);
      }
    }  
  } else {
    order.anomalies.push('Product table not recognized');
  }


  index = items.indexOf('Pag 1 di 1');
  if (index > -1) {
    order.number = items[index - 3];
    const orderDate = items[index - 2];
    try {
      order.date = getDateFromString(orderDate);
    } catch (error) {
      order.anomalies.push('Order date is not valid');
    }
    const deliveryDate = items[index - 1];
    try {
      order.delivery = getDateFromString(deliveryDate);
    } catch (error) {
      order.anomalies.push('Delivery date is not valid');
    }
    try {
      order.destination.address = `${items[index + 3]}, ${items[index + 4]}`;      
    } catch (error) {
      order.anomalies.push('Destination not recognized');
    }
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
      banks: 0,
      items: 0,
      cost: 0
    }
  };

  if (filename) {
    confirmation.date = getDateFromFilename(filename);
  }

  for (const product of products) {
    const index = items.indexOf(product.code);
    if (index > -1) {

      const offset = items[index + 4] === 'C212' ? 0 : 3;
      // sometimes "lotto" and "scadenza" are missing...

      const orderProduct = {
        code: product.code,
        description: product.description,
        banks: parseInt(items[index + 6 + offset]),
        items: parseInt(items[index + 7 + offset]),
        unitCost: parseFloat(items[index + 8 + offset].replace(',', '.'))
      }
      if (orderProduct.items !== orderProduct.banks * product.bankItems) {
        confirmation.anomalies.push(`Product "${product.description}": number of items (${orderProduct.items}) is not equal to number of banks (${orderProduct.banks}) multiplied by ${product.bankItems}`);
      }
      orderProduct.totalCost = parseFloat((orderProduct.unitCost * orderProduct.items).toFixed(4));
      confirmation.totals.banks += orderProduct.banks;
      confirmation.totals.items += orderProduct.items;
      confirmation.totals.cost += orderProduct.totalCost;
      confirmation.totals.cost = parseFloat(confirmation.totals.cost.toFixed(4));
      confirmation.products.push(orderProduct);
    }
  }

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
    needle: 'ORDINE D\'ACQUISTO',
    analyzer: analyzeOrder
  },
  {
    name: 'confirmation',
    needle: 'RISCONTRO D.D.T.',
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
