const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { GetQuery } = require('../db/database');
const { requireAuth, requireRole, secretKey } = require('../middleware/auth');

router.get('/books', async (req, res) => {
  const { search, available } = req.query;

  let sql = "SELECT * FROM books WHERE 1=1";
  let params = [];

  if (search && search.trim().length > 0) {
    sql += " AND (title LIKE ? OR author LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term);
  }

  if (available === "true") {
    sql += " AND is_available = TRUE";
  } else if (available === "false") {
    sql += " AND is_available = FALSE";
  }

  const books = await GetQuery(sql, params);
  res.status(200).json(books);
});

router.get('/books/:id', async (req, res) => {
  const bookId = req.params.id;
  const book = await GetQuery('SELECT * FROM books WHERE id = ?', [bookId]);
  res.status(200).json(book);
});

router.delete('/books/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const bookId = req.params.id;
  try {
    const sql = 'DELETE FROM books WHERE id = ?';
    const result = await GetQuery(sql, [bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

router.post('/books', requireAuth, async (req, res) =>{
  const {title, author, year, genre} = req.body;

   if (!title || !author) {
    return res.status(400).json({ message: "Title and author are required" });
  }

  try {
    const userId = req.user.id; 

    const sql = `INSERT INTO books (title, author, year, genre, owner_id) VALUES (?, ?, ?, ?, ?)`;
    const createdBook = await GetQuery(sql, [title, author, year, genre, userId]);


    if (createdBook.affectedRows === 1) {
      res.status(201).json({ message: "Book added successfully", id: createdBook.insertId });
    } else {
      res.status(500).json({ message: "Failed to add a book" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

router.post('/books/:id/borrow', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const bookId = req.params.id;

  try{
      const response = await GetQuery( 'UPDATE books SET is_available = FALSE, holder_user_id = ? WHERE id = ? AND is_available = TRUE',
    [userId, bookId]
  );

  if (response.affectedRows === 0) {
      return res.status(400).json({ message: 'Book is already borrowed or does not exist' });
    }
  }

  catch(error){
      return res.status(500).json({ message: 'Database error', error: error.message })
  }
  

  res.status(201).json({ message: 'Book borrowed successfully' });
});

router.post('/books/:id/share', requireAuth, async (req, res) => {
    const ownerId = req.user.id;
    const bookId = req.params.id;
    const { targetUserId, permission } = req.body; 
    if (permission !== 'read' && permission !== 'write') {
        return res.status(400).json({ message: "Invalid permission type. Use 'read' or 'write'." });
    }

    try {
        const books = await GetQuery('SELECT owner_id FROM books WHERE id = ?', [bookId]);
        
        if (books.length === 0) return res.status(404).json({ message: "Book not found" });
        if (books[0].owner_id !== ownerId) {
          GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Only the owner can share this book", 403, req.ip]);
          return res.status(403).json({ message: "Only the owner can share this book" });
        }

        await GetQuery(
            'INSERT INTO book_acl (book_id, user_id, permission) VALUES (?, ?, ?)',
            [bookId, targetUserId, permission]
        );

        res.json({ message: `Permission '${permission}' granted to user ${targetUserId}` });

    } catch (err) {
        res.status(500).json({ message: "Database error", error: err.message });
    }
});

router.post('/books/mysharedbooks', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const books = await GetQuery(
            `SELECT b.*, a.permission
             FROM books b
             LEFT JOIN book_acl a ON b.id = a.book_id
             WHERE b.owner_id = ?
                OR a.user_id = ?`,
            [userId, userId]
        );
        
        if (books.length === 0) return res.status(404).json({ message: "No Books" });

        res.json({ message: books });

    } catch (err) {
        res.status(500).json({ message: "Database error", error: err.message });
    }
});

router.post('/books/:id/return', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const bookId = req.params.id;

  try{
    const books = await GetQuery('SELECT holder_user_id FROM books WHERE id = ?', [bookId]);

    if (books.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if(books[0].holder_user_id !== userId && (userRole !== 'admin' && userRole !== 'editor')){
      GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["User doesn't have a permission to return a book - holder_user_id !== userId", 403, req.ip]);
      return res.status(403).json({ message: 'Forbidden: You cannot return a book checked out by someone else' });
    }

    GetQuery(
      'UPDATE books SET is_available = TRUE, holder_user_id = NULL WHERE id = ?',
      [bookId]
    );

  res.status(201).json({ message: 'Book returned successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }

});

router.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    const users = await GetQuery('SELECT * FROM users');
    res.json(users);
});

router.get('/admin/logs', requireAuth, requireRole('admin'), async (req, res) => {
    const sql = "SELECT * FROM logs";
    let params = [];

    try{
      const logs = await GetQuery(sql,params);
      res.json(logs);
    }
    catch(err){
      res.status(500).json({ message: 'Database error', error: err.message });
    }

    res.json(users);
});

router.get('/me', requireAuth, async (req, res) => {
  if(req.user){
    return res.json({
      message: "Welcome!",
      yourDetails: req.user
    });
  }
  else{
    GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["/me 403", 401, req.ip]);
    return res.status(401);
  }
    
});

router.post('/logout', requireAuth, (req, res) => {
    res.clearCookie('jwt_token');
    res.json({ message: "Logged out successfully" });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    } 

    try{
        let sql = "SELECT * FROM users WHERE email = ?";

        const users = await GetQuery(sql, [email]);

        if(users.length === 0) {
          GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["User with this email doesn't exist", 401, req.ip]);
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if(!passwordMatch) {
          GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Password is incorrect", 401, req.ip]);
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user.id, role: user.role, email: email, username: user.username }, secretKey, { expiresIn: '1h' });

        res.cookie('jwt_token', token, { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 3600000 });

        res.json({ message: "Login successful", role: user.role });
    }
    catch(err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/user/changepassword', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new passwords are required" });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: "New password cannot be the same as the current password" });
    }

    try {
        const users = await GetQuery('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: "User account not found" });
        }

        const currentHashedPassword = users[0].password_hash;

        const isMatch = await bcrypt.compare(currentPassword, currentHashedPassword);
        if (!isMatch) {
            GetQuery('INSERT INTO logs (log, status, ip) VALUES (?, ?, ?)', ["Password is incorrect during a password change", 401, req.ip]);
            return res.status(401).json({ message: "Incorrect current password" });
        }

        const saltRounds = 10;
        const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

        GetQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHashedPassword, userId]);

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error("Password change error:", err);
        res.status(500).json({ message: "Database error during password modification", error: err.message });
    }
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if(!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try{

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      let sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";

      const result = await GetQuery(sql, [username, email, hashedPassword]);

      if(result.affectedRows === 1) {
          res.status(201).json({ message: "User registered successfully" });
      } else {
          res.status(500).json({ message: "Failed to register user" });
      }
    }
    catch(err) {
        console.error("Registration error:", err);
    res.status(500).json({
        message: "Internal server error",
        error: err.sqlMessage || err.message
    });
    }
});

module.exports = router;