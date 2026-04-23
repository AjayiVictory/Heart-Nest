// Backend/validateEnv.js
// This script validates that all required environment variables are set

const requiredEnvVars = [
    'PORT',
    'MONGO_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

function validateEnvironment() {
    const missingVars = [];
    const invalidVars = [];

    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];

        // Check if variable exists
        if (!value) {
            missingVars.push(varName);
            return;
        }

        // Additional validation
        if (varName === 'PORT' && isNaN(value)) {
            invalidVars.push(`${varName} must be a number, got: ${value}`);
        }

        if (varName === 'MONGO_URI' && !value.includes('mongodb')) {
            invalidVars.push(`${varName} must be a valid MongoDB URI`);
        }

        if (varName === 'JWT_SECRET' && value.length < 8) {
            invalidVars.push(`${varName} must be at least 8 characters long`);
        }

        // Warn if using default/example values
        if (varName === 'JWT_SECRET' && value.includes('example')) {
            console.warn(`⚠️  WARNING: ${varName} appears to be an example value. Update it in production!`);
        }
    });

    // Report errors
    if (missingVars.length > 0 || invalidVars.length > 0) {
        console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');

        if (missingVars.length > 0) {
            console.error('Missing environment variables:');
            missingVars.forEach(varName => {
                console.error(`  - ${varName}`);
            });
        }

        if (invalidVars.length > 0) {
            console.error('\nInvalid environment variables:');
            invalidVars.forEach(error => {
                console.error(`  - ${error}`);
            });
        }

        console.error('\nPlease set all required variables and restart the server.\n');
        process.exit(1);
    }

    console.log('✅ All environment variables validated successfully!');
    return true;
}

module.exports = validateEnvironment;
