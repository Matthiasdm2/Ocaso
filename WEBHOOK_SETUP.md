# Stripe Webhook Setup

## Webhook URL
```
https://jouw-vercel-deployment-url.vercel.app/api/stripe/webhook
```

## Required Events
Selecteer deze events in je Stripe Dashboard webhook configuratie:

- `payment_intent.succeeded` - Voor credit aankopen
- `checkout.session.completed` - Voor marketplace orders  
- `payment_intent.amount_capturable_updated` - Voor marketplace betalingen
- `payment_intent.canceled` - Voor geannuleerde betalingen
- `charge.dispute.created` - Voor disputen
- `charge.dispute.closed` - Voor gesloten disputen
- `account.updated` - Voor account updates

## Webhook Secret
Na het aanmaken van de webhook in Stripe Dashboard, kopieer de 'Signing secret' en voeg deze toe aan je environment variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Testing
Test de webhook door een credit aankoop te doen en te controleren of de credits worden bijgewerkt in de database.

## Steps to Setup:

1. Ga naar je [Stripe Dashboard](https://dashboard.stripe.com/)
2. Klik op "Developers" > "Webhooks"
3. Klik op "Add endpoint"
4. Voer de webhook URL in
5. Selecteer de bovenstaande events
6. Klik op "Add endpoint"
7. Kopieer de "Signing secret" 
8. Voeg deze toe aan je Vercel environment variables als `STRIPE_WEBHOOK_SECRET`
9. Redeploy je applicatie


## Testing the Webhook

Na het instellen van de webhook kun je testen of alles werkt:

1. **Test Endpoint**: Bezoek `https://jouw-vercel-deployment-url.vercel.app/api/stripe/webhook/test` om te controleren of de database verbinding werkt.

2. **Stripe Dashboard**: Ga naar je Stripe Dashboard > Developers > Webhooks en klik op je webhook endpoint. Klik op "Send test event" en selecteer `payment_intent.succeeded`.

3. **Credit Aankoop Testen**: 
   - Doe een echte credit aankoop op je website
   - Controleer of de credits worden bijgewerkt in de database
   - Controleer of de teller in de header wordt bijgewerkt

4. **Logs Controleren**: Check de Vercel logs voor webhook events:
   ```
   [stripe/webhook] Received event: payment_intent.succeeded
   Credits topped up: +10 for user xxx (new balance: 10)
   ```

## Troubleshooting

- **Webhook niet ontvangen**: Controleer of de URL correct is en of alle events zijn geselecteerd
- **Credits niet bijgewerkt**: Controleer of de `STRIPE_WEBHOOK_SECRET` correct is ingesteld
- **Database fouten**: Controleer of de `SUPABASE_SERVICE_ROLE_KEY` correct is
- **Header niet bijgewerkt**: Dit gebeurt automatisch elke 30 seconden, of refresh de pagina

