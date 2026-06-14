# Healify Backend — Setup Guide (≈15 minutes)

## STEP 1: Create a free MongoDB Atlas cluster (~10 min)

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up (free)
2. Click "Build a Database" → choose the **FREE (M0)** tier → pick any cloud provider/region → "Create"
3. **Create a database user**: set a username + password (write these down!)
4. **Network Access**: click "Add IP Address" → "Allow Access from Anywhere" (0.0.0.0/0) — fine for a college project demo
5. Once the cluster is ready, click "Connect" → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the database user you created in step 3, and add `/healify` before the `?`:
   ```
   mongodb+srv://<db_username>:<db_password>@cluster.mongodb.net/healify
   ```

## STEP 2: Configure the backend (~2 min)

1. In the `healify_backend` folder, copy `.env.example` to a new file named `.env`
2. Paste your connection string as `MONGODB_URI`
3. Set `JWT_SECRET` to any long random string (e.g. mash your keyboard for 40 characters)

Your `.env` should look like:
```
MONGODB_URI=mongodb+srv://myuser:mypass123@cluster0.xxxxx.mongodb.net/healify?retryWrites=true&w=majority
JWT_SECRET=your_random_secret_here
PORT=5000
```

## STEP 3: Install & run (~2 min)

```bash
cd healify_backend
npm install
npm start
```

You should see:
```
✅ MongoDB connected successfully
🚀 Healify backend running on http://localhost:5000
```

## STEP 4: Test it's working

Open a browser to http://localhost:5000/api/health — you should see:
```json
{"status":"ok","message":"Healify backend is running"}
```

---

## API Reference (for frontend integration)

All routes except `/api/auth/signup` and `/api/auth/login` require a header:
```
Authorization: Bearer <token>
```
(the token is returned by signup/login)

| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | `{name, email, password}` | Create account, returns `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` | Returns `{token, user}` |
| POST | `/api/auth/logout` | — | Confirms logout (delete token client-side) |
| GET | `/api/auth/me` | — | Current user info |
| GET | `/api/profile` | — | Get profile (auto-created if missing) |
| PUT | `/api/profile` | profile fields | Create/update profile |
| GET | `/api/medicines` | — | List all medicines |
| POST | `/api/medicines` | `{name, strength, frequency, times}` | Add medicine (startDate = today, server-set) |
| DELETE | `/api/medicines/:id` | — | Remove medicine |
| POST | `/api/medicines/:id/dose` | `{date, time, status}` | Mark one dose taken/skipped |
| GET | `/api/food` | `?limit=20` optional | Food history |
| GET | `/api/food/today` | — | Today's entries + totals |
| POST | `/api/food` | food entry fields | Log food |
| PUT | `/api/food/:id` | fields to update | Correct a food entry |
| DELETE | `/api/food/:id` | — | Remove food entry |
| GET | `/api/water/today` | — | Today's glasses count |
| PUT | `/api/water/today` | `{glasses}` | Set today's glasses count |
| GET | `/api/water/history` | — | Last 30 days |
| GET | `/api/emergency` | — | Emergency incident history |
| POST | `/api/emergency` | incident + AI response fields | Save incident |
| DELETE | `/api/emergency/:id` | — | Remove incident |

---

## What's NOT done yet (next phase)

The **React frontend still uses localStorage** — it hasn't been rewired to call this API yet, and there are no Login/Signup pages in the UI yet. This backend is ready and tested to run standalone. Frontend integration (auth pages + replacing AppContext's localStorage calls with API calls) is the next step whenever you're ready.
