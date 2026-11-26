# WON (WeOwnNothing) - Agency Portal Platform

**Website Domain:** WonOriginals  
**Platforms:** Android Application + Website  
**Backend:** Unified NestJS REST API with MongoDB  
**Theme:** Minimalist Light Sky Blue + White  

---

## Architecture Overview

```text
                 WON PLATFORM
                      │
          ┌───────────┴───────────┐
          │                       │
     ANDROID APP               WEBSITE
          │                       │
    Kotlin + Compose        Next.js + TS
          │                       │
       Retrofit               REST API
          │                       │
          └───────────┬───────────┘
                      │
                NESTJS BACKEND
                      │
          ┌───────────┴───────────┐
          │                       │
       MONGODB               FILE STORAGE
          │                       │
    Central Database       Documents / Certs
```

---

## Six Core Functional Modules

1. **Attendance System**:
   - Subject-wise Attendance (2 subjects: *Subject 1: Systems & Architecture* and *Subject 2: Creative & Engineering*)
   - **Bond System**: Non-monetary accountability / commitment mechanism
   - **Spark System**: Precision ledger (`PRESENT: +0.25 Spark`, `ABSENT: -1.00 Spark`)
   - **Reader Component**: Hardware & virtual reader sync
   - **Timetable System**: Weekly scheduling grid
   - **Notices & Announcements**: Verifiable virtual signatures

2. **Project Management**:
   - Project specifications & contribution types (Core, Client, Bounty, R&D)
   - Contributor Application lifecycle (`PENDING`, `APPROVED`, `REJECTED`)
   - Reports & Documentation repository
   - Certification with authentic QR code verification

3. **Members Information**:
   - Agency links directory (GitHub, Portfolio, LinkedIn)
   - Digital E-ID Card with unique identifier (`WON-2026-XXXX`) and QR code pass
   - Join / Left chronological career timeline

4. **Voting and Feedback Form System**:
   - Live RFC and governance voting with realtime percentage tallies
   - Operational feedback questionnaires

5. **Ideation / Suggestion**:
   - "Raise a Problem" formal agency ticketing
   - Collaborative community ideation board with upvoting

6. **Funds Management**:
   - Target Raise Amount tracking & visual progress meter
   - Investment capital ledger and cryptographic receipt references

---

## Directory Structure

```text
AgencyPortal/
├── backend/            # NestJS shared REST API & MongoDB Mongoose ODM (18 collections)
│   ├── src/
│   │   ├── auth/
│   │   ├── attendance/
│   │   ├── bond/
│   │   ├── spark/
│   │   ├── reader/
│   │   ├── timetable/
│   │   ├── notices/
│   │   ├── projects/
│   │   ├── contributors/
│   │   ├── documents/
│   │   ├── certificates/
│   │   ├── members/
│   │   ├── voting/
│   │   ├── feedback/
│   │   ├── ideation/
│   │   └── funds/
│   └── database/schemas/
│
├── website/            # Next.js 16 + TypeScript + Tailwind CSS (Direct Login, No Marketing Page)
│   ├── app/            # Direct login route (/), dashboard
│   ├── components/     # Navbar, Sidebar, LoginScreen
│   ├── modules/        # All 6 Core PRD Modules
│   └── services/       # API contract & client state
│
└── android/            # Native Kotlin + Jetpack Compose Android Client
    ├── app/
    ├── core/           # Retrofit API service, Spark logic, Room models
    ├── design-system/  # Light Sky Blue tokens & Compose Material 3 Theme
    ├── navigation/     # Jetpack Compose Navigation
    └── features/       # 6 feature modules matching Web & Backend
```

---

## Quick Start

### 1. Website
```bash
cd website
npm run dev
# Opens directly on the Login Screen at http://localhost:3000
```

### 2. Backend
```bash
cd backend
npm run start:dev
# REST API served at http://localhost:3001/api
```

### 3. Android Application
Open the `android/` directory in Android Studio (Giraffe/Hedgehog/Iguana+) with JDK 17.
