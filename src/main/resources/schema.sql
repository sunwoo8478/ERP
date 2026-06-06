CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS company (
    company_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_code  VARCHAR(50)  NOT NULL UNIQUE,
    company_name  VARCHAR(200) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS org_unit (
    org_unit_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES company(company_id),
    parent_org_unit_id  UUID        REFERENCES org_unit(org_unit_id),
    org_unit_name       VARCHAR(100) NOT NULL,
    active_flag         BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS job_grade (
    job_grade_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID        NOT NULL REFERENCES company(company_id),
    grade_name     VARCHAR(50) NOT NULL,
    position_name  VARCHAR(50),
    sort_order     INT         NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS salary_step (
    salary_step_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_grade_id    UUID       NOT NULL REFERENCES job_grade(job_grade_id),
    step            INT        NOT NULL,
    apply_year      INT        NOT NULL,
    base_salary     NUMERIC(15,2) NOT NULL,
    UNIQUE (job_grade_id, step, apply_year)
);

CREATE TABLE IF NOT EXISTS employee (
    employee_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id       UUID        NOT NULL REFERENCES company(company_id),
    org_unit_id      UUID        NOT NULL REFERENCES org_unit(org_unit_id),
    job_grade_id     UUID        NOT NULL REFERENCES job_grade(job_grade_id),
    employee_no      VARCHAR(50) NOT NULL,
    full_name        VARCHAR(100) NOT NULL,
    employment_type  VARCHAR(20) NOT NULL DEFAULT 'FULL_TIME',
    current_step     INT         NOT NULL DEFAULT 1,
    dependent_count  INT         NOT NULL DEFAULT 0,
    hire_date        DATE        NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    UNIQUE (company_id, employee_no)
);

CREATE TABLE IF NOT EXISTS salary_standard (
    salary_standard_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id          UUID        NOT NULL REFERENCES employee(employee_id),
    effective_start_date DATE        NOT NULL,
    effective_end_date   DATE,
    meal_allowance       NUMERIC(15,2) NOT NULL DEFAULT 0,
    transport_allowance  NUMERIC(15,2) NOT NULL DEFAULT 0,
    position_allowance   NUMERIC(15,2) NOT NULL DEFAULT 0,
    change_reason        VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS insurance_rate (
    rate_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id         UUID       NOT NULL REFERENCES company(company_id),
    apply_year         INT        NOT NULL,
    health_employee    NUMERIC(6,4) NOT NULL DEFAULT 0.03545,
    health_employer    NUMERIC(6,4) NOT NULL DEFAULT 0.03545,
    lt_care_employee   NUMERIC(6,4) NOT NULL DEFAULT 0.1295,
    lt_care_employer   NUMERIC(6,4) NOT NULL DEFAULT 0.1295,
    pension_employee   NUMERIC(6,4) NOT NULL DEFAULT 0.045,
    pension_employer   NUMERIC(6,4) NOT NULL DEFAULT 0.045,
    emp_ins_employee   NUMERIC(6,4) NOT NULL DEFAULT 0.009,
    emp_ins_employer   NUMERIC(6,4) NOT NULL DEFAULT 0.009,
    accident_employer  NUMERIC(6,4) NOT NULL DEFAULT 0.009,
    UNIQUE (company_id, apply_year)
);

CREATE TABLE IF NOT EXISTS payroll_run (
    payroll_run_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID        NOT NULL REFERENCES company(company_id),
    run_name        VARCHAR(200) NOT NULL,
    payroll_year    INT         NOT NULL,
    payroll_month   INT         NOT NULL CHECK (payroll_month BETWEEN 1 AND 12),
    pay_date        DATE        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    UNIQUE (company_id, payroll_year, payroll_month)
);

CREATE TABLE IF NOT EXISTS payroll_slip (
    payroll_slip_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id     UUID       NOT NULL REFERENCES payroll_run(payroll_run_id),
    employee_id        UUID       NOT NULL REFERENCES employee(employee_id),
    gross_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
    non_taxable_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    taxable_income     NUMERIC(15,2) NOT NULL DEFAULT 0,
    deduction_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
    delivery_method    VARCHAR(20) DEFAULT 'EMAIL',
    delivery_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    file_url           TEXT
);

CREATE TABLE IF NOT EXISTS payroll_item (
    payroll_item_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_slip_id  UUID        NOT NULL REFERENCES payroll_slip(payroll_slip_id) ON DELETE CASCADE,
    item_type        VARCHAR(20) NOT NULL,
    item_name        VARCHAR(100) NOT NULL,
    is_taxable       BOOLEAN     NOT NULL DEFAULT TRUE,
    amount           NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_company ON employee(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_run_company ON payroll_run(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slip_run ON payroll_slip(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_item_slip ON payroll_item(payroll_slip_id);
