const request = require('supertest');
const bcrypt = require('bcrypt');
require('dotenv').config()

const jwt = require('jsonwebtoken');
const maria = require('mariadb');

const pool = {
    query: jest.fn(),
    release: jest.fn(),
    end: jest.fn()
};

const mockPool = {
    getConnection: jest.fn().mockResolvedValue(pool)
};

jest.mock('mariadb', () => ({
    createPool: jest.fn(() => mockPool)
}));

jest.mock('bcrypt');
const app = require('./app');

let token;
let Cookie; 

beforeAll(() => {
    jest.clearAllMocks();

    const testPayload = { 
        id: 10, 
        username: "testuser", 
        role: "admin",
        email: "test@admin.com"
    };

    const secret = process.env.JWT_SECRET || "secretKey";
token = jwt.sign(testPayload, secret, { expiresIn: '1h' });
    
    Cookie = `jwt_token=${token}; HttpOnly; SameSite=Strict`;
});

describe('Main test -> visit the links', () => {
    
    it('should allow access /', async () => {
        const response = await request(app)
            .get('/');

        expect(response.statusCode).toEqual(200);
    });

    it('should allow access /register', async () => {
        const response = await request(app)
            .get('/register');

        expect(response.statusCode).toEqual(200);
    });

    it('should allow access /login', async () => {
        const response = await request(app)
            .get('/login');

        expect(response.statusCode).toEqual(200);
    });

    it('should allow access /me', async () => {
        const response = await request(app)
            .get('/me');
        
        expect(response.statusCode).toEqual(200);
    });

    it('should allow access /password', async () => {
        const response = await request(app).get('/password');
        expect(response.statusCode).toBe(200);
    });

    it('should allow access /library', async () => {
        const response = await request(app)
            .get('/library');

        expect(response.statusCode).toEqual(200);
    });
});

describe('Book tests', () => {

    const mockAllBooks ={ 
        id: 101, 
        title: 'Cybersecurity 101', 
        author: 'John Doe', 
        year: 2023, 
        genre: 'Technology', 
        holder_user_id: 1, 
        owner_id: 5, 
        created_at: '2026-06-07T12:00:00.000Z', 
        is_available: false 
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('allows get all books', async () => {

        pool.query.mockResolvedValueOnce([mockAllBooks]);

        const response = await request(app)
            .get('/api/books');

        expect(response.status).toEqual(200);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('filters books by search and availability', async () => {

        pool.query.mockResolvedValueOnce([mockAllBooks]);

        const response = await request(app)
            .get('/api/books')
            .query({ search: 'cyber', available: 'false' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual([mockAllBooks]);

        expect(pool.query).toHaveBeenCalledTimes(1);

        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("title LIKE ?");
        expect(sql).toContain("author LIKE ?");
        expect(sql).toContain("is_available = FALSE");

        expect(params).toEqual(["%cyber%", "%cyber%"]);
    });

    it('allows to get book by id', async () => {

        pool.query.mockResolvedValueOnce([mockAllBooks]);

        const response = await request(app)
            .get('/api/books/101');

        
        expect(response.status).toEqual(200);
        expect(response.body).toEqual([mockAllBooks]);

        expect(pool.query).toHaveBeenCalledTimes(1);

        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("WHERE id = ?");
        expect(params).toEqual(["101"]);
    });

    it('allows user to create book', async () => {

        const newDbInsertId = 42;
        pool.query
            .mockResolvedValueOnce({ affectedRows: 1, insertId: newDbInsertId });

        const response = await request(app)
            .post('/api/books')
            .set('Cookie', Cookie)
            .send({
                title: "Test Book",
                author: "QA script",
                year: 2026,
                genre: "studying"
            });
        
        expect(response.status).toEqual(201);
        expect(response.body.message).toBe("Book added successfully");

        expect(response.body.id).toBe(newDbInsertId);

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("INSERT INTO books");
        expect(params).toEqual(["Test Book", "QA script", 2026, "studying", 10]);
    });

    it('allows user to borrow book', async () => {

        const bookId = "42";

        pool.query.mockResolvedValueOnce({ affectedRows: 1 });

        const response = await request(app)
            .post(`/api/books/${bookId}/borrow`)
            .set('Cookie', Cookie);
        
        expect(response.status).toEqual(201);
        expect(response.body.message).toBe("Book borrowed successfully");

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("UPDATE books SET is_available = FALSE, holder_user_id = ? WHERE id = ? AND is_available = TRUE");
        expect(params).toEqual([10, bookId]);
    });

    it('allows a user to return book', async () => {

        const bookId = "42";

        pool.query
            .mockResolvedValueOnce([mockAllBooks])
            .mockResolvedValueOnce({ affectedRows: 1});

        const response = await request(app)
            .post(`/api/books/${bookId}/return`)
            .set('Cookie', Cookie);

        expect(response.status).toEqual(201);
        expect(response.body.message).toBe("Book returned successfully");

        expect(pool.query).toHaveBeenCalledTimes(2);
        const [sql, params] = pool.query.mock.calls[1];

        expect(sql).toContain("UPDATE books SET is_available = TRUE, holder_user_id = NULL WHERE id = ?");
        expect(params).toEqual([bookId]);
    });

    it('successfully grants share permission by a book owner', async () => {

        const ownerId = 10;
        const bookId = 101;
        const targetUserId = 5;

        pool.query
            .mockResolvedValueOnce([{ owner_id: ownerId }])
            .mockResolvedValueOnce([{ id: 5, username: "targetUser" }])
            .mockResolvedValueOnce({ affectedRows: 1 });

        const response = await request(app)
            .post(`/api/books/${bookId}/share`)
            .set('Cookie', Cookie)
            .send({ targetUserId: targetUserId, permission: "read" });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Permission 'read' granted to user targetUser (5)");

        expect(pool.query).toHaveBeenCalledTimes(3);

        const [sql, params] = pool.query.mock.calls[2];
        expect(sql).toContain("INSERT INTO book_acl");
        expect(params).toEqual([bookId.toString(), targetUserId, "read"]);
    });

    it('allows user to remove shared book permissions from user', async () => {

        const targetUserId = 1;
        const bookId = 101;
        const ownerId = 10;

        pool.query
            .mockResolvedValueOnce([{ owner_id: ownerId }])
            .mockResolvedValueOnce({ affectedRows: 1 });

        const response = await request(app)
            .delete(`/api/books/${bookId}/unshare`)
            .set('Cookie', Cookie)
            .send({
                targetUserId: targetUserId
            });

        expect(response.status).toEqual(200);
        expect(response.body.message).toBe(`Permission removed for user ${targetUserId}`);

        expect(pool.query).toHaveBeenCalledTimes(2);
        const [sql, params] = pool.query.mock.calls[1];

        expect(sql).toContain("DELETE FROM book_acl WHERE book_id = ? AND user_id = ?");
        expect(params).toEqual([bookId.toString(), targetUserId]);
    });

    it('doesn\'t allow user to share not his book and give permissions', async () => {

        const targetUserId = 1;
        const bookId = 101;
        const ownerId = 10;

        pool.query
            .mockResolvedValueOnce([{ owner_id: 95 }])
            .mockResolvedValueOnce({ affectedRows: 1 });

        const response = await request(app)
            .post(`/api/books/${bookId}/share`)
            .set('Cookie', Cookie)
            .send({
                targetUserId: targetUserId,
                permission: "write"
            });

        expect(response.status).toEqual(403);
        expect(response.body.message).toBe("Only the owner can share this book");

         expect(pool.query).toHaveBeenCalledTimes(3);
        const [sql, params] = pool.query.mock.calls[2];

        expect(sql).toContain("INSERT INTO logs");
        expect(params).toEqual(["Only the owner can share this book", 403, expect.any(String)]);
    });

    it('allows user to see all his shared and owned books', async () => {

        const rawDbRows = [
            { id: 101, title: 'Hacking 101', owner_id: 10, shared_user_id: 5, permission: 'read' },
            { id: 101, title: 'Hacking 101', owner_id: 10, shared_user_id: 6, permission: 'write' },
            { id: 102, title: 'Solo Book', owner_id: 10, shared_user_id: null, permission: null }
        ];

        pool.query.mockResolvedValueOnce(rawDbRows);

        const response = await request(app)
            .post(`/api/books/mysharedbooks`)
            .set('Cookie', Cookie);

        expect(response.status).toEqual(200);

        expect(response.body.currentUserId).toBe(10);
        expect(response.body.books.length).toBe(2);

        const sharedBook = response.body.books.find(b => b.id === 101);
        expect(sharedBook.shared_users.length).toBe(2);
        expect(sharedBook.shared_users[0]).toEqual({ user_id: 5, permission: 'read' });
        expect(sharedBook.shared_users[1]).toEqual({ user_id: 6, permission: 'write' });

        const soloBook = response.body.books.find(b => b.id === 102);
        expect(soloBook.shared_users.length).toBe(0);

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];
        
        expect(sql).toContain("LEFT JOIN book_acl");
        expect(sql).toContain("WHERE b.owner_id = ?");
        expect(params).toEqual([10, 10]);
    });
});

describe('Admin stuff', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('allows admin to see all users', async () => {
        const userList = [{ id: 1, username: "user1", email: "user1@example.com", password_hash: "hash1", role: "user", created_at: "2026-06-07T12:00:00.000Z" }];
        const response = await request(app)
            .get(`/api/admin/users`)
            .set('Cookie', Cookie);
        
        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("SELECT * FROM users");
        expect(params).toEqual([]);
    });

    it('allows admin to see all existing logs', async () => {

        const logs = [
            { id: 1, log: "User logged in", status: 200, ip: "127.0.0.1", time: "2026-06-07T12:00:00.000Z" }
        ];
        pool.query.mockResolvedValueOnce(logs);

        const response = await request(app)
            .get(`/api/admin/logs`)
            .set('Cookie', Cookie);
        
        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

         expect(pool.query).toHaveBeenCalledTimes(1);
        const [sql, params] = pool.query.mock.calls[0];

        expect(sql).toContain("SELECT * FROM logs");
        expect(params).toEqual([]);
    });

});

describe('Account APIs', () => {


    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('allows to log out', async () => {
        const response = await request(app)
            .post(`/api/logout`)
            .set('Cookie', Cookie);

        expect(response.status).toEqual(200);
        expect(response.body.message).toBe("Logged out successfully");
    });

       
    it('allows user to see their own info', async () => {
        const response = await request(app)
            .get(`/api/me`)
            .set('Cookie', Cookie);

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
    });

    it('returns 403 while trying to access personnel info while being logged out', async () => {
        const response = await request(app)
            .get(`/api/me`);

        expect(response.status).toEqual(401);
    });

    it('allows to register', async () => {

        pool.query.mockResolvedValueOnce([]); 

        pool.query.mockResolvedValueOnce({ affectedRows: 1 });

        bcrypt.hash.mockResolvedValueOnce("hash1");

        const response = await request(app)
            .post(`/api/register`)
            .send({
                username: "tester",
                email: "tester@tester.co",
                password: "tester"
            });
            

        expect(response.status).toEqual(201);
        expect(response.body.message).toBe("User registered successfully");

        expect(pool.query).toHaveBeenCalledTimes(2);
        const [sql, params] = pool.query.mock.calls[1];
        
        expect(sql).toContain("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        expect(params).toEqual(["tester", "tester@tester.co", "hash1"]);

        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(bcrypt.hash).toHaveBeenCalledWith("tester", 10);

    });

    it('allows to login', async () => {

        const fakeUserFromDb = [ {
                id: 10, 
                username: "tester", 
                email: "tester@tester.co", 
                password_hash: "old_hashed_string", 
                role: "user" 
            }];

        pool.query.mockResolvedValueOnce(fakeUserFromDb);

        bcrypt.compare.mockResolvedValueOnce(true);

        const response = await request(app)
            .post(`/api/login`)
            .send({
                email: "tester@tester.co",
                password: "tester"
            });

        expect(response.headers['set-cookie']).toBeDefined();
        expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);
        expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
        expect(response.headers['set-cookie'][0]).toMatch(/jwt_token=/);

        expect(response.status).toEqual(200);
        expect(response.body.message).toBe("Login successful");
        expect(response.body.role).toBe("user");

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(bcrypt.compare).toHaveBeenCalledWith("tester", "old_hashed_string");
    });

    it('allows to change password while being logged in', async () => {

        pool.query
            .mockResolvedValueOnce([{ password_hash: "current_hashed_pw" }])
            .mockResolvedValueOnce({ affectedRows: 1 });

        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.hash.mockResolvedValueOnce("new_secure_hash");

        const response = await request(app)
            .post(`/api/user/changepassword`)
            .set('Cookie', Cookie)
            .send({
                currentPassword: "tester",
                newPassword: "bestQ2Automator"
            });

        expect(response.status).toEqual(200);
        expect(response.body.message).toBe("Password updated successfully");

        expect(pool.query).toHaveBeenCalledTimes(2);

        const [updateSql, updateParams] = pool.query.mock.calls[1];
        expect(updateSql).toContain("UPDATE users SET password_hash = ? WHERE id = ?");
        expect(updateParams).toEqual(["new_secure_hash", 10]);
    });

});