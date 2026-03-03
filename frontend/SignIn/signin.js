
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');

    if (input.type === 'password') {
        input.type = 'text';
        button.querySelector('.eye-icon').textContent = '👁️‍🗨️';
    } else {
        input.type = 'password';
        button.querySelector('.eye-icon').textContent = '👁️';
    }
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
    const rememberCheckbox = document.getElementById('remember');
    const emailInput = document.getElementById('email');

    if (rememberCheckbox.checked) {
        localStorage.setItem('rememberedEmail', emailInput.value);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
}

function loadSavedEmail() {
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('remember').checked = true;
    }
}
async function handleSignIn(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    saveEmail();
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('username', data.username);
            localStorage.setItem('token', data.token);

            alert(`Welcome back, ${data.username}!`);
            window.location.href = '../Dashboard/dashboard.html';
        } else {
            alert(data.message || 'Invalid credentials');
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
}

document.getElementById('signinForm').addEventListener('submit', handleSignIn);
document.getElementById('email').addEventListener('blur', checkEmailValidity);
document.getElementById('remember').addEventListener('change', saveEmail);
window.addEventListener('load', loadSavedEmail);