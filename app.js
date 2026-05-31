const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const apiRoutes = require('./routes/apiRoutes');
const { GetQuery } = require('./db/database');


const app = express();
const port = 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('/register to create an account, /login to log in');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'FrontRegister.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'FrontLogin.html'));
});

app.get('/me', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FrontMe.html'));
});

app.get('/password', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FrontNewPassword.html'));
});

app.get('/library', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FrontBooks.html'));
});

app.use('/api', apiRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


if (require.main === module) {
    start();
}

module.exports = app;