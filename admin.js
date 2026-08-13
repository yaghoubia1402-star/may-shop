const DEFAULT_PRODUCTS=[
{id:1,name:"زعفران ممتاز",price:2500000,category:"زعفران",image:"assets/zafaran.svg"},
{id:2,name:"ادویه مخصوص",price:180000,category:"ادویه",image:"assets/advieh.svg"},
{id:3,name:"شربت زعفران",price:220000,category:"شربت",image:"assets/sharbat.svg"},
{id:4,name:"قهوه فوری",price:150000,category:"قهوه",image:"assets/coffee.svg"}];

let products=JSON.parse(localStorage.getItem("may_products")||"null")||DEFAULT_PRODUCTS;
let orders=[];

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0)+" تومان";
const fa=n=>new Intl.NumberFormat("fa-IR").format(n);
const safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

async function api(path,options={}){
  const r=await fetch(path,{cache:"no-store",...options});
  const data=await r.json().catch(()=>({ok:false,error:"پاسخ نامعتبر سرور"}));
  if(!r.ok||data.ok===false) throw new Error(data.error||"خطای سرور");
  return data;
}

async function loadProducts(){
  try{
    const data=await api("/api/products");
    if(Array.isArray(data.products)){
      products=data.products;
      localStorage.setItem("may_products",JSON.stringify(products));
    }
  }catch(e){
    setStatus("اتصال به مدیریت مشترک برقرار نیست: "+e.message,"error");
  }
  render();
}

async function save(){
  localStorage.setItem("may_products",JSON.stringify(products));
  try{
    await api("/api/products",{
      method:"PUT",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({products})
    });
    setStatus("ذخیره شد و برای فروشگاه قابل مشاهده است.","success");
    return true;
  }catch(e){
    setStatus("محصول فقط روی این دستگاه ذخیره شد؛ ذخیره مشترک انجام نشد. "+e.message,"error");
    return false;
  }
}

function setStatus(text,type=""){
  const el=$("adminStatus");
  if(!el)return;
  el.className="status "+type;
  el.textContent=text;
  clearTimeout(setStatus.timer);
  setStatus.timer=setTimeout(()=>{el.textContent="";el.className="status";},6000);
}

function render(){
 $("adminProducts").innerHTML=products.length?products.map(p=>`
 <div class="admin-row"><img src="${p.image||"assets/coffee.svg"}" onerror="this.src='assets/coffee.svg'">
 <div class="grow"><b>${safe(p.name)}</b><div>${money(p.price)} — ${safe(p.category)}</div></div>
 <button class="edit" onclick="editProduct(${p.id})">ویرایش</button>
 <button class="danger" onclick="del(${p.id})">حذف</button></div>`).join(""):"<p>محصولی وجود ندارد.</p>";
}

async function del(id){
 if(!confirm("این محصول حذف شود؟"))return;
 const old=products;
 products=products.filter(p=>p.id!==id);
 render();
 const ok=await save();
 if(!ok){products=old;render();}
}

function editProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 $("editId").value=p.id;$("name").value=p.name;$("price").value=p.price;$("cat").value=p.category;
 $("imageUrl").value=p.image&&p.image.startsWith("http")?p.image:"";
 $("formTitle").textContent="ویرایش محصول";$("submitBtn").textContent="ذخیره تغییرات";
 window.scrollTo({top:0,behavior:"smooth"});
}
function resetForm(){
 $("editId").value="";$("productForm").reset();
 $("formTitle").textContent="افزودن محصول";$("submitBtn").textContent="افزودن محصول";
}
function readImage(file){
 return new Promise((resolve,reject)=>{
  const fr=new FileReader();
  fr.onload=()=>{
   const im=new Image();
   im.onload=()=>{
    const max=1000, scale=Math.min(1,max/im.width,max/im.height);
    const c=document.createElement("canvas");c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    resolve(c.toDataURL("image/jpeg",.82));
   };
   im.onerror=reject;im.src=fr.result;
  };
  fr.onerror=reject;fr.readAsDataURL(file);
 });
}

$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const id=$("editId").value;
 let image=$("imageUrl").value.trim()||"assets/coffee.svg";
 const file=$("imageFile").files[0];
 if(file) image=await readImage(file);
 const item={id:id?Number(id):Date.now(),name:$("name").value.trim(),price:Number($("price").value),category:$("cat").value.trim(),image};
 const old=products;
 if(id) products=products.map(p=>p.id===Number(id)?item:p); else products.push(item);
 render();
 const ok=await save();
 if(ok){resetForm();alert(id?"محصول ویرایش شد.":"محصول با موفقیت اضافه شد.");}
 else {products=old;render();}
});
$("cancelEdit").onclick=resetForm;

async function loadOrders(){
 const list=$("ordersList");
 list.innerHTML="<p>در حال دریافت سفارش‌ها...</p>";
 try{
  const health=await api("/api/health");
  if(!health.storage) throw new Error("ORDERS_KV به Worker متصل نیست.");
  const data=await api("/api/orders");
  orders=Array.isArray(data.orders)?data.orders:[];
  renderOrders();
  setStatus("اتصال سفارش‌ها برقرار است.","success");
 }catch(e){
  list.innerHTML=`<div class="error-box">❌ دریافت سفارش‌ها ممکن نیست.<br>${safe(e.message)}</div>`;
 }
}

function renderOrders(){
 const list=$("ordersList");
 if(!orders.length){list.innerHTML="<p class='muted'>هنوز سفارشی ثبت نشده است.</p>";return;}
 list.innerHTML=orders.map(o=>{
   const items=(o.items||[]).map(x=>`${safe(x.name)} × ${fa(x.qty)}`).join("، ");
   return `<div class="order-card">
     <div class="order-head"><b>${safe(o.id)}</b><span>${new Date(o.createdAt).toLocaleString("fa-IR")}</span></div>
     <div><b>مشتری:</b> ${safe(o.customer?.name)} — ${safe(o.customer?.phone)}</div>
     <div><b>آدرس:</b> ${safe(o.customer?.address)}</div>
     <div><b>محصولات:</b> ${items}</div>
     <div class="order-bottom"><b>مبلغ: ${money(o.total)}</b>
       <select onchange="changeOrderStatus('${safe(o.id)}',this.value)">
         ${["جدید","در حال بررسی","آماده ارسال","ارسال شد","لغو شد"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}
       </select>
       <button class="danger" onclick="deleteOrder('${safe(o.id)}')">حذف</button>
     </div>
   </div>`;
 }).join("");
}

async function changeOrderStatus(id,status){
 try{
  await api("/api/orders",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})});
  const o=orders.find(x=>x.id===id);if(o)o.status=status;
  setStatus("وضعیت سفارش تغییر کرد.","success");
 }catch(e){setStatus(e.message,"error");loadOrders();}
}

async function deleteOrder(id){
 if(!confirm("این سفارش از مدیریت حذف شود؟"))return;
 try{
  await api("/api/orders?id="+encodeURIComponent(id),{method:"DELETE"});
  orders=orders.filter(o=>o.id!==id);renderOrders();
 }catch(e){setStatus(e.message,"error");}
}

$("refreshOrders").onclick=loadOrders;
$("shopPhone").value=localStorage.getItem("may_phone")||"";
$("saveSettings").onclick=()=>{localStorage.setItem("may_phone",$("shopPhone").value.trim());alert("تنظیمات محلی ذخیره شد. شماره اصلی سایت در config.js تنظیم شده است.")};

render();
loadProducts();
loadOrders();
setInterval(loadOrders,15000);
