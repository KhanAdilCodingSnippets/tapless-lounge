const API_AUTH = '/api/auth';

// 1. LOGIN LOGIC
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            // Save User & Token
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            // Redirect
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error);
        }
    } catch (err) {
        showError('Server connection failed');
    }
});

// 2. REGISTER LOGIC (With Auto-Login)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_AUTH}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (data.success) {
            // AUTO LOGIN HAPPENS HERE
            // We treat registration exactly like login now
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            
            // Immediate Redirect (No flipping back needed)
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error);
        }
    } catch (err) {
        showError('Server connection failed');
    }
});

// Helper: Show Error Message
function showError(msg) {
    const errorBox = document.getElementById('error-msg');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    
    // Shake animation for effect
    const card = document.querySelector('.flip-container');
    card.classList.add('animate-pulse');
    setTimeout(() => card.classList.remove('animate-pulse'), 500);
}

// Ensure the flip function is available globally
window.rotateCard = function() {
    document.getElementById('card-flipper').classList.toggle('is-flipped');
    document.getElementById('error-msg').classList.add('hidden');
}