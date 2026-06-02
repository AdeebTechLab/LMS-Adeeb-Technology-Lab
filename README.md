# LMS-Adeeb-Technology-Lab

## Run locally

```bash
cd backend
npm install
npm run dev

cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the frontend proxies `/api` to the backend (port 5000).

## Forgot password / reset email

### Important: Render FREE tier blocks Gmail SMTP

Gmail `EMAIL_PASS` **does not send mail on Render free hosting** (ports 465/587 are blocked).  
Use **Brevo** (free HTTP API) on Render instead.

### Setup Brevo on Render (5 minutes)

1. Create account: [brevo.com](https://www.brevo.com)
2. **Senders & IP** → **Add a sender** → `info.adeebtechlab@gmail.com` → verify via the link Brevo emails you
3. **SMTP & API** → **Create API key** → copy the key
4. On [Render Dashboard](https://dashboard.render.com) → your service → **Environment** → add:

   | Key | Value |
   |-----|--------|
   | `BREVO_API_KEY` | paste API key |
   | `EMAIL_USER` | `info.adeebtechlab@gmail.com` (same verified sender) |
   | `EMAIL_FROM` | `info.adeebtechlab@gmail.com` |

5. **Save** → **Manual Deploy** (restart service)

6. Test in browser:  
   `https://lms-adeeb-technology-lab.onrender.com/api/auth/test-email`  
   You should see `"success":true` and get a test email at `EMAIL_USER`.

### Error: "Could not send reset email" or Brevo 401

Render par **galat key** lagi hai. `xsmtpsib-...` = SMTP key (wrong). You need **`xkeysib-...`** from **API keys & MCP** tab, not the SMTP tab.

### Local development (optional)

Use Gmail App Password in `backend/.env` (no `BREVO_API_KEY` needed locally):

- https://myaccount.google.com/apppasswords  
- `EMAIL_USER` + `EMAIL_PASS`

### Vercel (frontend)

`VITE_API_URL` = `https://lms-adeeb-technology-lab.onrender.com/api` then redeploy.




Redesigned Announcement Popup:

Branding: Added the official logo and "LMS Adeeb Tech Lab" title to the header.
Dynamic Big Icons: Notifications now show a large, clear icon based on their content:
Fees/Payments: 💳 Credit Card icon
Assignments/Tasks: 📄 File icon
Results/Certificates: 🏆 Award icon
Live Classes/Meetings: 📅 Calendar icon
Urgent Notices: ⚡ Zap icon
Aesthetics: Improved the layout with soft gradients, better shadows, and full support for both light and dark modes.