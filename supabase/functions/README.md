# ResQ Supabase Edge Functions

This directory contains serverless Edge Functions for secure backend operations.

## Functions

### dispatch-preview
**Endpoint:** `https://PROJECT.supabase.co/functions/v1/dispatch-preview`

Generates preview route lines for selected units before dispatch commitment.

**Request:**
```json
POST /dispatch-preview
{
  "incidentId": "INC-001",
  "unitIds": ["AMB-001", "FIRE-002"]
}
```

**Response:**
```json
{
  "incidentId": "INC-001",
  "routes": [
    {
      "unitId": "AMB-001",
      "unitName": "Ambulance Alpha",
      "route": [[40.758, -73.985], [40.759, -73.984], ...],
      "distance": 2.5,
      "eta": 5
    }
  ]
}
```

### dispatch-commit
**Endpoint:** `https://PROJECT.supabase.co/functions/v1/dispatch-commit`

Commits dispatch: creates dispatch records, updates unit status, updates incident status.

**Request:**
```json
POST /dispatch-commit
Authorization: Bearer <user-jwt-token>
{
  "incidentId": "INC-001",
  "unitIds": ["AMB-001", "FIRE-002"]
}
```

**Response:**
```json
{
  "success": true,
  "incidentId": "INC-001",
  "dispatches": [
    {
      "dispatchId": "uuid",
      "unitId": "AMB-001",
      "unitName": "Ambulance Alpha",
      "eta": 5,
      "route": [[40.758, -73.985], ...]
    }
  ],
  "dispatchedCount": 2
}
```

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project linked: `supabase link --project-ref YOUR_PROJECT_ID`

### Deploy All Functions
```bash
supabase functions deploy dispatch-preview
supabase functions deploy dispatch-commit
```

### Set Secrets (required)
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Test Locally
```bash
# Start local Supabase (optional)
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/dispatch-preview' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"incidentId":"INC-001","unitIds":["AMB-001"]}'
```

## Environment Variables

Edge Functions have access to:
- `SUPABASE_URL` - Project URL (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` - Set via secrets (NEVER commit to git)
- `SUPABASE_ANON_KEY` - Public key (auto-injected)

## Security

- Edge Functions use service role key for privileged operations
- User authentication verified via JWT token in Authorization header
- RLS bypassed only in functions (frontend still respects RLS)
- All inputs validated before database operations
