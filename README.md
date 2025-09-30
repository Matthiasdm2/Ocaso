# 🏪 Ocaso Marketplace Platform

Een moderne, full-stack marketplace platform gebouwd met Next.js en Supabase.

## ✨ Features

### 🛒 Marketplace

- **Product Listings**: Uitgebreide productpagina's met fotogalerij
- **Geavanceerd Zoeken**: Zoeken op categorie, locatie, prijs en meer
- **Favorieten Systeem**: Gebruikers kunnen producten opslaan
- **Geo-locatie**: Zoeken binnen een bepaalde radius
- **Reviews & Ratings**: Beoordeling systeem voor verkopers en producten

### 💬 Communicatie

- **Real-time Chat**: Berichten tussen kopers en verkopers
- **Notificaties**: Live updates voor nieuwe berichten en activiteiten
- **Gesprek Management**: Georganiseerde chatoverzichten

### 👥 Gebruikersbeheer

- **User Profielen**: Persoonlijke profielen met avatar upload
- **Business Profielen**: Zakelijke accounts met branding
- **Authenticatie**: Veilige inlog via Supabase Auth
- **Privacy**: GDPR-compliant met cookie consent management

### 🔧 Technische Features

- **Next.js 14**: Met App Router en Server Components
- **TypeScript**: Volledige type-safety
- **Supabase**: Backend-as-a-Service met real-time functies
- **Tailwind CSS**: Modern, responsive design
- **Image Processing**: Upload en crop functionaliteit
- **Database Migraties**: Versioned schema management

## 🚀 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Deployment**: Vercel/Netlify ready
- **Database**: PostgreSQL met Row Level Security
- **File Upload**: Supabase Storage
- **Real-time**: Supabase Real-time subscriptions

## 📦 Installation

1. **Clone het repository**

   ```bash
   git clone https://github.com/Matthiasdm2/Ocaso.git
   cd Ocaso
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment variabelen**

   ```bash
   cp .env.example .env.local
   ```

   Vul de volgende variabelen in:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Database setup**

   ```bash
   # Run database migrations
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

Het platform gebruikt een uitgebreide database schema met:

- **profiles**: Gebruiker profielen (persoonlijk + zakelijk)
- **listings**: Product advertenties
- **conversations**: Chat gesprekken
- **messages**: Chat berichten
- **reviews**: Beoordelingen
- **favorites**: Opgeslagen producten
- **categories**: Product categorieën

Zie `/docs/database-schema.md` voor gedetailleerde schema informatie.

## 🚀 Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Add environment variables
3. Deploy!

### Manual Deployment

1. Build het project:

   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── marketplace/       # Marketplace pages
│   ├── profile/          # User profile pages
│   └── business/         # Business profile pages
├── components/            # Reusable UI components
├── lib/                   # Utility functions & hooks
├── supabase/             # Database migrations & config
│   ├── migrations/       # Database schema migrations
│   └── sql/             # Helper SQL scripts
├── scripts/              # Build & utility scripts
├── types/               # TypeScript type definitions
└── public/             # Static assets
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript check

## 🤝 Contributing

1. Fork het project
2. Create een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push naar branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📝 License

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 🎯 Status

- ✅ Core marketplace functionaliteit
- ✅ User authentication & profiles
- ✅ Real-time chat systeem
- ✅ Business profiles & reviews
- ✅ Image upload & processing
- 🔄 Mobile app (in ontwikkeling)
- 🔄 Payment integration (geplanned)
- 🔄 Advanced analytics (geplanned)

## 📧 Contact

Voor vragen of ondersteuning, neem contact op via [GitHub Issues](https://github.com/Matthiasdm2/Ocaso/issues).

---

**Gebouwd met ❤️ door het Ocaso team**
