const DEFAULT_PRODUCTS = [
  {id:1,name:"زعفران ممتاز",price:2500000,category:"زعفران",image:"assets/zafaran.svg"},
  {id:2,name:"ادویه مخصوص",price:180000,category:"ادویه",image:"assets/advieh.svg"},
  {id:3,name:"شربت زعفران",price:220000,category:"شربت",image:"assets/sharbat.svg"},
  {id:4,name:"قهوه فوری",price:150000,category:"قهوه",image:"assets/coffee.svg"}
];

const PRODUCT_KEY = "products";
const ORDER_KEY = "orders";
const MAX_ORDERS = 500;
const ADMIN_PASSWORD = "MAY@09122468958#Admin";
const ADMIN_COOKIE = "MAY_ADMIN_AUTH";
const ADMIN_TOKEN = "MAYSHOP-ADMIN-2026";

function hasAdmin(request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some(x => x.trim() === ADMIN_COOKIE + "=" + ADMIN_TOKEN);
}
function adminResponse() {
  return json({ok:false,error:"دسترسی مدیریت نیاز به ورود دارد."},401);
}

const json = (data, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type":"application/json; charset=utf-8",
    "cache-control":"no-store",
    "access-control-allow-origin":"*",
    "access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":"content-type,accept"
  }
});

async function readJSON(env, key, fallback) {
  const store = env.ORDERS_KV || env.MAY_DATA;
  if (!store) throw new Error("اتصال ORDERS_KV در Cloudflare فعال نیست.");
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(env, key, value) {
  const store = env.ORDERS_KV || env.MAY_DATA;
  if (!store) throw new Error("اتصال ORDERS_KV در Cloudflare فعال نیست.");
  await store.put(key, JSON.stringify(value));
}

function normalizeProduct(p, index=0) {
  return {
    id: Number(p?.id) || Date.now() + index,
    name: String(p?.name || "").trim(),
    price: Math.max(0, Number(p?.price) || 0),
    category: String(p?.category || "").trim(),
    image: String(p?.image || "assets/coffee.svg")
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","access-control-allow-headers":"content-type,accept","access-control-max-age":"86400"}});
      try {
        if (url.pathname === "/api/health" && request.method === "GET") {
          return json({ok:true, storage:!!(env.ORDERS_KV || env.MAY_DATA)});
        }

        if (url.pathname === "/api/admin/login" && request.method === "POST") {
          const body = await request.json().catch(()=>({}));
          if (String(body.password || "") !== ADMIN_PASSWORD) {
            return json({ok:false,error:"رمز مدیریت نادرست است."},401);
          }
          return new Response(JSON.stringify({ok:true}), {
            headers: {
              "content-type":"application/json; charset=utf-8",
              "cache-control":"no-store",
              "set-cookie": `${ADMIN_COOKIE}=${ADMIN_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
              "access-control-allow-origin":"*",
              "access-control-allow-methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS",
              "access-control-allow-headers":"content-type,accept"
            }
          });
        }

        if (url.pathname === "/api/admin/logout" && request.method === "POST") {
          return new Response(JSON.stringify({ok:true}), {
            headers: {
              "content-type":"application/json; charset=utf-8",
              "cache-control":"no-store",
              "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
              "access-control-allow-origin":"*"
            }
          });
        }

        if (url.pathname === "/api/products") {
          if (request.method !== "GET" && !hasAdmin(request)) return adminResponse();
          if (request.method === "GET") {
            const products = await readJSON(env, PRODUCT_KEY, DEFAULT_PRODUCTS);
            return json({ok:true, products});
          }
          if (request.method === "PUT") {
            const body = await request.json();
            if (!Array.isArray(body.products)) return json({ok:false,error:"products must be an array"},400);
            const products = body.products.map(normalizeProduct);
            await writeJSON(env, PRODUCT_KEY, products);
            return json({ok:true, products});
          }
        }

        if (url.pathname === "/api/orders") {
          if (request.method !== "POST" && !hasAdmin(request)) return adminResponse();
          if (request.method === "GET") {
            const orders = await readJSON(env, ORDER_KEY, []);
            return json({ok:true, orders:[...orders].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))), count:orders.length});
          }

          if (request.method === "POST") {
            const body = await request.json();
            const customer = body.customer || {};
            const items = Array.isArray(body.items) ? body.items : [];
            if (!String(customer.name||"").trim() || !String(customer.phone||"").trim() ||
                !String(customer.address||"").trim() || !items.length) {
              return json({ok:false,error:"اطلاعات سفارش کامل نیست."},400);
            }

            const total = Math.max(0, Number(body.total)||0);
            const now = new Date().toISOString();
            const order = {
              id: "MAY-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,7).toUpperCase(),
              createdAt: now,
              status: "جدید",
              customer: {
                name: String(customer.name).trim().slice(0,120),
                phone: String(customer.phone).trim().slice(0,40),
                address: String(customer.address).trim().slice(0,1000)
              },
              items: items.map(x=>({
                id:Number(x.id)||0,
                name:String(x.name||"").slice(0,200),
                qty:Math.max(1,Number(x.qty)||1),
                price:Math.max(0,Number(x.price)||0)
              })),
              total
            };

            const orders = await readJSON(env, ORDER_KEY, []);
            orders.unshift(order);
            await writeJSON(env, ORDER_KEY, orders.slice(0, MAX_ORDERS));
            return json({ok:true, order});
          }

          if (request.method === "PATCH") {
            const body = await request.json();
            const orders = await readJSON(env, ORDER_KEY, []);
            const i = orders.findIndex(o=>o.id===body.id);
            if (i<0) return json({ok:false,error:"سفارش پیدا نشد."},404);
            if (body.status) orders[i].status=String(body.status).slice(0,40);
            await writeJSON(env, ORDER_KEY, orders);
            return json({ok:true, order:orders[i]});
          }

          if (request.method === "DELETE") {
            const id=url.searchParams.get("id");
            const orders=await readJSON(env, ORDER_KEY, []);
            const next=orders.filter(o=>o.id!==id);
            await writeJSON(env, ORDER_KEY, next);
            return json({ok:true});
          }
        }

        return json({ok:false,error:"مسیر API پیدا نشد."},404);
      } catch (err) {
        return json({ok:false,error:err?.message || "خطای سرور"},500);
      }
    }

    if (url.pathname === "/admin" || url.pathname === "/admin.html") {
      if (!hasAdmin(request)) {
        return new Response(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ورود مدیریت MAY.SHOP</title><style>body{font-family:sans-serif;background:#f6f6f6;display:grid;place-items:center;min-height:100vh;margin:0}.box{background:#fff;padding:28px;border-radius:18px;box-shadow:0 10px 30px #0001;width:min(90%,360px)}input,button{width:100%;padding:13px;margin-top:10px;box-sizing:border-box;border-radius:10px;border:1px solid #ddd}button{cursor:pointer;background:#111;color:#fff}.err{color:#b00020;margin-top:10px}</style><div class="box"><h2>MAY.SHOP</h2><p>ورود مدیریت فروشگاه</p><input id="p" type="password" placeholder="رمز مدیریت"><button onclick="login()">ورود</button><div id="e" class="err"></div></div><script>async function login(){const e=document.getElementById("e");e.textContent="";const r=await fetch("/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:document.getElementById("p").value})});const d=await r.json();if(d.ok)location.href="/admin.html";else e.textContent=d.error||"ورود ناموفق بود."}</script></html>`, {headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
      }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("MAY.SHOP", {headers:{"content-type":"text/plain; charset=utf-8"}});
  }
};
