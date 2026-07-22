# Appwrite Setup Guide

Follow these steps to create the backend for your Inventory Manager.

---

## 1. Create an Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io/) and sign in
2. Click **"Create Project"**
3. Name it something like **"Inventory Manager"**
4. Copy your **Project ID** — you'll need it soon

## 2. Add a Web Platform

1. In your project dashboard, click **"Add Platform"**
2. Select **"Web App"**
3. Set the hostname to `localhost` (for development)
4. Later add your production domain

## 3. Update Configuration

Open `js/appwrite.js` and replace:

```js
const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';  // ← Paste your Project ID here
```

## 4. Create the Database

1. Go to **Databases** in the Appwrite Console
2. Click **"Create Database"**
3. Set Database ID to: `inventory_db`
4. Name it: **Inventory Database**

## 5. Create the `shops` Collection

1. Inside `inventory_db`, click **"Create Collection"**
2. Set Collection ID to: `shops`
3. Name it: **Shops**

### Set Permissions
Go to the **Settings** tab of the collection:
- Enable **Document Security** (this lets each document have its own permissions)

### Add Attributes
Go to the **Attributes** tab and create these:

| Key              | Type    | Size  | Required | Default |
|------------------|---------|-------|----------|---------|
| `name`           | String  | 255   | ✅       |         |
| `slug`           | String  | 255   | ✅       |         |
| `logoFileId`     | String  | 255   | ❌       |         |
| `coverFileId`    | String  | 255   | ❌       |         |
| `phoneNumber`    | String  | 50    | ❌       |         |
| `whatsappNumber` | String  | 50    | ✅       |         |
| `address`        | String  | 500   | ❌       |         |
| `googleMapsLink` | String  | 500   | ❌       |         |
| `description`    | String  | 2000  | ❌       |         |
| `ownerId`        | String  | 255   | ✅       |         |

### Add Indexes
Go to the **Indexes** tab:

| Key          | Type     | Attributes |
|--------------|----------|------------|
| `slug_idx`   | Unique   | `slug`     |
| `owner_idx`  | Key      | `ownerId`  |

## 6. Create the `products` Collection

1. Inside `inventory_db`, click **"Create Collection"**
2. Set Collection ID to: `products`
3. Name it: **Products**

### Set Permissions
Go to the **Settings** tab:
- Enable **Document Security**

### Add Attributes

| Key              | Type         | Size  | Required | Default   |
|------------------|--------------|-------|----------|-----------|
| `shopId`         | String       | 255   | ✅       |           |
| `name`           | String       | 500   | ✅       |           |
| `category`       | String       | 100   | ✅       |           |
| `condition`      | String       | 50    | ✅       |           |
| `availability`   | String       | 50    | ✅       |           |
| `sellingPrice`   | Integer      |       | ✅       |           |
| `previousPrice`  | Integer      |       | ❌       |           |
| `quantity`        | Integer             |❌       |  1         |
| `sku`            | String       | 100   | ❌       |           |
| `specifications` | String       | 5000  | ❌       |           |
| `imageFileIds`   | String Array | 255   | ❌       |           |
| `ownerId`        | String       | 255   | ✅       |           |

> **Note**: For `imageFileIds`, select type **String** and check the **Array** option.

### Add Indexes

| Key              | Type     | Attributes                   |
|------------------|----------|------------------------------|
| `shop_idx`       | Key      | `shopId`                     |
| `owner_idx`      | Key      | `ownerId`                    |
| `availability`   | Key      | `availability`               |
| `category_idx`   | Key      | `category`                   |
| `search_idx`     | Fulltext | `name`                       |

## 7. Create the Storage Bucket

1. Go to **Storage** in the Appwrite Console
2. Click **"Create Bucket"**
3. Set Bucket ID to: `product-images`
4. Name it: **Product Images**
5. Set **Maximum File Size**: 10 MB (10000000 bytes)
6. Set **Allowed File Extensions**: `jpg`, `jpeg`, `png`, `webp`, `gif`
7. Enable **File Security** (so each file has its own permissions)

## 8. Enable Authentication

1. Go to **Auth** → **Settings**
2. Make sure **Email/Password** sign-in is enabled (it should be by default)

---

## 9. Run Your App

Since the app uses ES modules, you need a local web server. You can't just open the HTML files directly.

### Option A: Use `npx serve`
```bash
cd tech-catalog
npx -y serve .
```

### Option B: Use Python
```bash
cd tech-catalog
python -m http.server 8000
```

### Option C: Use VS Code Live Server
Install the "Live Server" extension and click "Go Live".

Then open:
- **Dashboard**: http://localhost:3000/login.html (or your port)
- **Public Store**: http://localhost:3000/index.html?shop=your-shop-slug

---

## Quick Checklist

- [ ] Created Appwrite project
- [ ] Added web platform with `localhost`
- [ ] Updated `APPWRITE_PROJECT_ID` in `js/appwrite.js`
- [ ] Created `inventory_db` database
- [ ] Created `shops` collection with all attributes and indexes
- [ ] Created `products` collection with all attributes and indexes
- [ ] Created `product-images` storage bucket
- [ ] Verified Email/Password auth is enabled
- [ ] Started a local web server
