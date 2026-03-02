function togglePassword() {
    const input = document.getElementById('password');
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

function checkEmail() {
    const emailInput = document.getElementById('email');
    if (emailInput.value && !validateEmail(emailInput.value)) {
        emailInput.style.borderColor = 'rgba(255, 100, 100, 0.8)';
    } else {
        emailInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }
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

async function handleSignup(e) {
    e.preventDefault(); // prevent page reload

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    saveEmail();

    try {
        const response = await fetch('https://heart-nest.onrender.com/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});


        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            localStorage.setItem('currentUser', data.username);
            window.location.href = '../Dashboard/dashboard.html';
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (err) {
        console.error(err);
        alert('Server error. Check console.');
    }
}


function handleGoogleLogin() {
    console.log('Initiating Google login...');
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth';
}

function handleAppleLogin() {
    console.log('Apple login coming soon');
    alert('Apple login will be available soon');
}

document.getElementById('signupForm').addEventListener('submit', handleSignup);
document.getElementById('email').addEventListener('blur', checkEmail);

document.querySelectorAll('.btn-social').forEach(button => {
    button.addEventListener('click', function() {
        if (this.textContent.includes('Google')) {
            handleGoogleLogin();
        } else {
            handleAppleLogin();
        }
    });
});

window.addEventListener('load', loadSavedEmail);
