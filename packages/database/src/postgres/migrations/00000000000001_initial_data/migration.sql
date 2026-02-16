-- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;

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
