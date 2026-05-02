-- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;
--> statement-breakpoint

-- Permission
INSERT INTO "permission"
    (component, action, role_id)
VALUES
    /**
     * OWNER (role_id: 1) - Full access to all components
     */
    ('<OWNER>', 'ANY', 1),
    ('<ADMIN>', 'ANY', 1),
    ('ws', 'ANY', 1),
    ('ws', 'listen', 1),
    ('ws', 'broadcast', 1),
    /**
     * ADMIN (role_id: 2) - Full access to all components
     */
    ('<ADMIN>', 'ANY', 2),
    ('ws', 'ANY', 2),
    ('ws', 'listen', 2),
    ('ws', 'broadcast', 2),
    /**
     * MEMBER (role_id: 3) - Limited access
     */
    ('ws', 'listen', 3);
--> statement-breakpoint

-- Role
INSERT INTO "role"
    (id, name, description)
VALUES
    (1, 'owner', 'Organization Owner'),
    (2, 'admin', 'Organization Administrator'),
    (3, 'member', 'Organization Member');
--> statement-breakpoint

-- Account
-- Default password is P@ssw0rd1234
INSERT INTO "account"
    (id, user_id, account_id, provider_id, password)
VALUES
    ('ACCOUNT_001', 'USER_001', 'USER_001', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_002', 'USER_002', 'USER_002', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_003', 'USER_003', 'USER_003', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e'),
    ('ACCOUNT_999', 'USER_999', 'USER_999', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e');
--> statement-breakpoint

-- Member
INSERT INTO "member"
    (id, user_id, organization_id, role)
VALUES
    ('MEMBER_001', 'USER_001', 'ORGANIZATION_001', 'owner'),
    ('MEMBER_002', 'USER_002', 'ORGANIZATION_001', 'admin'),
    ('MEMBER_003', 'USER_003', 'ORGANIZATION_001', 'member'),
    ('MEMBER_999', 'USER_999', 'ORGANIZATION_001', 'member');
--> statement-breakpoint

-- Organization
INSERT INTO "organization"
    (id, name, slug)
VALUES
    ('ORGANIZATION_001', 'SUPER ORGANIZATION', 'superorganization');
--> statement-breakpoint

-- User
INSERT INTO "user"
    (id, name, email, username)
VALUES
    ('USER_001', 'SUPER ADMINISTRATOR', 'superadministrator@hyperion.app', 'superadministrator'),
    ('USER_002', 'ADMINISTRATOR', 'administrator@hyperion.app', 'administrator'),
    ('USER_003', 'MEMBER', 'member@hyperion.app', 'member'),
    ('USER_999', 'LOCKED', 'locked@hyperion.app', 'locked');
--> statement-breakpoint

-- User Attribute
INSERT INTO "user_attribute"
    (user_id, is_locked)
VALUES
    ('USER_001', false),
    ('USER_002', false),
    ('USER_003', false),
    ('USER_999', true);
--> statement-breakpoint

/**
 * Sync identity sequences
 */

 SELECT setval(pg_get_serial_sequence('"role"', 'id'), (SELECT MAX(id) FROM "role"));
