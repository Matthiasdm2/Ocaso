# Database Migratie Uitleg

## Wat is een Database Migratie?

Een **database migratie** is een SQL script dat de structuur van je database aanpast. In dit geval voegen we een nieuwe kolom toe aan de `profiles` tabel.

## Wat doet deze specifieke migratie?

De migratie voegt een nieuwe kolom `business` toe aan de `profiles` tabel:

```sql
ALTER TABLE public.profiles 
ADD COLUMN business JSONB DEFAULT '{}'::jsonb;
```

### Details:

1. **Kolom naam**: `business`
2. **Type**: `JSONB` (JSON Binary - efficiënte opslag van JSON data)
3. **Default waarde**: `'{}'` (leeg JSON object)
4. **Doel**: Opslaan van subscription data (plan, billing_cycle, subscription_active, etc.)

### Waarom is dit nodig?

Onze code gebruikt nu twee kolommen voor subscription data:
- `business_plan` (text): "basis_maandelijks", "pro_jaarlijks", etc.
- `business` (JSONB): Gedetailleerde subscription data

De migratie zorgt ervoor dat beide kolommen beschikbaar zijn in de database.

## Is dit veilig?

**Ja!** Deze migratie is:
- ✅ **Idempotent**: Kan meerdere keren worden uitgevoerd zonder problemen
- ✅ **Non-breaking**: Voegt alleen een kolom toe, verwijdert niets
- ✅ **Default waarde**: Bestaande rijen krijgen automatisch `{}` als waarde
- ✅ **Geen downtime**: Database blijft beschikbaar tijdens migratie

## Wat gebeurt er tijdens de migratie?

1. Database controleert of kolom al bestaat
2. Als kolom niet bestaat → wordt toegevoegd
3. Als kolom al bestaat → wordt overgeslagen (veilig!)
4. Bestaande profielen krijgen `business = {}` als default

## Na de migratie

- ✅ Nieuwe subscriptions worden opgeslagen in beide kolommen
- ✅ Admin dashboard kan subscriptions beheren
- ✅ Profielpagina kan subscription data lezen
- ✅ Alles blijft werken zoals voorheen

