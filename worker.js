const DEFAULT_PRODUCTS = [
  {id:1,name:"زعفران ممتاز",price:2500000,category:"زعفران",image:"assets/zafaran.svg"},
  {id:2,name:"ادویه مخصوص",price:180000,category:"ادویه",image:"assets/advieh.svg"},
  {id:3,name:"شربت زعفران",price:220000,category:"شربت",image:"assets/sharbat.svg"},
  {id:4,name:"قهوه فوری",price:150000,category:"قهوه",image:"assets/coffee.svg"}
];

const PRODUCT_KEY = "products";
const ORDER_KEY = "orders";
const MAX_ORDERS = 500;

const json = (data, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"}
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
      try {
        if (url.pathname === "/api/health" && request.method === "GET") {
          return json({ok:true, storage:!!(env.ORDERS_KV || env.MAY_DATA)});
        }

        if (url.pathname === "/api/products") {
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

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("MAY.SHOP", {headers:{"content-type":"text/plain; charset=utf-8"}});
  }
};
