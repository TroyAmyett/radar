# Invite Code System for Beta Signup

## Status: Backlog

## Summary
Add an invite code system to the signup flow so new users must enter a valid code to register. Codes are managed by Super Admins.

## Requirements

### Invite Code Management (Super Admin)
- Super Admin can generate invite codes from an admin panel
- Each code can be single-use or multi-use (with a max redemption count)
- Codes can have an optional expiry date
- Admin can view all codes: active, expired, fully redeemed
- Admin can revoke/deactivate codes

### Signup Flow
- Add an "Invite Code" field to the signup form
- Validate the code before allowing registration
- Record which code was used by which user
- Assign the user's subscription tier based on the code (e.g., beta, trial)

### Database Schema
```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'beta',
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE invite_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES invite_codes(id),
  user_id UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ DEFAULT now()
);
```

### API Endpoints
- `POST /api/admin/invite-codes` - Generate new code (Super Admin)
- `GET /api/admin/invite-codes` - List all codes (Super Admin)
- `DELETE /api/admin/invite-codes/[id]` - Deactivate code (Super Admin)
- `POST /api/invite-codes/validate` - Validate code during signup (public)
