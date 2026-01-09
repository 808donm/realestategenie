-- Migration: Patch to assign members to default office
-- Fixes the office assignment that failed in 071 due to ambiguous column reference

DO $$
DECLARE
  account_record RECORD;
  default_office_id UUID;
BEGIN
  -- For each account with a Brokerage Growth+ plan that has an office
  FOR account_record IN
    SELECT DISTINCT a.id, a.name
    FROM accounts a
    INNER JOIN subscription_plans sp ON sp.id = a.subscription_plan_id
    WHERE a.is_active = true
      AND sp.tier_level >= 3
  LOOP
    -- Get the first office for this account
    SELECT id INTO default_office_id
    FROM offices
    WHERE account_id = account_record.id
      AND is_active = true
    ORDER BY created_at
    LIMIT 1;

    -- If office exists, assign members without an office to it
    IF default_office_id IS NOT NULL THEN
      UPDATE account_members
      SET office_id = default_office_id
      WHERE account_id = account_record.id
        AND office_id IS NULL;

      RAISE NOTICE 'Assigned members to office % for account %', default_office_id, account_record.name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Office assignment complete';
END $$;
