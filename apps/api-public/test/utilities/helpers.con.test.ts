import { describe, expect, it } from 'vitest'

import {
    canLoginAuthRole,
    hasPrivilegedAuthRole,
    parseAuthRoles,
} from '../../src/utilities/helpers.js'

describe.concurrent('Auth role helpers', () => {
    it('parses comma-separated roles with trimming and empty-value filtering.', () => {
        expect(parseAuthRoles(' owner, admin, ,member ')).toEqual([
            'owner',
            'admin',
            'member',
        ])
    })

    it.each([
        'owner,member',
        'admin,member',
    ])('recognizes privileged multi-role value %s.', (role) => {
        expect(hasPrivilegedAuthRole(role)).toBe(true)
    })

    it('does not treat non-privileged multi-role values as privileged.', () => {
        expect(hasPrivilegedAuthRole('member')).toBe(false)
    })

    it('allows every parsed role when no login role allow-list is provided.', () => {
        expect(canLoginAuthRole('owner,member')).toBe(true)
        expect(canLoginAuthRole('')).toBe(true)
    })

    it('allows login when any parsed role exists in the allow-list.', () => {
        expect(canLoginAuthRole('owner,member', ['member'])).toBe(true)
        expect(canLoginAuthRole('admin,member', ['admin'])).toBe(true)
    })

    it('rejects login when no parsed role exists in the allow-list.', () => {
        expect(
            canLoginAuthRole('member', [
                'admin',
                'owner',
            ]),
        ).toBe(false)
    })
})
