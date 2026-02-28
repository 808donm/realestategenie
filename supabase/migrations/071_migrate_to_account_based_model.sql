-- Migration: Migrate Existing Data to Account-Based Model
-- Transforms individual agent subscriptions into account-based structure
-- Each existing agent becomes an account owner with their own account

-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
  agent_count INTEGER;
  subscription_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO agent_count FROM agents WHERE is_active = true;
  SELECT COUNT(*) INTO subscription_count FROM agent_subscriptions WHERE status = 'active';

  RAISE NOTICE 'Starting migration: % active agents, % active subscriptions', agent_count, subscription_count;
END $$;

-- ============================================================================
-- MIGRATE AGENTS TO ACCOUNTS
-- ============================================================================

DO $$
DECLARE
  agent_record RECORD;
  new_account_id UUID;
  subscription_record RECORD;
  account_name TEXT;
BEGIN
  -- Loop through all active agents
  FOR agent_record IN
    SELECT id, email, display_name, role, is_active
    FROM agents
    WHERE is_active = true
    ORDER BY created_at
  LOOP
    -- Generate account name
    account_name := COALESCE(agent_record.display_name, agent_record.email);
    IF account_name NOT LIKE '%Account%' AND account_name NOT LIKE '%Organization%' THEN
      account_name := account_name || '''s Account';
    END IF;

    -- Get agent's subscription if exists
    SELECT * INTO subscription_record
    FROM agent_subscriptions
    WHERE agent_id = agent_record.id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Skip if agent already has an account (idempotent re-run)
    SELECT am.account_id INTO new_account_id
    FROM account_members am
    WHERE am.agent_id = agent_record.id
      AND am.account_role = 'owner'
      AND am.is_active = true
    LIMIT 1;

    IF new_account_id IS NOT NULL THEN
      RAISE NOTICE 'Agent % already has account %, skipping', agent_record.email, new_account_id;
      CONTINUE;
    END IF;

    -- Create account for this agent
    INSERT INTO accounts (
      owner_id,
      name,
      subscription_plan_id,
      billing_email,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      agent_record.id,
      account_name,
      subscription_record.subscription_plan_id, -- NULL if no subscription
      agent_record.email,
      agent_record.is_active,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_account_id;

    -- Link subscription to account if exists
    IF subscription_record.id IS NOT NULL THEN
      UPDATE agent_subscriptions
      SET account_id = new_account_id
      WHERE id = subscription_record.id;
    END IF;

    -- Add agent as account owner/member
    -- Determine account_role based on current agent role
    INSERT INTO account_members (
      account_id,
      agent_id,
      account_role,
      office_id,
      joined_at,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      new_account_id,
      agent_record.id,
      -- Map existing role to account role
      CASE agent_record.role
        WHEN 'admin' THEN 'owner'  -- System admins become account owners
        WHEN 'broker' THEN 'owner' -- Brokers become account owners
        WHEN 'team_lead' THEN 'owner' -- Team leads become account owners
        ELSE 'owner' -- All others become owners of their own account
      END,
      NULL, -- No office assigned yet
      NOW(),
      true,
      NOW(),
      NOW()
    );

    -- Initialize usage tracking for the account
    PERFORM update_account_usage(new_account_id);

    RAISE NOTICE 'Created account % for agent % (%)', new_account_id, agent_record.email, account_name;
  END LOOP;

  RAISE NOTICE 'Account migration complete';
END $$;

-- ============================================================================
-- MIGRATE EXISTING TEAMS TO ACCOUNT STRUCTURE
-- ============================================================================

DO $$
DECLARE
  team_record RECORD;
  broker_account_id UUID;
  member_record RECORD;
BEGIN
  -- Loop through existing teams
  FOR team_record IN
    SELECT id, broker_id, team_lead_id, name, created_at
    FROM teams
    WHERE is_active = true
  LOOP
    -- Get the broker's account ID
    SELECT account_id INTO broker_account_id
    FROM account_members
    WHERE agent_id = team_record.broker_id
      AND account_role = 'owner'
      AND is_active = true
    LIMIT 1;

    IF broker_account_id IS NULL THEN
      RAISE NOTICE 'Skipping team % - broker account not found', team_record.id;
      CONTINUE;
    END IF;

    -- Update the account name to reflect it's a team
    IF team_record.name IS NOT NULL AND team_record.name != '' THEN
      UPDATE accounts
      SET name = team_record.name
      WHERE id = broker_account_id;
    END IF;

    -- Add team members to the broker's account
    FOR member_record IN
      SELECT agent_id
      FROM team_members
      WHERE team_id = team_record.id
        AND is_active = true
    LOOP
      -- Skip if member is already in the account (e.g., the broker themselves)
      IF EXISTS (
        SELECT 1 FROM account_members
        WHERE account_id = broker_account_id
          AND agent_id = member_record.agent_id
      ) THEN
        CONTINUE;
      END IF;

      -- Add team member to account
      INSERT INTO account_members (
        account_id,
        agent_id,
        account_role,
        joined_at,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        broker_account_id,
        member_record.agent_id,
        -- Team members become 'agent' role in account
        'agent',
        NOW(),
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (account_id, agent_id) DO NOTHING;

      RAISE NOTICE 'Added team member % to account %', member_record.agent_id, broker_account_id;
    END LOOP;

    -- Update usage for the account
    PERFORM update_account_usage(broker_account_id);
  END LOOP;

  RAISE NOTICE 'Team migration complete';
END $$;

-- ============================================================================
-- CREATE DEFAULT OFFICE FOR MULTI-OFFICE ACCOUNTS
-- ============================================================================

DO $$
DECLARE
  account_record RECORD;
  new_office_id UUID;
  plan_record RECORD;
BEGIN
  -- Create default office for accounts that can have offices (Brokerage Growth+)
  FOR account_record IN
    SELECT a.id, a.name, a.subscription_plan_id, a.owner_id, ag.email
    FROM accounts a
    INNER JOIN agents ag ON ag.id = a.owner_id
    WHERE a.is_active = true
      AND a.subscription_plan_id IS NOT NULL
  LOOP
    -- Get plan details
    SELECT * INTO plan_record
    FROM subscription_plans
    WHERE id = account_record.subscription_plan_id;

    -- Only create office if plan tier is 3+ (Brokerage Growth or higher)
    IF plan_record.tier_level >= 3 THEN
      INSERT INTO offices (
        account_id,
        name,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        account_record.id,
        account_record.name || ' - Main Office',
        true,
        NOW(),
        NOW()
      )
      RETURNING id INTO new_office_id;

      -- Assign all account members to this office
      UPDATE account_members
      SET office_id = new_office_id
      WHERE account_id = account_record.id
        AND office_id IS NULL;

      RAISE NOTICE 'Created default office for account %', account_record.name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Office creation complete';
END $$;

-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================

DO $$
DECLARE
  account_count INTEGER;
  member_count INTEGER;
  office_count INTEGER;
  linked_subscription_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO account_count FROM accounts WHERE is_active = true;
  SELECT COUNT(*) INTO member_count FROM account_members WHERE is_active = true;
  SELECT COUNT(*) INTO office_count FROM offices WHERE is_active = true;
  SELECT COUNT(*) INTO linked_subscription_count FROM agent_subscriptions WHERE account_id IS NOT NULL;

  RAISE NOTICE 'Migration complete: % accounts, % members, % offices, % linked subscriptions',
    account_count, member_count, office_count, linked_subscription_count;

  -- Verify every active agent has an account
  IF EXISTS (
    SELECT 1 FROM agents a
    WHERE a.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM account_members am
        WHERE am.agent_id = a.id AND am.is_active = true
      )
  ) THEN
    RAISE WARNING 'Some active agents are not linked to any account!';
  ELSE
    RAISE NOTICE 'All active agents successfully linked to accounts';
  END IF;
END $$;

-- ============================================================================
-- UPDATE USAGE ALERTS TO USE ACCOUNTS
-- ============================================================================

-- Add account_id to usage_alerts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_alerts' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE usage_alerts
      ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

    CREATE INDEX idx_usage_alerts_account_id ON usage_alerts(account_id);

    -- Link existing alerts to accounts
    UPDATE usage_alerts ua
    SET account_id = (
      SELECT am.account_id
      FROM account_members am
      WHERE am.agent_id = ua.agent_id
        AND am.is_active = true
      LIMIT 1
    );
  END IF;
END $$;

COMMENT ON TABLE accounts IS 'Primary organizational structure - each account has an owner, subscription, and team members';
COMMENT ON TABLE account_members IS 'Links agents to accounts with role-based access (owner, admin, agent, assistant)';
