# UniGo Project Documentation

## Project Overview

UniGo is a comprehensive university platform that integrates cafeteria ordering, club event management, and a marketplace system for the university community. The platform serves three primary user roles: Students, Vendors, and Administrators.

## Technical Architecture

The UniGo platform follows the Model-View-Controller (MVC) architectural pattern:

- **Views**: React components that render the user interface
- **Controllers**: Logic for handling user interactions and data manipulation (implemented in `/src/controllers/`)
- **Models**: Data structures and business logic (to be implemented)

### Technology Stack
- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: HeroUI
- **Styling**: Tailwind CSS
- **Routing**: React Router (implemented in `/src/routes/index.tsx` with route guards)
- **State Management**: Context API with React hooks (implemented in `/src/store/`)

### Routing Architecture
The application uses React Router with a centralized routing configuration in `/src/routes/index.tsx`. The routing system includes:

- **Route Guards**: 
  - `AuthGuard.tsx`: Protects routes that require authentication
  - `RoleGuard.tsx`: Controls access based on user roles (Student, Vendor, Admin)
  
- **Layout Structure**:
  - `DefaultLayout`: Wraps public routes with common navigation and footer components

- **Lazy Loading**: All page components are lazily loaded for optimized performance

### Controllers
The application follows the MVC pattern with controllers implemented in the `/src/controllers/` directory:
- `authController.ts`: Manages user authentication flows
- `cafeteriaController.ts`: Handles cafeteria-related operations
- `eventsController.ts`: Manages event creation and registration
- `marketplaceController.ts`: Controls marketplace listings and interactions

### State Management
The application uses a custom state management approach with:
- Context API with React hooks
- State stores organized by domain:
  - `auth.ts`: Authentication state
  - `cafeteria.ts`: Cafeteria-related state
  - `events.ts`: Events and calendar state
  - `marketplace.ts`: Product listings and cart state

## Module Structure & Functional Requirements

The UniGo platform is divided into four primary modules, each addressing specific functional requirements:

### 1. Cafeteria Ordering Module

**Components**: Menu, Order, Inventory

#### Functional Requirements:

| ID | Requirement | Implementation Files |
|----|-------------|---------------------|
| FR 1 | Student Authentication & Access to Cafeteria Ordering System | `/src/pages/auth/login.tsx`, `/src/pages/auth/register.tsx`, `/src/pages/student/cafeteria/index.tsx` |
| FR 2 | Display available cafeteria menu items with prices, nutritional information, and customization options in real-time | `/src/pages/student/cafeteria/menu.tsx`, `/src/pages/vendor/products/index.tsx`, `/src/pages/admin/cafeteria/menu-management.tsx` |
| FR 3 | Students can select pickup/delivery time slots and place orders up to 30 minutes in advance | `/src/pages/student/cafeteria/order.tsx` |
| FR 4 | Automatically remove unavailable items from the menu when inventory is depleted | `/src/pages/admin/cafeteria/inventory.tsx`, `/src/pages/student/cafeteria/menu.tsx` |
| FR 5 | Students receive real-time notifications about their order status via email notifications | `/src/pages/student/cafeteria/order-history.tsx`, `/src/pages/vendor/orders/incoming.tsx`, `/src/pages/vendor/orders/processing.tsx`, `/src/pages/vendor/orders/completed.tsx` |

#### User Interfaces:
- **Students**: Browse menu, place orders, track order status, view order history
- **Vendors**: Manage menu items, process orders, update inventory
- **Administrators**: Oversee cafeteria operations, manage system-wide settings

### 2. Club Events & Tours Management Module

**Components**: EventCreation, Registration, Notification

#### Functional Requirements:

| ID | Requirement | Implementation Files |
|----|-------------|---------------------|
| FR 1 | Club moderators can create event/tour listings with details including dates, fees, capacity limits, and equipment requirements | `/src/pages/vendor/products/create.tsx` (for club vendors), `/src/pages/admin/events/create.tsx` |
| FR 2 | Students can browse available events and register for tours through the platform | `/src/pages/student/events/index.tsx`, `/src/pages/student/events/details.tsx`, `/src/pages/student/events/registration.tsx` |
| FR 3 | System automatically adds event/tour fees to students' university payment accounts upon registration | `/src/pages/student/events/registration.tsx`, `/src/pages/student/payment/history.tsx` |
| FR 4 | System sends automated event reminders and updates to registered participants | Related to event management system, not a direct UI component |
| FR 5 | Students can view all registered events and tour history in their dashboard | `/src/pages/student/events/calendar.tsx`, `/src/pages/student/dashboard.tsx` |

#### User Interfaces:
- **Students**: Browse events, register for events, view event calendar
- **Clubs (Vendors)**: Create and manage events, track registrations
- **Administrators**: Oversee all events, approve or reject events

### 3. Marketplace Module

**Components**: Storefront, ProductListing, Search

#### Functional Requirements:

| ID | Requirement | Implementation Files |
|----|-------------|---------------------|
| FR 1 | Approved vendors can create customizable storefronts to list products or services | `/src/pages/vendor/dashboard/index.tsx`, `/src/pages/vendor/products/create.tsx`, `/src/pages/vendor/products/edit.tsx` |
| FR 2 | Students can search for products/services using filters by category, price range, or vendor type | `/src/pages/student/marketplace/index.tsx`, `/src/pages/student/marketplace/vendors.tsx` |
| FR 3 | Students can add items from multiple vendors to a single unified cart | `/src/pages/student/marketplace/cart.tsx` |
| FR 4 | Vendors must submit required documents for admin/moderator approval before their storefront is activated | `/src/pages/auth/vendor-application.tsx`, `/src/pages/admin/vendors/applications.tsx` |
| FR 5 | System displays vendor ratings and reviews to help students make informed purchasing decisions | `/src/pages/student/marketplace/vendors.tsx`, `/src/pages/student/marketplace/product-details.tsx` |

#### User Interfaces:
- **Students**: Browse products, view product details, manage shopping cart, view vendor profiles
- **Vendors**: Create and manage products, customize storefront
- **Administrators**: Approve vendors, manage categories, oversee marketplace operations

### 4. Payment Processing & Financial Management Module

**Components**: Billing, Transaction, PaymentHistory

#### Functional Requirements:

| ID | Requirement | Implementation Files |
|----|-------------|---------------------|
| FR 1 | System automatically deducts payments for all purchases from students' university accounts via secure API integration | `/src/pages/student/marketplace/cart.tsx`, `/src/pages/student/payment/history.tsx` |
| FR 2 | System deducts a fixed commission percentage from vendor sales and processes weekly payouts through university accounting systems | `/src/pages/admin/reports/financials.tsx` |
| FR 3 | Students can view detailed transaction histories for all platform purchases | `/src/pages/student/payment/history.tsx` |
| FR 4 | System allows students to request refunds for canceled orders/events | `/src/pages/student/payment/refunds.tsx` |
| FR 5 | System generates and sends digital receipts for all transactions to students via email | Related to payment processing system, not a direct UI component |

#### User Interfaces:
- **Students**: View payment history, request refunds
- **Vendors**: View earnings, track sales
- **Administrators**: Monitor all transactions, process vendor commissions, generate financial reports

## Project Structure Detailed Explanation

The UniGo platform's structure is organized by feature and user role:

### Core Components

- **Authentication System**: Handles user login, registration, password recovery, and role-based access control
- **User Profiles**: Manages user information, preferences, and settings
- **Navigation and Layouts**: Provides consistent UI structure across the platform

### Student Portal

Students can access services through multiple modules:

1. **Dashboard**: Central hub showing personalized information
   - File: `/src/pages/student/dashboard.tsx`
   - Purpose: Provides an overview of orders, upcoming events, and recent marketplace activity

2. **Cafeteria System**:
   - Files: 
     - `/src/pages/student/cafeteria/index.tsx`: Main cafeteria page
     - `/src/pages/student/cafeteria/menu.tsx`: Menu browsing with filtering for allergies/preferences
     - `/src/pages/student/cafeteria/order.tsx`: Order placement with time slot selection
     - `/src/pages/student/cafeteria/order-history.tsx`: Past orders and their statuses
   - Purpose: Enables students to browse food items, place orders with customizations, and track deliveries

3. **Events System**:
   - Files:
     - `/src/pages/student/events/index.tsx`: Events listing page
     - `/src/pages/student/events/calendar.tsx`: Calendar view of events
     - `/src/pages/student/events/details.tsx`: Detailed event information
     - `/src/pages/student/events/registration.tsx`: Event registration process
   - Purpose: Allows students to discover, register for, and track university events and club activities

4. **Marketplace**:
   - Files:
     - `/src/pages/student/marketplace/index.tsx`: Main marketplace browsing
     - `/src/pages/student/marketplace/product-details.tsx`: Detailed product information
     - `/src/pages/student/marketplace/cart.tsx`: Shopping cart management
     - `/src/pages/student/marketplace/vendors.tsx`: Vendor browsing and filtering
   - Purpose: Provides a platform for students to purchase products/services from university vendors

5. **Payment System**:
   - Files:
     - `/src/pages/student/payment/history.tsx`: Transaction history
     - `/src/pages/student/payment/refunds.tsx`: Refund request management
   - Purpose: Allows students to track spending and manage financial transactions

6. **Profile Management**:
   - Files:
     - `/src/pages/student/profile/index.tsx`: General profile information
     - `/src/pages/student/profile/allergens.tsx`: Allergen settings for food orders
     - `/src/pages/student/profile/preferences.tsx`: Food and other preferences
   - Purpose: Manages student personal information and preferences

### Vendor Portal

Vendors (cafeteria, clubs, shops) manage their offerings through:

1. **Dashboard**:
   - Files:
     - `/src/pages/vendor/dashboard/index.tsx`: Main vendor dashboard
     - `/src/pages/vendor/dashboard/analytics.tsx`: Performance metrics
     - `/src/pages/vendor/dashboard/settings.tsx`: Vendor account settings
   - Purpose: Provides vendors with an overview of their business performance

2. **Product Management**:
   - Files:
     - `/src/pages/vendor/products/index.tsx`: Product listing management
     - `/src/pages/vendor/products/create.tsx`: Adding new products
     - `/src/pages/vendor/products/edit.tsx`: Modifying existing products
   - Purpose: Allows vendors to create and manage their product catalog

3. **Counter Management** (Cafeteria specific):
   - Files:
     - `/src/pages/vendor/counters/index.tsx`: Counter overview
     - `/src/pages/vendor/counters/create.tsx`: Creating new counters
     - `/src/pages/vendor/counters/manage.tsx`: Managing existing counters
     - `/src/pages/vendor/counters/staff.tsx`: Staff assignment to counters
   - Purpose: Helps cafeteria vendors organize their physical service points

4. **Order Management**:
   - Files:
     - `/src/pages/vendor/orders/index.tsx`: Order overview dashboard
     - `/src/pages/vendor/orders/incoming.tsx`: New orders management
     - `/src/pages/vendor/orders/processing.tsx`: Orders being prepared
     - `/src/pages/vendor/orders/completed.tsx`: Fulfilled orders
     - `/src/pages/vendor/orders/history.tsx`: Historical order archive
   - Purpose: Enables vendors to process and track customer orders

5. **Profile**:
   - File: `/src/pages/vendor/profile.tsx`
   - Purpose: Manages vendor account information and settings

### Admin Portal

Administrators oversee the entire platform through:

1. **Dashboard**:
   - Files:
     - `/src/pages/admin/dashboard/index.tsx`: Main admin dashboard
     - `/src/pages/admin/dashboard/overview.tsx`: System-wide overview
   - Purpose: Provides high-level insights into platform performance

2. **User Management**:
   - Files:
     - `/src/pages/admin/users/index.tsx`: User listing and search
     - `/src/pages/admin/users/create.tsx`: Creating new users
     - `/src/pages/admin/users/edit.tsx`: Modifying user accounts
   - Purpose: Manages all user accounts on the platform

3. **Vendor Management**:
   - Files:
     - `/src/pages/admin/vendors/index.tsx`: Vendor listing
     - `/src/pages/admin/vendors/applications.tsx`: Pending vendor applications
     - `/src/pages/admin/vendors/approved.tsx`: Approved vendor management
   - Purpose: Controls vendor access and monitors vendor activity

4. **Cafeteria Management**:
   - Files:
     - `/src/pages/admin/cafeteria/index.tsx`: Cafeteria overview
     - `/src/pages/admin/cafeteria/menu-management.tsx`: System-wide menu controls
     - `/src/pages/admin/cafeteria/inventory.tsx`: Inventory oversight
   - Purpose: Oversees cafeteria operations across the university

5. **Events Management**:
   - Files:
     - `/src/pages/admin/events/index.tsx`: Events overview
     - `/src/pages/admin/events/create.tsx`: Creating system events
     - `/src/pages/admin/events/manage.tsx`: Managing all events
   - Purpose: Controls and monitors all events on the platform

6. **Marketplace Management**:
   - Files:
     - `/src/pages/admin/marketplace/index.tsx`: Marketplace overview
     - `/src/pages/admin/marketplace/categories.tsx`: Product category management
     - `/src/pages/admin/marketplace/products.tsx`: System-wide product monitoring
   - Purpose: Oversees all marketplace activities

7. **Reporting System**:
   - Files:
     - `/src/pages/admin/reports/index.tsx`: Reports dashboard
     - `/src/pages/admin/reports/sales.tsx`: Sales analytics
     - `/src/pages/admin/reports/user-activity.tsx`: User behavior metrics
     - `/src/pages/admin/reports/financials.tsx`: Financial reporting
   - Purpose: Generates insights and analytics for decision-making

8. **Settings**:
   - File: `/src/pages/admin/settings.tsx`
   - Purpose: Controls system-wide configuration

### Authentication System

All users access the platform through:

- Files:
  - `/src/pages/auth/login.tsx`: User login
  - `/src/pages/auth/register.tsx`: New account registration
  - `/src/pages/auth/forgot-password.tsx`: Password recovery
  - `/src/pages/auth/reset-password.tsx`: Password reset
  - `/src/pages/auth/vendor-application.tsx`: Vendor application process

- Purpose: Manages user access, security, and onboarding

## Future Implementation Notes

As the project progresses beyond the current view/UI layer:

1. **Controllers** will need to be implemented to:
   - Process user inputs
   - Validate form data
   - Communicate with backend services
   - Update the UI based on business logic

2. **Models** will need to be designed for:
   - User profiles (Student, Vendor, Admin)
   - Products (menu items, marketplace products, events)
   - Orders and transactions
   - Notifications and communications

3. **State Management** will be required for:
   - User authentication state
   - Shopping cart
   - Form data
   - UI state (loading, errors, etc.)

4. **API Integration** will be necessary for:
   - University payment system
   - Email notification service
   - Data persistence

## Development Roadmap

1. **Phase 1 (Current)**: UI Structure and Component Placeholders
2. **Phase 2**: Implement core UI components with HeroUI
3. **Phase 3**: Develop controllers and state management
4. **Phase 4**: Integrate with backend/API services
5. **Phase 5**: Testing and refinement
6. **Phase 6**: Deployment and monitoring

## Conclusion

The UniGo platform architecture provides a comprehensive solution for university community needs, integrating cafeteria services, event management, and marketplace functionality. The strictly applied MVC pattern ensures a clean separation of concerns, while the role-based interface design delivers tailored experiences for students, vendors, and administrators.