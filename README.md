# Digital Performance Monitoring Platform (DPMP)

A centralized, web-based **Digital Performance Monitoring and Reporting Platform** designed to capture, monitor, analyze, and report digital performance activities across branches, districts, and regions.

The platform provides real-time visibility into customer engagement, digital product activation, reactivation, transactions, follow-up activities, staff performance, targets, and achievement rates.

---

## Overview

The Digital Performance Monitoring Platform (DPMP) replaces manual daily performance reporting with a centralized digital system.

It enables Digital Reskilled Staff and authorized users to record daily activities while allowing supervisors, district teams, regional teams, and administrators to monitor performance through dashboards and reports.

The platform supports activities such as:

* Customer visits
* Customer phone calls
* Customer contacts
* Customer education and engagement
* Digital product activation
* Digital product reactivation
* Digital transactions
* Customer follow-up
* Target monitoring
* Conversion-rate monitoring
* Achievement-rate monitoring
* Performance reporting
* Challenge and remark tracking

---

## Project Structure

The project uses a monorepo-style structure containing separate backend and frontend applications.

```text
DIGITAL-PERFORMANCE/
│
├── apps/
│   │
│   ├── api/                    # Backend API
│   │   ├── prisma/             # Prisma schema and migrations
│   │   ├── src/                # Backend source code
│   │   ├── test/               # Backend tests
│   │   ├── package.json
│   │   └── .env
│   │
│   └── web/                    # Frontend application
│       ├── src/                # Frontend source code
│       ├── public/             # Static resources
│       └── package.json
│
├── .gitignore
└── README.md
```

---

# Technology Stack

## Backend

The backend API is built using:

* Node.js
* TypeScript
* NestJS
* Prisma ORM
* MySQL 8
* JWT Authentication
* Passport
* Argon2
* Class Validator
* Swagger / OpenAPI

## Frontend

The frontend provides the user interface for data entry, dashboards, administration, monitoring, and reporting.

It is structured as a separate application under:

```text
apps/web
```

---

# Core Functional Areas

## Authentication and Authorization

The platform provides secure user authentication and role-based access control.

Main capabilities include:

* User login
* JWT-based authentication
* Password hashing
* Role-based access control
* User account status management
* Failed-login monitoring
* Account locking
* Session management
* Audit logging

---

## Organization Structure

The platform can organize performance data according to operational hierarchy.

Typical hierarchy:

```text
Region
   │
   └── District
          │
          └── Branch
                 │
                 └── Staff
```

This enables reports and dashboards to be filtered and aggregated at different organizational levels.

---

## Digital Activity Monitoring

Staff can capture daily digital performance activities including:

* Customer visits
* Phone calls
* Customers contacted
* Customers educated
* Customers engaged
* Activations
* Reactivations
* Transactions
* Follow-up activities

---

## Digital Products and Channels

The system can monitor activities associated with digital products and channels such as:

* CBE Birr
* Mobile Banking
* Internet Banking
* Cards
* Merchant services
* POS
* QR
* Other supported digital channels

---

## Target Management

Performance targets can be defined for different periods and organizational levels.

Supported target periods may include:

* Daily
* Weekly
* Monthly
* Quarterly
* Yearly
* Custom periods

Targets can be assigned at different scopes such as:

```text
GLOBAL
REGION
DISTRICT
BRANCH
STAFF
```

---

## Performance Metrics

The platform supports monitoring metrics such as:

* Customer visits
* Phone calls
* Customer contacts
* Customer engagements
* Activations
* Reactivations
* Transactions
* Follow-ups
* Conversion rates
* Achievement rates

---

# Dashboard

The dashboard provides summarized performance information for authorized users.

Dashboard information may include:

* Total customer contacts
* Total customer engagements
* Total activations
* Total reactivations
* Total transactions
* Target achievement
* Conversion rates
* Staff performance
* Branch performance
* District performance
* Regional performance
* Product/channel performance
* Performance trends

Charts and visual indicators help users quickly identify performance trends and areas requiring attention.

---

# Reporting

The reporting module supports analysis by:

* Date
* Staff
* Branch
* District
* Region
* Product
* Digital channel
* Activity type
* Performance metric

Reports can be used for operational monitoring and management decision-making.

---

# Backend Setup

Navigate to the backend application:

```powershell
cd D:\DIGITAL-PERFORMANCE\apps\api
```

Install dependencies:

```powershell
npm install
```

Create the required `.env` configuration.

Example:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/digital_performance"

JWT_SECRET="replace-with-secure-secret"
```

> Never commit the real `.env` file or production credentials to Git.

---

## Prisma

Generate the Prisma client:

```powershell
npx prisma generate
```

Validate the schema:

```powershell
npx prisma validate
```

Format the schema:

```powershell
npx prisma format
```

Run database migrations:

```powershell
npx prisma migrate dev
```

---

## Start Backend

Development mode:

```powershell
npm run start:dev
```

The API is typically available at:

```text
http://localhost:3000
```

---

# Frontend Setup

Navigate to the frontend:

```powershell
cd D:\DIGITAL-PERFORMANCE\apps\web
```

Install dependencies:

```powershell
npm install
```

Start the frontend development server:

```powershell
npm run dev
```

The terminal will display the local frontend URL after the development server starts.

---

# Running Both Applications

Use two PowerShell terminals.

### Terminal 1 — Backend

```powershell
cd D:\DIGITAL-PERFORMANCE\apps\api
npm run start:dev
```

### Terminal 2 — Frontend

```powershell
cd D:\DIGITAL-PERFORMANCE\apps\web
npm run dev
```

---

# Database

The project uses **MySQL 8**.

Database:

```text
digital_performance
```

Prisma ORM manages the application database schema and migrations.

The main Prisma schema is located at:

```text
apps/api/prisma/schema.prisma
```

---

# Environment Variables

Environment-specific configuration must not be committed to the repository.

The following files are ignored:

```text
.env
.env.*
```

Developers should maintain an `.env.example` containing variable names without real credentials.

Example:

```env
DATABASE_URL=
JWT_SECRET=
PORT=
```

---

# API Documentation

The backend supports Swagger/OpenAPI documentation.

When Swagger is enabled, API documentation can be accessed through the configured Swagger endpoint.

This provides developers with information about:

* API endpoints
* Request parameters
* Request bodies
* Authentication
* Response structures
* Validation requirements

---

# Security

The platform is designed with security controls including:

* Secure password hashing
* JWT authentication
* Role-based authorization
* Input validation
* Request throttling
* Security headers
* Account status controls
* Login-attempt monitoring
* Audit logging
* Environment-based secret management

Sensitive credentials must never be stored directly in source code.

---

# Development Workflow

Before starting development, update your local repository:

```powershell
git pull
```

After making changes:

```powershell
git status
```

Stage the changes:

```powershell
git add .
```

Commit:

```powershell
git commit -m "Describe the changes"
```

Push:

```powershell
git push
```

---

# Git Ignore

The repository excludes generated, sensitive, and unnecessary files such as:

```text
node_modules/
.env
dist/
coverage/
*.log
apps/api/src/generated/prisma/
```

Dependencies should be restored using:

```powershell
npm install
```

and generated Prisma files should be recreated using:

```powershell
npx prisma generate
```

---

# Development Status

The Digital Performance Monitoring Platform is currently under active development.

Major development areas include:

* Backend API
* Frontend dashboard
* Authentication and authorization
* Organizational hierarchy
* Digital activity recording
* Target management
* Performance monitoring
* Analytics
* Reporting
* Audit and security controls

---

# Project Objective

The overall objective of DPMP is to provide a centralized and reliable digital platform that improves:

* Data accuracy
* Reporting efficiency
* Real-time performance visibility
* Target monitoring
* Staff accountability
* Branch-level monitoring
* District and regional oversight
* Digital product performance analysis
* Management decision-making

---

## License

This project is intended for authorized organizational use.

Copyright © 2026. All rights reserved.
