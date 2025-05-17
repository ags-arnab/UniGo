import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthGuard from './guards/AuthGuard'; // Uncommented
import RoleGuard from './guards/RoleGuard'; // Uncommented
import DefaultLayout from '@/layouts/default';

// Lazy load pages for better performance
// Public pages
const Home = lazy(() => import('@/pages/index'));
const About = lazy(() => import('@/pages/about'));
const Pricing = lazy(() => import('@/pages/pricing'));
const Blog = lazy(() => import('@/pages/blog'));
const Docs = lazy(() => import('@/pages/docs'));

// Auth pages
const Login = lazy(() => import('@/pages/auth/login'));
const Register = lazy(() => import('@/pages/auth/register'));
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'));
const ResetPassword = lazy(() => import('@/pages/auth/reset-password'));
const VendorApplication = lazy(() => import('@/pages/auth/vendor-application'));

// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/dashboard'));
// Student Cafeteria
const StudentCafeteria = lazy(() => import('@/pages/student/cafeteria/index'));
const StudentCafeteriaMenu = lazy(() => import('@/pages/student/cafeteria/menu'));
const StudentCafeteriaItemDetail = lazy(() => import('@/pages/student/cafeteria/item-detail'));
// Renamed import for the checkout page
const StudentCafeteriaCheckout = lazy(() => import('@/pages/student/cafeteria/order'));
const StudentCafeteriaOrderHistory = lazy(() => import('@/pages/student/cafeteria/order-history')); // Re-enabled
// Student Events
const StudentEvents = lazy(() => import('@/pages/student/events/index'));
const StudentEventsCalendar = lazy(() => import('@/pages/student/events/calendar'));
const StudentEventsDetails = lazy(() => import('@/pages/student/events/details'));
const StudentEventsRegistration = lazy(() => import('@/pages/student/events/registration'));
const ClubEventsPage = lazy(() => import('@/pages/student/ClubEventsPage')); // Import ClubEventsPage
// Student Marketplace
const StudentMarketplace = lazy(() => import('@/pages/student/marketplace/index'));
const StudentMarketplaceStores = lazy(() => import('@/pages/student/marketplace/stores/index')); // Added for stores routes
const StudentMarketplaceProductDetails = lazy(() => import('@/pages/student/marketplace/product-details'));
const StudentMarketplaceCart = lazy(() => import('@/pages/student/marketplace/cart'));
const StudentMarketplaceCheckout = lazy(() => import('@/pages/student/marketplace/checkout')); // Added lazy import
// Student Payment
const StudentPaymentHistory = lazy(() => import('@/pages/student/payment/history'));
const StudentPaymentRefunds = lazy(() => import('@/pages/student/payment/refunds'));
// Student Profile
const StudentProfile = lazy(() => import('@/pages/student/profile/index'));
const StudentProfileAllergens = lazy(() => import('@/pages/student/profile/allergens'));
const StudentProfilePreferences = lazy(() => import('@/pages/student/profile/preferences'));
const StudentMarketplaceOrders = lazy(() => import('@/pages/student/profile/marketplace-orders')); // Add import for marketplace orders

// Admin pages
const AdminDashboardOverview = lazy(() => import('@/pages/admin/dashboard/overview'));
// Admin Users
const AdminUsers = lazy(() => import('@/pages/admin/users/index'));
const AdminUsersCreate = lazy(() => import('@/pages/admin/users/create'));
const AdminUsersEdit = lazy(() => import('@/pages/admin/users/edit'));
// Admin Cafeteria - Removed, moved to Vendor
// Admin Events
const AdminEvents = lazy(() => import('@/pages/admin/events/index'));
const AdminEventsCreate = lazy(() => import('@/pages/admin/events/create'));
const AdminEventsManage = lazy(() => import('@/pages/admin/events/manage'));
// Admin Marketplace
const AdminMarketplace = lazy(() => import('@/pages/admin/marketplace/index'));
const AdminMarketplaceCategories = lazy(() => import('@/pages/admin/marketplace/categories'));
const AdminMarketplaceProducts = lazy(() => import('@/pages/admin/marketplace/products'));
// Admin Vendors
const AdminVendors = lazy(() => import('@/pages/admin/vendors/index'));
const AdminVendorsApplications = lazy(() => import('@/pages/admin/vendors/applications'));
const AdminVendorsApproved = lazy(() => import('@/pages/admin/vendors/approved'));
// Admin Reports
const AdminReports = lazy(() => import('@/pages/admin/reports/index'));
const AdminReportsFinancials = lazy(() => import('@/pages/admin/reports/financials'));
const AdminReportsSales = lazy(() => import('@/pages/admin/reports/sales'));
const AdminReportsUserActivity = lazy(() => import('@/pages/admin/reports/user-activity'));
// Admin Settings
const AdminSettings = lazy(() => import('@/pages/admin/settings'));

// Vendor pages
// Vendor Profile
const VendorProfile = lazy(() => import('@/pages/vendor/profile'));
// Vendor Products
const VendorProductsCreate = lazy(() => import('@/pages/vendor/products/create'));
// Vendor Counters
const VendorCounters = lazy(() => import('@/pages/vendor/counters/index'));
const VendorCountersCreate = lazy(() => import('@/pages/vendor/counters/create'));
const VendorCountersManage = lazy(() => import('@/pages/vendor/counters/manage'));
const VendorCountersStaff = lazy(() => import('@/pages/vendor/counters/staff'));
// Vendor Orders
const VendorOrders = lazy(() => import('@/pages/vendor/orders/index'));
const VendorOrdersIncoming = lazy(() => import('@/pages/vendor/orders/incoming'));
const VendorOrdersProcessing = lazy(() => import('@/pages/vendor/orders/processing'));
const VendorOrdersCompleted = lazy(() => import('@/pages/vendor/orders/completed'));
const VendorOrdersHistory = lazy(() => import('@/pages/vendor/orders/history'));
// Vendor Cafeteria Management (New)
const VendorCafeteriaOrders = lazy(() => import('@/pages/vendor/cafeteria_management/orders/index'));
const VendorCafeteriaInventory = lazy(() => import('@/pages/vendor/cafeteria_management/inventory'));
const VendorCafeteriaMenu = lazy(() => import('@/pages/vendor/cafeteria_management/menu'));
const VendorCafeteriaCounters = lazy(() => import('@/pages/vendor/cafeteria_management/counters'));
const VendorCafeteriaPOS = lazy(() => import('@/pages/vendor/cafeteria_management/pos')); // This component will be used in the new dashboard route
const VendorCafeteriaDelivery = lazy(() => import('@/pages/vendor/cafeteria_management/delivery/index')); // Added Delivery Page

// New Vendor Dashboard Layout and Views (Lazy Loaded)
const VendorDashboardLayout = lazy(() => import('@/layouts/VendorDashboardLayout'));
// Assuming view components will be created in src/pages/vendor/dashboard/
const MenuManagementView = lazy(() => import('@/pages/vendor/dashboard/MenuManagementView.tsx')); // Re-added .tsx
const InventoryView = lazy(() => import('@/pages/vendor/dashboard/InventoryView.tsx')); // Re-added .tsx
const OrderManagementView = lazy(() => import('@/pages/vendor/dashboard/OrderManagementView.tsx')); // Re-added .tsx
const AnalyticsView = lazy(() => import('@/pages/vendor/dashboard/AnalyticsView.tsx'));
const ShopSettingsView = lazy(() => import('@/pages/vendor/dashboard/ShopSettingsView.tsx'));
const TaxSettingsView = lazy(() => import('@/pages/vendor/dashboard/TaxSettingsView.tsx'));
const CounterManagementView = lazy(() => import('@/pages/vendor/dashboard/CounterManagementView.tsx'));
const CategoryManagementView = lazy(() => import('@/pages/vendor/cafeteria_management/categories.tsx')); // Import the new page
const VendorBalancePage = lazy(() => import('@/pages/vendor/dashboard/balance.tsx')); // Import the balance page

// Club Management Pages (Lazy Loaded) - Still in vendor/club-management folder
const ClubEventManagementView = lazy(() => import('@/pages/vendor/club-management/EventManagementView.tsx'));
const ClubCreateEventView = lazy(() => import('@/pages/vendor/club-management/CreateEventView.tsx'));
const ClubEditEventView = lazy(() => import('@/pages/vendor/club-management/EditEventView.tsx')); // Added Edit view
const ClubSettingsView = lazy(() => import('@/pages/vendor/club-management/SettingsView.tsx'));
const ClubStorefrontView = lazy(() => import('@/pages/vendor/club-management/ClubStorefrontView.tsx')); // Renamed and moved
const ClubBalanceView = lazy(() => import('@/pages/vendor/club-management/ClubBalanceView.tsx')); // Added Balance view
const ClubAnalyticsView = lazy(() => import('@/pages/vendor/club-management/ClubAnalyticsView.tsx')); // Added Analytics view
const AllRegistrationsView = lazy(() => import('@/pages/vendor/club-management/AllRegistrationsView.tsx')); // Added All Registrations view

// New Club Dashboard Layout
const ClubDashboardLayout = lazy(() => import('@/layouts/ClubDashboardLayout')); // Import new layout

// New Admin Dashboard Layout and Views (Lazy Loaded)
const AdminDashboardLayout = lazy(() => import('@/layouts/AdminDashboardLayout'));
const AdminVendorApplicationsPage = lazy(() => import('@/pages/admin/vendors/applications.tsx')); // Added .tsx
// Add other admin dashboard views here as needed

// Marketplace Management (Vendor/Operator Side)
const MarketplaceManagementLayout = lazy(() => import('@/layouts/MarketplaceManagementLayout'));
const MarketplaceStorefrontManagement = lazy(() => import('@/pages/vendor/marketplace_management/storefront'));
const MarketplaceProductManagement = lazy(() => import('@/pages/vendor/marketplace_management/products'));
const MarketplaceOrderManagement = lazy(() => import('@/pages/vendor/marketplace_management/orders/index'));
const MarketplaceBalancePage = lazy(() => import('@/pages/vendor/marketplace_management/balance')); // Import the balance page

// Error page
const NotFound = lazy(() => import('@/pages/errors/404'));

// Loading fallback
const LoadingFallback = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<DefaultLayout><Outlet /></DefaultLayout>}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="blog" element={<Blog />} />
            <Route path="docs" element={<Docs />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/auth">
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="vendor-application" element={<VendorApplication />} />
          </Route>

          {/* Student Routes */}
          {/* Apply AuthGuard and RoleGuard */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['student']} />}>
              <Route path="/student" element={<DefaultLayout><Outlet /></DefaultLayout>}>
                {/* Set index route to cafeteria as the default for students */}
                <Route index element={<Navigate to="/student/cafeteria" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />

            {/* Student Cafeteria Routes */}
            <Route path="cafeteria">
              <Route index element={<StudentCafeteria />} />
              <Route path="menu" element={<StudentCafeteriaMenu />} />
              <Route path="menu/:id" element={<StudentCafeteriaItemDetail />} />
              {/* Updated route path and component */}
              <Route path="checkout" element={<StudentCafeteriaCheckout />} />
              <Route path="order-history" element={<StudentCafeteriaOrderHistory />} /> {/* Re-enabled */}
            </Route>
            
            {/* Student Events Routes */}
            <Route path="events">
              <Route index element={<StudentEvents />} />
              <Route path="calendar" element={<StudentEventsCalendar />} />
              <Route path="details/:id" element={<StudentEventsDetails />} />
              <Route path="registration/:id" element={<StudentEventsRegistration />} />
              <Route path="clubs/:clubId/events" element={<ClubEventsPage />} /> {/* Add route for club-specific events */}
            </Route>
            
            {/* Student Marketplace Routes */}
            <Route path="marketplace">
              <Route index element={<StudentMarketplace />} />
              <Route path="cart" element={<StudentMarketplaceCart />} />
              <Route path="checkout" element={<StudentMarketplaceCheckout />} /> {/* Added checkout route here */}
              <Route path="stores/*" element={<StudentMarketplaceStores />} /> {/* Updated stores route structure */}
              <Route path="product/:productId" element={<StudentMarketplaceProductDetails />} /> {/* Direct product route */}
              {/* <Route path="vendors" element={<StudentMarketplaceVendors />} /> */}
            </Route>
            
            {/* Student Payment Routes */}
            <Route path="payment">
              <Route path="history" element={<StudentPaymentHistory />} />
              <Route path="refunds" element={<StudentPaymentRefunds />} />
            </Route>
            
            {/* Student Profile Routes */}
            <Route path="profile">
              <Route index element={<StudentProfile />} />
              <Route path="allergens" element={<StudentProfileAllergens />} />
              <Route path="preferences" element={<StudentProfilePreferences />} />
              <Route path="marketplace-orders" element={<StudentMarketplaceOrders />} /> {/* Add marketplace orders route */}
            </Route>
          </Route> {/* End Student Routes within DefaultLayout */}
        </Route> {/* End RoleGuard */}
      </Route> {/* End AuthGuard */}


          {/* === New Admin Dashboard Routes === */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<AdminDashboardOverview />} /> {/* Reuse existing overview */}
                {/* Vendor Management */}
                <Route path="vendors">
                    <Route index element={<Navigate to="applications" replace />} />
                    <Route path="applications" element={<AdminVendorApplicationsPage />} />
                    {/* Add route for approved vendors later */}
                    {/* <Route path="approved" element={<AdminVendorsApproved />} /> */}
                </Route>
                {/* Add other admin dashboard sections here (Users, Settings, etc.) */}
                {/* <Route path="users" element={<AdminUsers />} /> */}
                {/* <Route path="settings" element={<AdminSettings />} /> */}
              </Route>
            </Route> {/* End RoleGuard */}
          </Route> {/* End AuthGuard */}
          {/* === End New Admin Dashboard Routes === */}


          {/* OLD Admin Routes with AuthGuard and RoleGuard */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin" element={<DefaultLayout><Outlet /></DefaultLayout>}>
                {/* Index route might conflict, consider removing */}
                {/* <Route index element={<Navigate to="/admin/dashboard" replace />} /> */}
                {/* Keep old dashboard routes? */}
                {/* <Route path="dashboard">
                  <Route index element={<AdminDashboard />} />
                  <Route path="overview" element={<AdminDashboardOverview />} />
                </Route> */}
                
                {/* Admin Users Routes */}
                <Route path="users">
                  <Route index element={<AdminUsers />} />
                  <Route path="create" element={<AdminUsersCreate />} />
                  <Route path="edit/:id" element={<AdminUsersEdit />} />
                </Route>
                
                {/* Admin Events Routes */}
                <Route path="events">
                  <Route index element={<AdminEvents />} />
                  <Route path="create" element={<AdminEventsCreate />} />
                  <Route path="manage/:id" element={<AdminEventsManage />} />
                </Route>
                
                {/* Admin Marketplace Routes */}
                <Route path="marketplace">
                  <Route index element={<AdminMarketplace />} />
                  <Route path="categories" element={<AdminMarketplaceCategories />} />
                  <Route path="products" element={<AdminMarketplaceProducts />} />
                </Route>
                
                {/* Admin Vendors Routes */}
                <Route path="vendors">
                  <Route index element={<AdminVendors />} />
                  <Route path="applications" element={<AdminVendorsApplications />} />
                  <Route path="approved" element={<AdminVendorsApproved />} />
                </Route>
                
                {/* Admin Reports Routes */}
                <Route path="reports">
                  <Route index element={<AdminReports />} />
                  <Route path="financials" element={<AdminReportsFinancials />} />
                  <Route path="sales" element={<AdminReportsSales />} />
                  <Route path="user-activity" element={<AdminReportsUserActivity />} />
                </Route>
                
                {/* Admin Settings */}
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            </Route>
          </Route>

          {/* === New Centralized Vendor Dashboard Routes === */}
          <Route element={<AuthGuard />}>
            {/* Only allow 'vendor' role */}
            <Route element={<RoleGuard allowedRoles={['vendor']} />}>
              {/* Apply the Vendor layout */}
              <Route path="/vendor/dashboard" element={<VendorDashboardLayout />}>
                {/* Default route for vendors */}
                <Route index element={<Navigate to="menu" replace />} />
              <Route path="menu" element={<MenuManagementView />} />
              <Route path="inventory" element={<InventoryView />} />
              <Route path="orders" element={<OrderManagementView />} />
              <Route path="analytics" element={<AnalyticsView />} />
              <Route path="counters" element={<CounterManagementView />} />
              <Route path="categories" element={<CategoryManagementView />} /> {/* Added categories route */}
              {/* Nested settings routes */}
              <Route path="settings">
                 <Route index element={<Navigate to="shop" replace />} /> {/* Default settings view */}
                 <Route path="shop" element={<ShopSettingsView />} />
                 <Route path="tax" element={<TaxSettingsView />} />
              </Route>
              {/* Add the POS route here */}
              <Route path="pos" element={<VendorCafeteriaPOS />} />
              {/* Add the Balance route here */}
              <Route path="balance" element={<VendorBalancePage />} />
              {/* Add the legacy orders route here */}
              <Route path="legacy-orders" element={<VendorCafeteriaOrders />} />
              {/* Add the Delivery route here */}
              <Route path="delivery" element={<VendorCafeteriaDelivery />} />
              {/* Vendor-specific routes end here */}
            </Route> {/* End of VendorDashboardLayout route */}
           </Route> {/* End of RoleGuard for 'vendor' */}
          </Route> {/* End of AuthGuard route */}
          {/* === End of New Vendor Dashboard Routes === */}


          {/* === New Club Dashboard Routes === */}
          <Route element={<AuthGuard />}>
            {/* Only allow 'club' role */}
            <Route element={<RoleGuard allowedRoles={['club']} />}>
              {/* Apply the Club layout */}
              <Route path="/club/dashboard" element={<ClubDashboardLayout />}>
                 {/* Default route for clubs */}
                 <Route index element={<Navigate to="events" replace />} />
                 <Route path="events" element={<ClubEventManagementView />} />
                 <Route path="events/create" element={<ClubCreateEventView />} />
                 <Route path="events/edit/:eventId" element={<ClubEditEventView />} /> {/* Added Edit route */}
                 <Route path="registrations" element={<AllRegistrationsView />} /> {/* Added All Registrations route */}
                 <Route path="balance" element={<ClubBalanceView />} /> {/* Added Balance route */}
                 <Route path="analytics" element={<ClubAnalyticsView />} /> {/* Added Analytics route */}
                 <Route path="settings" element={<ClubSettingsView />} />
                 {/* Add other club-specific dashboard routes here */}
              </Route> {/* End of ClubDashboardLayout route */}
            </Route> {/* End of RoleGuard for 'club' */}
          </Route> {/* End of AuthGuard route */}
          {/* === End of New Club Club Dashboard Routes === */}


          {/* === Club Storefront Route (Public or Authenticated) === */}
          {/* Decide if this needs AuthGuard or is fully public */}
          {/* For now, assume public access, using the moved component */}
          <Route path="/club/:clubId" element={<DefaultLayout><ClubStorefrontView /></DefaultLayout>} />


          {/* OLD Vendor Routes with AuthGuard and RoleGuard */}
          {/* Keep this guard specific to 'vendor' if these routes are truly vendor-only */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['vendor']} />}>
              <Route path="/vendor" element={<DefaultLayout><Outlet /></DefaultLayout>}>
                {/* Vendor Profile - Maybe clubs need a profile page too? */}
                <Route path="profile" element={<VendorProfile />} />
                
                {/* Vendor Products */}
                <Route path="products">
                  <Route path="create" element={<VendorProductsCreate />} />
                  {/* Add other product routes as needed */}
                </Route>
                
                {/* Vendor Counters */}
                <Route path="counters">
                  <Route index element={<VendorCounters />} />
                  <Route path="create" element={<VendorCountersCreate />} />
                  <Route path="manage/:id" element={<VendorCountersManage />} />
                  <Route path="staff" element={<VendorCountersStaff />} />
                </Route>
                
                {/* Vendor Orders */}
                <Route path="orders">
                  <Route index element={<VendorOrders />} />
                  <Route path="incoming" element={<VendorOrdersIncoming />} />
                  <Route path="processing" element={<VendorOrdersProcessing />} />
                  <Route path="completed" element={<VendorOrdersCompleted />} />
                  <Route path="history" element={<VendorOrdersHistory />} />
                </Route>

                {/* Vendor Cafeteria Management Routes (Keep others if needed, remove orders) */}
                <Route path="cafeteria-management">
                  {/* Redirect base path? Maybe remove or point elsewhere if orders was the only entry */}
                  <Route index element={<Navigate to="menu" replace />} /> {/* Example: redirect to menu */}
                  {/* <Route path="orders" element={<VendorCafeteriaOrders />} />  <- Removed */}
                  <Route path="inventory" element={<VendorCafeteriaInventory />} />
                  <Route path="menu" element={<VendorCafeteriaMenu />} />
                  <Route path="counters" element={<VendorCafeteriaCounters />} />
                  <Route path="pos" element={<VendorCafeteriaPOS />} />
                </Route>
              </Route>
            </Route>
          </Route>

          {/* === BEGIN Marketplace Operator Management Routes === */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['marketplace_operator']} />}>
              <Route path="/vendor/marketplace-management" element={<MarketplaceManagementLayout />}>
                <Route index element={<Navigate to="products" replace />} />
                <Route path="products" element={<MarketplaceProductManagement />} />
                <Route path="storefront" element={<MarketplaceStorefrontManagement />} />
                <Route path="orders" element={<MarketplaceOrderManagement />} />
                <Route path="balance" element={<MarketplaceBalancePage />} /> {/* Add balance route */}
              </Route>
            </Route>
          </Route>
          {/* === END Marketplace Operator Management Routes === */}

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
  );
};

export default AppRoutes;
