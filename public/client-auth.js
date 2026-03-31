/**
 * Tapless Lounge | Client-Side Authentication Engine
 * Handles secure token storage and session management.
 */

const API_AUTH = '/api/auth';

// 1. LOGIN HANDLER
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button');
    const originalText = submitBtn.textContent;
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        setLoading(submitBtn, true);

        const res = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Clear any lingering old sessions
            localStorage.clear();
            
            // Securely store credentials
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            
            // Seamless transition to the hub
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || "Login failed. Check your credentials.");
            setLoading(submitBtn, false, originalText);
        }
    } catch (err) {
        showError('Unable to reach the server. Please try again later.');
        setLoading(submitBtn, false, originalText);
    }
});

// 2. REGISTRATION HANDLER (With Instant Provisioning)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button');
    const originalText = submitBtn.textContent;

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        setLoading(submitBtn, true);

        const res = await fetch(`${API_AUTH}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            localStorage.clear();
            
            // Auto-login after successful registration
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || "Registration failed. Email might be taken.");
            setLoading(submitBtn, false, originalText);
        }
    } catch (err) {
        showError('Registration server is currently unavailable.');
        setLoading(submitBtn, false, originalText);
    }
});

/**
 * UI Helper: Updates button state during API calls
 */
function setLoading(btn, isLoading, text = "Processing...") {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? text : text;
    btn.style.opacity = isLoading ? "0.7" : "1";
}

/**
 * UI Helper: Displays feedback to the user
 */
function showError(msg) {
    const errorBox = document.getElementById('error-msg');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    
    // Visual feedback for errors
    const card = document.querySelector('.flipper');
    card.classList.add('shake-effect');
    setTimeout(() => card.classList.remove('shake-effect'), 500);
}

// Global rotation helper
window.rotateCard = function() {
    const flipper = document.getElementById('card-flipper');
    flipper.classList.toggle('is-flipped');
    document.getElementById('error-msg').classList.add('hidden');
}