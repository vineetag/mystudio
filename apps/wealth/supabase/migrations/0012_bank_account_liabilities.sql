-- SimpleFIN returns every linked account, not just checking/savings — credit
-- cards and loans come along too. Extend account_type so they can be badged
-- as liabilities; net worth subtracts their owed balance instead of adding it.
alter table pt_bank_accounts
  drop constraint pt_bank_accounts_account_type_check;
alter table pt_bank_accounts
  add constraint pt_bank_accounts_account_type_check
  check (account_type in ('checking', 'savings', 'credit_card', 'loan', 'unknown'));

-- Re-guess rows the first sync typed before liabilities existed: an account
-- named like a mortgage/loan is a loan, and a negative balance is how
-- SimpleFIN reports money owed (credit cards). Owner-set types on other rows
-- are untouched, and future corrections still stick — the sync never writes
-- account_type on existing rows.
update pt_bank_accounts
  set account_type = 'loan'
  where account_type = 'checking' and account_name ~* '(mortgage|loan)';
update pt_bank_accounts
  set account_type = 'credit_card'
  where account_type = 'checking' and balance < 0;
