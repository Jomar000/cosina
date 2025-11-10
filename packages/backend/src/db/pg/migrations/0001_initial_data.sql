-- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;

-- Account
-- Default password is P@ssw0rd1234
INSERT INTO "account"
    (id, user_id, account_id, provider_id, password)
VALUES
    ('ACCOUNT_001', 'USER_001', 'USER_001', 'credential', 't8lNmhcpgYY5pqB3t5anZsyMyI0Zbw2f:3d0264f0459d0a26851c2e4172db15196e69ace403f7ceab6f1818b009f9fcd7d645da1ed9e6e42ff5c138db81d840e79aa6323aeb1bac435959a8b2f06d0617'),
    ('ACCOUNT_002', 'USER_002', 'USER_002', 'credential', 't8lNmhcpgYY5pqB3t5anZsyMyI0Zbw2f:3d0264f0459d0a26851c2e4172db15196e69ace403f7ceab6f1818b009f9fcd7d645da1ed9e6e42ff5c138db81d840e79aa6323aeb1bac435959a8b2f06d0617'),
    ('ACCOUNT_003', 'USER_003', 'USER_003', 'credential', 't8lNmhcpgYY5pqB3t5anZsyMyI0Zbw2f:3d0264f0459d0a26851c2e4172db15196e69ace403f7ceab6f1818b009f9fcd7d645da1ed9e6e42ff5c138db81d840e79aa6323aeb1bac435959a8b2f06d0617'),
    ('ACCOUNT_999', 'USER_999', 'USER_999', 'credential', 't8lNmhcpgYY5pqB3t5anZsyMyI0Zbw2f:3d0264f0459d0a26851c2e4172db15196e69ace403f7ceab6f1818b009f9fcd7d645da1ed9e6e42ff5c138db81d840e79aa6323aeb1bac435959a8b2f06d0617');

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

-- Permission
INSERT INTO "permission"
    (component, action, role_id)
VALUES
    ('owner', 'ANY', 1),
    ('admin', 'ANY', 1),
    ('admin', 'ANY', 2),
    ('member', 'ANY', 3);

-- Role
INSERT INTO "role"
    (id, name, description)
VALUES
    (1, 'owner', 'Organization Owner'),
    (2, 'admin', 'Organization Administrator'),
    (3, 'member', 'Organization Member');

-- User
INSERT INTO "user"
    (id, name, email, username)
VALUES
    ('USER_001', 'SUPER ADMINISTRATOR', 'superadministrator@localhost.dev', 'superadministrator'),
    ('USER_002', 'ADMINISTRATOR', 'administrator@localhost.dev', 'administrator'),
    ('USER_003', 'MEMBER', 'member@localhost.dev', 'member'),
    ('USER_999', 'LOCKED', 'locked@localhost.dev', 'locked');

-- User Attribute
INSERT INTO "user_attribute"
    (user_id, is_locked)
VALUES
    ('USER_001', false),
    ('USER_002', false),
    ('USER_003', false),
    ('USER_999', true);
