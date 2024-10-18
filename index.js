require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const axios = require('axios');
const schedule = require('node-schedule');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

let monitorResults = [];

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
 
}));

app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        console.log('User is authenticated');
        return next();
    } else {
        console.log('User is not authenticated, redirecting to /login');
        res.redirect('/login');
    }
}


// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});



/* // Function to check the status of a URL
async function checkUrlStatus(url, auth,apiKey) {
    try {
        const options = {
            headers: apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {},
            auth: auth ? { username: auth.username, password: auth.password } : undefined
        };
        
        const response = await axios.get(url, options);
        return { url: url, status: 'up', httpStatus: response.status };
    } catch (error) {
        if (error.response) {
             // Service is down, send email notification
             //await sendEmailNotification(url);
            return { url: url, status: 'down', httpStatus: error.response.status };
        } else {
            return { url: url, status: 'down', error: error.message };
        }
    }
} */

    async function checkUrlStatus(url, auth, apiKey) {
        try {
            const headers = {};
    
            // Conditionally add headers based on apiKey
            if (apiKey) {
                headers['Ocp-Apim-Subscription-Key'] = apiKey;
                headers['apiKey'] = apiKey;
            }
    
            const options = {
                headers: headers,
                auth: auth ? { username: auth.username, password: auth.password } : undefined
            };
    
            const response = await axios.get(url, options);
            return { url: url, status: 'up', httpStatus: response.status };
        } catch (error) {
            if (error.response) {
                // Service is down, send email notification
                await sendEmailNotification(url);
                return { url: url, status: 'down', httpStatus: error.response.status };
            } else {
                return { url: url, status: 'down', error: error.message };
            }
        }
    }

async function sendEmailNotification(url,categoryName) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.NOTIFICATION_EMAILS.split(','), // Array of notification emails
         subject: `${categoryName} - Service Down Notification`,
        text: `Service at ${url} is down in category ${categoryName}!`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email notification sent for service down at ${url} in category ${categoryName}`);
    } catch (error) {
        console.error('Error sending email notification:', error);
    }
}


/* // Function to monitor URLs in a given category
async function monitorCategory(urls, categoryName) {
    const results = await Promise.all(urls.map(async ({ name, url, auth }) => {
        const status = await checkUrlStatus(url, auth);
        return { name, ...status };
    }));
    return { category: categoryName, urls: results };
} */

    // Function to monitor URLs in a given category
/*async function monitorCategory(urls, categoryName) {
    const results = await Promise.all(urls.map(async ({ name, url, auth, apiKey }) => {
        const apiKeyValue = apiKey ? process.env[apiKey] : undefined;
        const status = await checkUrlStatus(url, auth, apiKeyValue);
        return { name, ...status };
    }));
    return { category: categoryName, urls: results };
}*/

async function monitorCategory(urls, categoryName) {
    const results = await Promise.all(urls.map(async ({ name, url, auth, apiKey }) => {
        const status = await checkUrlStatus(url, auth, apiKey);
        return { name, ...status };
    }));
    return { category: categoryName, urls: results };
}


// Main function to run the monitor
/* async function runMonitor() {
    const environments = process.env.ENVIRONMENTS.split(',');
    const results = await Promise.all(environments.map(async env => {
        const urls = JSON.parse(process.env[`${env}_URLS`]);
        return await monitorCategory(urls, env);
    }));

    monitorResults = results;
} */

    async function runMonitor() {
        const environments = process.env.ENVIRONMENTS.split(',');
        const results = await Promise.all(environments.map(async env => {
            const urls = JSON.parse(process.env[`${env}_URLS`]);
            const categoryResults = await monitorCategory(urls, env);
            //console.log("category--",categoryResults);
            categoryResults.urls.forEach(urlData => {
                if (urlData.status === 'down') {
                    sendEmailNotification(urlData.url, categoryResults.category);
                }
            });
            return categoryResults;
        }));
    
        monitorResults = results;
    }
    
// Schedule the monitor to run every 10 minutes
schedule.scheduleJob('*/10 * * * *', runMonitor);


// Initial run
runMonitor();

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Login route
// Login route
app.get('/login', (req, res) => {
    const error = req.flash('error');
    res.send(`
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login</title>
            <!-- Bootstrap CSS -->
            <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body {
                    background-color: #f8f9fa;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .card {
                    max-width: 400px;
                    padding: 20px;
                    margin: auto;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 class="mb-4">Login</h2>
                ${error ? `<div class="alert alert-danger">${error}</div>` : ''}
                <form method="post" action="/login">
                    <div class="form-group">
                        <label for="username">Username:</label>
                        <input type="text" class="form-control" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Login</button>
                </form>
            </div>

            <!-- Bootstrap JS and dependencies (jQuery and Popper.js) -->
            <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@1.16.1/dist/umd/popper.min.js"></script>
            <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "om-admin" && password === "q1w2e3r4t5") {
        req.session.user = username;
        res.redirect('/');
    } else {
        req.flash('error', 'Invalid username or password');
        res.redirect('/login');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Protected route for monitoring status
app.get('/status', (req, res) => {
    console.log('Status route accessed');
    res.json(monitorResults);
});

// Protected route for the main page
app.get('/', isAuthenticated, (req, res) => {
    console.log('Main page accessed');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Example usage
//sendEmailNotification('https://example.com/service');
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
