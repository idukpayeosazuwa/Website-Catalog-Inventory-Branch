/**
 * Auth Logic — Login, Register, Session Management
 */
import { account, ID, showToast, getCurrentUser } from './appwrite.js';

// ─── Check Existing Session ─────────────────────────────────
(async function checkSession() {
    const user = await getCurrentUser();
    if (user) {
        window.location.href = 'dashboard.html';
    }
})();

// ─── Tab Switching ───────────────────────────────────────────
window.switchTab = function(tab) {
    // Update tabs
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');

    // Update forms
    document.getElementById('form-login').classList.toggle('active', tab === 'login');
    document.getElementById('form-register').classList.toggle('active', tab === 'register');

    // Clear error
    hideError();
};

// ─── Error Display ───────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.add('show');
}

function hideError() {
    document.getElementById('auth-error').classList.remove('show');
}

// ─── Loading State ───────────────────────────────────────────
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ─── Login Handler ───────────────────────────────────────────
window.handleLogin = async function(e) {
    e.preventDefault();
    hideError();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    setLoading('btn-login', true);

    try {
        await account.createEmailPasswordSession(email, password);
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('Login error:', err);
        if (err.code === 401) {
            showError('Invalid email or password. Please try again.');
        } else if (err.code === 429) {
            showError('Too many attempts. Please wait a moment and try again.');
        } else {
            showError(err.message || 'Login failed. Please check your credentials.');
        }
        setLoading('btn-login', false);
    }
};

// ─── Register Handler ────────────────────────────────────────
window.handleRegister = async function(e) {
    e.preventDefault();
    hideError();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showError('Please fill in all fields.');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters.');
        return;
    }

    setLoading('btn-register', true);

    try {
        // Create account
        await account.create(ID.unique(), email, password, name);

        // Auto-login after registration
        await account.createEmailPasswordSession(email, password);

        // Redirect to dashboard (it will detect no shop and show setup)
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('Register error:', err);
        if (err.code === 409) {
            showError('An account with this email already exists. Try signing in.');
        } else if (err.code === 429) {
            showError('Too many attempts. Please wait a moment.');
        } else {
            showError(err.message || 'Registration failed. Please try again.');
        }
        setLoading('btn-register', false);
    }
};
