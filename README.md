MAY.SHOP v10
- Shared products/orders via ORDERS_KV
- Admin login required; /admin is always a fresh login gate
- No payment gateway
- Payment instructions after order
- Bale only for sending payment tracking number
Default admin password: MAY@09122468958#Admin

IMPORTANT: In Cloudflare Workers > may-shop > Bindings, the KV namespace named may-shop-orders must be connected with variable name ORDERS_KV. After changing a binding, deploy the Worker again. Open /api/health and confirm storage:true and binding:"ORDERS_KV".
