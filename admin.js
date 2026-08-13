let products=JSON.parse(localStorage.getItem("may_products")||"null")||[
{id:1,name:"زعفران ممتاز",price:2500000,category:"زعفران",image:"assets/zafaran.svg"},
{id:2,name:"ادویه مخصوص",price:180000,category:"ادویه",image:"assets/advieh.svg"},
{id:3,name:"شربت زعفران",price:220000,category:"شربت",image:"assets/sharbat.svg"},
{id:4,name:"قهوه فوری",price:150000,category:"قهوه",image:"assets/coffee.svg"}];

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0)+" تومان";
const safe=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function save(){localStorage.setItem("may_products",JSON.stringify(products))}
function render(){
 $("adminProducts").innerHTML=products.map(p=>`
 <div class="admin-row"><img src="${p.image||"assets/coffee.svg"}" onerror="this.src='assets/coffee.svg'">
 <div class="grow"><b>${safe(p.name)}</b><div>${money(p.price)} — ${safe(p.category)}</div></div>
 <button class="edit" onclick="editProduct(${p.id})">ویرایش</button>
 <button class="danger" onclick="del(${p.id})">حذف</button></div>`).join("");
}
function del(id){if(confirm("این محصول حذف شود؟")){products=products.filter(p=>p.id!==id);save();render()}}
function editProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 $("editId").value=p.id;$("name").value=p.name;$("price").value=p.price;$("cat").value=p.category;
 $("imageUrl").value=p.image&&p.image.startsWith("http")?p.image:"";
 $("formTitle").textContent="ویرایش محصول";$("submitBtn").textContent="ذخیره تغییرات";window.scrollTo({top:0,behavior:"smooth"});
}
function resetForm(){$("editId").value="";$("productForm").reset();$("formTitle").textContent="افزودن محصول";$("submitBtn").textContent="افزودن محصول"}
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
 if(id) products=products.map(p=>p.id===Number(id)?item:p); else products.push(item);
 save();resetForm();render();alert(id?"محصول ویرایش شد.":"محصول با موفقیت اضافه شد.");
});
$("cancelEdit").onclick=resetForm;
$("shopPhone").value=localStorage.getItem("may_phone")||"";
$("saveSettings").onclick=()=>{localStorage.setItem("may_phone",$("shopPhone").value.trim());alert("ذخیره شد. توجه: این شماره فقط روی همین مرورگر ذخیره می‌شود؛ شماره واتساپ اصلی سایت در config.js تنظیم می‌شود.")};
render();
