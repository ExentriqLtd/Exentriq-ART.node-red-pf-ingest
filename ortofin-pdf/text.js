const getDateFromString = (stringDate) => {

  const options = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  };

  try {
    return new Date(stringDate.slice(6, 10), stringDate.slice(3, 5), stringDate.slice(0, 2), 10, 00).toLocaleDateString('it-IT', options);  
  } catch (error) {
    throw ('Invalid date');
  }

};

const analyzeOrder = (items, products) => {

  const order = {
    anomalies: [],
    overrides: false,
    totals: {
      banks: 0,
      items: 0,
    }
  };

  let index = items.indexOf('Origine');

  if (index > -1 && items[index + 1] === '') {
    const productCount = ((items.length - (index + 2)) / 9);
    order.products = [];

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
        break;
      }
    }
  

    // for (let i = 0; i < productCount; i++) {
    //   const productIndex = index + 9 * i + 2;
    //   const productCode = items[productIndex];
    //   const matchingProduct = products.find(x => x.code === productCode);
    //   if (matchingProduct) {
    //     order.products.push({
    //       code: matchingProduct.code,
    //       description: matchingProduct.description,
    //       items: parseInt(items[productIndex + 5]),
    //       banks: parseInt(items[productIndex + 8])
    //     });
    //     order.bankCount += parseInt(items[productIndex + 8]);
    //   }
    // }
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
      order.destination = `${items[index + 3]} - ${items[index + 4]}`;      
    } catch (error) {
      order.anomalies.push('Destination not recognized');
    }
  }

  return order;
};

const analyzeConfirmation = (items, products) => {

  const confirmation = {
    anomalies: [],
    products: [],
    totals: {
      banks: 0,
      items: 0,
      cost: 0
    }
  };

  for (const product of products) {
    const index = items.indexOf(product.code);
    if (index > -1) {
      const orderProduct = {
        code: product.code,
        description: product.description,
        banks: parseInt(items[index + 9]),
        items: parseInt(items[index + 10]),
        unitCost: parseFloat(items[index + 11].replace(',', '.'))
      }
      if (orderProduct.items !== orderProduct.banks * product.bankItems) {
        confirmation.anomalies.push(`Product "${product.description}": number of items (${orderProduct.items}) is not equal to number of banks (${orderProduct.banks}) multiplied by ${product.bankItems}`);
      }
      orderProduct.totalCost = orderProduct.unitCost * orderProduct.items;
      confirmation.totals.banks += orderProduct.banks;
      confirmation.totals.items += orderProduct.items;
      confirmation.totals.cost += orderProduct.totalCost;
      confirmation.products.push(orderProduct);
    }
  }

  const index = items.indexOf('Vostro D.D.T. di consegna numero');
  if (index > -1) {
    confirmation.shipping = {

    };
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


const analyzeText = (text, products) => {

  let result;

  for (const documentType of documentTypes) {
    if (text.items.filter(x => x.str.startsWith(documentType.needle)).length === 1) {
      result = {
        documentType: documentType.name,
        content: documentType.analyzer(text.items.map(x => x.str.trim()), products)
      };
      break;
    }
  }

  return result;

};

module.exports = {
  analyzeText
};
