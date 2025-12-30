# SECURITY_AND_GDPR.md

## Security & GDPR Compliance voor OCASO

### Security Principles
- **Defense in Depth**: Meerdere lagen van bescherming
- **Zero Trust**: Geen impliciete vertrouwen
- **Least Privilege**: Minimale rechten per rol
- **Fail Safe**: Standaard weigeren bij fouten
- **Audit Everything**: Alle acties gelogd

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication
- **Session Management**: Secure cookies (httpOnly, secure, sameSite)
- **Role-Based Access Control (RBAC)**:
  - `buyer`: Basis marketplace toegang
  - `seller`: Listing management + B2C features
  - `org_member`: Organisatie-specifieke seller rechten
  - `org_admin`: Organisatie beheer
  - `moderator`: Content moderatie
  - `platform_admin`: Volledige systeem toegang
- **Row Level Security (RLS)**: Database-level access control

### Data Protection
- **Encryption**: Data at rest encrypted via Supabase
- **HTTPS Only**: Alle communicatie encrypted
- **Input Validation**: Server-side validatie op alle inputs
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **XSS Prevention**: CSP headers + input sanitization

### GDPR Compliance
- **Legal Basis**: Contractuele noodzaak voor marketplace, toestemming voor marketing
- **Data Minimization**: Alleen noodzakelijke data verzameld
- **Purpose Limitation**: Data alleen gebruikt voor opgegeven doelen
- **Storage Limitation**: Data bewaard zolang noodzakelijk
- **Data Subject Rights**:
  - Recht op inzage
  - Recht op rectificatie
  - Recht op verwijdering
  - Recht op beperking verwerking
  - Recht op overdraagbaarheid
  - Recht van bezwaar
- **Data Protection Officer**: [Contact opnemen voor DPO]
- **Data Breach Notification**: Binnen 72 uur bij breaches
- **Privacy by Design**: Privacy considerations in alle systemen

### Security Headers (Implemented)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: [Comprehensive CSP]
Access-Control-Allow-Origin: https://ocaso.be (production)
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
```

### Rate Limiting
- **Authentication**: 5 attempts per 15 minuten
- **API Calls**: 100 requests per minuut
- **Chat Messages**: 30 berichten per minuut
- **QR Generation**: 10 requests per minuut
- **Implementation**: In-memory voor development, Vercel KV voor production

### Audit Logging
- **Admin Actions**: Alle admin operaties gelogd met context
- **Security Events**: Failed logins, rate limit hits, suspicious activity
- **Data Changes**: Belangrijke data wijzigingen getraceerd
- **Retention**: Audit logs 7 jaar bewaard

### Incident Response
- **Detection**: Monitoring via health checks en error logging
- **Response**: Gedefinieerde procedures voor security incidents
- **Recovery**: Backup en restore procedures
- **Communication**: Transparante communicatie bij breaches

### Third-Party Security
- **Stripe**: PCI DSS compliant payment processing
- **Supabase**: SOC 2 Type II compliant
- **Vercel**: Enterprise-grade hosting security
- **Vendor Assessments**: Jaarlijkse security assessments

### Employee Security
- **Access Control**: Role-based access tot systemen
- **Training**: Jaarlijkse security awareness training
- **Background Checks**: Voor employees met sensitive access
- **Remote Work**: Secure VPN vereist voor remote access

### Compliance Monitoring
- **Regular Audits**: Kwartaalijkse security audits
- **Penetration Testing**: Jaarlijkse externe pentests
- **Vulnerability Scanning**: Wekelijkse automated scans
- **Compliance Reporting**: Maandelijkse compliance rapporten

### Contact
Voor security gerelateerde zaken: security@ocaso.be
Voor GDPR vragen: privacy@ocaso.be
