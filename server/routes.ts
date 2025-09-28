import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { bot } from './bot.js';
import { verifyInitData } from './verifyInit.js';
import { DB } from './db.js';
import type { Order } from './types.js';

const r = Router();
const upload = multer({ dest: 'uploads/' });

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID!;
const POS_WEBHOOK_URL = process.env.POS_WEBHOOK_URL || '';
const POS_WEBHOOK_SECRET = process.env.POS_WEBHOOK_SECRET || '';
const ADMIN_KEY = process.env.ADMIN_KEY!;

r.get('/menu', (_req,res)=> res.json({ items: DB.items }));

r.post('/admin/item.upsert', (req,res)=>{
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).end();
  const body = req.body;
  if (!body.id) body.id = crypto.randomUUID();
  const i = DB.items.findIndex((x:any)=> x.id===body.id);
  if (i>=0) DB.items[i] = body; else DB.items.push(body);
  res.json({ ok:true, id: body.id });
});

function inServiceArea(text?: string){ return text ? /七号家园/.test(text) : false; }

r.post('/address', (req,res)=>{
  const { initData, address } = req.body;
  if (!verifyInitData(initData)) return res.status(403).end();
  if (!inServiceArea(address?.text)) return res.status(400).json({ ok:false, error:'仅支持七号家园内配送' });

  const match = initData.match(/(?:^|&)user=([^&]+)/);
  const userStr = match ? decodeURIComponent(match[1]) : '';
  const user = userStr ? JSON.parse(userStr) : null;
  DB.addresses.set(user.id, address);
  res.json({ ok:true });
});

r.post('/order', async (req,res)=>{
  const { initData, cart, payMethod, note } = req.body;
  if (!verifyInitData(initData)) return res.status(403).end();

  const userStr = decodeURIComponent((initData.match(/(?:^|&)user=([^&]+)/)||[])[1] || '');
  const user = userStr ? JSON.parse(userStr) : null;
  if (!user?.id) return res.status(400).json({ ok:false, error:'no user' });

  const addr = DB.addresses.get(user.id);
  if (!addr || !inServiceArea(addr.text)) return res.status(400).json({ ok:false, error:'地址不在配送范围' });

  const deliveryFee = 5;
  const items = cart.map((it:any)=>({
    ...it,
    price: it.unitPrice * it.qty + (it.addons?.reduce((s:any,a:any)=>s+a.price,0)||0) * it.qty
  }));
  const subtotal = items.reduce((s:any,i:any)=> s+i.price, 0);
  const total = subtotal + deliveryFee;

  const order: Order = {
    id: crypto.randomUUID(),
    userId: user.id,
    items, subtotal, deliveryFee, total,
    addressText: addr.text, addressContact: addr.contact, addressPhone: addr.phone,
    note, payMethod, status:'pending', createdAt: Date.now()
  };
  DB.orders.push(order);

  await Promise.all([
    notifyMerchant(order),
    pushToPOS(order).catch(e => console.error('POS webhook error', e))
  ]);

  res.json({ ok:true, orderId: order.id, status: order.status });
});

r.post('/order/:id/payproof', upload.single('file'), (req,res)=>{
  res.json({ ok:true, file: req.file?.filename });
});

async function notifyMerchant(order: Order) {
  const lines = order.items.map(it =>
    `• ${it.name}${it.size?`(${it.size})`:''} x${it.qty}  ¥${it.price}`).join('\n');
  const text =
`🧋 新订单 #${order.id}
支付：${order.payMethod==='cash'?'现金到付':'汇旺'}
金额：¥${order.total}（含运费¥${order.deliveryFee}）
地址：${order.addressText}
联系人：${order.addressContact||''} ${order.addressPhone||''}
备注：${order.note||'无'}

${lines}`;

  await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, {
    reply_markup: { inline_keyboard: [[
      { text:'✅ 确认', callback_data:`order:confirm:${order.id}` },
      { text:'❌ 取消', callback_data:`order:cancel:${order.id}` }
    ]]}
  });
}

function signPayload(obj: object) {
  return crypto.createHmac('sha256', POS_WEBHOOK_SECRET).update(JSON.stringify(obj)).digest('hex');
}
async function pushToPOS(order: Order) {
  if (!POS_WEBHOOK_URL) return;
  const payload = {
    event: 'order.created',
    ts: Date.now(),
    order: {
      id: order.id, total: order.total, subtotal: order.subtotal, delivery_fee: order.deliveryFee,
      pay_method: order.payMethod, note: order.note || '',
      address: { text: order.addressText, contact: order.addressContact, phone: order.addressPhone },
      items: order.items.map(i=>({
        sku: i.itemId, name: i.name, qty: i.qty,
        unit_price: i.unitPrice, size: i.size||null, sugar: i.sugar||null, ice: i.ice||null,
        addons: i.addons||[], line_total: i.price
      }))
    }
  };
  await fetch(POS_WEBHOOK_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'X-Signature': signPayload(payload) },
    body: JSON.stringify(payload)
  });
}

export default r;
