-- Custom SQL migration file, put your code below! ---- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;

-- Account
-- Default password is P@ssw0rd1234
INSERT INTO "account"
    (id, user_id, account_id, provider_id, password)
VALUES
    ('ACCOUNT_001', 'USER_001', 'USER_001', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_002', 'USER_002', 'USER_002', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_003', 'USER_003', 'USER_003', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_999', 'USER_999', 'USER_999', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e');

-- Member
INSERT INTO "member"
    (id, user_id, organization_id, role)
VALUES
    ('MEMBER_001', 'USER_001', 'ORGANIZATION_001', 'owner'),
    ('MEMBER_002', 'USER_002', 'ORGANIZATION_001', 'admin'),
    ('MEMBER_003', 'USER_003', 'ORGANIZATION_001', 'member'),
    ('MEMBER_999', 'USER_999', 'ORGANIZATION_001', 'member');

-- Organization
INSERT INTO "organization"
    (id, name, slug)
VALUES
    ('ORGANIZATION_001', 'SUPER ORGANIZATION', 'superorganization');

-- User
INSERT INTO "user"
    (id, name, email, username)
VALUES
    ('USER_001', 'SUPER ADMINISTRATOR', 'superadministrator@hyperion.app', 'superadministrator'),
    ('USER_002', 'ADMINISTRATOR', 'administrator@hyperion.app', 'administrator'),
    ('USER_003', 'MEMBER', 'member@hyperion.app', 'member'),
    ('USER_999', 'LOCKED', 'locked@hyperion.app', 'locked');

-- User Attribute
INSERT INTO "user_attribute"
    (user_id, is_locked)
VALUES
    ('USER_001', false),
    ('USER_002', false),
    ('USER_003', false),
    ('USER_999', true);
