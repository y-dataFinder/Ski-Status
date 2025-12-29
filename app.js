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
let firebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK failed to load. Check your internet connection.');
        }

        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        firebaseInitialized = true;

        console.log('Firebase initialized successfully');
        showConnectionStatus('Connected to Firebase', false);

        // Monitor connection state
        database.ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('Firebase connected');
                showConnectionStatus('Connected', false);
            } else {
                console.log('Firebase disconnected');
                showConnectionStatus('Disconnected - Reconnecting...', true);
            }
        });

    } catch (error) {
        console.error("Firebase initialization error:", error);
        showConnectionStatus('Failed to connect to Firebase: ' + error.message, true);
        firebaseInitialized = false;
    }
}

// Show connection status to user
function showConnectionStatus(message, isError) {
    console.log(`Connection status: ${message}`);

    // Create or update status message element
    let statusEl = document.getElementById('connection-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'connection-status';
        statusEl.className = 'connection-status';
        document.body.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.className = isError ? 'connection-status error' : 'connection-status success';

    // Auto-hide success messages after 3 seconds
    if (!isError) {
        setTimeout(() => {
            if (statusEl && statusEl.textContent === message) {
                statusEl.style.opacity = '0';
                setTimeout(() => {
                    if (statusEl) statusEl.remove();
                }, 300);
            }
        }, 3000);
    }
}

// App State
let currentUser = null;
let userToken = null;
let deviceId = null;
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
    showConnectionStatus('Initializing...', false);
    initializeFirebase();
    loadUserFromStorage();
    setupEventListeners();
    listenToFirebaseChanges();
    checkDailyReset();

    // Check reset every minute
    setInterval(checkDailyReset, 60000);
});

// Device ID Management (persistent across localStorage clears)
function getOrCreateDeviceId() {
    // Try multiple storage locations (in order of persistence)
    let storedDeviceId = getCookie('deviceId') ||
                         localStorage.getItem('deviceId') ||
                         sessionStorage.getItem('deviceId');

    if (storedDeviceId) {
        deviceId = storedDeviceId;
    } else {
        // Generate new device ID
        deviceId = generateToken() + '_' + Date.now();
    }

    // Store in all three locations for maximum persistence
    setCookie('deviceId', deviceId, 365); // Cookie lasts 1 year
    localStorage.setItem('deviceId', deviceId);
    sessionStorage.setItem('deviceId', deviceId);

    return deviceId;
}

// Cookie helpers
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Load user from local storage or Firebase (by device ID)
async function loadUserFromStorage() {
    const storedName = localStorage.getItem('userName');
    const storedToken = localStorage.getItem('userToken');

    // Get or create device ID
    getOrCreateDeviceId();

    if (storedName && storedToken) {
        // localStorage still has user data
        currentUser = storedName;
        userToken = storedToken;
        updateWelcomeMessage();
        nameInputSection.style.display = 'none';
    } else if (database && deviceId) {
        // localStorage was cleared, try to restore from Firebase
        console.log('localStorage empty, checking Firebase for device ID...');
        try {
            const snapshot = await database.ref('users_by_device/' + deviceId).once('value');
            const userData = snapshot.val();

            if (userData && userData.name && userData.token) {
                // Found user data, restore it
                console.log('Restored user from Firebase:', userData.name);
                currentUser = userData.name;
                userToken = userData.token;

                // Save back to localStorage
                localStorage.setItem('userName', currentUser);
                localStorage.setItem('userToken', userToken);

                updateWelcomeMessage();
                nameInputSection.style.display = 'none';

                showConnectionStatus('Welcome back, ' + currentUser, false);
            } else {
                console.log('No previous user data found for this device');
            }
        } catch (error) {
            console.error('Error restoring user from Firebase:', error);
        }
    }
}

// Update welcome message and status indicator
function updateWelcomeMessage() {
    if (currentUser) {
        welcomeMessage.textContent = `Hello, ${currentUser}`;

        // Update status indicator
        const statusIndicator = document.getElementById('user-status-indicator');
        if (statusIndicator && allUsers[currentUser]) {
            const userStatus = allUsers[currentUser];

            // Remove all status classes
            statusIndicator.className = 'status-indicator';

            // Add current status class
            statusIndicator.classList.add(userStatus.status);

            // Add backcountry class if applicable
            if (userStatus.backcountry) {
                statusIndicator.classList.add('backcountry');
            }

            // Show the indicator
            statusIndicator.style.display = 'inline-block';
        } else if (statusIndicator) {
            // Hide if user hasn't set status
            statusIndicator.style.display = 'none';
        }
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
    // Allow if: (1) name not taken, (2) you have the token, OR (3) you have the device ID
    if (allUsers[name]) {
        const existingUser = allUsers[name];
        const hasToken = existingUser.token === userToken;
        const hasDeviceId = existingUser.deviceId === deviceId;

        if (!hasToken && !hasDeviceId) {
            // Try to check Firebase for device ID match (in case allUsers hasn't synced yet)
            try {
                const snapshot = await database.ref('users_by_device/' + deviceId).once('value');
                const deviceData = snapshot.val();

                if (!deviceData || deviceData.name !== name) {
                    alert('This name is already taken by another user');
                    return;
                }
                // Device ID matches, allow reclaiming
                console.log('Reclaiming name via device ID match');
            } catch (error) {
                console.error('Error checking device ownership:', error);
                alert('This name is already taken by another user');
                return;
            }
        }
    }

    // Save to Firebase
    const userData = {
        status: selectedStatus,
        backcountry: backcountryCheckbox.checked,
        token: userToken,
        deviceId: deviceId,
        lastUpdated: Date.now()
    };

    try {
        // Save user status
        await database.ref('users/' + sanitizeName(name)).set(userData);

        // Save device mapping for recovery
        await database.ref('users_by_device/' + deviceId).set({
            name: name,
            token: userToken
        });

        console.log('Status saved successfully with device ID');
        closeModal();
    } catch (error) {
        console.error('Error saving status:', error);
        alert('Error saving status. Please check Firebase configuration.');
    }
}

// Listen to Firebase changes
function listenToFirebaseChanges() {
    if (!database) {
        console.warn('Cannot listen to Firebase changes: database not initialized');
        showConnectionStatus('Firebase not initialized', true);
        return;
    }

    console.log('Setting up Firebase listener...');

    database.ref('users').on('value', (snapshot) => {
        allUsers = {};
        const data = snapshot.val();

        console.log('Received Firebase data:', data);

        if (data) {
            // Validate and process each user
            Object.keys(data).forEach(key => {
                const userData = data[key];

                // Validate user data structure
                if (!userData || typeof userData !== 'object') {
                    console.warn(`Invalid user data for key: ${key}`);
                    return;
                }

                if (!userData.status || !userData.token) {
                    console.warn(`Incomplete user data for key: ${key}`, userData);
                    return;
                }

                const userName = desanitizeName(key);
                allUsers[userName] = userData;
            });
        }

        console.log(`Rendering board with ${Object.keys(allUsers).length} users`);
        renderBoard();
    }, (error) => {
        // Error callback
        console.error('Firebase listener error:', error);
        showConnectionStatus('Error loading statuses: ' + error.message, true);
    });
}

// Render board
function renderBoard() {
    column1.innerHTML = '';
    column2.innerHTML = '';

    const userNames = Object.keys(allUsers).sort();

    // Show empty state if no users
    if (userNames.length === 0 && firebaseInitialized) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.textContent = 'No one is online yet. Be the first to set your status!';
        column1.appendChild(emptyMessage);
        updateWelcomeMessage(); // Update status indicator even when board is empty
        return;
    }

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

    // Update current user's status indicator after rendering board
    updateWelcomeMessage();
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

// Sanitize name for Firebase key (converts spaces and special chars to underscores)
function sanitizeName(name) {
    // Replace spaces and Firebase-invalid characters with underscores
    return name.replace(/[.#$\/\[\]\s]/g, '_');
}

// Desanitize name (converts underscores back to spaces - inverse of sanitize)
function desanitizeName(key) {
    return key.replace(/_/g, ' ');
}

// Check daily reset at 4:10 PM
async function checkDailyReset() {
    if (!database) return;

    const now = new Date();
    const currentDate = now.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Check if it's past 4:10 PM
    const isPast410PM = currentHour > 16 || (currentHour === 16 && currentMinute >= 10);

    if (!isPast410PM) {
        return; // Not time to reset yet
    }

    try {
        // Get last reset date from Firebase (shared across all users)
        const metadataRef = database.ref('metadata/lastResetDate');
        const snapshot = await metadataRef.once('value');
        const lastResetDate = snapshot.val();

        console.log('Checking daily reset:', { currentDate, lastResetDate, isPast410PM });

        // Only reset if we haven't reset today
        if (lastResetDate !== currentDate) {
            await performDailyReset(currentDate);
        }
    } catch (error) {
        console.error('Error checking daily reset:', error);
    }
}

// Perform daily reset
async function performDailyReset(currentDate) {
    if (!database) {
        console.warn('Cannot perform daily reset: database not initialized');
        return;
    }

    try {
        console.log('Performing daily reset...');

        // Clear all users from Firebase
        await database.ref('users').remove();

        // Save the reset date to Firebase (shared across all users)
        await database.ref('metadata/lastResetDate').set(currentDate);

        console.log('Daily reset completed successfully for date:', currentDate);
        showConnectionStatus('Daily status reset completed', false);
    } catch (error) {
        console.error('Error performing daily reset:', error);

        // Check if it's a permission error
        if (error.code === 'PERMISSION_DENIED') {
            console.error('Permission denied: Update Firebase database rules to allow writes at "users" and "metadata" level');
            showConnectionStatus('Daily reset failed: Permission denied. Check Firebase rules.', true);
        } else {
            showConnectionStatus('Daily reset failed: ' + error.message, true);
        }
    }
}
