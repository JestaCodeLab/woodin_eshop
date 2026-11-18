# Woodin headless storefront — build plan

Source of truth: the Claude Design canvas (`Site-*` boards + `SiteHeader/Footer/Card`). The `.dc.html` files are read as a visual + markup spec only; everything is rebuilt as idiomatic React + Tailwind. "Premium-*", "Main", "Product", "Checkout" drafts are ignored.

## 1. Stack and conventions

- Next.js (App Router), TypeScript `strict`, Tailwind CSS v4 (tokens in `@theme`), deployed on Vercel.
- Server Components by default; `'use client'` only for interactive leaves (carousel, accordion, quantity stepper, filters, mobile drawer, checkout form).
- Fonts via `next/font`: Bodoni Moda exposed as `--font-display` (swap point for Le Jeune Deck later), Jost as `--font-text`.
- Images via `next/image` with `fill` + `object-position` taken from the design (`objectPosition` prop kept per image). Local files in `public/images`.
- Secrets stay server-side: `WC_STORE_URL` (no `NEXT_PUBLIC_`), `REVALIDATE_SECRET`. The browser only ever talks to `/api/cart/*`.
- Max content width 1360px (`max-w-content`), 32px gutters desktop, 16–20px at 390px. Every page checked at 390px.

### Design tokens (Tailwind `@theme`)

| Token | Value | Use |
|---|---|---|
| `brown` | `#521B0A` | primary, footer, active nav, buttons |
| `ink` | `#1A120E` | text |
| `ivory` | `#F8F5EF` | page background |
| `sand` | `#EFE8DC` | alternate bands |
| `line` | `#E3DACB` | hairlines |
| `muted` | `#5F554C` | secondary text |
| `gold` | `#8A6115` | eyebrow labels |
| `gold-btn` | `#D9A441` | gold button (Bold Fusion tile) |
| `sky` | `#174A8B` | fabric story band |

Extra values appear repeatedly in the design and become tokens too: `#D8CDBC` (`line-strong`, input borders), `#3D332C` (`body`, long copy), `#2A1E17` (`espresso`, image placeholder bg), `#E2C57A` / `#E9C77F` (gold on dark), `#2E7D4F` / `#2E5E3A` (in-stock green), `#8A3A12` (low-stock note), `#FFCC00` (MoMo express-pay button).
Buttons are square (no radius). Labels: `text-[12px] font-medium uppercase tracking-[0.2em]`.

## 2. Route map

| Route | File | Data | Rendering |
|---|---|---|---|
| `/` | `app/page.tsx` | New-in products (Store API), 3 latest posts (WP), static hero/world/looks | ISR 300 |
| `/ready-to-wear` | `app/ready-to-wear/page.tsx` | Products in RTW categories; category chip filter via `?cat=` | ISR 300 |
| `/fabrics` | `app/fabrics/page.tsx` | Products in `fabrics` category; print-family chip via `?family=` | ISR 300 |
| `/lookbook` | `app/lookbook/page.tsx` | Static looks data (`data/looks.ts`); "Add look" posts a batch to cart | static |
| `/insights` | `app/insights/page.tsx` | `wp/v2/posts?_embed`, `?topic=` + `?page=` | ISR 300 |
| `/insights/[slug]` | `app/insights/[slug]/page.tsx` | `wp/v2/posts?slug=` | ISR + `generateStaticParams` |
| `/stores` | `app/stores/page.tsx` | `data/stores.json` (demo) | static; client `StoreLocator` island |
| `/shop` | `app/shop/page.tsx` | Products; filters in URL: `?cat=&size=&colour=&min=&max=&stock=&sort=&page=` | dynamic on `searchParams`, fetch cached 300s |
| `/product/[slug]` | `app/product/[slug]/page.tsx` | Product + variations + related | ISR 300 + `generateStaticParams` (first N) |
| `/cart` | `app/cart/page.tsx` | Cart via `/api/cart` (cookie token) | dynamic, client cart UI |
| `/checkout` | `app/checkout/page.tsx` | Cart summary + zone/payment choice, then hand-off | dynamic |
| `/api/cart/*` | route handlers | proxy to Store API | `no-store` |
| `/api/revalidate` | route handler | WC product-updated webhook | — |

Extras: `app/not-found.tsx`, `app/error.tsx`, `loading.tsx` for shop/product/cart, `sitemap.ts`, `robots.ts`.

### Header variants per page (from design)

`overlay` on `/` only (white logo/text over hero). `solid` elsewhere. Active nav key: `rtw` (RTW + product), `fabrics`, `shop`, `lookbook`, `insights`, `stores`, `none` (cart, checkout). Derived from `usePathname` in the client nav, so pages do not pass it manually.

## 3. Component tree

```
app/layout.tsx            fonts, <AnnouncementBar/>, <CartProvider/>, <Footer/>
 ├─ components/layout/
 │   ├─ AnnouncementBar    brown strip: "Free Accra delivery over GH₵ [X] · …"
 │   ├─ Header             server shell; props: variant="solid|overlay"
 │   │   ├─ NavLinks (client)   usePathname → aria-current + brown underline
 │   │   ├─ HeaderIcons          search, wishlist, account, <BagLink/> (count from CartProvider)
 │   │   └─ MobileDrawer (client, step 5)  hamburger → full-height nav drawer
 │   └─ Footer             newsletter band (client form), link columns, pay badges
 ├─ components/ui/
 │   ├─ Button             variants: primary(brown) | outline | gold | ivory | ghost-underline
 │   ├─ Eyebrow, SectionHeading (display font + optional italic span)
 │   ├─ Accordion (client) single-open panels, aria-expanded, +/− sign
 │   ├─ QuantityStepper (client)  −/n/+ with 44px targets, min 0 / max 9
 │   ├─ Chip / ChipGroup   pressed-state pill (category, family, region)
 │   ├─ Swatch / SwatchPicker  colour dots, 46px ring when selected
 │   ├─ Badge              "New", "Simulation", "Last few"…
 │   ├─ Breadcrumb
 │   ├─ Pagination         link-based (URL driven)
 │   ├─ ProgressBar        free-delivery bar
 │   └─ Skeleton           loading states
 ├─ components/product/
 │   ├─ ProductCard        image (object-position), badge, wishlist, cat, title, price, swatches
 │   ├─ ProductGrid        responsive grid, takes cardImageHeight
 │   ├─ ProductGallery     1 hero + 2 tiles (desktop), swipe strip (mobile)
 │   ├─ VariationPicker (client)  print swatches + size grid; states: available / low / sold-out (dashed+strike) → "Notify me"
 │   ├─ AddToBag (client)  sticky on mobile (step 5)
 │   ├─ InfoPanel          delivery / click&collect / pay-your-way
 │   └─ CompleteTheLook
 ├─ components/shop/
 │   ├─ FilterSidebar (client)  category checkboxes, size grid, colour dots, price min/max, availability; writes URL query
 │   ├─ FilterSlideOver (client, step 5)  same content in a drawer ≤ lg
 │   ├─ AppliedFilters     removable chips + "Clear all"
 │   └─ SortSelect (client)
 ├─ components/home/
 │   ├─ Hero               overlay variant, "Simulation" 104px tracking 0.18em
 │   ├─ WorldCarousel (client)  7 cards, 3.5 visible, translateX by one card, prev/next, disabled ends
 │   ├─ FeaturedLooks      full-bleed grid (8px gutter): 1 tall + 1 wide + 2 square
 │   ├─ NewIn              4 ProductCards
 │   ├─ ShopTheLook        image + 3 line items + "Add full look"
 │   ├─ FabricsBand        brown band, 3 zoomed print tiles
 │   ├─ InsightsTeaser     3 posts
 │   ├─ ServicesRow        4 service blurbs
 │   └─ WearWoodin         6-tile UGC grid
 ├─ components/cart/
 │   ├─ CartProvider (client)  context + optimistic updates, talks to /api/cart/*
 │   ├─ CartLine, CartSummary, FreeDeliveryBar, EmptyCart
 ├─ components/checkout/
 │   ├─ CheckoutSteps (ol with aria-current)
 │   ├─ ContactFields, DeliveryZonePicker, PaymentMethodPicker, OrderSummary
 │   └─ HandOffButton      posts to /api/checkout → redirects to WC checkout URL
 ├─ components/stores/StoreLocator (client)  region chips, list, pseudo-map pins, selected-store panel
 └─ components/insights/PostCard, TopicTabs, EventsList
```

## 4. Data layer

### Types (`lib/types.ts`)
`WCProduct`, `WCProductVariation` (via `?type=variation` + `attributes`), `WCImage`, `WCPrices` (minor-unit strings + `currency_minor_unit`), `WCCategory`, `WCAttribute`/`WCTerm`, `WCCart`, `WCCartItem`, `WCCartTotals`, `WCCartError`, plus app-level `Product` (normalised: price as number in GH₵, colours/sizes lists, stock state per size) and `WPPost`. Normalisation lives in `lib/normalize.ts` so components never see raw WC shapes.

### Store API client (`lib/woocommerce.ts`, `server-only`)
- `wcFetch<T>(path, { revalidate, tags, cartToken })` — base URL from `WC_STORE_URL`, throws a typed `WooError`, never logs tokens.
- Catalogue (ISR `revalidate: 300`, tags `products`, `product:<slug>`): `getProducts(params)`, `getProduct(slug)`, `getProductVariations(id)`, `getCategories()`.
- Posts: `getPosts`, `getPost(slug)` from `wp/v2/posts` (`_embed` for the featured image + terms).
- Cart (`cache: 'no-store'`, Cart-Token header): `getCart`, `addItem`, `updateItem`, `removeItem`, `applyCoupon`, `batchAdd`.
- Responses are mapped to `Product`/`Cart` types in `normalize.ts`.

### Cart proxy
`/api/cart` (GET), `/api/cart/add-item`, `/api/cart/update-item`, `/api/cart/remove-item`, `/api/cart/coupon`. Each handler reads the `woodin_cart_token` httpOnly/Secure/SameSite=Lax cookie, forwards it as `Cart-Token`, and writes back the rotated token from the response header. Inputs validated with zod. The WC `Nonce` header is not needed for Cart-Token flows.

### Revalidation
`/api/revalidate` verifies the WooCommerce webhook HMAC (`X-WC-Webhook-Signature`, base64 HMAC-SHA256 of the raw body with `REVALIDATE_SECRET`), then `revalidateTag('products')` and `revalidateTag('product:<slug>')`.

### Checkout hand-off (phase 1)
Next.js `/checkout` shows contact, delivery zone, payment method and a summary, then redirects to the WooCommerce checkout page with the same Cart-Token carried across (via WC's `?cart_token` hand-off or a signed session URL — see question 3). The Paystack plugin runs there. The "Check your phone" and "Thank you" screens in the design are a phase 2 concern (needs Paystack inline + webhooks); in phase 1 they are replaced by WC's own pages.

### Stores
`data/stores.json` typed as `Store { id, name, region, address, lat, lng, phone, hours, services }`, all values `[PLACEHOLDER]` until Woodin supplies them. Map = the design's stylised pin map for now; Google Maps embed is a TODO.

## 5. Assets

The canvas references 14 `/_blob/<id>` files. They download into `public/images` with descriptive names, plus the crops used in the design recorded in `lib/images.ts` (name → src + default `objectPosition`):

| Canvas id | File | Notes |
|---|---|---|
| `c5096261…` | `hero-simulation-sail.jpg` | home hero, `50% 30%` |
| `3115f28e…` | `men-heritage-shirts.jpg` | RTW hero, Heritage tile |
| `d34835fe…` | `women-pink-dress-green-blouse.jpg` | Elegance, Green Leaf print |
| `d38b2b74…` | `men-terracotta-patchwork.jpg` | weekend shirt |
| `7572727b…` | `models-smiling-print-shirts.jpg` | shop-the-look, look 01 |
| `28b177e7…` | `men-sunset-print-shirts.jpg` | news, stores banner |
| `f96a07e6…` | `woman-yellow-patchwork-boxy.jpg` | Bold Fusion, Sunday Patchwork |
| `7447dbbc…` | `woman-paperbag-shorts-necklace.jpg` | paperbag shorts, accessories |
| `2a34e0ba…` | `women-tiered-skirt-shorts.jpg` | tiered skirt |
| `8df35c23…` | `women-peplum-blouse-dress.jpg` | peplum blouse |
| `af6172d5…` / `6ec9df07…` / `4818ffa4…` | `logo-white.*`, `logo-dark.*`, `logo-footer.*` | header overlay, solid, footer |
| `c92ebb9b…` | `woodin-mark.*` | store pins, #WearWoodin |

Many "product" images are crops of the same campaign photos (different `object-position` / zoom). Product cards in the design therefore use campaign shots; once WooCommerce supplies real product images, `ProductCard` prefers the product image and falls back to the design crop for demo data.

## 6. Design-to-code notes

- The carousel in the design uses `translateX(calc(-i * ((100% - 60px)/3.5 + 20px)))` with 7 cards and max index `n - 3`. I'll keep that maths, add keyboard/focus handling, and on ≤ 640px show 1.2 cards with scroll-snap instead (no 3.5 at 390px).
- Several design controls are only visual (Search, Wishlist, Account, Language, "Notify me", "Save for later", "Load more"). They render as buttons and are wired where WooCommerce can support them; the rest are listed in TODO.md.
- The Shop page's `Colour` and `Size` facets map to WC attributes `pa_colour` / `pa_size`; `Availability` maps to `stock_status`. "Click & collect today" has no Store API equivalent, so it is rendered disabled with a TODO.
- All `GH₵ [PRICE]`-style placeholders in the design render real data once WC is connected; when WC is unavailable the same placeholder strings render so the pitch still looks right (`NEXT_PUBLIC_DEMO_FALLBACK`-style flag replaced by a server-only `USE_DEMO_DATA`).
- Every `[X]`, `[N]`, `[HOURS]`… in the design is surfaced through one `placeholder()` helper so TODO.md can be generated by grepping for it.

## 7. Delivery steps

1. **PLAN.md** (this file) — commit.
2. **Scaffold + Home** — tokens, `next/font`, `.env.example`, Header, Footer, ProductCard, Home page — commit. **Stop for review.**
3. `lib/woocommerce.ts`, ISR, cart proxy + cookie, `/api/revalidate`.
4. Remaining pages: variation picker with stock states, cart with free-delivery bar, checkout hand-off.
5. Polish: mobile nav drawer, filter slide-over, sticky add-to-bag, loading/empty states, metadata, a11y pass, `TODO.md`.

## 8. Questions

1. **Staging WooCommerce URL and access.** Is the cloned staging site already up, and does it have products, categories and `pa_colour` / `pa_size` attributes set up? Until you give me `WC_STORE_URL`, steps 2–3 run against demo data (the arrays in the design) behind the same typed interface.
2. **Product images.** The design reuses 10 campaign photos for every product. OK to keep that for the demo, or will staging products have their own photos (which then take priority)?
3. **Cart hand-off to WooCommerce checkout.** The Store API Cart-Token does not log the browser into the WC session by itself. Options: (a) a small mu-plugin on staging that accepts a signed `?cart_token=` link and restores the cart server-side, (b) re-add the items on the WC side via a pre-filled `?add-to-cart=` URL (loses variation/coupon detail), (c) hand off to a WC page embedded under a shared parent domain so the session cookie is shared. I recommend (a). Can you add a plugin to the staging site?
4. **Currency and pricing.** Is staging in GHS with GH₵ shown, and is `[X]` (free-delivery threshold) a value I should read from a WC setting, or hardcode as an env var until Woodin confirms?
5. **Language toggle (EN · FR).** The header shows it. Static label only for the pitch, or do you want real i18n (`/fr`)? I'm assuming static.
6. **Search / wishlist / account.** Search can be a real `/shop?q=` route cheaply. Wishlist and account have no backend in scope: should they stay inert buttons (my default) or save wishlist to `localStorage`?
7. **Newsletter form.** Where should the footer subscribe post to (Mailchimp, a WC plugin, nothing yet)? Default: client-side success state only, listed in TODO.
8. **Fonts.** Bodoni Moda is a Google Font and loads through `next/font/google`. Confirm that is fine for production for now, with Le Jeune Deck swapped in later via the `--font-display` variable.
9. **Next.js version.** I'll scaffold with the current stable (16, with `proxy.ts` rather than `middleware.ts`). Any reason to pin 15?
10. **Package manager / Vercel.** Defaulting to npm. Should I link a Vercel project or leave deployment to you?

## 9. Decisions made after step 2

- **Live site, read-only.** `WC_STORE_URL=https://woodinfashion.com` is used for catalogue, categories and Insights only (GET). The live site has no active ecommerce: 448 products, all `simple`, every price `0` (USD), `is_purchasable: false`, no attributes or variations, no descriptions.
- **Cart and checkout stay local.** `/api/cart/*` uses a demo cart in an httpOnly cookie (`woodin_demo_cart`, ids and quantities only; prices are looked up server-side). The Store API cart (`lib/cart/woo.ts`, Cart-Token cookie) exists behind `WC_ALLOW_CART_WRITES=true` and refuses to run against `woodinfashion.com`.
- **Demo override layer** (`data/product-overrides.ts`): SKU → display name, category line, GH₵ price, badge. Names come from the product photos; prices are invented. A real WooCommerce price above 0 always wins. Products without an entry use rules in `lib/normalize.ts` (strip `RTW-`, `Range · code` for fabrics, per-category default prices).
- **Caching:** Cache Components is on, so ISR is `'use cache'` + `cacheLife({ stale: 300, revalidate: 300, expire: 86400 })` + `cacheTag`. The webhook expires tags with `revalidateTag(tag, { expire: 0 })`.
- **Known gap for step 4:** WooCommerce cannot sort or filter by price (all 0). The Shop price filter and price sort must run in the app over `Product.price.amount`. Sizes and colours do not exist in WooCommerce; the variation picker will use a demo generator.

## 10. Direction change: this app is the eshop at shop.woodinfashion.com

Supersedes the route map in section 2. The marketing/editorial site stays on woodinfashion.com (WordPress). The main site's menu gets a **"Shop Now"** item that links here. This app is a small, focused eshop.

### Routes (5 pages, plus the cart API)

| Route | Purpose |
|---|---|
| `/` | Eshop home (the designed home page, re-pointed at shop categories) |
| `/shop` | All products. Filters in the URL: `?cat=&size=&colour=&min=&max=&stock=&sort=&page=` |
| `/product/[slug]` | Product detail |
| `/cart` | Bag |
| `/checkout` | Summary + delivery + payment choice + hand-off |

Dropped from this app (they live on the main site): `/ready-to-wear`, `/fabrics`, `/lookbook`, `/insights` (+ `[slug]`), `/stores`. Not built, so nothing is deleted. The design boards for them are simply unused.

### What changes in what exists

- **Header:** nav becomes shop-centred: *Shop*, *Ready To Wear*, *Fabrics*, *Accessories* (each a `/shop?cat=` filter), plus a clear way back to woodinfashion.com. Main-site pages (About Us, Lookbook, Blog) are external links to `https://woodinfashion.com/woodin/`, `/what-to-wear/`, `/blog/`. "Find a store" and EN · FR link out.
- **Footer:** same columns; Discover/Help/Stores links point at woodinfashion.com.
- **Home:** keep every designed section. World of Woodin cards, Featured looks and Hero links go to `/shop` filters. The Insights teaser becomes "From the blog" and links to the real posts on woodinfashion.com (data already available via `wp/v2/posts`). Lookbook-style content links out.
- **Metadata / SEO:** `NEXT_PUBLIC_SITE_URL=https://shop.woodinfashion.com`, canonical URLs, product JSON-LD, `sitemap.xml` for `/`, `/shop`, products only.
- **Click & collect:** the store list is only needed inside checkout (pickup selector), so `data/stores.json` stays, but there is no store-locator page.

### Same-domain advantage

`shop.` and the main site share a registrable domain, so cookies can be scoped to `.woodinfashion.com`. That keeps a future WooCommerce-session hand-off (option (c) in question 3) and a bag count on the main site's menu possible without cross-site tricks. Not needed while cart and checkout are local.

### Deployment

Vercel project for this repo, custom domain `shop.woodinfashion.com` (a CNAME `shop` → Vercel in the woodinfashion.com DNS), `WC_STORE_URL=https://woodinfashion.com`, `WC_ALLOW_CART_WRITES=false`.
