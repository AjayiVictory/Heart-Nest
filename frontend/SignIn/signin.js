
const API = window.APP_CONFIG?.API_BASE_URL || 'https://heart-nest.onrender.com';

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password, .icon-button');

    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (button) button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkEmailValidity() {
    const emailInput = document.getElementById('email');
    emailInput.style.borderColor = (emailInput.value && !validateEmail(emailInput.value))
        ? 'rgba(255, 100, 100, 0.8)'
        : 'rgba(255, 255, 255, 0.3)';
}

function saveEmail() {
    const rememberCheckbox = document.getElementById('rememberEmail');
    const emailInput = document.getElementById('email');

    if (rememberCheckbox.checked) {
        localStorage.setItem('rememberedEmail', emailInput.value);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
}

function loadSavedEmail() {
    const prefillEmail = sessionStorage.getItem('prefillEmail');
    if (prefillEmail) {
        document.getElementById('email').value = prefillEmail;
        sessionStorage.removeItem('prefillEmail');
        return;
    }

    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberEmail').checked = true;
    }
}
async function handleSignIn(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    saveEmail();
    
    // Validate email and password
    if (!email || !password) {
        alert('Please provide email and password');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        const res = await fetch(`${API}/api/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Store user data including username from database
            localStorage.setItem('username', data.username);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userEmail', data.email || email);

            // Redirect to dashboard
            window.location.href = '../Dashboard/dashboard.html';
        } else {
            alert(data.message || 'Invalid email or password');
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
}

document.getElementById('signinForm').addEventListener('submit', handleSignIn);
document.getElementById('rememberEmail').addEventListener('change', saveEmail);
window.addEventListener('load', loadSavedEmail);