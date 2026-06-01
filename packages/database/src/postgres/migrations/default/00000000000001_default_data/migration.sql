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
    ('SYSOWNER', 'ANY', 1),
    ('SYSADMIN', 'ANY', 1),
    ('ws', 'listen', 1),
    ('ws', 'broadcast', 1),
    /**
     * ADMIN (role_id: 2) - Full access to all components
     */
    ('SYSADMIN', 'ANY', 2),
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

/**
 * Sync identity sequences
 */

SELECT setval(pg_get_serial_sequence('"role"', 'id'), (SELECT MAX(id) FROM "role"));
--> statement-breakpoint
