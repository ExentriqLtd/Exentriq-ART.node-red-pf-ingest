const analyzeText = (text) => {

  const order = {};

  const regexes = {
    order: /ESSELUNGA S\.P\.A\. (?<number>\w\/\d*)-PAG\./,
    destination: /^(?<address>.*)$\n^ATTENZIONE: IL NOSTRO/m,
    delivery: /CONSEGNARE TASSATIVAMENTE IL (?<day>\d{1,2})\/(?<month>\d{1,2})\/(?<year>\d{1,2})/,
    warehouse: /IL NOSTRO MAGAZZINO RICEVE MERCI DALLE (?<fromHour>\d{1,2})\.(?<fromMinute>\d{1,2}) ALLE (?<toHour>\d{1,2})\.(?<toMinute>\d{1,2})/,
    products: /(?<code>\d{6})\s*(?<description>[\w\s]*G)\s*(?<quantity>\d*)\s*(?<price>[\d\,\s]*)\n/g,
    bankCount: /TOTALE COLL[IT]\s*(?<count>\d*)/
  };
  
  let match;

  match = text.match(regexes.order);
  if (match
    && match.groups
    && match.groups.number) {
    order.number = match.groups.number;
  };

  match = text.match(regexes.destination);
  if (match
    && match.groups
    && match.groups.address) {
    order.destination = match.groups.address;
  };

  match = text.match(regexes.bankCount);
  if (match
    && match.groups
    && match.groups.count) {
    order.bankCount = parseInt(match.groups.count);
  };

  match = text.match(regexes.delivery);
  if (match
    && match.groups
    && match.groups.day
    && match.groups.month
    && match.groups.year) {
    const deliveryDate = {
      day:  parseInt(match.groups.day),
      month: parseInt(match.groups.month) - 1,
      year: parseInt(match.groups.year) + 2000
    };
    const options = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    order.delivery = new Date(deliveryDate.year, deliveryDate.month, deliveryDate.day, 10, 00).toLocaleDateString('it-IT', options);
  };

  match = text.match(regexes.warehouse);
  if (match
    && match.groups
    && match.groups.fromHour
    && match.groups.fromMinute
    && match.groups.toHour
    && match.groups.toMinute) {
    order.warehouse = {
      from: `${match.groups.fromHour}:${match.groups.fromMinute}`,
      to: `${match.groups.toHour}:${match.groups.toMinute}`
    }
  }

  const matches = [...text.matchAll(regexes.products)];
  if (matches.length > 0) {
    order.products = [];
    for (const match of matches) {

      if (match.groups
        && match.groups.code
        && match.groups.description
        && match.groups.quantity
        && match.groups.price) {
        const product = {
          code: match.groups.code.trim(),
          description: match.groups.description.trim(),
          quantity: parseInt(match.groups.quantity),
          price: parseFloat(match.groups.price.replace(/\s*/g, '').replace(',', '.'))
        };
        order.products.push(product);
        }
    }
  }
  
  const totals = order.products.reduce((acc, curr) => {
    return {
      bankCount: acc.bankCount + curr.quantity,
      totalPrice: acc.totalPrice + curr.price * curr.quantity * 8 // items are bank (8 packages each)
    };
  }, { bankCount: 0, totalPrice: 0 });
  
  if (totals.bankCount === order.bankCount) {
    order.totalPrice = totals.totalPrice;
    console.log(order);
    return  order;
  } else {
    throw(new Error(`Calculated item count (${totals.bankCount}) is different from the read item count (${order.bankCount})!`));
  }  
};

module.exports = {
  analyzeText
};