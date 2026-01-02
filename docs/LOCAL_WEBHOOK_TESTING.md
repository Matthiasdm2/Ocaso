# Lokale Webhook Testing

## Probleem

Stripe webhooks werken **niet automatisch** lokaal omdat:
- Stripe kan niet naar `localhost` of `127.0.0.1` webhooks sturen
- Je lokale server is niet bereikbaar vanaf het internet
- Webhooks worden alleen getriggerd na echte checkout completion

## Oplossingen

### Oplossing 1: Stripe CLI (Aanbevolen) ✅

De Stripe CLI kan webhook events naar je lokale server forwarden.

#### Installatie
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Of download van: https://stripe.com/docs/stripe-cli
```

#### Gebruik
```bash
# 1. Login met Stripe CLI
stripe login

# 2. Forward webhooks naar je lokale server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 3. In een andere terminal, start je Next.js server
npm run dev

# 4. Trigger test events
stripe trigger checkout.session.completed
```

#### Test Subscription Webhook
```bash
# Trigger een test subscription checkout
stripe trigger checkout.session.completed \
  --add checkout.session.metadata.userId=YOUR_USER_ID \
  --add checkout.session.metadata.plan=basic \
  --add checkout.session.metadata.billing=monthly
```

### Oplossing 2: ngrok (Alternatief)

ngrok maakt je lokale server bereikbaar via een publieke URL.

#### Installatie
```bash
brew install ngrok
# Of download van: https://ngrok.com/
```

#### Gebruik
```bash
# 1. Start ngrok tunnel
ngrok http 3000

# 2. Kopieer de HTTPS URL (bijv. https://abc123.ngrok.io)

# 3. Configureer webhook in Stripe Dashboard:
#    - URL: https://abc123.ngrok.io/api/stripe/webhook
#    - Events: checkout.session.completed, payment_intent.succeeded

# 4. Start je Next.js server
npm run dev

# 5. Test checkout flow - webhooks worden nu naar je lokale server gestuurd
```

### Oplossing 3: Manual Test (Voor Quick Tests)

Voor snelle tests kun je de webhook handmatig simuleren:

```bash
# Gebruik het test script
node scripts/test-subscription-real-flow.mjs
```

Dit simuleert de webhook update zonder Stripe.

### Oplossing 4: Test Mode in Stripe Dashboard

1. Ga naar Stripe Dashboard → Developers → Webhooks
2. Klik op "Add endpoint"
3. Gebruik ngrok URL of Stripe CLI webhook forwarding
4. Selecteer events: `checkout.session.completed`, `payment_intent.succeeded`
5. Test met test mode checkout

## Aanbevolen Workflow

### Voor Development:
1. **Gebruik Stripe CLI** voor automatische webhook forwarding
2. Test checkout flow lokaal
3. Webhooks worden automatisch doorgestuurd

### Voor Quick Tests:
1. **Gebruik test scripts** om webhook te simuleren
2. Verifieer database state
3. Test profielpagina logica

### Voor Production Testing:
1. **Gebruik Stripe Test Mode** met ngrok
2. Test volledige flow end-to-end
3. Check webhook logs in Stripe Dashboard

## Troubleshooting

### Webhook wordt niet getriggerd
- ✅ Check of Stripe CLI draait: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- ✅ Check of Next.js server draait op poort 3000
- ✅ Check webhook URL in Stripe Dashboard

### Webhook signature verification failed
- ✅ Check `STRIPE_WEBHOOK_SECRET` environment variable
- ✅ Gebruik de webhook secret van Stripe CLI: `stripe listen --print-secret`
- ✅ Zet deze in je `.env.local` als `STRIPE_WEBHOOK_SECRET`

### Subscription wordt niet geactiveerd
- ✅ Check webhook logs in Stripe Dashboard
- ✅ Check server logs voor errors
- ✅ Verifieer dat metadata correct is (userId, plan, billing)
- ✅ Check database state met test script

## Quick Start

```bash
# Terminal 1: Start Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 2: Start Next.js
npm run dev

# Terminal 3: Test webhook
stripe trigger checkout.session.completed \
  --add checkout.session.metadata.userId=YOUR_USER_ID \
  --add checkout.session.metadata.plan=basic \
  --add checkout.session.metadata.billing=monthly
```

## Conclusie

**Ja, het is normaal dat webhooks lokaal niet automatisch werken.** Je hebt een van deze tools nodig:
- ✅ **Stripe CLI** (aanbevolen voor development)
- ✅ **ngrok** (voor publieke URL)
- ✅ **Test scripts** (voor quick tests zonder Stripe)

Zonder deze tools kun je alleen de checkout flow testen, maar niet de webhook die de subscription activeert.

