-- Defer Foreign Keys during seeding
-- https://www.postgresql.org/docs/current/sql-set-constraints.html
SET CONSTRAINTS ALL DEFERRED;
--> statement-breakpoint

-- Organization
INSERT INTO "organization"
    (id, name, slug)
VALUES
    ('cosina-org-001', 'Cosina', 'cosina');
--> statement-breakpoint

-- Dev Admin for cosina-org-001 (password: P@ssw0rd1234)
INSERT INTO "user"
    (id, name, email, email_verified, username)
VALUES
    ('cosina-admin-001', 'Cosina Admin', 'admin@cosina.com', true, 'cosinaadmin');
--> statement-breakpoint

INSERT INTO "user_attribute"
    (user_id, is_locked)
VALUES
    ('cosina-admin-001', false);
--> statement-breakpoint

INSERT INTO "account"
    (id, user_id, account_id, provider_id, password)
VALUES
    ('cosina-account-001', 'cosina-admin-001', 'cosina-admin-001', 'credential', 'ZLdlpfqhiPOY5tot3wc5Iq3xt-N8eHrB:691f4315a32bb67e45572fdfa8d0556076062d63e3402844bfb8eed3f7a09a5460ee6553fe751d79e076bcf00fece142d5b4315df8475f15c9acf46c4897412e');
--> statement-breakpoint

INSERT INTO "member"
    (id, user_id, organization_id, role)
VALUES
    ('cosina-member-001', 'cosina-admin-001', 'cosina-org-001', 'owner');
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

-- Products
INSERT INTO "product"
    (id, organization_id, name, ingredients, price, category, is_available)
VALUES
    -- Bilao Packages
    (1,  'cosina-org-001', 'Pancit Bihon Bilao',   'Bihon noodles, cabbage, carrots, pork strips, soy sauce, calamansi',            350.00, 'bilao_package',  true),
    (2,  'cosina-org-001', 'Pancit Canton Bilao',  'Canton noodles, bok choy, carrots, chicken, oyster sauce, sesame oil',           350.00, 'bilao_package',  true),
    (3,  'cosina-org-001', 'Palabok Bilao',        'Rice noodles, palabok sauce, shrimp, tofu, crushed chicharon, tinapa flakes',    400.00, 'bilao_package',  true),
    (4,  'cosina-org-001', 'Pansit Malabon Bilao', 'Thick rice noodles, seafood, shrimp sauce, tinapa, hard-boiled egg',             420.00, 'bilao_package',  true),
    -- Bundle Packages
    (5,  'cosina-org-001', 'Sampler Bundle',       'Good for 5–7 pax: 1 main dish, 1 pancit bilao (small), 1 dessert',              850.00, 'bundle_package', true),
    (6,  'cosina-org-001', 'Family Feast Bundle',  'Good for 10–12 pax: 2 main dishes, 1 pancit bilao (medium), 2 desserts',       1600.00, 'bundle_package', true),
    (7,  'cosina-org-001', 'Party Bundle',         'Good for 20–25 pax: 3 main dishes, 2 pancit bilaos (large), 3 desserts',       2800.00, 'bundle_package', true),
    -- Single Orders
    (8,  'cosina-org-001', 'Chicken Adobo',        'Chicken, soy sauce, vinegar, garlic, bay leaf, black pepper',                   180.00, 'single_order',   true),
    (9,  'cosina-org-001', 'Pork Sinigang',        'Pork ribs, tamarind broth, sitaw, kangkong, radish, eggplant',                  250.00, 'single_order',   true),
    (10, 'cosina-org-001', 'Kare-Kare',            'Oxtail, banana heart, sitaw, eggplant, peanut sauce, bagoong',                  320.00, 'single_order',   true),
    (11, 'cosina-org-001', 'Crispy Pata',          'Pork knuckles, garlic, bay leaf, fish sauce dipping sauce',                     380.00, 'single_order',   true),
    (12, 'cosina-org-001', 'Lechon Kawali',        'Pork belly, garlic, bay leaf, peppercorns, liver sauce',                        280.00, 'single_order',   true),
    (13, 'cosina-org-001', 'Leche Flan',           'Egg yolks, condensed milk, evaporated milk, caramel syrup',                     90.00, 'single_order',   true),
    (14, 'cosina-org-001', 'Maja Blanca',          'Coconut milk, cornstarch, sugar, sweet kernel corn, latik',                     75.00, 'single_order',   true),
    (15, 'cosina-org-001', 'Biko',                 'Glutinous rice, coconut milk, brown sugar, latik topping',                      80.00, 'single_order',   true);
--> statement-breakpoint

-- Product sizes (for bilao packages only — single/bundle orders have a fixed price)
INSERT INTO "product_size"
    (product_id, name, price)
VALUES
    -- Pancit Bihon Bilao
    (1, 'Small  (8–10 servings)',  350.00),
    (1, 'Medium (15–20 servings)', 600.00),
    (1, 'Large  (25–30 servings)', 900.00),
    -- Pancit Canton Bilao
    (2, 'Small  (8–10 servings)',  350.00),
    (2, 'Medium (15–20 servings)', 650.00),
    (2, 'Large  (25–30 servings)', 950.00),
    -- Palabok Bilao
    (3, 'Small  (8–10 servings)',  400.00),
    (3, 'Medium (15–20 servings)', 700.00),
    (3, 'Large  (25–30 servings)', 1000.00),
    -- Pansit Malabon Bilao
    (4, 'Small  (8–10 servings)',  420.00),
    (4, 'Medium (15–20 servings)', 750.00),
    (4, 'Large  (25–30 servings)', 1050.00);
--> statement-breakpoint

-- Sync identity sequences for product tables
SELECT setval(pg_get_serial_sequence('"product"', 'id'),      (SELECT MAX(id) FROM "product"));
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('"product_size"', 'id'), (SELECT MAX(id) FROM "product_size"));
--> statement-breakpoint
