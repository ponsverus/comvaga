# Protected Actions

This is a two-phase deployment because the production frontend is published manually.

1. Apply `sql/prepare_protected_actions.sql` through a tracked Supabase migration.
2. Deploy `protected-agendamentos`, `protected-depoimentos`, and `protected-gestao` with JWT verification enabled.
3. Publish the changed frontend files. Confirm booking, reviews and management actions use the new functions.
4. Apply `sql/activate_protected_actions.sql` through a tracked migration. This atomically removes eleven replaced counters and revokes direct browser execution of all seventeen covered RPCs.
5. Verify the old RPCs deny authenticated direct calls and the three Edge entrypoints still work.

Preparation and Edge deployment do not close the old RPC paths. Do not describe the protection as fully activated before step 4. Older open browser tabs must reload after activation.

Activation checks the reviewed function definitions before replacing anything. If another change occurred meanwhile, it aborts atomically and must be reviewed again.

## Boundaries

Edges validate the caller with Auth getUser. They pass only that verified identity to a service-only, statically allowlisted database entrypoint. The database supplies that identity to the original permission checks and triggers; it never treats a partner as an owner.

The attempt-counter RPC commits separately and returns denials normally. It reuses private.rate_limits and its existing two-day cleanup. Counters are not added to the Realtime publication. A counter failure denies execution.

Initial fixed-minute request caps per authenticated user:
- Domain envelope: 120/minute for bookings or management; 30/minute for reviews. Malformed authenticated requests consume this envelope.
- Booking creation: 30/minute, shared by single/multiple routes. Assisted creation has its own 30/minute bucket shared by its two routes.
- Reviews: 10/minute shared by business/professional reviews.
- Existing management/cancellation/completion caps: 30/minute; account/business deletion: 5/minute. Approval is now per user rather than per user/business, preventing invalid business IDs from multiplying buckets.

Existing successful-operation quotas remain: five reviews/client/SP day and ten inserted client-booking records/user/minute. They are distinct from request caps; multi-service bookings still consume one successful-record unit per service.

Public reads, signup checks, Auth/login, billing and existing permission rules are outside this change.

## Verification

Run `node --experimental-vm-modules --test supabase/tests/protected-actions.test.mjs supabase/tests/protected-action-client.test.mjs`.
Run `supabase/tests/protected_actions.sql` after preparation; all audit writes roll back.
Run the frontend lint and build. Functional rollout and capacity testing remain separate from these regression checks.

Blocked requests still consume an Edge invocation and a small database counter operation. This is not a guarantee against distributed denial of service.
