const tg = window.Telegram.WebApp;
tg.expand();
const initData = tg.initData;

let cart = [];
const $app = document.getElementById('app');
const $count = document.getElementById('cartCount');

function render(items){
  $app.innerHTML = (items||[]).map(it => `
    <div class="card">
      <div class="name">${it.name}</div>
      <div>¥${it.price}</div>
      <button data-id="${it.id}" class="add">加入</button>
    </div>
  `).join('');
  [...document.querySelectorAll('.add')].forEach(btn=>{
    btn.onclick = ()=>{
      const item = items.find(x=>x.id===btn.dataset.id);
      cart.push({ itemId:item.id, name:item.name, qty:1, unitPrice:item.price, price:item.price });
      $count.textContent = cart.length;
    };
  });
}

async function init(){
  const menu = await fetch('/api/menu').then(r=>r.json());
  render(menu.items || []);

  document.getElementById('checkout').onclick = async ()=>{
    const addressText = prompt('请输入地址（需包含“七号家园”）');
    const contact = prompt('联系人');
    const phone = prompt('手机号/电话');

    await fetch('/api/address', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ initData, address:{ text:addressText, contact, phone } })
    });

    const pay = await new Promise(res=>{
      tg.showPopup({ title:'选择支付', message:'请选择支付方式',
        buttons:[
          {id:'cash',type:'default',text:'现金'},
          {id:'huiwang',type:'default',text:'汇旺'},
          {type:'cancel'}
        ]}, id=>res(id));
    });
    if (!pay || pay==='cancel') return;

    const result = await fetch('/api/order', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ initData, cart, payMethod: pay, note: '' })
    }).then(r=>r.json());

    if (result.ok) tg.showAlert('下单成功！我们正在为您处理～');
    else tg.showAlert('下单失败：' + (result.error||'未知错误'));
  };
}
init();
