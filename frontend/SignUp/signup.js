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

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword');
    confirmPassword.style.borderColor = (confirmPassword.value && confirmPassword.value !== password) 
        ? 'rgba(255, 100, 100, 0.8)' 
        : 'rgba(255, 255, 255, 0.3)';
}

async function handleSignUp(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('terms').checked;

    if (!username || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    if (!termsAccepted) {
        alert('Please accept the Terms and Conditions');
        return;
    }
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const res = await fetch('https://heart-nest.onrender.com/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('username', data.username);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            sessionStorage.setItem('prefillEmail', email);
            alert('Signup successful! Redirecting to Sign In...');
            window.location.href = '../SignIn/signin.html';
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (err) {
        console.error(err);
        alert('Server error. Please try again later.');
    }
}

document.getElementById('signupForm').addEventListener('submit', handleSignUp);
document.getElementById('email').addEventListener('blur', checkEmailValidity);
document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);