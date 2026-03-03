# Testing the App Proxy Endpoint

Route: `GET /api/apps/sqairinch/config`
Storefront URL: `https://{shop}.myshopify.com/apps/sqairinch/config`

---

## A. Local dev (generate a valid HMAC signature)

```bash
node -e "
  const crypto = require('crypto');
  const secret = process.env.SHOPIFY_API_SECRET;
  const params = 'path_prefix=apps&shop=mystore.myshopify.com&timestamp=1234567890';
  const sig = crypto.createHmac('sha256', secret).update(params).digest('hex');
  console.log('signature=' + sig);
"

# Then curl with the generated signature:
curl "http://localhost:3000/api/apps/sqairinch/config?path_prefix=apps&shop=mystore.myshopify.com&timestamp=1234567890&signature=<sig>"
```

---

## B. From a live storefront (browser console on any product page)

```javascript
const res = await fetch(`/apps/sqairinch/config`);
const config = await res.json();
console.log(config);
// Expected: { version, enabledZones, baseTolerancesCm, fabricMultipliers, branding, uiFlags }
```

When fetched via `https://{shop}/apps/sqairinch/config`, Shopify automatically appends signed query params before forwarding to the app.

---

## C. Expected response (200 OK)

```json
{
  "version": "0.1",
  "enabledZones": ["shoulders","bust_chest","waist","hips","thigh","inseam","sleeve_length","torso_length"],
  "baseTolerancesCm": { "shoulders": 1.5, "bust_chest": 2.0 },
  "fabricMultipliers": { "STRETCHY": 0.7, "MODERATE": 1.0, "STIFF": 1.3 },
  "branding": { "poweredBy": true, "poweredByText": "Powered by Sqairinch" },
  "uiFlags": { "enableOverlay": true, "enableRecommendation": true, "debug": false }
}
```

---

## D. Error cases

| Condition | Status | Body |
|-----------|--------|------|
| Missing/invalid `signature` param | 401 | `{ ok: false, error: { code: "UNAUTHORIZED" } }` |
| Unexpected server error | 500 | `{ error: { code: "CONFIG_ERROR", message: "Internal server error" } }` |

### Quick error tests

```bash
# No signature → 401
curl http://localhost:3000/api/apps/sqairinch/config

# Malformed signature → 401 (not 500 crash)
curl "http://localhost:3000/api/apps/sqairinch/config?path_prefix=apps&shop=mystore.myshopify.com&timestamp=1234567890&signature=bad"
```
