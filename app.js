const DEFAULT_PRODUCTS=[
{id:1,name:"زعفران ممتاز",price:2500000,category:"زعفران",image:"assets/zafaran.svg"},
{id:2,name:"ادویه مخصوص",price:180000,category:"ادویه",image:"assets/advieh.svg"},
{id:3,name:"شربت زعفران",price:220000,category:"شربت",image:"assets/sharbat.svg"},
{id:4,name:"قهوه فوری",price:150000,category:"قهوه",image:"assets/coffee.svg"}];

let products=JSON.parse(localStorage.getItem("may_products")||"null")||DEFAULT_PRODUCTS;
let cart=JSON.parse(localStorage.getItem("may_cart")||"[]");

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0)+" تومان";
const fa=n=>new Intl.NumberFormat("fa-IR").format(n);

function save(){
  localStorage.setItem("may_products",JSON.stringify(products));
  localStorage.setItem("may_cart",JSON.stringify(cart));
}
function safe(s){
  return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function imgSrc(src){ return src || "assets/coffee.svg"; }

async function loadProducts(){
  try{
    const r=await fetch(API_BASE+"/api/products",{cache:"no-store",headers:{"accept":"application/json"}});
    const data=await r.json();
    if(data.ok && Array.isArray(data.products)){
      products=data.products;
      localStorage.setItem("may_products",JSON.stringify(products));
    }
  }catch(e){ /* local fallback */ }
  renderCategories(); renderProducts(); updateCount(); renderCart();
}

function renderCategories(){
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];
  $("category").innerHTML='<option value="">همه دسته‌ها</option>'+
    cats.map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join("");
}
function renderProducts(){
  const q=$("search").value.trim().toLowerCase();
  const cat=$("category").value;
  const list=products.filter(p=>
    (!q || String(p.name).toLowerCase().includes(q) || String(p.category).toLowerCase().includes(q)) &&
    (!cat || p.category===cat)
  );
  $("empty").classList.toggle("hidden",list.length!==0);
  $("products").innerHTML=list.map(p=>`
    <article class="card">
      <img src="${imgSrc(p.image)}" alt="${safe(p.name)}"
           onerror="this.onerror=null;this.src='assets/coffee.svg'">
      <div class="card-body">
        <h3>${safe(p.name)}</h3>
        <div class="cat">دسته: ${safe(p.category)}</div>
        <div class="price">${money(p.price)}</div>
        <button class="primary" onclick="addToCart(${Number(p.id)})">🛒 افزودن به سبد</button>
      </div>
    </article>`).join("");
}
function addToCart(id){
  const product=products.find(p=>p.id===id);
  if(!product)return;
  const x=cart.find(i=>i.id===id);
  x?x.qty++:cart.push({id,qty:1});
  save(); updateCount(); openCart();
}
function updateCount(){ $("cartCount").textContent=fa(cart.reduce((s,i)=>s+i.qty,0)); }
function openCart(){renderCart();$("cartModal").classList.remove("hidden")}
function closeCart(){$("cartModal").classList.add("hidden")}
function renderCart(){
  const items=cart.map(i=>({...i,p:products.find(p=>p.id===i.id)})).filter(x=>x.p);
  $("cartItems").innerHTML=items.length?items.map(x=>`
    <div class="cart-line">
      <img src="${imgSrc(x.p.image)}" alt="">
      <div class="grow"><b>${safe(x.p.name)}</b><div>${money(x.p.price)}</div></div>
      <div class="qty">
        <button type="button" onclick="changeQty(${x.p.id},-1)">−</button>
        <b>${fa(x.qty)}</b>
        <button type="button" onclick="changeQty(${x.p.id},1)">+</button>
      </div>
      <button type="button" class="remove" onclick="removeFromCart(${x.p.id})">حذف</button>
    </div>`).join(""):"<p>سبد خرید خالی است.</p>";
  const total=items.reduce((s,x)=>s+x.p.price*x.qty,0);
  $("cartTotal").textContent=money(total);
  $("checkoutBtn").disabled=!items.length;
}
function changeQty(id,d){
  const x=cart.find(i=>i.id===id); if(!x)return;
  x.qty+=d;
  if(x.qty<=0)cart=cart.filter(i=>i.id!==id);
  save();updateCount();renderCart();
}
function removeFromCart(id){
  cart=cart.filter(i=>i.id!==id);
  save();updateCount();renderCart();
}
function getOrderData(){
  const items=cart.map(i=>({...i,p:products.find(p=>p.id===i.id)})).filter(x=>x.p);
  return {
    customer:{
      name:$("customerName").value.trim(),
      phone:$("phone").value.trim(),
      address:$("address").value.trim()
    },
    items:items.map(x=>({id:x.p.id,name:x.p.name,qty:x.qty,price:x.p.price})),
    total:items.reduce((s,x)=>s+x.p.price*x.qty,0)
  };
}
function buildOrderText(data){
  const lines=[
    "سلام، می‌خواهم از MAY.SHOP سفارش ثبت کنم.",
    "",
    `نام: ${data.customer.name}`,
    `شماره تماس: ${data.customer.phone}`,
    `آدرس: ${data.customer.address}`,
    "",
    "محصولات:"
  ];
  data.items.forEach(x=>lines.push(`- ${x.name} × ${fa(x.qty)} = ${money(x.price*x.qty)}`));
  lines.push("",`جمع کل: ${money(data.total)}`);
  return lines.join("\n");
}

$("search").addEventListener("input",renderProducts);
$("category").addEventListener("change",renderProducts);
$("cartBtn").addEventListener("click",openCart);
$("checkoutBtn").addEventListener("click",()=>{
  if(!cart.length){renderCart();return;}
  const form=$("orderForm");
  form.classList.add("show-form");
  setTimeout(()=>form.querySelector("#customerName").focus(),50);
});

function openBale(){
  const phone = "09122468958";
  const text = "سلام، شماره پیگیری واریز سفارش MAY.SHOP را ارسال می‌کنم.";
  window.open("https://ble.ir/"+phone+"?text="+encodeURIComponent(text),"_blank");
}


$("orderForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const result=$("orderResult");
  if(!cart.length){result.textContent="سبد خرید خالی است.";return;}
  const data=getOrderData();
  if(!data.customer.name||!data.customer.phone||!data.customer.address){
    result.textContent="لطفاً نام، موبایل و آدرس را کامل وارد کنید.";
    return;
  }

  result.textContent="در حال ثبت سفارش در مدیریت...";
  try{
    const r=await fetch(API_BASE+"/api/orders",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(data)
    });
    const out=await r.json();
    if(!r.ok||!out.ok) throw new Error(out.error||"ثبت سفارش ناموفق بود.");

    const created = new Date(out.order.createdAt);
    result.innerHTML=`<div class="success-box">
      <h3>✅ سفارش شما با موفقیت ثبت شد</h3>
      <p>کد سفارش: <b>${safe(out.order.id)}</b></p>
      <p>زمان ثبت سفارش: <b>${safe(created.toLocaleString("fa-IR"))}</b></p>
      <p>مبلغ قابل پرداخت: <b>${money(out.order.total)}</b></p>
    </div>
    <div class="payment-box">
      <h3>💳 پرداخت سفارش</h3>
      <p>برای نهایی شدن سفارش، مبلغ بالا را به کارت زیر واریز کنید:</p>
      <div class="card-number">6037&nbsp;9973&nbsp;6131&nbsp;3746</div>
      <p><b>بانک ملی</b><br>به نام <b>محمد علی یعقوبی‌زاده</b></p>
      <p>پس از واریز، <b>شماره پیگیری واریز</b> را در پلتفرم <b>بله</b> برای ما ارسال کنید.</p>
      <button type="button" class="primary full" onclick="openBale()">🔵 ارسال شماره پیگیری در بله</button>
    </div>`;

    cart=[];
    save();
    updateCount();
    renderCart();
  }catch(err){
    result.innerHTML=`<div class="error-box">❌ سفارش در مدیریت ثبت نشد.<br>${safe(err.message)}<br><small>لطفاً دوباره تلاش کنید.</small></div>`;
  }
});

renderCategories();renderProducts();updateCount();
loadProducts();
