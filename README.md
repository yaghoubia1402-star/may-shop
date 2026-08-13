# MAY.SHOP FINAL v7

این نسخه معماری صحیح Pages + Worker را دارد: رابط فروشگاه و پنل می‌توانند روی Pages باشند، اما همه محصولات و سفارش‌ها از API مرکزی Worker و KV مشترک خوانده/ذخیره می‌شوند.

## تنظیم ضروری Cloudflare
Worker باید `may-shop` باشد و Binding زیر را داشته باشد:
- Type: KV namespace
- Variable name: `ORDERS_KV`
- Namespace: `may-shop-orders`

تست اتصال:
`https://may-shop.yaghoubia1402.workers.dev/api/health`
باید `storage:true` نشان دهد.

## استقرار
1. همه محتویات این ZIP را در همان GitHub repository جایگزین کنید.
2. Commit changes بزنید.
3. Cloudflare Pages باید Commit جدید را Deploy کند.
4. Worker نیز باید از `worker.js` نسخه v7 Deploy شده باشد.

نکته: دیگر نباید انتظار داشت `/api/*` روی Pages خودش KV داشته باشد؛ فایل‌های `app.js` و `admin.js` مستقیماً به API مرکزی Worker متصل‌اند.

## آدرس API مرکزی
`https://may-shop.yaghoubia1402.workers.dev`

## مشخصات فروشگاه
MAY.SHOP — 09122468958
