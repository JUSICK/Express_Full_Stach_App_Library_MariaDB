# Secure Library API & Access Control System

A robust, secure, and fully tested RESTful API built with Node.js and Express. This project serves as a comprehensive backend system managing user authentication, role-based access control (RBAC), and shared resource permissions (ACL). 

The architecture strictly adheres to modern backend engineering practices, including Infrastructure as Code (Database Migrations), Dependency Injection in testing, and secure cryptography.

## 🧠 What I Learned & Implemented

This project was built to master enterprise-grade backend architecture. Key engineering milestones include:

* **Infrastructure as Code (Database Migrations):** Transitioned from manual SQL execution to automated, version-controlled schema management using `dbmate`. This ensures Idempotency and eliminates State Drift across development environments.
* **Advanced Unit Testing & Dependency Mocking:** Built a fully isolated test suite using Jest. Successfully mocked asynchronous relational database pools and cryptographic engines (Bcrypt) to ensure deterministic, lightning-fast testing without relying on local infrastructure.
* **Database Seeding Strategy:** Implemented automated data seeding to separate structural database migrations from the injection of dummy data and default administrative accounts, maintaining a pristine production pipeline.
* **Secure Authentication Flow:** Handled password hashing with mathematically secure salt rounds, and implemented stateless session management using HTTP-only, Strict SameSite JSON Web Tokens (JWT).

## 🛠 Technologies & Tools

* **Runtime & Framework:** Node.js, Express.js
* **Database & ORM:** MariaDB (Raw SQL queries via `mariadb` connection pooling)
* **Security:** `bcrypt` (Cryptography), `jsonwebtoken` (Auth)
* **Infrastructure Management:** `dbmate` (SQL Migrations)
* **Testing:** `jest` (Unit/Integration Testing), `supertest` (HTTP assertions)
* **Environment:** `dotenv`

## 🚀 Quick Start (Developer Experience)

The development environment is designed to be fully reproducible.

### Prerequisites
* Node.js installed.
* A local SQL server running (e.g., MariaDB, MySQL, or XAMPP).

### 1. Installation
Clone the repository and install all dependencies (both production and development):
```bash
git clone https://github.com/JUSICK/Express_Full_Stach_App_Library_MariaDB.git
cd Express_Full_Stach_App_Library_MariaDB
npm install
```
### 2. Environment Configuration
Create your local environment variables file:

* Copy .env.example and rename it to .env.
* Update the variables with your local SQL credentials.

### 3. Build the Infrastructure
Execute the automated scripts to build the database from scratch and populate it with default data:
```bash
# Creates the empty database
npm run db:create 

# Runs all SQL migrations
npm run db:up 

# Injects default users and books
npm run db:seed
```

### 4. Run the Server
```bash
npm run dev
```

### Testing
```bash
npm test
```

<img width="1286" height="997" alt="Screenshot 2026-06-08 163938" src="https://github.com/user-attachments/assets/cd0f8799-7864-40a7-a606-0c3e1a0d6046" />

