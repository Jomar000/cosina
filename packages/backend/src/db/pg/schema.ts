import { sql } from 'drizzle-orm'
import {
    bigint,
    boolean,
    check,
    foreignKey,
    index,
    integer,
    jsonb,
    numeric,
    pgEnum,
    pgTable,
    smallint,
    text,
    timestamp,
    unique,
    uuid,
} from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

///////////
// Enums //
///////////

export const genderEnum = pgEnum('gender', [
    'MALE',
    'FEMALE',
])

///////////////////
// Tables - Core //
///////////////////

export const address = pgTable('address', {
    id: bigint('id', { mode: 'number' })
        .generatedByDefaultAsIdentity()
        .primaryKey(),
    publicId: uuid('public_id')
        .unique('c2nhrro7q3w6_unique')
        .notNull()
        .$defaultFn(() => uuidv7()),
    line1: text('line_1').notNull(),
    line2: text('line_2'),
    cityMunicipality: text('city_municipality').notNull(),
    provinceStateRegion: text('province_state_region').notNull(),
    postalCode: text('postal_code').notNull(),
    countryCode: text('country_code').notNull(),
    latitude: numeric('latitude'),
    longitude: numeric('longitude'),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
})

export const auditTrail = pgTable(
    'audit_trail',
    {
        id: bigint('id', { mode: 'number' })
            .generatedByDefaultAsIdentity()
            .primaryKey(),
        publicId: uuid('public_id')
            .unique('oxbb5xf5czye_unique')
            .notNull()
            .$defaultFn(() => uuidv7()),
        organizationId: text('organization_id').notNull(),
        userId: text('user_id').notNull(),
        component: text('component').notNull(),
        action: text('action').notNull(),
        description: text('description').notNull(),
        recordTable: text('record_table'),
        recordId: text('record_id'),
        recordDataOld: jsonb('record_data_old'),
        recordDataNew: jsonb('record_data_new'),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        loggedAt: timestamp('logged_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('xhbjm31r4h6s_index').on(t.organizationId),
        foreignKey({
            name: 'xhbjm31r4h6s_fkey',
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('kg5nldbccqqf_index').on(t.userId),
        foreignKey({
            name: 'kg5nldbccqqf_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        }),
    ],
)

export const objectStorage = pgTable('object_storage', {
    id: text('id').primaryKey(),
    size: bigint('size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type'),
    hashSha256: text('hash_sha256').unique('ectz8nfqt8mj_unique').notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
})

export const objectStorageAcl = pgTable(
    'object_storage_acl',
    {
        objectStorageId: text('object_storage_id').notNull(),
        userId: text('user_id').notNull(),
        /**
         * @description
         * Uses bit-masking for mode
         */
        mode: integer('mode').notNull().default(1),
    },
    (t) => [
        index('xabdmms1rce4_index').on(t.objectStorageId),
        foreignKey({
            name: 'xabdmms1rce4_fkey',
            columns: [t.objectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('68ghia6fpgvj_index').on(t.userId),
        foreignKey({
            name: '68ghia6fpgvj_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        unique('i9c1la91qvh8_unique').on(t.objectStorageId, t.userId),
    ],
)

export const upload = pgTable(
    'upload',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('dwolixf6w8hp_index').on(t.userId),
        foreignKey({
            name: 'dwolixf6w8hp_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const uploadAttachment = pgTable(
    'upload_attachment',
    {
        uploadId: text('upload_id').notNull(),
        objectStorageId: text('object_storage_id').notNull(),
    },
    (t) => [
        index('c0g7vcldgcc1_index').on(t.uploadId),
        foreignKey({
            name: 'c0g7vcldgcc1_fkey',
            columns: [t.uploadId],
            foreignColumns: [upload.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('o7xm4my0uq10_index').on(t.objectStorageId),
        foreignKey({
            name: 'o7xm4my0uq10_fkey',
            columns: [t.objectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        unique('23aso68ioiyj_unique').on(t.uploadId, t.objectStorageId),
    ],
)

export const userAttribute = pgTable(
    'user_attribute',
    {
        userId: text('user_id').primaryKey(),
        isLocked: boolean('is_locked').default(false).notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('nhsl7a2vq0j4_index').on(t.userId),
        foreignKey({
            name: 'nhsl7a2vq0j4_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const userProfile = pgTable(
    'user_profile',
    {
        userId: text('user_id').primaryKey(),
        firstName: text('first_name').notNull(),
        middleName: text('middle_name'),
        lastName: text('last_name').notNull(),
        nameExtension: text('name_extension'),
        gender: genderEnum('gender').notNull(),
        backupPhoneNumber: text('backup_phone_number'),
        addressId: bigint('address_id', { mode: 'number' }),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('eem2zxeduyfv_index').on(t.userId),
        foreignKey({
            name: 'eem2zxeduyfv_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('qun382y3zidg_index').on(t.addressId),
        foreignKey({
            name: 'qun382y3zidg_fkey',
            columns: [t.addressId],
            foreignColumns: [address.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const userRelationship = pgTable(
    'user_relationship',
    {
        userId: text('user_id').primaryKey(),
        name: text('name').notNull(),
        relationship: text('relationship').notNull(),
        phoneNumber: text('phone_number').notNull(),
        backupPhoneNumber: text('backup_phone_number'),
        email: text('email'),
        addressId: bigint('address_id', { mode: 'number' }),
        isEmergencyContact: boolean('is_emergency_contact')
            .notNull()
            .default(false),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('pa6kbv7tko20_index').on(t.userId),
        foreignKey({
            name: 'pa6kbv7tko20_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('7ms4oot44t7x_index').on(t.addressId),
        foreignKey({
            name: '7ms4oot44t7x_fkey',
            columns: [t.addressId],
            foreignColumns: [address.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

///////////////////
// Tables - Auth //
///////////////////

export const account = pgTable(
    'account',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', {
            withTimezone: true,
            mode: 'date',
        }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
            withTimezone: true,
            mode: 'date',
        }),
        scope: text('scope'),
        idToken: text('id_token'),
        password: text('password'),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('ame54f8rq90m_index').on(t.userId),
        foreignKey({
            name: 'ame54f8rq90m_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        unique('fmpxm18jipcc_unique').on(t.providerId, t.accountId),
    ],
)

export const invitation = pgTable(
    'invitation',
    {
        id: text('id').primaryKey(),
        email: text('email').notNull(),
        inviterId: text('inviter_id').notNull(),
        organizationId: text('organization_id').notNull(),
        role: text('role').notNull(),
        status: text('status').notNull(),
        expiresAt: timestamp('expires_at', {
            withTimezone: true,
            mode: 'date',
        }).notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('vsccwld046ul_index').on(t.inviterId),
        foreignKey({
            name: 'vsccwld046ul_fkey',
            columns: [t.inviterId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('dwh0vrawi8kc_index').on(t.organizationId),
        foreignKey({
            name: 'dwh0vrawi8kc_fkey',
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('to5af3ntvzc0_index').on(t.role),
        foreignKey({
            name: 'to5af3ntvzc0_fkey',
            columns: [t.role],
            foreignColumns: [role.name],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const member = pgTable(
    'member',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        organizationId: text('organization_id').notNull(),
        role: text('role').notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        unique('qticc263mdrn_unique').on(t.organizationId, t.userId),
        index('0xl3tx6iju2c_index').on(t.userId),
        foreignKey({
            name: '0xl3tx6iju2c_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('ey8flhlguwkb_index').on(t.organizationId),
        foreignKey({
            name: 'ey8flhlguwkb_fkey',
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('kn8m1fkitar0_index').on(t.role),
        foreignKey({
            name: 'kn8m1fkitar0_fkey',
            columns: [t.role],
            foreignColumns: [role.name],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const organization = pgTable(
    'organization',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        slug: text('slug').unique('vcr7tjb6whfs_unique').notNull(),
        logo: text('logo'),
        metadata: text('metadata'),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    () => [
        check('vcr7tjb6whfs_check', sql`slug = LOWER(slug)`),
    ],
)

export const permission = pgTable(
    'permission',
    {
        id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
        component: text('component').notNull(),
        action: text('action').notNull(),
        roleId: smallint('role_id').notNull(),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        unique('ctaxe84nuq66_unique').on(t.component, t.action, t.roleId),
        index('7vz0lkc6bbu7_index').on(t.roleId),
    ],
)

export const role = pgTable(
    'role',
    {
        id: integer('id').generatedByDefaultAsIdentity().primaryKey(),
        name: text('name').unique('629pi1o76z2z_unique').notNull(),
        description: text('description'),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    () => [
        check('629pi1o76z2z_check', sql`name = LOWER(name)`),
    ],
)

export const session = pgTable(
    'session',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        token: text('token').unique('d3j63aa60m5j_unique').notNull(),
        expiresAt: timestamp('expires_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        activeOrganizationId: text('active_organization_id'),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index('11rzmcpm3uv0_index').on(t.userId),
        foreignKey({
            name: '11rzmcpm3uv0_fkey',
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index('n6ebx1rg81k4_index').on(t.activeOrganizationId),
        foreignKey({
            name: 'n6ebx1rg81k4_fkey',
            columns: [t.activeOrganizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const user = pgTable(
    'user',
    {
        id: text('id').primaryKey(),
        name: text('name').notNull(),
        email: text('email').unique('mfll9xelu6gc_unique').notNull(),
        emailVerified: boolean('email_verified').notNull().default(false),
        image: text('image'),
        username: text('username').unique('2qajnnnraodw_unique').notNull(),
        displayUsername: text('display_username'),
        twoFactorEnabled: boolean('two_factor_enabled')
            .notNull()
            .default(false),
        createdAt: timestamp('created_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', {
            withTimezone: true,
            mode: 'date',
        })
            .notNull()
            .defaultNow(),
    },
    () => [
        check('mfll9xelu6gc_check', sql`email = LOWER(email)`),
        check('2qajnnnraodw_check', sql`username = LOWER(username)`),
    ],
)

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').unique('46hrccabod8t_unique').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', {
        withTimezone: true,
        mode: 'date',
    })
        .notNull()
        .defaultNow(),
})
