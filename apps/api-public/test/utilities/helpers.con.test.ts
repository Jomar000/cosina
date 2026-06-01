import { describe, expect, it } from 'vitest'

import {
    hasPrivilegedAuthRole,
    parseAuthRoles,
} from '../../src/utilities/helpers.js'

describe.concurrent('Auth role helpers', () => {
    it('parses comma-separated roles with trimming and empty-value filtering.', () => {
        expect(parseAuthRoles(' homeowner, board_member, ,member ')).toEqual([
            'homeowner',
            'board_member',
            'member',
        ])
    })

    it.each([
        'owner,homeowner',
        'admin,personnel',
    ])('recognizes privileged multi-role value %s.', (role) => {
        expect(hasPrivilegedAuthRole(role)).toBe(true)
    })

    it('does not treat non-privileged multi-role values as privileged.', () => {
        expect(hasPrivilegedAuthRole('homeowner,board_member')).toBe(false)
    })
})
