-- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;

-- Account
-- Default password is P@ssw0rd1234
INSERT INTO "account"
    (id, user_id, account_id, provider_id, password)
VALUES
    ('ACCOUNT_001', 'USER_001', 'USER_001', 'credential', 't8lNmhcpgYY5pqB3t5anZsyMyI0Zbw2f:3d0264f0459d0a26851c2e4172db15196e69ace403f7ceab6f1818b009f9fcd7d645da1ed9e6e42ff5c138db81d840e79aa6323aeb1bac435959a8b2f06d0617');

-- Member
INSERT INTO "member"
    (id, user_id, organization_id, role)
VALUES
    ('MEMBER_001', 'USER_001', 'ORGANIZATION_001', 'OWNER');

-- Organization
INSERT INTO "organization"
    (id, name, slug)
VALUES
    ('ORGANIZATION_001', 'SUPER ORGANIZATION', 'superorganization');

-- Permission
INSERT INTO "permission"
    (component, action, role_id)
VALUES
    ('contribution', 'create', 1),
    ('contribution', 'read', 1),
    ('contribution', 'update', 1),
    ('contribution', 'delete', 1),
    ('contribution', 'create', 2),
    ('contribution', 'read', 2),
    ('contribution', 'update', 2),
    ('contribution', 'delete', 2);

-- Role
INSERT INTO "role"
    (id, name, description)
VALUES
    (1, 'OWNER', 'Organization Owner'),
    (2, 'ADMIN', 'Organization Administrator'),
    (3, 'MEMBER', 'Organization Member');

-- User
INSERT INTO "user"
    (id, name, email, username)
VALUES
    ('USER_001', 'SUPER ADMINISTRATOR', 'superadministrator@localhost.dev', 'superadministrator');

-- User Attribute
INSERT INTO "user_attribute"
    (user_id, is_locked)
VALUES
    ('USER_001', false);
