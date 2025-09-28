import crypto from 'crypto';

export function verifyInitData(initData: string) {
  const token = process.env.BOT_TOKEN!;
  const data = new URLSearchParams(initData);
  const hash = data.get('hash')!;
  data.delete('hash');
  const checkString = [...data.entries()]
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calc = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(calc,'hex'));
}
