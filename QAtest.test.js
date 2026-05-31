const app = require('./app');
const request = require('supertest');
const {closeDB, GetQuery } = require('./db/database')

const jwt = require('jsonwebtoken');
const { secretKey } = require('./middleware/auth');

let Cookie;
let secondBookId;
let email1;

function generateTestEmail(base = 'tester@tester.com') {
  const [name, domain] = base.split('@');
  const unique = Date.now();
  return `${name}+${unique}@${domain}`;
}

afterAll(async () => {
    await closeDB();
});

beforeAll(async () => {

    const sql = `INSERT INTO books (title, author, year, genre, owner_id)
             VALUES (?, ?, ?, ?, ?)`;

    const createdBook = await GetQuery(sql, [
        "Test Book",
        "QA script",
        2008,
        "studying",
        1
        ]);

    email1 = generateTestEmail();

    secondBookId = createdBook.insertId;
    
    const fakeAdminToken = jwt.sign({ id: 1, role: 'admin' }, secretKey);

    Cookie = `jwt_token=${fakeAdminToken}`;
});




describe('Main test -> visit the links', () => {
    
    it('should allow access / (200 OK)', async () => {
        const res = await request(app)
            .get('/');

        expect(res.statusCode).toEqual(200);
    });

    it('should allow access /register (200 OK)', async () => {
        const res = await request(app)
            .get('/register');

        expect(res.statusCode).toEqual(200);
    });

    it('should allow access /login (200 OK)', async () => {
        const res = await request(app)
            .get('/login');

        expect(res.statusCode).toEqual(200);
    });

    it('should allow access /me (200 OK)', async () => {
        const res = await request(app)
            .get('/me');
        
        expect(res.statusCode).toEqual(200);
    });

    it('should allow access /password (200 OK)', async () => {
        const res = await request(app).get('/password');
        expect(res.statusCode).toBe(200);
    });

    it('should allow access /library (200 OK)', async () => {
        const res = await request(app)
            .get('/library');

        expect(res.statusCode).toEqual(200);
    });
});

describe('Book tests', () => {

    let createdBookId;

    


    it('should allow get all the books (200 OK)', async () => {
        const res = await request(app)
            .get('/api/books');

        expect(res.status).toEqual(200);
    });

    it('should allow get a book by id (200 OK)', async () => {
        const res = await request(app)
            .get('/api/books/1');

        expect(res.status).toEqual(200);
        expect(res.body).toBeDefined();
    });

    it('should allow a user to create a book (201 Created)', async () => {
        const res = await request(app)
            .post('/api/books')
            .set('Cookie', Cookie)
            .send({
                title: "Test Book",
                author: "QA script",
                year: 2026,
                genre: "studying"
            });

        createdBookId = res.body.id;

        expect(res.status).toEqual(201);
        expect(res.body.message).toBe("Book added successfully");
        expect(createdBookId).toBeDefined();
    });

    it('should allow a user to borrow a book (201 Created)', async () => {
        const res = await request(app)
            .post(`/api/books/${secondBookId}}/borrow`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(201);
        expect(res.body.message).toBe("Book borrowed successfully");
    });

    it('should allow a user to return a book (201 Created)', async () => {
        const res = await request(app)
            .post(`/api/books/${secondBookId}/return`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(201);
        expect(res.body.message).toBe("Book returned successfully");
    });

    it('should allow a user to share a book and give permissions (200 OK)', async () => {
        const res = await request(app)
            .post(`/api/books/${createdBookId}/share`)
            .set('Cookie', Cookie)
            .send({
                targetUserId: 1,
                permission: "write"
            });

        expect(res.status).toEqual(200);
        expect(res.body.message).toBe("Permission 'write' granted to user 1");
    });

    it('shouldnt allow a user to share not his/her book and give permissions (403 Forbidden)', async () => {
        const res = await request(app)
            .post('/api/books/4/share')
            .set('Cookie', Cookie)
            .send({
                targetUserId: 1,
                permission: "write"
            });

        expect(res.status).toEqual(403);
        expect(res.body.message).toBe("Only the owner can share this book");
    });

    it('should allow a user to see all his/her shared books (200 OK)', async () => {
        const res = await request(app)
            .post(`/api/books/mysharedbooks`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
        expect(res.body).toBeDefined();
    });
});

describe('Admin stuff', () => {
    it('should allow an admin to see all existing users (200 OK)', async () => {
        const res = await request(app)
            .get(`/api/admin/users`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
        expect(res.body).toBeDefined();
    });

    it('should allow an admin to see all existing logs (200 OK)', async () => {
        const res = await request(app)
            .get(`/api/admin/logs`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
        expect(res.body).toBeDefined();
    });

    it('should return users info (200 OK)', async () => {
        const res = await request(app)
            .get(`/api/me`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
        expect(res.body).toBeDefined();
    });
});

describe('Account APIs', () => {
    it('should allow to log out (200 OK)', async () => {
        const res = await request(app)
            .post(`/api/logout`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
        expect(res.body.message).toBe("Logged out successfully");
    });

    it('should return 403 while trying to access personnel info while being logged out (401 Unauthorized)', async () => {
        const res = await request(app)
            .get(`/api/me`);

        expect(res.status).toEqual(401);
    });

     it('should allow to register (201 Created)', async () => {
        const res = await request(app)
            .post(`/api/register`)
            .send({
                username: "Tester228",
                email: email1,
                password: "123tester"
            });
            

        expect(res.status).toEqual(201);
        expect(res.body.message).toBe("User registered successfully");
    });

    it('should allow to login (200 OK)', async () => {
        const res = await request(app)
            .post(`/api/login`)
            .send({
                email: email1,
                password: "123tester"
            });
            
        Cookie = res.headers['set-cookie'][0];

        expect(res.headers['set-cookie']).toBeDefined();
        expect(res.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);
        expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
        expect(res.headers['set-cookie'][0]).toMatch(/jwt_token=/);

        expect(res.status).toEqual(200);
        expect(res.body.message).toBe("Login successful");
        expect(res.body.role).toBeDefined();
    });

    it('should allow to access me info (200 OK)', async () => {
        const res = await request(app)
            .get(`/api/me`)
            .set('Cookie', Cookie);

        expect(res.status).toEqual(200);
    });

    it('should allow to change password while being logged in (200 OK)', async () => {
        const res = await request(app)
            .post(`/api/user/changepassword`)
            .set('Cookie', Cookie)
            .send({
                currentPassword: "123tester",
                newPassword: "bestQ2Automator"
            });

        expect(res.status).toEqual(200);
        expect(res.body.message).toBe("Password updated successfully");
    });

});