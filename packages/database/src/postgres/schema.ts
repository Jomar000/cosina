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
    pgSchema,
    pgTable,
    smallint,
    text,
    timestamp,
    unique,
    uuid,
} from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

/////////////
// Schemas //
/////////////

export const archiveSchema = pgSchema('archive')

///////////
// Enums //
///////////

export const genderEnum = pgEnum('gender', [
    'MALE',
    'FEMALE',
])

export const productCategoryEnum = pgEnum('product_category', [
    'bilao_package',
    'bundle_package',
    'single_order',
])

export const productTagEnum = pgEnum('product_tag', [
    'new',
    'best_seller',
    'seasonal',
    'limited',
])

export const orderStatusEnum = pgEnum('order_status', [
    'pending',
    'cooking',
    'looking_for_rider',
    'ready_to_pick_up',
    'rider_is_on_the_way',
    'completed',
    'cancelled',
])

export const deliveryTypeEnum = pgEnum('delivery_type', [
    'self_pickup',
    'lalamove',
    'other_courier',
])

///////////////////
// Tables - Core //
///////////////////

export const address = pgTable('address', {
    id: bigint('id', { mode: 'number' })
        .generatedByDefaultAsIdentity()
        .primaryKey(),
    publicId: uuid('public_id')
        .unique()
        .notNull()
        .default(sql`gen_random_uuid()`)
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
            .unique()
            .notNull()
            .default(sql`gen_random_uuid()`)
            .$defaultFn(() => uuidv7()),
        organizationId: text('organization_id'),
        userId: text('user_id'),
        component: text('component').notNull(),
        action: text('action').notNull(),
        description: text('description').notNull(),
        records: jsonb('records').$type<
            {
                table: string
                id: string
                oldData?: unknown
            }[]
        >(),
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
        index().on(t.organizationId),
        foreignKey({
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        }),
    ],
)

export const keyCounter = pgTable('key_counter', {
    id: bigint('id', { mode: 'number' })
        .generatedByDefaultAsIdentity()
        .primaryKey(),
    publicId: uuid('public_id')
        .unique()
        .notNull()
        .default(sql`gen_random_uuid()`)
        .$defaultFn(() => uuidv7()),
    key: text('key').unique().notNull(),
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
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

export const keyValue = pgTable('key_value', {
    id: bigint('id', { mode: 'number' })
        .generatedByDefaultAsIdentity()
        .primaryKey(),
    publicId: uuid('public_id')
        .unique()
        .notNull()
        .default(sql`gen_random_uuid()`)
        .$defaultFn(() => uuidv7()),
    key: text('key').unique().notNull(),
    value: text('value'),
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

export const objectStorage = pgTable('object_storage', {
    id: text('id').primaryKey(),
    size: bigint('size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type'),
    hashSha256: text('hash_sha256').unique().notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    isUploaded: boolean('is_uploaded').notNull().default(false),
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
        foreignKey({
            columns: [t.objectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('cascade')
            .onUpdate('no action'),
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        unique().on(t.objectStorageId, t.userId),
    ],
)

export const upload = pgTable(
    'upload',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        isCommitted: boolean('is_committed').notNull().default(false),
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
        index().on(t.userId),
        foreignKey({
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
        foreignKey({
            columns: [t.uploadId],
            foreignColumns: [upload.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.objectStorageId),
        foreignKey({
            columns: [t.objectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('cascade')
            .onUpdate('no action'),
        unique().on(t.uploadId, t.objectStorageId),
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
        foreignKey({
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
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.addressId),
        foreignKey({
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
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.addressId),
        foreignKey({
            columns: [t.addressId],
            foreignColumns: [address.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

/////////////////////
// Tables - Domain //
/////////////////////

export const product = pgTable(
    'product',
    {
        id: bigint('id', { mode: 'number' })
            .generatedByDefaultAsIdentity()
            .primaryKey(),
        publicId: uuid('public_id')
            .unique()
            .notNull()
            .default(sql`gen_random_uuid()`)
            .$defaultFn(() => uuidv7()),
        organizationId: text('organization_id').notNull(),
        name: text('name').notNull(),
        ingredients: text('ingredients'),
        category: productCategoryEnum('category')
            .notNull()
            .default('single_order'),
        price: numeric('price').notNull(),
        imageObjectStorageId: text('image_object_storage_id'),
        isAvailable: boolean('is_available').notNull().default(true),
        tags: productTagEnum('tags').array().notNull().default([]),
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
        index().on(t.organizationId),
        foreignKey({
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        foreignKey({
            columns: [t.imageObjectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('set null')
            .onUpdate('no action'),
    ],
)

export const productSize = pgTable(
    'product_size',
    {
        id: bigint('id', { mode: 'number' })
            .generatedByDefaultAsIdentity()
            .primaryKey(),
        productId: bigint('product_id', { mode: 'number' }).notNull(),
        name: text('name').notNull(),
        price: numeric('price').notNull(),
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
        index().on(t.productId),
        foreignKey({
            columns: [t.productId],
            foreignColumns: [product.id],
        })
            .onDelete('cascade')
            .onUpdate('no action'),
    ],
)

export const order = pgTable(
    'order',
    {
        id: bigint('id', { mode: 'number' })
            .generatedByDefaultAsIdentity()
            .primaryKey(),
        publicId: uuid('public_id')
            .unique()
            .notNull()
            .default(sql`gen_random_uuid()`)
            .$defaultFn(() => uuidv7()),
        trackingCode: text('tracking_code').notNull().unique(),
        organizationId: text('organization_id').notNull(),
        customerName: text('customer_name').notNull(),
        contactNumber: text('contact_number').notNull(),
        contactNumber2: text('contact_number_2'),
        deliveryType: deliveryTypeEnum('delivery_type').notNull(),
        downpayment: numeric('downpayment'),
        amountToPay: numeric('amount_to_pay').notNull(),
        proofOfPaymentObjectStorageId: text(
            'proof_of_payment_object_storage_id',
        ),
        remainingBalancePaymentMethod: text('remaining_balance_payment_method'),
        remainingBalanceProofObjectStorageId: text(
            'remaining_balance_proof_object_storage_id',
        ),
        proofOfPaymentStatus: text('proof_of_payment_status'),
        remainingBalanceProofStatus: text('remaining_balance_proof_status'),
        remainingBalanceSenderName: text('remaining_balance_sender_name'),
        remainingBalanceSenderNumber: text('remaining_balance_sender_number'),
        remainingBalanceAmountSent: numeric('remaining_balance_amount_sent'),
        status: orderStatusEnum('status').notNull().default('pending'),
        notes: text('notes'),
        deliveryAddress: text('delivery_address'),
        deliveryAt: timestamp('delivery_at', {
            withTimezone: true,
            mode: 'date',
        }),
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
        index().on(t.organizationId),
        foreignKey({
            columns: [t.organizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.status),
        index().on(t.deliveryAt),
        index().on(t.createdAt),
        foreignKey({
            columns: [t.proofOfPaymentObjectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('set null')
            .onUpdate('no action'),
        foreignKey({
            columns: [t.remainingBalanceProofObjectStorageId],
            foreignColumns: [objectStorage.id],
        })
            .onDelete('set null')
            .onUpdate('no action'),
    ],
)

export const orderItem = pgTable(
    'order_item',
    {
        id: bigint('id', { mode: 'number' })
            .generatedByDefaultAsIdentity()
            .primaryKey(),
        orderId: bigint('order_id', { mode: 'number' }).notNull(),
        productId: bigint('product_id', { mode: 'number' }),
        name: text('name').notNull(),
        sizeName: text('size_name'),
        quantity: integer('quantity').notNull().default(1),
        price: numeric('price').notNull(),
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
        index().on(t.orderId),
        foreignKey({
            columns: [t.orderId],
            foreignColumns: [order.id],
        })
            .onDelete('cascade')
            .onUpdate('no action'),
        index().on(t.productId),
        foreignKey({
            columns: [t.productId],
            foreignColumns: [product.id],
        })
            .onDelete('set null')
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
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        unique().on(t.providerId, t.accountId),
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
        index().on(t.email),
        index().on(t.inviterId),
        foreignKey({
            columns: [t.inviterId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.organizationId),
        foreignKey({
            columns: [t.organizationId],
            foreignColumns: [organization.id],
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
        unique().on(t.organizationId, t.userId),
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        foreignKey({
            columns: [t.organizationId],
            foreignColumns: [organization.id],
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
        slug: text('slug').unique().notNull(),
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
        check('organization_slug_check', sql`slug = LOWER(slug)`),
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
        unique().on(t.component, t.action, t.roleId),
        index().on(t.roleId),
        foreignKey({
            columns: [t.roleId],
            foreignColumns: [role.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const role = pgTable(
    'role',
    {
        id: smallint('id').generatedByDefaultAsIdentity().primaryKey(),
        name: text('name').unique().notNull(),
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
        check('role_name_check', sql`name = LOWER(name)`),
    ],
)

export const session = pgTable(
    'session',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        token: text('token').unique().notNull(),
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
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
        index().on(t.activeOrganizationId),
        foreignKey({
            columns: [t.activeOrganizationId],
            foreignColumns: [organization.id],
        })
            .onDelete('no action')
            .onUpdate('no action'),
    ],
)

export const twoFactor = pgTable(
    'two_factor',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        secret: text('secret'),
        backupCodes: text('backup_codes'),
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
        index().on(t.userId),
        foreignKey({
            columns: [t.userId],
            foreignColumns: [user.id],
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
        email: text('email').unique().notNull(),
        emailVerified: boolean('email_verified').notNull().default(false),
        image: text('image'),
        username: text('username').unique().notNull(),
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
        check('user_email_check', sql`email = LOWER(email)`),
        check('user_username_check', sql`username = LOWER(username)`),
    ],
)

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').unique().notNull(),
    value: text('value').notNull(),
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
})
