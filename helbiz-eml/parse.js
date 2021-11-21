
const regexes = {
  deliverySubject: /ordine helbiz per \w{3} (?<day>\d{1,2})\/(?<month>\d{1,2})/,
  deliveryBody: /consegna per \w{3} (?<day>\d{1,2})\/(?<month>\d{1,2})/,
  product: /\-\s*(?<description>.*):\s*(?<boxes>\d{1,2})\s*ct/
}

const today = new Date();

const parseMessage = (body, subject, date, products) => {

  const messageDate = new Date(date);

  const order = {
    number: `Helbiz_${messageDate.getFullYear()}${(messageDate.getMonth() + 1).toString().padStart(2, '0')}${messageDate.getDate().toString().padStart(2, '0')}`,
    date: messageDate.toISOString().slice(0, 10),
    delivery: null,
    anomalies: [],
    destinations: [
      {
        address: null,
        from: null,
        to: null,
        products: []
      }
    ],
    totals: {
      boxes: 0,
      items: 0
    }
  };

  const subjectMatch = subject.toLowerCase().match(regexes.deliverySubject);
  if (subjectMatch) {
    const deliveryDate = new Date(today.getFullYear(), parseInt(subjectMatch.groups.month) - 1, parseInt(subjectMatch.groups.day), 10, 0);
    order.delivery = deliveryDate.toISOString().slice(0, 10);
  }

  const rows = body.split('\n').map(x => x.trim().toLowerCase()).filter(x => x !== '');
  for (const row of rows) {
    const matches = {
      delivery: row.match(regexes.deliveryBody),
      product: row.match(regexes.product)
    };
    if (matches.delivery) {
      const deliveryDate = new Date(today.getFullYear(), parseInt(matches.delivery.groups.month) - 1, parseInt(matches.delivery.groups.day), 10, 0);
      const delivery = deliveryDate.toISOString().slice(0, 10);
      if (delivery !== order.delivery) {
        order.anomalies.push(`Delivery date in subject (${order.delivery}) and delivery date in body (${delivery}) don't match!`);
      }
    } else if (matches.product) {
      const product = products.find(x => x.description.toLowerCase().startsWith(matches.product.groups.description));
      if (product) {
        const boxes = parseInt(matches.product.groups.boxes);
        const items = boxes * product.boxItems;
        order.destinations[0].products.push({
          code: product.code,
          ean: product.ean,
          description: product.description,
          boxes,
          items
        });
        order.totals.boxes += boxes;
        order.totals.items += items;
      }
    }
  }
  return order;
};

module.exports = {
  parseMessage
};
