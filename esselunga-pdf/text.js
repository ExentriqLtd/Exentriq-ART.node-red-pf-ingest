const regexes = {
  order: {
    number: /TRASMETTIAMO NOSTRO ORDINE DI ACQUISTO\s*(?<number>\w\/\d*) DEL/,
    date: /TRASMETTIAMO NOSTRO ORDINE DI ACQUISTO\s*.*DEL\s*(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4})/,
    destination: /^(?<address>.*)$\n^ATTENZIONE: IL NOSTRO/m,
    delivery: /CONSEGNARE TASSATIVAMENTE IL (?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{1,2})/,
    warehouse: /IL NOSTRO MAGAZZINO RICEVE MERCI DALLE (?<fromHour>\d{1,2})\.(?<fromMinute>\d{1,2}) ALLE (?<toHour>\d{1,2})\.(?<toMinute>\d{1,2})/,
    products: /(?<code>\d{6,})\s*(?<description>[\w\s]*G)\s*(?<quantity>\d*)\s*(?<cost>[\d\,\s]*)\n/g,
    bankCount: /TOTALE COLL[IT]\s*(?<count>\d*)/
  },
  confirmation: {
    number: /ORDINE NR. (?<number>\w\/\d*)/,
    products: /(?<code>\d{6,})\s*(?<description>[\w\s]*?G*)\s{4,}(?<banks>\d*)\s{4,}(?<items>\d*)\s{5,}(?<unitCost>\d{1,2},\s{0,1}\d{4,})\s{4,}(?<totalCost>\d{1,5},\s{0,1}\d{4,})/g,
    totals: /\n(?<bankTotal>\d*)\s{1,}(?<itemTotal>[\d\.]*)\s{5,}(?<costTotal>[\d\.]*,\s{0,1}\d{4,})\nSi prega di verificare/,
    date: /Distinti saluti\nLimito di Pioltello, (?<day>\d{2,}) (?<month>\w*) (?<year>\d{4})/
  }
};

const months = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

const fixDatePart = (datePart) => {

  if (datePart === 109) {
    datePart = 10;
  }
  if (datePart === 209) {
    datePart = 20;
  }
  if (datePart > 80 && datePart < 90) {
    datePart -= 80;
  }
  if (datePart > 60 && datePart < 70) {
    datePart -= 60;
  }

  return datePart;

};

const analyzeOrder = (text) => {

  const order = {
    anomalies: []
  };
  
  let match;

  match = text.match(regexes.order.number);
  if (match) {
    order.number = match.groups.number;
  } else {
    order.anomalies.push('Order number not recognized');
  }

  match = text.match(regexes.order.date);
  if (match) {
    const orderDate = {
      day:  parseInt(match.groups.day),
      month: parseInt(match.groups.month) - 1,
      year: parseInt(match.groups.year)
    };

    if (orderDate.day > 80) {
      orderDate.day -= 80;
    } else if (orderDate.day > 60) {
      orderDate.day -= 60;
    }

    const options = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    try {
      order.date = new Date(orderDate.year, orderDate.month, orderDate.day, 10, 00).toLocaleDateString('it-IT', options);      
    } catch (error) {
      order.anomalies.push('Order date is not valid');
    }
  } else {
    order.anomalies.push('Order date not recognized');
  }

  match = text.match(regexes.order.destination);
  if (match) {
    order.destination = match.groups.address.replace(/\s{2,}/g, ' ');
  } else {
    oreder.anomalies.push('Destination address not recognized');
  }

  match = text.match(regexes.order.bankCount);
  if (match) {
    order.bankCount = parseInt(match.groups.count.replace('.', ''));
  } else {
    order.anomalies.push('Total bank count not recognized');
  }

  match = text.match(regexes.order.delivery);
  if (match) {
    const deliveryDate = {
      day:  parseInt(match.groups.day),
      month: parseInt(match.groups.month) - 1,
      year: parseInt(match.groups.year) + 2000
    };
    const options = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    try {
      order.delivery = new Date(deliveryDate.year, deliveryDate.month, deliveryDate.day, 10, 00).toLocaleDateString('it-IT', options);      
    } catch (error) {
      order.anomalies.push('Delivery date is not valid');
    }
  } else {
    order.anomalies.push('Delivery date not recognized');
  }

  match = text.match(regexes.order.warehouse);
  if (match) {
    order.warehouse = {
      from: `${match.groups.fromHour}:${match.groups.fromMinute}`,
      to: `${match.groups.toHour}:${match.groups.toMinute}`
    }
  } else {
    order.anomalies.push('Warehouse opening hours not recognized');
  }

  const matches = [...text.matchAll(regexes.order.products)];
  if (matches.length > 0) {
    order.products = [];
    for (const match of matches) {
      const product = {
        code: match.groups.code.trim(),
        description: match.groups.description.trim(),
        quantity: parseInt(match.groups.quantity),
        cost: parseFloat(match.groups.cost.replace(/\s*/g, '').replace(',', '.'))
      };
      order.products.push(product);
    }
  } else {
    order.anomalies.push('Products not recognized');
  }
  
  const totals = order.products.reduce((acc, curr) => {
    return {
      bankCount: acc.bankCount + curr.quantity,
      totalCost: acc.totalCost + curr.cost * curr.quantity * 8 // items are bank (8 packages each)
    };
  }, { bankCount: 0, totalCost: 0 });
  
  if (totals.bankCount !== order.bankCount) {
    order.anomalies.push(`Calculated item count (${totals.bankCount}) is different from the read item count (${order.bankCount})`);
  }
  order.totalCost = totals.totalCost;
  return order;
};

const analyzeConfirmation = (text) => {

  const confirmation = {
    products: [],
    totals: {},
    anomalies: []
  };

  let match;
  
  match = text.match(regexes.confirmation.number);
  if (match) {
    confirmation.orderNumber = match.groups.number;
  } else {
    confirmation.anomalies.push('Order number not recognized');
  }

  match = text.match(regexes.confirmation.date);
  if (match) {
    const confirmationDate = {
      day:  parseInt(match.groups.day),
      month: months.indexOf(match.groups.month.toLowerCase()),
      year: parseInt(match.groups.year)
    };

    confirmationDate.day = fixDatePart(confirmationDate.day);
    confirmationDate.month = fixDatePart(confirmationDate.month);

    const options = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    try {
      confirmation.date = new Date(confirmationDate.year, confirmationDate.month, confirmationDate.day, 10, 00).toLocaleDateString('it-IT', options);      
    } catch (error) {
      confirmation.anomalies.push('Confirmation date is not valid');
    }
  } else {
    confirmation.anomalies.push('Confirmation date not recognized');
  }

  const matches = [...text.matchAll(regexes.confirmation.products)];
  if (matches.length > 0) {
    for (const match of matches) {
      const product = {
        code: match.groups.code.trim(),
        description: match.groups.description.trim(),
        banks: parseInt(match.groups.banks),
        items: parseInt(match.groups.items),
        unitCost: parseFloat(match.groups.unitCost.replace(/\s*/g, '').replace(',', '.')),
        totalCost: parseFloat(match.groups.totalCost.replace(/\s*/g, '').replace(',', '.'))
      };
      confirmation.products.push(product);
    }
  } else {
    confirmation.anomalies.push('Products not recognized');
  }

  match = text.match(regexes.confirmation.totals);
  if (match) {
    confirmation.totals.banks = parseInt(match.groups.bankTotal.replace('.', ''));
    confirmation.totals.items = parseInt(match.groups.itemTotal.replace('.', ''));
    confirmation.totals.cost = parseFloat(match.groups.costTotal.replace(/\s*/g, '').replace('.', '').replace(',', '.'));
  } else {
    confirmation.anomalies.push('Totals not recognized');
  }

  // Perform some checks...

  let banks = 0;
  let items = 0;
  let cost = 0;

  for (const product of confirmation.products) {
    if (product.items !== 8 * product.banks) {
      confirmation.anomalies.push(`Product "${product.description}": number of items (${product.items}) is not equal to number of banks (${product.banks}) multiplied by 8`);
    }
    if ((product.items * product.unitCost).toFixed(4) !== product.totalCost.toFixed(4)) {
      confirmation.anomalies.push(`Product "${product.description}": total cost (€ ${product.totalCost}) is not equal to number of items (${product.items}) multiplied by unit cost (€ ${product.unitCost})`);
    }
    banks += product.banks;
    items += product.items;
    cost += product.totalCost;
  }

  if (banks !== confirmation.totals.banks) {
    confirmation.anomalies.push(`Bank total (${confirmation.totals.banks}) is not equal to the sum of banks of products (${banks})`)
  }

  if (items !== confirmation.totals.items) {
    confirmation.anomalies.push(`Item total (${confirmation.totals.items}) is not equal to the sum of items of products (${items})`)    
  }

  if (cost.toFixed(4) !== confirmation.totals.cost.toFixed(4)) {
    confirmation.anomalies.push(`Total cost (€ ${confirmation.totals.cost}) is not equal to the sum of costs of products (€ ${cost})`)
  }

  return confirmation;

};

const documentTypes = [
  {
    name: 'order',
    needle: /TRASMETTIAMO NOSTRO ORDINE DI ACQUISTO/,
    analyzer: analyzeOrder
  },
  {
    name: 'confirmation',
    needle: /Conferma ricezione merce/,
    analyzer: analyzeConfirmation
  }
];

const analyzeText = (text) => {

  let result;

  for (const documentType of documentTypes) {
    if (text.search(documentType.needle) > -1) {
      result = {
        documentType: documentType.name,
        content: documentType.analyzer(text)
      };
      break;
    }
  }

  return result;

};

module.exports = {
  analyzeText
};