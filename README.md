MAY.SHOP v11
- Shared products/orders through the Cloudflare KV binding ORDERS_KV.
- Admin is protected by a password gate at /admin and /admin.html.
- The authenticated management panel is /admin-panel.
- No payment gateway.
- After a successful order, payment instructions are shown.
- Bale only is used for sending the payment tracking number.

Cloudflare requirement:
Workers & Pages > may-shop > Bindings must contain a KV namespace binding:
Variable name: ORDERS_KV
Namespace: may-shop-orders

After changing bindings, deploy the Worker. Test:
https://YOUR-WORKER-DOMAIN/api/health

Expected:
{"ok":true,"storage":true,"binding":"ORDERS_KV"}

Admin password:
MAY@09122468958#Admin
