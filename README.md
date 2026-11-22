# M/S GANESH AGRO - Staff & Labour Payroll Manager

A modern, production-grade, mobile-first web app designed for **M/S GANESH AGRO** (Agricultural Machinery & Equipment Manufacturing) to manage labour wages and staff salaries seamlessly.

- **Company**: M/S GANESH AGRO (Agricultural Machinery & Equipment Manufacturing)
- **Currency**: Indian Rupee (₹) with Indian number formatting (e.g. `₹1,25,000.00`).
- **Dates**: DD/MM/YYYY.
- **Tech Stack**: React 18 + Vite + Tailwind CSS + Lucide Icons + Firebase (Firestore onSnapshot real-time sync + Firebase Auth).
- **Themes & Design**: Light/Dark theme toggle, clean pure English user-friendly interface.
- **Testing**: 19 automated unit tests using Vitest covering all core payroll calculations.

---

## 🌟 Key Features

### 1. Two Employee Categories
#### A. Labourers (Paid by Work Done)
- **Fields**: Full Name, Phone (optional), 12-digit Aadhaar Card (validated, masked as `XXXX XXXX 1234` everywhere with an interactive one-tap reveal eye icon), Joining Date, Active / Inactive (Archive) status, and Notes.
- **Individual Work Type Rates**: Set per labourer and per work type. Two labourers can have different rates for the same job.
- **Rate History with Effective Dates**: When a rate is changed, the new rate applies only from that date forward. Past months' salaries remain stable and reproducible.
- **Built-in Work Types**:
  1. *Simple Labour Work*: Hourly wage (`hourly rate x hours`). 8 hours standard day; hours beyond 8 are overtime (paid at 1.5x multiplier).
  2. *Filter Wash*: Piece-rate (`quantity washed x rate per filter`). Optionally allows hours.
  3. *Charge*: Hourly wage with overtime beyond 8 hours.
  4. *Custom Work Types*: Define unlimited custom jobs with either hourly or piece-rate pay models.
- **Daily Work Entry (Mobile-First)**:
  - Date picker (defaults to today).
  - Quick action buttons: **"Mark All Present 8h"**, **"Copy Yesterday's Entries"**, **"Mark Absent"**.
  - Multiple work types on the same day for a single worker. Overtime calculated on total day hours above 8.
  - Live day earnings displayed in real time as hours/pieces are entered.
  - Visible **"Edited"** tag on updated past records.

#### B. Fixed-Salary Staff (Supervisors, Office, Admin)
- **Fields**: Name, Role/Designation, Phone, Masked Aadhaar, Monthly Fixed Salary, Joining Date, Paid Leaves Allowed per month (default 2), Status.
- **Monthly Leave & Attendance Calendar**: Interactive calendar where the owner taps any day to cycle through: *Present (Green)* → *Absent (Red)* → *Half Day (Orange)* → *Paid Leave (Blue)*.
- **Automatic Salary Calculation**:
  - Per-day rate = `Monthly Salary / Days in Month` (e.g. 28, 29, 30, or 31 days, or configurable fixed 30-day basis).
  - Deduction = `Unpaid Leaves x Per-Day Rate` (Half day = 0.5 day). Paid leaves within the allowed monthly quota are not deducted.

### 2. Advances & Loan Ledger
- Modes:
  - **Deduct in this month's salary**: Deducted in the month the advance was taken.
  - **Adjust in upcoming month**: Target month selection.
  - **Split into installments**: Spread across multiple months (e.g. ₹3,000 over 3 months = ₹1,000/month).
- **Automatic Carry Forward**: If total advance deduction exceeds gross earned wages in a month, the deduction is capped at gross earnings and the remaining balance carries forward automatically to the following month.
- Ledger per employee: Total advance given, deducted so far, and pending balance.

### 3. Monthly Salary Sheet & Payslips
- **Default View**: Shows the **PREVIOUS MONTH** by default (since salary is disbursed after month end), with a month picker to view any historical month.
- **Salary Sheet**: Expandable rows per worker showing the breakdown by work type, advance deduction, and final net payable in bold green.
- **Payment Tracking**: One-tap button to mark salary as "Paid" with payment date and mode (Cash, UPI, Bank Transfer).
- **Payslips**: Printable & downloadable PDF payslip with company header and formal breakdown.
- **WhatsApp Share**: Pre-filled WhatsApp message summarizing hours, gross earnings, advance deductions, and net payable.
- **Day-Wise Verification Grid**: Calendar/table view showing all entries for that worker throughout the month.
- **Exports**: Export monthly sheet to Excel (`.xlsx`) or PDF.

### 4. Offline Persistence & Backup
- **Offline Mode**: IndexedDB persistence ensures work entered without internet syncs automatically when reconnected.
- **Instant Demo Mode**: Includes realistic seed data (3 labourers, 4 work types, 1 supervisor, advances, and work entries) behind a "Load demo data" button.
- **Backup & Restore**: Download full JSON backups or restore previous backups in Settings.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js 18+ or 20+
- npm 9+

### 2. Installation
```bash
# Clone or navigate to the project directory
cd "SALARY PAYROLL"

# Install dependencies
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite
```bash
npm run test
```
Runs 19 automated unit tests in `src/utils/payrollCalculator.test.ts`.

---

## ☁️ Firebase Configuration & Deployment

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts.
3. In the project dashboard, go to **Authentication** -> **Sign-in method** -> Enable **Email/Password**.
4. Go to **Firestore Database** -> Click **Create database** -> Choose your preferred region.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Firebase project credentials from **Project Settings > General > Your apps > Web app**:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
```

### Step 3: Deploy Firestore Security Rules
Deploy the included `firestore.rules` using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### Step 4: Deploy to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Step 5: Connect Your Custom Domain (`www.ganeshagrosangrur.com`)
1. In the [Firebase Console](https://console.firebase.google.com/), navigate to **Hosting**.
2. Click **Add custom domain**.
3. Enter `www.ganeshagrosangrur.com` (and `ganeshagrosangrur.com`).
4. Firebase will display the DNS records to add at your domain registrar (GoDaddy, Namecheap, Google Domains/Squarespace, etc.):
   - **Type**: `A` or `CNAME`
   - **Host/Name**: `www` (or `@` for root)
   - **Value**: The IP address or target provided by Firebase (e.g., `199.36.158.100`)
5. Free SSL certificates are automatically provisioned within a few hours.

---

## 🧪 Unit Test Coverage
The calculation engine in `src/utils/payrollCalculator.ts` is covered by Vitest tests:
- Overtime calculation above 8 hours
- Multiple work types on the same day
- Piece rates (quantity x rate per item)
- Advances deducted in the same month
- Advances deferred to a later month
- Advances split into equal installments
- Advance larger than salary (automatic carry-forward to the next month)
- Fixed staff leave deductions for 28, 30, and 31-day months (and fixed 30-day basis)
- Half-day deductions (0.5 day) and paid leave quota allowances
- Aadhaar 12-digit validation and masking (`XXXX XXXX 1234`)
- Indian numbering system currency formatting (`₹1,25,000.00`)
