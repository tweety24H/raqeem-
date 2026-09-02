// اختبار سريع: يشغّل الخادم مؤقتًا (منفذ تجريبي) ويتحقق من أهم نقاط الـ API.
process.env.RAQEEM_DB_DIR = require('path').join(__dirname, '..', '.smoke-data');
process.env.RAQEEM_PORT = '4399';

const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      {
        method,
        host: 'localhost',
        port: 4399,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let out = '';
        res.on('data', (c) => (out += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(out) });
          } catch {
            resolve({ status: res.statusCode, body: out });
          }
        });
      }
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  require('../server/index.js');
  await new Promise((r) => setTimeout(r, 500));

  const health = await req('GET', '/api/health');
  console.log('health:', health.status, health.body);

  const login = await req('POST', '/api/auth/login', { pin: '1234' });
  console.log('login:', login.status, login.body.worker || login.body);
  if (login.status !== 200) throw new Error('فشل تسجيل الدخول الافتراضي');
  const token = login.body.token;

  const dashboard = await req('GET', '/api/dashboard/summary', null, token);
  console.log('dashboard:', dashboard.status);

  const stock = await req('POST', '/api/stock', {
    name: 'ورق A4',
    unit: 'فرخ',
    quantity: 500,
    min_quantity: 50,
    cost_per_unit: 250,
  }, token);
  console.log('create stock item:', stock.status, stock.body);

  const customer = await req('POST', '/api/customers', { name: 'زبون تجريبي', phone: '07700000000' }, token);
  console.log('create customer:', customer.status, customer.body);

  const services = await req('GET', '/api/services', null, token);
  const svc = services.body.services[0];

  const order = await req(
    'POST',
    '/api/orders',
    {
      customer_id: customer.body.id,
      items: [{ service_id: svc.id, description: svc.name, quantity: 2, unit_price: svc.price, stock_item_id: stock.body.id, stock_qty_used: 2 }],
      discount: 0,
      payment_type: 'partial',
      paid_amount: 10000,
    },
    token
  );
  console.log('create order:', order.status, order.body);
  if (order.status !== 200) throw new Error('فشل إنشاء الطلب');

  const receipt = await req('GET', `/api/orders/${order.body.orderId}/receipt`, null, token);
  console.log('receipt:', receipt.status, !!receipt.body.qrDataUrl);

  console.log('\n✅ كل الاختبارات نجحت');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ فشل الاختبار:', err);
  process.exit(1);
});
