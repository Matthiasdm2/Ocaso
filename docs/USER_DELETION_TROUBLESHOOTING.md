# User Deletion Troubleshooting

## Probleem

Wanneer een gebruiker wordt verwijderd via het admin dashboard, komt deze na een refresh terug.

## Oorzaak

De `handle_new_user` trigger maakt automatisch een profile aan wanneer een auth user bestaat. Als de auth user niet wordt verwijderd, maakt de trigger het profile opnieuw aan bij refresh.

## Oplossing

De delete functie moet **eerst** de auth user verwijderen voordat het profile wordt verwijderd. Als de auth user deletion faalt, wordt de operatie gestopt.

## Debugging Stappen

### 1. Check Server Logs

Wanneer je een gebruiker verwijdert, check de server terminal voor logs:

```
🗑️ Attempting to delete user: [user-id]
User lookup: { exists: true, email: "...", error: null }
✅ Auth user deleted successfully (verified)
✅ Profile deleted successfully
✅ User [user-id] successfully deleted
```

Als je deze logs ziet:
- `❌ Failed to delete auth user:` → Auth deletion faalt
- `⚠️ Auth user still exists after deletion attempt!` → Verificatie faalt

### 2. Check Supabase Dashboard

1. Ga naar Supabase Dashboard → Authentication → Users
2. Zoek de gebruiker die je hebt verwijderd
3. Check of deze nog bestaat

Als de gebruiker nog bestaat:
- De auth deletion heeft gefaald
- Check de error in server logs
- Check of `SUPABASE_SERVICE_ROLE_KEY` correct is ingesteld

### 3. Check Environment Variables

Zorg dat `SUPABASE_SERVICE_ROLE_KEY` correct is ingesteld:

```bash
# Check in .env.local
echo $SUPABASE_SERVICE_ROLE_KEY

# Moet beginnen met: eyJ... (JWT token)
# NIET: sb_secret_... (dat is een oude format)
```

### 4. Test Auth Deletion Direct

Test of auth deletion werkt:

```bash
node scripts/test-user-delete.mjs
```

Dit toont of de auth user bestaat en of deletion zou werken.

## Mogelijke Oorzaken

### 1. Service Role Key Probleem
- **Symptoom**: Auth deletion faalt zonder duidelijke error
- **Oplossing**: Check of `SUPABASE_SERVICE_ROLE_KEY` een JWT token is (begint met `eyJ`)
- **Fix**: Haal nieuwe service role key op van Supabase Dashboard → Settings → API

### 2. Permissions Probleem
- **Symptoom**: `deleteUser()` faalt met permission error
- **Oplossing**: Service role key heeft admin permissions nodig
- **Fix**: Gebruik de service role key (niet anon key)

### 3. Trigger Probleem
- **Symptoom**: Auth user wordt verwijderd, maar profile komt terug
- **Oorzaak**: `handle_new_user` trigger maakt profile opnieuw aan
- **Fix**: Zorg dat auth user EERST wordt verwijderd (gebeurt al in code)

### 4. Cascade Delete Probleem
- **Symptoom**: Profile wordt verwijderd maar auth user blijft
- **Oorzaak**: Foreign key constraint `on delete cascade` werkt niet
- **Fix**: Verwijder auth user eerst (gebeurt al in code)

## Test Flow

1. **Verwijder gebruiker via admin dashboard**
2. **Check server logs** voor delete logs
3. **Check Supabase Dashboard** → Authentication → Users
4. **Refresh admin dashboard**
5. **Check of gebruiker terugkomt**

Als gebruiker terugkomt:
- Check server logs voor errors
- Check of auth user echt is verwijderd
- Check of profile echt is verwijderd
- Check of er een trigger is die profile opnieuw aanmaakt

## Fixes Toegepast

1. ✅ Auth user deletion wordt nu geverifieerd
2. ✅ Als auth user deletion faalt, wordt operatie gestopt
3. ✅ Betere error messages met uitleg
4. ✅ Verificatie check na deletion
5. ✅ Profile deletion alleen als auth user is verwijderd

## Als Het Nog Steeds Niet Werkt

1. **Check server logs** tijdens delete operatie
2. **Deel de error message** die je ziet
3. **Check Supabase Dashboard** → Authentication → Users
4. **Test met test script**: `node scripts/test-user-delete.mjs`

De meest waarschijnlijke oorzaak is dat de auth user deletion faalt zonder duidelijke error. De nieuwe code zou dit nu moeten detecteren en een duidelijke error geven.

