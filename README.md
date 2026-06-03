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

Password reset emails need Gmail **App Password** (not your normal Gmail password):

1. Enable 2-Step Verification on the Gmail account.
2. Create an App Password: https://myaccount.google.com/apppasswords
3. In `backend/.env` set:
   - `EMAIL_USER=your@gmail.com`
   - `EMAIL_PASS=16_character_app_password` (no spaces)
4. On **Render** (production API), add the same `EMAIL_USER` and `EMAIL_PASS` in Environment.
5. Restart backend after changing `.env`.

If you see *"Email could not be sent"*, update `EMAIL_PASS` with a new App Password.
If you see *"Cannot reach the server"*, run `npm run dev` in the `backend` folder.

<<<<<<< HEAD
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
=======
**Deploy:** Push code to GitHub so **Render** (backend) and **Vercel** (frontend) both redeploy. Forgot-password must use the latest backend (instant API response; email sends in background).
>>>>>>> parent of 68ff33e (news)




Redesigned Announcement Popup:

Branding: Added the official logo and "LMS Adeeb Tech Lab" title to the header.
Dynamic Big Icons: Notifications now show a large, clear icon based on their content:
Fees/Payments: 💳 Credit Card icon
Assignments/Tasks: 📄 File icon
Results/Certificates: 🏆 Award icon
Live Classes/Meetings: 📅 Calendar icon
Urgent Notices: ⚡ Zap icon
Aesthetics: Improved the layout with soft gradients, better shadows, and full support for both light and dark modes.