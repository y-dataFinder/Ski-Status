# Ski Status Board

A minimalistic, digital ski message board with a retro split-flap aesthetic. Pure black background with white retro font, designed for GitHub Pages.

## Features

- **Two-column layout** for maximum name display
- **Status indicators** with colored dots:
  - 🟢 Green: Free skiing
  - 🔴 Red: Working
  - 🟡 Yellow: Maybe later
  - 🟠 Orange ring: Backcountry gear equipped
- **Persistent user names** via local storage
- **Status protection** - Each user gets a unique token to prevent others from modifying their status
- **Daily reset** at 4:10 PM automatically clears all statuses
- **Real-time sync** across all users via Firebase

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps
3. Once created, click on "Web" (</>) to add a web app
4. Register your app and copy the Firebase configuration

### 2. Enable Firebase Realtime Database

1. In your Firebase project, go to "Build" → "Realtime Database"
2. Click "Create Database"
3. Choose a location and start in **test mode** (we'll secure it next)
4. Click "Enable"

### 3. Set Database Rules

To protect against unauthorized modifications, set these rules in the "Rules" tab:

```json
{
  "rules": {
    "users": {
      "$userName": {
        ".read": true,
        ".write": "!data.exists() || data.child('token').val() === newData.child('token').val()"
      }
    }
  }
}
```

This allows:
- Anyone to read all statuses
- New users to create their status
- Only users with the correct token to modify their own status

### 4. Configure the App

Open `app.js` and replace the Firebase configuration at the top:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push these files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click Save

Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Usage

1. **First time**: Enter your name when prompted - it will be saved locally
2. **Update status**: Click "Update Status" button
3. **Select status**: Choose your current availability
4. **Backcountry gear**: Check the box if you have backcountry equipment
5. **Save**: Your status will sync with all users in real-time

## How It Works

### Local Storage
- Your name and unique token are saved in browser local storage
- You won't be prompted for your name again on the same device

### Status Protection
- Each user gets a unique token when they first set their status
- Only the user with the matching token can modify that status
- Prevents others from easily changing your status

### Daily Reset
- At 4:10 PM every day, all statuses are cleared
- The app checks every minute if a reset is needed
- Uses local storage to track the last reset date

## Customization

### Change Reset Time
In `app.js`, modify the `checkDailyReset()` function:
```javascript
const isPast410PM = currentHour > 16 || (currentHour === 16 && currentMinute >= 10);
```
Change `16` (hour) and `10` (minute) to your desired time (24-hour format).

### Change Colors
In `styles.css`, modify the status indicator colors:
```css
.status-indicator.free { background-color: #00ff00; }
.status-indicator.working { background-color: #ff0000; }
.status-indicator.maybe { background-color: #ffff00; }
```

### Change Fonts
The board uses VT323 and Share Tech Mono fonts. You can change these in `styles.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap');
```

## Troubleshooting

### Firebase not connecting
- Check that your Firebase config is correct
- Ensure Realtime Database is enabled in Firebase Console
- Check browser console for error messages

### Status not updating
- Verify Firebase database rules are set correctly
- Check that you have internet connection
- Look for errors in browser console

### Daily reset not working
- The reset checks every minute when the page is open
- If no one has the page open at 4:10 PM, reset happens when someone next visits after 4:10 PM
- Check browser local storage for 'lastResetDate' key

## License

MIT License - Feel free to use and modify as needed!
