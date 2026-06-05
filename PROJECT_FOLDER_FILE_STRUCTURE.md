## Below Project File Structure is just a reference structure of the project not the actual project structure.

```
/home/tis/MyKarobar/
├── backend/
│ ├── drizzle/
│ │ ├── meta/
│ │ │ ├── \_journal.json
│ │ │ ├── 0000_snapshot.json
│ │ │ ├── 0001_snapshot.json
│ │ │ ├── 0002_snapshot.json
│ │ │ ├── 0003_snapshot.json
│ │ │ ├── 0004_snapshot.json
│ │ │ ├── 0005_snapshot.json
│ │ │ └── 0006_snapshot.json
│ │ ├── 0000_orange_post.sql
│ │ ├── 0001_omniscient_jack_murdock.sql
│ │ ├── 0002_nasty_toad.sql
│ │ ├── 0003_lovely_cloak.sql
│ │ ├── 0004_overconfident_hannibal_king.sql
│ │ ├── 0005_fixed_rawhide_kid.sql
│ │ └── 0006_overrated_red_hulk.sql
│ ├── migrations/
│ │ ├── 0008_add_low_stock_threshold.sql
│ │ ├── 0009_fix_order_items_cascade.sql
│ │ ├── 0010_add_trial_lifecycle_fields.sql
│ │ ├── add_admin_tables.sql
│ │ ├── add_authorised_signatory.sql
│ │ ├── add_bank_and_invoice_terms.sql
│ │ ├── add_customer_pan.sql
│ │ ├── add_gst_tables.sql
│ │ ├── add_gst_type_to_proforma.sql
│ │ ├── add_order_items_gst_rate.sql
│ │ ├── add_payment_method_category.sql
│ │ ├── add_payment_settings.sql
│ │ ├── add_phone_to_users.sql
│ │ ├── add_product_gst_rate.sql
│ │ ├── add_proforma_invoices.sql
│ │ ├── add_razorpay_fields.sql
│ │ ├── add_subscription_razorpay_fields.sql
│ │ ├── ADMIN_MIGRATION_GUIDE.md
│ │ ├── create_admin_user.js
│ │ ├── create_store_settings.sql
│ │ ├── INDEX.md
│ │ ├── MIGRATION_PACKAGE_SUMMARY.md
│ │ ├── QUICK_REFERENCE.md
│ │ ├── README_ADMIN_MIGRATION.md
│ │ ├── run_admin_migration.sh
│ │ ├── run_phone_migration.sh
│ │ └── verify_admin_migration.sh
│ ├── src/
│ │ ├── config/
│ │ │ ├── env.ts
│ │ │ ├── firebase.config.ts
│ │ │ └── index.ts
│ │ ├── constants/
│ │ │ ├── messages.ts
│ │ │ └── roles.ts
│ │ ├── db/
│ │ │ ├── migrations/
│ │ │ │ └── fix-customers-is-deleted.ts
│ │ │ ├── seeds/
│ │ │ │ ├── seedCustomers.ts
│ │ │ │ ├── seedPlans.ts
│ │ │ │ └── seedProducts.ts
│ │ │ ├── index.ts
│ │ │ └── schema.ts
│ │ ├── middlewares/
│ │ │ ├── adminAuth.middleware.ts
│ │ │ ├── auth.middleware.ts
│ │ │ ├── error.middleware.ts
│ │ │ └── store.middleware.ts
│ │ ├── modules/
│ │ │ ├── admin/
│ │ │ │ ├── admin.controller.ts
│ │ │ │ ├── admin.routes.ts
│ │ │ │ └── admin.services.ts
│ │ │ ├── auth/
│ │ │ │ ├── auth.controller.ts
│ │ │ │ ├── auth.routes.ts
│ │ │ │ ├── auth.service.ts
│ │ │ │ ├── auth.types.ts
│ │ │ │ ├── password-reset.controller.ts
│ │ │ │ └── password-reset.service.ts
│ │ │ ├── customer/
│ │ │ │ ├── customer.controller.ts
│ │ │ │ ├── customer.routes.ts
│ │ │ │ └── customer.service.ts
│ │ │ ├── customize/
│ │ │ │ ├── customize.controller.ts
│ │ │ │ ├── customize.routes.ts
│ │ │ │ └── customize.service.ts
│ │ │ ├── dashboard/
│ │ │ │ ├── dashboard.controller.ts
│ │ │ │ ├── dashboard.routes.ts
│ │ │ │ ├── dashboard.service.ts
│ │ │ │ └── dashboard.types.ts
│ │ │ ├── domain/
│ │ │ │ ├── domain.controller.ts
│ │ │ │ ├── domain.routes.ts
│ │ │ │ ├── domain.service.ts
│ │ │ │ └── domain.types.ts
│ │ │ ├── gst/
│ │ │ │ ├── gst.controller.ts
│ │ │ │ ├── gst.routes.ts
│ │ │ │ ├── gst.service.ts
│ │ │ │ └── gst.types.ts
│ │ │ ├── merchant/
│ │ │ │ └── merchant-lifecycle.service.ts
│ │ │ ├── notification/
│ │ │ │ ├── notification.controller.ts
│ │ │ │ ├── notification.routes.ts
│ │ │ │ └── notification.service.ts
│ │ │ ├── order/
│ │ │ │ ├── customer.service.ts
│ │ │ │ ├── order.controller.ts
│ │ │ │ ├── order.routes.ts
│ │ │ │ └── order.service.ts
│ │ │ ├── payment/
│ │ │ │ ├── payment.controller.ts
│ │ │ │ ├── payment.routes.ts
│ │ │ │ └── payment.service.ts
│ │ │ ├── product/
│ │ │ │ ├── product.controller.ts
│ │ │ │ ├── product.model.ts
│ │ │ │ ├── product.routes.ts
│ │ │ │ └── product.service.ts
│ │ │ ├── proforma/
│ │ │ │ ├── proforma.controller.ts
│ │ │ │ ├── proforma.routes.ts
│ │ │ │ ├── proforma.service.ts
│ │ │ │ └── proforma.types.ts
│ │ │ ├── sales/
│ │ │ │ ├── sales.controller.ts
│ │ │ │ ├── sales.routes.ts
│ │ │ │ ├── sales.service.ts
│ │ │ │ └── sales.types.ts
│ │ │ ├── settings/
│ │ │ │ ├── settings.controller.ts
│ │ │ │ ├── settings.routes.ts
│ │ │ │ ├── settings.service.ts
│ │ │ │ └── settings.types.ts
│ │ │ ├── store/
│ │ │ │ ├── store.controller.ts
│ │ │ │ ├── store.routes.ts
│ │ │ │ └── store.service.ts
│ │ │ ├── subscription/
│ │ │ │ ├── lifecycle-jobs.ts
│ │ │ │ ├── subscription.controller.ts
│ │ │ │ ├── subscription.routes.ts
│ │ │ │ └── subscription.service.ts
│ │ │ ├── support/
│ │ │ │ ├── support.controller.ts
│ │ │ │ ├── support.routes.ts
│ │ │ │ └── support.service.ts
│ │ │ └── user/
│ │ │ ├── user.model.ts
│ │ │ └── user.types.ts
│ │ ├── scripts/
│ │ │ └── createAdmin.ts
│ │ ├── utils/
│ │ │ ├── auth/
│ │ │ │ ├── hash.ts
│ │ │ │ ├── index.ts
│ │ │ │ └── jwt.ts
│ │ │ ├── common/
│ │ │ │ ├── index.ts
│ │ │ │ ├── logger.ts
│ │ │ │ └── validation.ts
│ │ │ ├── email/
│ │ │ │ ├── emailService.ts
│ │ │ │ └── index.ts
│ │ │ ├── http/
│ │ │ │ ├── index.ts
│ │ │ │ └── response.ts
│ │ │ ├── index.ts
│ │ │ ├── paymentMethodHelper.ts
│ │ │ ├── subscriptionPeriod.ts
│ │ │ └── timezone.ts
│ │ ├── app.ts
│ │ ├── index.ts
│ │ ├── routes.ts
│ │ └── server.ts
│ ├── tests/
│ ├── .env
│ ├── .gitignore
│ ├── drizzle.config.ts
│ ├── IMAGEKIT_SETUP.md
│ ├── package-lock.json
│ ├── package.json
│ ├── README.md
│ └── tsconfig.json
├── frontend/
│ ├── .vercel/
│ │ ├── project.json
│ │ └── README.txt
│ ├── public/
│ │ ├── firebase-messaging-sw.js
│ │ └── vite.svg
│ ├── src/
│ │ ├── api/
│ │ │ ├── admin/
│ │ │ │ └── index.ts
│ │ │ ├── auth/
│ │ │ │ └── index.ts
│ │ │ ├── dashboard/
│ │ │ │ └── index.ts
│ │ │ ├── domain/
│ │ │ │ └── index.ts
│ │ │ ├── gst/
│ │ │ │ └── index.ts
│ │ │ ├── products/
│ │ │ │ └── index.ts
│ │ │ ├── proforma/
│ │ │ │ └── index.ts
│ │ │ ├── sales/
│ │ │ │ └── index.ts
│ │ │ ├── settings/
│ │ │ │ └── index.ts
│ │ │ ├── subscription/
│ │ │ │ └── index.ts
│ │ │ ├── support/
│ │ │ │ └── index.ts
│ │ │ ├── config.ts
│ │ │ ├── index.ts
│ │ │ └── phoneAuth.ts
│ │ ├── assets/
│ │ │ └── react.svg
│ │ ├── components/
│ │ │ ├── auth/
│ │ │ │ └── PhoneLogin.tsx
│ │ │ ├── layouts/
│ │ │ │ ├── GSTLayout.tsx
│ │ │ │ └── ProtectedLayout.tsx
│ │ │ ├── pages/
│ │ │ │ ├── admin/
│ │ │ │ │ ├── AdminAuditLogs.tsx
│ │ │ │ │ ├── AdminDashboard.tsx
│ │ │ │ │ ├── AdminLayout.tsx
│ │ │ │ │ ├── AdminLogin.tsx
│ │ │ │ │ ├── AdminMerchantDetail.tsx
│ │ │ │ │ ├── AdminMerchants.tsx
│ │ │ │ │ ├── AdminOrders.tsx
│ │ │ │ │ ├── AdminPlans.tsx
│ │ │ │ │ ├── AdminRevenue.tsx
│ │ │ │ │ ├── AdminSettings.tsx
│ │ │ │ │ ├── AdminStores.tsx
│ │ │ │ │ ├── AdminSubscriptions.tsx
│ │ │ │ │ ├── AdminSupport.tsx
│ │ │ │ │ ├── AdminTeam.tsx
│ │ │ │ │ └── AdminTicketDetail.tsx
│ │ │ │ ├── customers/
│ │ │ │ │ ├── addCustomer/
│ │ │ │ │ │ └── AddCustomer.tsx
│ │ │ │ │ ├── customerProfile/
│ │ │ │ │ │ └── CustomerProfile.tsx
│ │ │ │ │ ├── editCustomer/
│ │ │ │ │ │ └── EditCustomer.tsx
│ │ │ │ │ └── Customers.tsx
│ │ │ │ ├── customize/
│ │ │ │ │ └── Customize.tsx
│ │ │ │ ├── dashboard/
│ │ │ │ │ ├── previewStore/
│ │ │ │ │ │ └── PreviewStore.tsx
│ │ │ │ │ ├── upgradeNow/
│ │ │ │ │ │ └── UpgradeNow.tsx
│ │ │ │ │ └── Dashboard.tsx
│ │ │ │ ├── domain/
│ │ │ │ │ └── Domain.tsx
│ │ │ │ ├── forgotPassword/
│ │ │ │ │ └── ForgotPassword.tsx
│ │ │ │ ├── gst/
│ │ │ │ │ ├── CreditDebitNotes.tsx
│ │ │ │ │ ├── GSTDashboard.tsx
│ │ │ │ │ ├── GSTInvoices.tsx
│ │ │ │ │ ├── GSTLocked.tsx
│ │ │ │ │ ├── GSTReports.tsx
│ │ │ │ │ ├── GSTSettings.tsx
│ │ │ │ │ ├── InvoiceForm.tsx
│ │ │ │ │ ├── NewInvoicePage.tsx
│ │ │ │ │ └── NewNotePage.tsx
│ │ │ │ ├── landingPage/
│ │ │ │ │ └── LandingPage.tsx
│ │ │ │ ├── login/
│ │ │ │ │ └── Login.tsx
│ │ │ │ ├── orders/
│ │ │ │ │ ├── createOrder/
│ │ │ │ │ │ └── CreateOrder.tsx
│ │ │ │ │ ├── editOrder/
│ │ │ │ │ │ └── EditOrder.tsx
│ │ │ │ │ ├── exportOrders/
│ │ │ │ │ │ └── ExportOrders.tsx
│ │ │ │ │ ├── orderDetail/
│ │ │ │ │ │ └── OrderDetail.tsx
│ │ │ │ │ └── Orders.tsx
│ │ │ │ ├── payments/
│ │ │ │ │ └── Payments.tsx
│ │ │ │ ├── products/
│ │ │ │ │ ├── addProduct/
│ │ │ │ │ │ └── AddProduct.tsx
│ │ │ │ │ ├── editProduct/
│ │ │ │ │ │ └── EditProduct.tsx
│ │ │ │ │ ├── importProducts/
│ │ │ │ │ │ └── ImportProducts.tsx
│ │ │ │ │ └── Products.tsx
│ │ │ │ ├── proforma/
│ │ │ │ │ ├── CreateProforma.tsx
│ │ │ │ │ ├── EditProforma.tsx
│ │ │ │ │ ├── ProformaDetail.tsx
│ │ │ │ │ └── ProformaInvoices.tsx
│ │ │ │ ├── publicStore/
│ │ │ │ │ ├── StoreCheckout.tsx
│ │ │ │ │ ├── StoreHome.tsx
│ │ │ │ │ ├── StoreLayout.tsx
│ │ │ │ │ ├── StoreMyOrders.tsx
│ │ │ │ │ └── StoreProductDetail.tsx
│ │ │ │ ├── sales/
│ │ │ │ │ └── Sales.tsx
│ │ │ │ ├── settings/
│ │ │ │ │ └── Settings.tsx
│ │ │ │ ├── sidebar/
│ │ │ │ │ ├── GSTSidebar.tsx
│ │ │ │ │ └── Sidebar.tsx
│ │ │ │ ├── signup/
│ │ │ │ │ └── SignUp.tsx
│ │ │ │ ├── subscription/
│ │ │ │ │ ├── GracePeriodDashboardAlert.tsx
│ │ │ │ │ ├── InactiveStoreBanner.tsx
│ │ │ │ │ └── UpgradeModalForGracePeriod.tsx
│ │ │ │ └── support/
│ │ │ │ └── Support.tsx
│ │ │ └── shared/
│ │ ├── config/
│ │ │ └── firebase.ts
│ │ ├── constants/
│ │ │ ├── ordersData/
│ │ │ │ └── index.ts
│ │ │ ├── productsData/
│ │ │ │ └── index.ts
│ │ │ └── indianStates.ts
│ │ ├── context/
│ │ │ ├── AdminContext.tsx
│ │ │ ├── CustomerContext.tsx
│ │ │ ├── CustomizeContext.tsx
│ │ │ ├── DashboardContext.tsx
│ │ │ ├── DomainContext.tsx
│ │ │ ├── GSTContext.tsx
│ │ │ ├── OrderContext.tsx
│ │ │ ├── PaymentContext.tsx
│ │ │ ├── ProductContext.tsx
│ │ │ ├── ProformaContext.tsx
│ │ │ ├── SalesContext.tsx
│ │ │ ├── SettingsContext.tsx
│ │ │ └── SubscriptionContext.tsx
│ │ ├── services/
│ │ │ ├── notificationService.ts
│ │ │ └── phoneAuth.ts
│ │ ├── types/
│ │ │ └── gst.ts
│ │ ├── utils/
│ │ │ ├── cn.ts
│ │ │ ├── dateUtils.ts
│ │ │ ├── gstValidation.ts
│ │ │ ├── invoicePDF.ts
│ │ │ ├── pdfExport.ts
│ │ │ ├── proformaInvoicePDF.ts
│ │ │ └── taxCalculation.ts
│ │ ├── .env
│ │ ├── App.css
│ │ ├── App.tsx
│ │ ├── index.css
│ │ ├── main.tsx
│ │ └── vite-env.d.ts
│ ├── .env
│ ├── .gitignore
│ ├── eslint.config.ts
│ ├── index.html
│ ├── package-lock.json
│ ├── package.json
│ ├── README.md
│ ├── tsconfig.json
│ ├── tsconfig.node.json
│ ├── vercel.json
│ └── vite.config.ts
├── firebase-setup.sh
└── verify_domain_module.sh
```
