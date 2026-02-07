-- Migration script for pending features columns
-- Run this script to add the new columns to existing tables

-- ==================== INVOICE TABLE ====================
-- Add courier tracking columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS courier_company VARCHAR(200);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS courier_docket_number VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS courier_tracking_url VARCHAR(500);

-- ==================== QUOTATION TABLE ====================
-- Add multi-currency support columns
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'INR';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6) DEFAULT 1.0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS base_currency_total NUMERIC(14, 2);
-- Add PDF options
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS show_images_in_pdf BOOLEAN DEFAULT TRUE;

-- ==================== DELIVERY CHALLAN TABLE ====================
-- Add acknowledgement tracking
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS acknowledgement_image_url VARCHAR(500);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS acknowledgement_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(200);
-- Add courier tracking
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS courier_company VARCHAR(200);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS courier_docket_number VARCHAR(100);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS courier_tracking_url VARCHAR(500);

-- ==================== PRODUCT/ITEMS TABLE ====================
-- Add approval workflow
ALTER TABLE items ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
ALTER TABLE items ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36);
ALTER TABLE items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ==================== SALES ORDER TABLE ====================
-- Add store workflow status
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS store_status VARCHAR(50) DEFAULT 'pending';

-- ==================== CREATE NEW TABLES ====================

-- Employee Expenses table
CREATE TABLE IF NOT EXISTS employee_expenses (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    amount NUMERIC(14, 2) NOT NULL,
    receipt_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    approved_by VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    reimbursed_at TIMESTAMP,
    reimbursement_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expense_company ON employee_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_employee ON employee_expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON employee_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_status ON employee_expenses(status);

-- Advance Requests table
CREATE TABLE IF NOT EXISTS advance_requests (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    disbursed_at TIMESTAMP,
    disbursement_reference VARCHAR(100),
    settlement_mode VARCHAR(50) DEFAULT 'salary_deduction',
    monthly_deduction NUMERIC(14, 2),
    settled_amount NUMERIC(14, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_advance_company ON advance_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_advance_employee ON advance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_advance_status ON advance_requests(status);

-- Appointment Letters table
CREATE TABLE IF NOT EXISTS appointment_letters (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    letter_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    designation VARCHAR(200) NOT NULL,
    department VARCHAR(200),
    joining_date DATE NOT NULL,
    probation_period_months INTEGER DEFAULT 6,
    basic_salary NUMERIC(14, 2) NOT NULL,
    total_ctc NUMERIC(14, 2),
    notice_period_days INTEGER DEFAULT 30,
    work_location VARCHAR(200),
    reporting_to VARCHAR(200),
    additional_terms TEXT,
    pdf_url VARCHAR(500),
    acknowledged_at TIMESTAMP,
    signature_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appt_company ON appointment_letters(company_id);
CREATE INDEX IF NOT EXISTS idx_appt_employee ON appointment_letters(employee_id);

-- Sales Targets table
CREATE TABLE IF NOT EXISTS sales_targets (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    target_year INTEGER NOT NULL,
    target_month INTEGER,
    target_amount NUMERIC(14, 2) NOT NULL,
    target_enquiries INTEGER DEFAULT 0,
    target_quotations INTEGER DEFAULT 0,
    target_conversions INTEGER DEFAULT 0,
    target_visits INTEGER DEFAULT 0,
    achieved_amount NUMERIC(14, 2) DEFAULT 0,
    achieved_enquiries INTEGER DEFAULT 0,
    achieved_quotations INTEGER DEFAULT 0,
    achieved_conversions INTEGER DEFAULT 0,
    achieved_visits INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_target_company ON sales_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_target_employee ON sales_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_target_period ON sales_targets(target_year, target_month);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE SET NULL,
    enquiry_id VARCHAR(36) REFERENCES enquiries(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL,
    start_km NUMERIC(10, 2),
    end_km NUMERIC(10, 2),
    distance_km NUMERIC(10, 2),
    start_location JSONB,
    end_location JSONB,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    purpose TEXT,
    notes TEXT,
    outcome TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_visit_company ON visits(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_employee ON visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_visit_customer ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_status ON visits(status);

-- Visit Plans table
CREATE TABLE IF NOT EXISTS visit_plans (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id VARCHAR(36) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE SET NULL,
    planned_date DATE NOT NULL,
    planned_time TIME,
    purpose TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    visit_id VARCHAR(36) REFERENCES visits(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_visit_plan_company ON visit_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_plan_employee ON visit_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_visit_plan_date ON visit_plans(planned_date);
CREATE INDEX IF NOT EXISTS idx_visit_plan_status ON visit_plans(status);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE SET NULL,
    project_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    target_end_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) DEFAULT 'planning',
    budget NUMERIC(14, 2) DEFAULT 0,
    actual_cost NUMERIC(14, 2) DEFAULT 0,
    manager_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    progress_percent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_project_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_project_status ON projects(status);

-- Project Milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_milestone_project ON project_milestones(project_id);

-- Project Tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id VARCHAR(36) REFERENCES project_milestones(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'todo',
    start_date DATE,
    due_date DATE,
    completion_date DATE,
    estimated_hours NUMERIC(6, 2) DEFAULT 0,
    actual_hours NUMERIC(6, 2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_task_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_milestone ON project_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_status ON project_tasks(status);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    issue_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'support',
    severity VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    reported_by_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    reported_by_customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE SET NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_to_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,
    resolved_by_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    product_id VARCHAR(36) REFERENCES items(id) ON DELETE SET NULL,
    attachments JSONB,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_issue_company ON issues(company_id);
CREATE INDEX IF NOT EXISTS idx_issue_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issue_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issue_assigned ON issues(assigned_to_id);

-- Issue Comments table
CREATE TABLE IF NOT EXISTS issue_comments (
    id VARCHAR(36) PRIMARY KEY,
    issue_id VARCHAR(36) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR(36) REFERENCES employees(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) DEFAULT 'comment',
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_issue_comment_issue ON issue_comments(issue_id);

-- ==================== CUSTOMER LOCATION FIELDS ====================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS area VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_address VARCHAR(500);
CREATE INDEX IF NOT EXISTS idx_customers_location_lat ON customers(location_lat);
CREATE INDEX IF NOT EXISTS idx_customers_location_lng ON customers(location_lng);

-- ==================== SALES TRACKING SETTINGS ====================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS petrol_rate_per_km NUMERIC(10, 2) DEFAULT 0;

-- Done!
SELECT 'Migration completed successfully!' AS status;
