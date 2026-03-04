# Shopify App Template - React Router (MongoDB)

Template Shopify app su dung React Router v7 va MongoDB Atlas database.

---

## Bat dau nhanh (cho nguoi moi)

### Buoc 1: Cai dat tu dong

Mo **Terminal** (tim trong Launchpad hoac nhan `Cmd + Space` go "Terminal"), dan lenh sau va nhan Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/sellersmith/shopify-app-template-react-router-mongodb/main/setup.sh | bash
```

Script se tu dong cai tat ca nhung gi can thiet: Homebrew, Git, Node.js, Shopify CLI, va project.

### Buoc 2: Cau hinh database

Tao file `.env` tu file mau:

```bash
cd ~/projects/shopify-app-template-react-router-mongodb
cp .env.example .env
```

Mo file `.env` va dien connection string MongoDB Atlas cua ban:

```
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

Chua co MongoDB Atlas? Tao mien phi tai: https://cloud.mongodb.com/

Sau do push schema len database:

```bash
npx prisma db push
```

### Buoc 3: Dang nhap Shopify Partner

```bash
shopify auth login
```

Trinh duyet se mo ra, dang nhap bang tai khoan Shopify Partner cua ban.
Chua co? Dang ky tai: https://partners.shopify.com/

### Buoc 4: Chay app

```bash
npm run dev
```

Shopify CLI se hoi ban chon app va dev store. Chon theo huong dan tren man hinh.

Sau khi chay xong, nhan **P** de mo app trong trinh duyet. Click **Install** de cai app vao dev store.

**Xong!** App cua ban da chay. Moi thay doi trong code se tu dong cap nhat tren trinh duyet.

---

## Cau truc project

```
app/
  routes/
    app.tsx              # Layout chinh (sidebar, navigation)
    app._index.tsx       # Trang Dashboard
    app.additional.tsx   # Trang phu
    auth.$.tsx           # OAuth callback
    auth.login/          # Trang dang nhap
    webhooks.app.*.tsx   # Xu ly webhook
  shopify.server.ts      # Cau hinh Shopify app
  db.server.ts           # Ket noi database
prisma/
  schema.prisma          # Database schema (MongoDB)
extensions/              # Shopify extensions
.env.example             # Mau file cau hinh
```

## Lenh thuong dung

| Lenh | Mo ta |
|---|---|
| `npm run dev` | Chay app trong che do dev |
| `npm run build` | Build app cho production |
| `npm run lint` | Kiem tra loi code |
| `npm run typecheck` | Kiem tra loi TypeScript |
| `npx prisma studio` | Mo trinh duyet database |
| `npx prisma db push` | Cap nhat schema len database |

## Database

Template nay su dung **MongoDB Atlas** — database cloud, can tao tai khoan va dien connection string vao file `.env`.

Khac voi SQLite, MongoDB **khong dung migrations**. Khi thay doi schema, chay `npx prisma db push`.

## Luu y quan trong

- **Navigation**: Dung `Link` tu `react-router`, khong dung `<a>`
- **GraphQL**: Dung `admin.graphql()` de truy van du lieu Shopify
- **Webhooks**: Khai bao trong `shopify.app.toml`, khong dang ky trong code
- **Khong commit file `.env`** — file nay chua thong tin bi mat

## Troubleshooting

### Loi ket noi database

Kiem tra `DATABASE_URL` trong file `.env` co dung khong. Dam bao:
- Username va password dung
- IP cua ban da duoc whitelist trong MongoDB Atlas (Network Access > Add IP > Allow Access from Anywhere)

### App khong load trong Shopify Admin

Kiem tra Terminal co dang chay `npm run dev` khong. Thu tat va chay lai.

### Loi "nbf claim timestamp check failed"

Kiem tra dong ho may tinh da bat "Set time and date automatically" chua (System Settings > Date & Time).

---

## Tai lieu tham khao

- [Shopify App docs](https://shopify.dev/docs/apps/getting-started)
- [React Router docs](https://reactrouter.com/home)
- [Prisma + MongoDB docs](https://www.prisma.io/docs/orm/overview/databases/mongodb)
- [MongoDB Atlas](https://cloud.mongodb.com/)
- [Polaris Web Components](https://shopify.dev/docs/api/app-home/polaris-web-components)
