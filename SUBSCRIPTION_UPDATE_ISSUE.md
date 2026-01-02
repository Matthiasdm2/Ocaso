# Subscription Update Issue - Troubleshooting

## Probleem
De wijziging blijft niet behouden: wanneer een abonnement wordt toegewezen via het adminpaneel, wordt de waarde correct geüpdatet naar bijvoorbeeld "basis_maandelijks", maar wanneer de data wordt opgehaald via `/api/admin/users?subscriptions=true`, is de waarde weer `null`.

## Observaties

1. **Update werkt**: De API retourneert succesvol `{"success": true, "verified": "basis_maandelijks"}`
2. **Verificatie werkt**: Direct na de update wordt de waarde correct getoond
3. **Data ophalen faalt**: Via `/api/admin/users?subscriptions=true` wordt `null` teruggegeven

## Mogelijke Oorzaken

1. **RLS Policies**: Row Level Security policies kunnen updates blokkeren
2. **Database Triggers**: Triggers kunnen waarden resetten na updates
3. **Caching**: Er kan een caching probleem zijn
4. **Timing Issue**: De data wordt mogelijk overschreven tussen update en query
5. **Query Probleem**: De query in `/api/admin/users` haalt mogelijk niet de juiste data op

## Debugging Stappen

1. Controleer of de database update daadwerkelijk wordt uitgevoerd
2. Controleer RLS policies voor de `profiles` tabel
3. Controleer database triggers die mogelijk `business_plan` kunnen resetten
4. Controleer of er andere API calls zijn die `business_plan` kunnen overschrijven
5. Controleer de query in `/api/admin/users` voor mogelijke problemen

## Oplossing Strategie

1. **Update eerst alleen `business_plan`**: Zorg dat deze kolom correct wordt geüpdatet
2. **Update daarna `business` JSONB**: Als deze kolom bestaat, update deze ook
3. **Verifieer de update**: Haal de data opnieuw op om te verifiëren dat de update correct is
4. **Controleer RLS**: Zorg dat de admin client de juiste permissies heeft

## Code Wijzigingen

- `app/api/admin/subscriptions/[id]/route.ts`: Update logica verbeterd
- `app/api/admin/users/route.ts`: Query logica mogelijk aanpassen

## Test Commando's

```bash
# Update subscription
curl -X PUT 'http://localhost:3000/api/admin/subscriptions/{user_id}' \
  -H 'Content-Type: application/json' \
  -d '{"business_plan":"basis_maandelijks"}'

# Haal data op
curl 'http://localhost:3000/api/admin/users?subscriptions=true'
```

## Volgende Stappen

1. Controleer database logs voor errors
2. Controleer RLS policies
3. Controleer database triggers
4. Test met directe database query

