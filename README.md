# RentalCar - Full Stack Vehicle Reservation System

A production-ready Car Rental application built with **Spring Boot 3** and **React**, following Hexagonal Architecture principles for high maintainability, scalability, and clean code standards.

---

## Live Demo & Deployment Info
**Website:** [RentalCars](https://rentalcars-v95l.onrender.com/) The application is fully deployed and accessible:
> [!IMPORTANT]
> 
> **Performance Note:** Since the application is hosted on **Render's Free Tier**, you may experience high latency.
> 
* **Frontend:** Hosted on **Render** (Static Service)
* **Backend:** Hosted on **Render** (Web Service)
* **Database:** Managed via **Supabase** (PostgreSQL)
* **Payment Processing:** Integrated with **Stripe API** (Test Mode)

### Default Credentials (Local Environment)
For testing and exploring the application locally, you can use the following pre-seeded accounts:

| **Admin** | `admin@example.com` | `123456` |
| **Customer** | `customer@example.com` | `123456` |

### Cold Start Mitigation (Keep-Alive Server)
Since the application is hosted on **Render's Free Tier**, the backend service normally "spins down" after 15 minutes of inactivity. 
To ensure a smooth user experience, I have implemented a **Warm-up Strategy**:
* **Cron-job Integration:** An external monitoring service pings the `/api/v1/vehicles` endpoint every 10 minutes.
* **Result:** This keeps the Spring Boot application alive, significantly reducing cold start delays (from 60s down to near-instant).

---

## Architectural Pattern: Hexagonal

The project strictly follows the **Hexagonal Architecture** to ensure a clean separation of concerns and business logic independence:

1.  **Domain Layer:** Core business logic and entities (e.g., Vehicle, Reservation), completely framework-agnostic.
2.  **Application Layer:** Input/Output Ports (Interfaces) and Use Case implementations that coordinate the flow of data.
3.  **Infrastructure Layer:** External adapters such as:
    * **Persistence:** PostgreSQL (via Supabase) using Spring Data JPA.
    * **Security:** JWT-based stateless authentication.
    * **Payments:** Stripe API integration for secure checkout.
    * **Storage:** Cloudinary for vehicle image management.

---

## Tech Stack

### Backend
* **Java 21 & Spring Boot 3**
* **Spring Security:** Role-Based Access Control (RBAC) with JWT authentication.
* **Liquibase:** For version-controlled database schema migrations.
* **Hibernate/JPA:** Optimized with **Custom Queries** and **DB Indexing** for performance.

### Frontend
* **React.js (Vite):** Functional components.
* **State Management:** Context API & custom hooks (e.g., `useAuth`).
* **UI/UX:** Custom CSS3, Responsive Design and React-Datepicker.

### DevOps & Environments
* **Cloud Deployment:** Hosted on **Render** (Static site for Frontend, Web Service for Backend, SupaBase for Postgres).
* **Local Development:** Full stack orchestration via **Docker & Docker Compose**, utilizing **Nginx** as a Reverse Proxy to mirror production-like routing locally.

---

## Performance Optimization
To ensure scalability and data integrity, the system implements:
* **Database Indexing:** Strategic indexes for search efficiency.
* **Concurrency Guard:** Frontend "Submitting" states and backend transactional integrity to prevent double-bookings during high latency.

---

## Local Setup & Installation

### Prerequisites
* **Docker & Docker Compose** (Latest version)
* **Node.js (v18 or higher)** & **npm**
* **Java 21 JDK** (Only if you want to run the Spring Boot app outside Docker)
* **Stripe Account** (To obtain Test API Keys)

Create a `.env` file in the root directory (like .env.example):

```
Start Infrastructure (Docker)
docker-compose up --build -d

Start Frontend
cd frontend
npm install
npm run dev

Login to Stripe:
install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:80/api/v1/payments/webhook

```
