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
    if (emailInput.value && !validateEmail(emailInput.value)) {
        emailInput.style.borderColor = 'rgba(255, 100, 100, 0.8)';
    } else {
        emailInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (confirmPassword.value && confirmPassword.value !== password) {
        confirmPassword.style.borderColor = 'rgba(255, 100, 100, 0.8)';
    } else {
        confirmPassword.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }
}

function handleSignUp(e) {
    e.preventDefault();
    
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAccepted = document.getElementById('terms').checked;
    
    if (!fullname || !email || !password || !confirmPassword) {
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
    
    localStorage.setItem('userName', fullname);
    localStorage.setItem('userEmail', email);
    
    setTimeout(() => {
        window.location.href = '../SignUp/signup.html';
    }, 3000);
}

function handleGoogleSignUp() {
    console.log('Initiating Google sign up...');
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth';
}

function handleAppleSignUp() {
    console.log('Apple sign up coming soon');
    alert('Apple sign up will be available soon');
}

document.getElementById('signupForm').addEventListener('submit', handleSignUp);
document.getElementById('email').addEventListener('blur', checkEmailValidity);
document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);

document.querySelectorAll('.btn-social').forEach(button => {
    button.addEventListener('click', function() {
        if (this.textContent.includes('Google')) {
            handleGoogleSignUp();
        } else {
            handleAppleSignUp();
        }
    });
});
