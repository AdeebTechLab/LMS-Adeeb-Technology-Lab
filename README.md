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




Redesigned Announcement Popup:

Branding: Added the official logo and "LMS Adeeb Tech Lab" title to the header.
Dynamic Big Icons: Notifications now show a large, clear icon based on their content:
Fees/Payments: 💳 Credit Card icon
Assignments/Tasks: 📄 File icon
Results/Certificates: 🏆 Award icon
Live Classes/Meetings: 📅 Calendar icon
Urgent Notices: ⚡ Zap icon
Aesthetics: Improved the layout with soft gradients, better shadows, and full support for both light and dark modes.