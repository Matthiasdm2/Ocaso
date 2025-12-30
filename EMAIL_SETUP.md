# EMAIL_SETUP.md

## Email Setup voor OCASO Platform

### Email Provider Interface
- **Interface**: `EmailProvider` in `/v4/lib/email/templates.ts`
- **Current Implementation**: Placeholder provider (console logging)
- **Production Ready**: Interface allows easy swap to SendGrid, Mailgun, etc.

### Transactionele Email Templates

#### Email Confirmation
- **Trigger**: User registration
- **Template**: `createEmailConfirmTemplate(confirmUrl)`
- **Content**: Welcome message, confirmation link (24h expiry)
- **Variables**: `confirmUrl`

#### Password Reset
- **Trigger**: Password reset request
- **Template**: `createPasswordResetTemplate(resetUrl)`
- **Content**: Reset instructions, secure link (1h expiry)
- **Variables**: `resetUrl`

#### Payment Success
- **Trigger**: Successful payment via Stripe
- **Template**: `createPaymentSuccessTemplate(amount, description)`
- **Content**: Payment confirmation, amount, description
- **Variables**: `amount`, `description`

#### Subscription Changes
- **Trigger**: Subscription created/updated/cancelled
- **Template**: `createSubscriptionChangedTemplate(planName, status)`
- **Content**: Subscription details, status update
- **Variables**: `planName`, `status`

#### Chat Notifications (Optional)
- **Trigger**: New chat message received
- **Template**: `createChatNotificationTemplate(senderName, listingTitle, messagePreview)`
- **Content**: Message preview, link to conversation
- **Variables**: `senderName`, `listingTitle`, `messagePreview`

### Email Sending Integration Points
- **Authentication**: Supabase Auth webhooks (confirmation, password reset)
- **Payments**: Stripe webhook success handlers
- **Subscriptions**: Subscription lifecycle events
- **Chat**: Message creation (optional, configurable per user)

### SPF/DKIM/DMARC Setup

#### SPF (Sender Policy Framework)
```
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```
- **Purpose**: Prevent email spoofing
- **DNS Record**: TXT record op ocaso.be
- **Includes**: Google Workspace, SendGrid (of gekozen provider)

#### DKIM (DomainKeys Identified Mail)
```
Key: [Provider-generated DKIM key]
Selector: [Provider-specific selector, e.g. s1, s2]
```
- **Purpose**: Email authentication via cryptographic signature
- **DNS Record**: TXT record op [selector]._domainkey.ocaso.be
- **Management**: Provider dashboard (SendGrid, Mailgun, etc.)

#### DMARC (Domain-based Message Authentication)
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@ocaso.be; ruf=mailto:dmarc@ocaso.be; fo=1
```
- **Purpose**: Email authentication policy and reporting
- **DNS Record**: TXT record op _dmarc.ocaso.be
- **Policy**: `quarantine` (mark suspicious emails)
- **Reporting**: Daily aggregate reports to dmarc@ocaso.be

### Email Deliverability Best Practices
- **From Address**: noreply@ocaso.be of info@ocaso.be
- **Reply-To**: support@ocaso.be
- **Unsubscribe**: Include unsubscribe links for marketing emails
- **Plain Text**: Always include plain text version
- **Mobile Optimization**: Responsive HTML templates
- **Link Tracking**: UTM parameters voor analytics

### Email Analytics & Monitoring
- **Delivery Rates**: Track bounce rates, spam complaints
- **Open Rates**: Monitor engagement
- **Click Rates**: Track link performance
- **Unsubscribe Rates**: Monitor list quality
- **Spam Complaints**: Maintain low complaint rates (<0.1%)

### Anti-Spam Compliance
- **CAN-SPAM**: US compliance voor commercial emails
- **CASL**: Canadian anti-spam legislation
- **GDPR**: Consent-based email marketing
- **Physical Address**: Include business address in footers
- **Unsubscribe**: Easy unsubscribe mechanism

### Email Security
- **Encryption**: TLS encryption voor transmission
- **Authentication**: SPF/DKIM/DMARC implementation
- **Link Security**: Short-lived tokens, no sensitive data in URLs
- **Rate Limiting**: Prevent email abuse
- **Monitoring**: Alert on unusual email patterns

### Implementation Steps for Production
1. **Choose Provider**: SendGrid, Mailgun, Amazon SES, etc.
2. **Domain Verification**: Verify domain ownership
3. **DNS Records**: Add SPF, DKIM, DMARC records
4. **API Integration**: Replace placeholder provider
5. **Template Testing**: Test all templates across email clients
6. **Deliverability Testing**: Use tools like Mail-Tester, GlockApps
7. **Monitoring Setup**: Configure delivery monitoring
8. **Compliance Review**: Legal review van templates

### Testing Checklist
- [ ] Templates render correctly in Gmail, Outlook, Apple Mail
- [ ] Links work and are secure
- [ ] Unsubscribe links functional
- [ ] Plain text versions readable
- [ ] Mobile responsive design
- [ ] SPF/DKIM/DMARC records valid
- [ ] Domain reputation good
- [ ] IP warming completed

### Support Contacts
- **Email Provider Support**: [Provider contact]
- **Deliverability Issues**: Check provider dashboard
- **DNS Issues**: Contact domain registrar
- **Compliance Questions**: Legal team
