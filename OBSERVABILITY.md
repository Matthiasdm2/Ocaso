# OBSERVABILITY.md

## Observability voor OCASO Platform

### Health Checks
- **Endpoint**: `GET /api/health`
- **Checks**:
  - Database connectivity (Supabase)
  - Required environment variables
  - System uptime
- **Response Codes**:
  - 200: Healthy
  - 503: Unhealthy (database down, missing env vars)

### Structured Logging
- **Format**: JSON met correlation ID
- **Levels**: INFO, WARN, ERROR, AUDIT
- **Context Fields**:
  - `requestId`: Unique request identifier
  - `userId`: Authenticated user ID (if available)
  - `ip`: Client IP address
  - `userAgent`: User agent string
  - `url`: Request URL
  - `method`: HTTP method
  - `action`: Specific action being performed

### Error Logging Locations
- **Authentication**: Login attempts, session issues
- **Payments**: Stripe webhook failures, payment processing errors
- **Subscriptions**: Plan changes, entitlement checks, gating failures
- **Database**: Query failures, connection issues
- **External APIs**: Stripe API errors, Supabase errors
- **Security**: Rate limit hits, authorization failures

### Audit Logging
- **Admin Actions**: All platform_admin operations
- **Security Events**: Failed authentications, suspicious activity
- **Data Changes**: User data modifications, subscription changes
- **Business Events**: Payment completions, subscription activations

### Monitoring Alerts (Future Implementation)
- **System Health**: Health check failures
- **Error Rates**: >5% error rate over 5 minutes
- **Performance**: Response times >2 seconds
- **Security**: Multiple failed login attempts
- **Business**: Payment failures, subscription cancellations

### Log Retention
- **Application Logs**: 30 dagen
- **Audit Logs**: 7 jaar (GDPR compliance)
- **Security Logs**: 1 jaar minimum

### Log Analysis
- **Tools**: Vercel Analytics, custom log aggregation
- **Dashboards**: Error rates, user activity, system performance
- **Alerts**: Automated notifications voor critical issues

### Correlation IDs
- **Generation**: UUID voor elke incoming request
- **Propagation**: Door alle service calls en async operations
- **Usage**: Request tracing, debugging, support

### Performance Monitoring
- **Metrics**: Response times, throughput, error rates
- **Thresholds**: P95 < 500ms, P99 < 2s
- **Tracking**: Per endpoint, per user type

### Business Metrics Logging
- **User Activity**: Registrations, logins, listings created
- **Commerce**: Payments processed, subscriptions activated
- **Engagement**: Messages sent, listings viewed
- **Retention**: User return rates, subscription renewals

### Incident Response
- **Detection**: Automated alerts via monitoring
- **Investigation**: Correlation IDs voor request tracing
- **Resolution**: Structured logs voor root cause analysis
- **Prevention**: Log analysis voor improvement identification

### Development Observability
- **Local Development**: Console logging met structured format
- **Testing**: Log capture in test suites
- **Debugging**: Request tracing voor development issues

### Compliance Logging
- **GDPR**: Data access/modification logging
- **Security**: All security-relevant events
- **Audit**: Business-critical operations
- **Retention**: Compliant met legal requirements
