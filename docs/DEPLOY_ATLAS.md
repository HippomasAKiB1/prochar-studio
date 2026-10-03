# MongoDB Atlas Setup Guide

This guide walks through provisioning a free-tier MongoDB Atlas cluster for the Prochar Studio API deployment.

---

## 1. Create Free-Tier (M0) Cluster

1. Log into your [MongoDB Atlas account](https://cloud.mongodb.com/).
2. In your Project, click **Create** or **Build a Database**.
3. Choose the **M0 (Shared)** cluster option (Free).
4. Select a cloud provider and region closest to your API deployment (e.g. AWS / `ap-southeast-1` Singapore or `ap-south-1` Mumbai).
5. Cluster Name: `prochar-studio` (or default `Cluster0`).
6. Click **Create Deployment**.

---

## 2. Create Database User

1. In the Atlas dashboard, navigate to **Security** → **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set Username: `prochar_api_user`.
5. Set a secure, random password (store safely; escape special characters if using URI).
6. Database User Privileges: **Read and write to any database** (built-in role: `readWriteAnyDatabase@admin` or restrict to `prochar-studio` database).
7. Click **Add User**.

---

## 3. Configure Network Access

1. Navigate to **Security** → **Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere** (`0.0.0.0/0`).
   > **Note**: Permitting `0.0.0.0/0` is recommended for assessment scope and serverless/container platforms (e.g., Render, Fly.io, Railway) that utilize dynamic outbound IP ranges.
4. Entry comment: `Allow API container outbound access (assessment scope)`.
5. Click **Confirm**.

---

## 4. Obtain Connection String

1. Navigate to **Databases** → click **Connect** on your cluster.
2. Select **Drivers** (Node.js).
3. Copy the SRV connection URI:
   ```text
   mongodb+srv://prochar_api_user:<password>@cluster0.xxxxx.mongodb.net/prochar-studio?retryWrites=true&w=majority&appName=prochar-studio
   ```
4. Replace `<password>` with your database user password and specify `/prochar-studio` as the target database name.
5. Set this string as the `MONGODB_URI` environment variable in your production runtime (Render).

---

## 5. Validate Connection

From your local machine or terminal, test the connection using `mongosh`:

```bash
mongosh "mongodb+srv://prochar_api_user:<password>@cluster0.xxxxx.mongodb.net/prochar-studio?retryWrites=true&w=majority" --eval "db.runCommand({ping:1})"
```

**Expected output:**
```json
{ "ok": 1 }
```

Once verified, provide `MONGODB_URI` to Render during API web service configuration.
