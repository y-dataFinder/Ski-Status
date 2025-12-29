// Firebase Configuration
// NOTE: Replace with your own Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCZJ_y_9OQYJ948RumjvjNjgPu35m5CI4k",
  authDomain: "split-flapski.firebaseapp.com",
  databaseURL: "https://split-flapski-default-rtdb.firebaseio.com",
  projectId: "split-flapski",
  storageBucket: "split-flapski.firebasestorage.app",
  messagingSenderId: "906271890596",
  appId: "1:906271890596:web:e03bd304e97ff7c323da31"
};

// Initialize Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// App State
let currentUser = null;
let userToken = null;
let selectedStatus = null;
let allUsers = {};

// DOM Elements
const modal = document.getElementById('status-modal');
const nameInput = document.getElementById('name-input');
const nameInputSection = document.getElementById('name-input-section');
const changeStatusBtn = document.getElementById('change-status-btn');
const saveStatusBtn = document.getElementById('save-status-btn');
const cancelBtn = document.getElementById('cancel-btn');
const welcomeMessage = document.getElementById('welcome-message');
const statusBtns = document.querySelectorAll('.status-btn');
const backcountryCheckbox = document.getElementById('backcountry-checkbox');
const column1 = document.getElementById('column-1');
const column2 = document.getElementById('column-2');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();
    setupEventListeners();
    listenToFirebaseChanges();
    checkDailyReset();

    // Check reset every minute
    setInterval(checkDailyReset, 60000);
});

// Load user from local storage
function loadUserFromStorage() {
    const storedName = localStorage.getItem('userName');
    const storedToken = localStorage.getItem('userToken');

    if (storedName && storedToken) {
        currentUser = storedName;
        userToken = storedToken;
        updateWelcomeMessage();
        nameInputSection.style.display = 'none';
    }
}

// Update welcome message
function updateWelcomeMessage() {
    if (currentUser) {
        welcomeMessage.textContent = `Hello, ${currentUser}`;
    }
}

// Setup event listeners
function setupEventListeners() {
    changeStatusBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);
    saveStatusBtn.addEventListener('click', saveStatus);

    statusBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            statusBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedStatus = btn.dataset.status;
        });
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Open modal
function openModal() {
    modal.classList.add('active');

    // Pre-fill name if user exists
    if (currentUser) {
        nameInput.value = currentUser;
        nameInputSection.style.display = 'none';
    } else {
        nameInputSection.style.display = 'block';
        nameInput.value = '';
    }

    // Reset selections
    statusBtns.forEach(b => b.classList.remove('selected'));
    backcountryCheckbox.checked = false;
    selectedStatus = null;

    // Pre-select current user's status if they exist
    if (currentUser && allUsers[currentUser]) {
        const userStatus = allUsers[currentUser];
        selectedStatus = userStatus.status;
        backcountryCheckbox.checked = userStatus.backcountry || false;

        statusBtns.forEach(btn => {
            if (btn.dataset.status === selectedStatus) {
                btn.classList.add('selected');
            }
        });
    }
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
}

// Save status
async function saveStatus() {
    const name = currentUser || nameInput.value.trim();

    if (!name) {
        alert('Please enter your name');
        return;
    }

    if (!selectedStatus) {
        alert('Please select a status');
        return;
    }

    // Generate token for new users
    if (!currentUser) {
        currentUser = name;
        userToken = generateToken();
        localStorage.setItem('userName', name);
        localStorage.setItem('userToken', userToken);
        updateWelcomeMessage();
    }

    // Check if user can modify this status
    if (allUsers[name] && allUsers[name].token !== userToken) {
        alert('This name is already taken by another user');
        return;
    }

    // Save to Firebase
    const userData = {
        status: selectedStatus,
        backcountry: backcountryCheckbox.checked,
        token: userToken,
        lastUpdated: Date.now()
    };

    try {
        await database.ref('users/' + sanitizeName(name)).set(userData);
        closeModal();
    } catch (error) {
        console.error('Error saving status:', error);
        alert('Error saving status. Please check Firebase configuration.');
    }
}

// Listen to Firebase changes
function listenToFirebaseChanges() {
    if (!database) return;

    database.ref('users').on('value', (snapshot) => {
        allUsers = {};
        const data = snapshot.val();

        if (data) {
            Object.keys(data).forEach(key => {
                const userName = desanitizeName(key);
                allUsers[userName] = data[key];
            });
        }

        renderBoard();
    });
}

// Render board
function renderBoard() {
    column1.innerHTML = '';
    column2.innerHTML = '';

    const userNames = Object.keys(allUsers).sort();
    const midpoint = Math.ceil(userNames.length / 2);

    userNames.forEach((name, index) => {
        const user = allUsers[name];
        const card = createUserCard(name, user);

        if (index < midpoint) {
            column1.appendChild(card);
        } else {
            column2.appendChild(card);
        }
    });
}

// Create user card
function createUserCard(name, userData) {
    const card = document.createElement('div');
    card.className = 'user-card';

    const indicator = document.createElement('span');
    indicator.className = `status-indicator ${userData.status}`;
    if (userData.backcountry) {
        indicator.classList.add('backcountry');
    }

    const userName = document.createElement('span');
    userName.className = 'user-name';
    userName.textContent = name;

    const lastUpdated = document.createElement('span');
    lastUpdated.className = 'last-updated';
    lastUpdated.textContent = formatTime(userData.lastUpdated);

    card.appendChild(indicator);
    card.appendChild(userName);
    card.appendChild(lastUpdated);

    return card;
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

// Generate token
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Sanitize name for Firebase key
function sanitizeName(name) {
    return name.replace(/[.#$\/\[\]]/g, '_');
}

// Desanitize name
function desanitizeName(key) {
    return key.replace(/_/g, ' ');
}

// Check daily reset at 4:10 PM
function checkDailyReset() {
    const lastResetDate = localStorage.getItem('lastResetDate');
    const now = new Date();
    const currentDate = now.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if it's past 4:10 PM and we haven't reset today
    const isPast410PM = currentHour > 16 || (currentHour === 16 && currentMinute >= 10);

    if (isPast410PM && lastResetDate !== currentDate) {
        performDailyReset();
        localStorage.setItem('lastResetDate', currentDate);
    }
}

// Perform daily reset
async function performDailyReset() {
    if (!database) return;

    try {
        // Clear all users from Firebase
        await database.ref('users').remove();
        console.log('Daily reset completed at 4:10 PM');
    } catch (error) {
        console.error('Error performing daily reset:', error);
    }
}
