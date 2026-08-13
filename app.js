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
function imgSrc(src){
  return src || "assets/coffee.svg";
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
function updateCount(){
  $("cartCount").textContent=fa(cart.reduce((s,i)=>s+i.qty,0));
}
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
function buildOrderText(){
  const items=cart.map(i=>({...i,p:products.find(p=>p.id===i.id)})).filter(x=>x.p);
  const total=items.reduce((s,x)=>s+x.p.price*x.qty,0);
  const lines=[
    "سلام، می‌خواهم از MAY.SHOP سفارش ثبت کنم.",
    "",
    `نام: ${$("customerName").value.trim()}`,
    `شماره تماس: ${$("phone").value.trim()}`,
    `آدرس: ${$("address").value.trim()}`,
    "",
    "محصولات:"
  ];
  items.forEach(x=>lines.push(`- ${x.p.name} × ${fa(x.qty)} = ${money(x.p.price*x.qty)}`));
  lines.push("",`جمع کل: ${money(total)}`);
  return lines.join("\n");
}
$("search").addEventListener("input",renderProducts);
$("category").addEventListener("change",renderProducts);
$("cartBtn").addEventListener("click",openCart);
$("checkoutBtn").addEventListener("click",()=>{
  if(!cart.length){
    renderCart();
    return;
  }
  const form=$("orderForm");
  form.classList.add("show-form");
  setTimeout(()=>form.querySelector("#customerName").focus(),50);
});
function sendOrder(platform){
  if(!cart.length){$("orderResult").textContent="سبد خرید خالی است.";return;}
  const text=buildOrderText();
  const raw=String(SHOP_CONFIG[platform]||"").replace(/\\D/g,"");
  if(!raw){$("orderResult").textContent="این روش تماس هنوز تنظیم نشده است.";return;}
  let url="";
  if(platform==="whatsapp") url="https://wa.me/"+raw+"?text="+encodeURIComponent(text);
  else if(platform==="eitaa") url="https://eitaa.com/"+raw;
  else if(platform==="bale") url="https://ble.ir/"+raw;
  else if(platform==="rubika") url="https://rubika.ir/"+raw;
  window.open(url,"_blank");
}
$("orderForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!cart.length){$("orderResult").textContent="سبد خرید خالی است.";return;}
  $("orderResult").innerHTML=`<div class="send-title">انتخاب روش ارسال سفارش</div>
  <div class="send-grid">
    <button type="button" onclick="sendOrder('whatsapp')">🟢 واتساپ</button>
    <button type="button" onclick="sendOrder('bale')">🔵 بله</button>
    <button type="button" onclick="sendOrder('eitaa')">🟠 ایتا</button>
    <button type="button" onclick="sendOrder('rubika')">🟣 روبیکا</button>
  </div>
  <small>شماره فروشگاه: 0912 246 8958</small>`;
});

renderCategories();renderProducts();updateCount();
