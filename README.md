# Project DAGYAW

**Team Smart Dito sa Globe (SDG)**  
Developers: Dexter Jethro Enriquez, Carl Jacob Landicho, Charles Daniel Quinto

---

## 🏙️ Project Overview

DAGYAW is a community-driven urban sustainability platform that bridges the **"Invisibility Gap"** between citizens and local government units (LGUs). By transforming subjective reports into objective data, DAGYAW creates a transparent accountability loop for resolving environmental and infrastructural issues.

---

## ✨ Key Features

### 🔁 The 70/30 Consensus Loop

Issues only reach a "Resolved" state if **67% of the community upvotes the fix** within 3 days.

$$
\text{Status = Green if } \frac{\text{Upvotes}}{\text{Total Votes}} \geq 0.67
$$

### 📊 Watch Mode Dashboard

A specialized LGU interface with **AI provided insights** to surface the most critical issues.

### 🌐 External Data Enrichment

Reports are automatically overlaid with real-time hazard data (IQAir, and more) to provide context-aware impact scoring.

---

## 🛠️ Tech Stack & APIs

| Layer        | Technology                                                    |
| ------------ | ------------------------------------------------------------- |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion |
| **Backend**  | Supabase (PostgreSQL, Auth, Realtime, Edge Functions)         |
| **Mapping**  | React Leaflet                                                 |

### External APIs

| API                        | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| **Claude API (Anthropic)** | AI prioritization logic and statistical analysis       |
| **IQAir Visual API**       | Real-time PM2.5 and CO2 levels for pollution reporting |
| **Open-Meteo**             | Real-time rain and weather forecast data               |
| **GROQ API**               | Free and fast user fed LLM in terms of data processing |

---

## 🤖 Generative AI Disclosure

In compliance with **Mechanics #6**, this project utilized Generative AI as a **"co-pilot"**. While AI assisted in heavy lifting, the developers maintained absolute control over the project scope, technical limitations, and final architectural decisions.

**Tools Used:** Claude 4.6 Opus, GPT 5.3 Codex, Gemini 3.1 Pro

### Sample Responsible Prompts

Below are examples of how AI was moderated to ensure it functioned as a **tool, not a replacement** for developer logic:

#### 1. "Superpowers" for Brainstorming

> _"Act as a Smart City consultant. Given a list of urban categories like 'Illegal Dumping' and 'Broken Streetlights,' brainstorm 5 high-impact external data points (e.g., population density, flood risk) we can use to generate a 'Priority Score' for LGUs. Focus on the Philippine context."_

#### 2. API Map Interface Implementation

> _"Help me draft a TypeScript function to fetch real-time flood data from the Open-Meteo API and map it to a Leaflet GeoJSON layer. Ensure the pins change color based on the hazard level (Low/Medium/High) to stay consistent with our Red/Yellow/Green UI."_

#### 3. Fixing UI Alignment Issues

> _"In my Tailwind CSS dashboard, the 'Priority Queue' list is overflowing the parent container on mobile. Refine the Flexbox logic to ensure the cards stack properly without breaking the municipality header alignment."_

#### 4. Creating Process Documentation

> _"Generate a technical design document for a 'Watch Mode' resolution system. I need a state machine description for how a pin moves from Active to Pending to Resolved based on a 67% community vote threshold."_

#### 5. Notification System Architecture

> _"Design a Supabase Edge Function that triggers a web push notification whenever a pin in a user's 'municipality of interest' is marked as Pending Resolution. Only notify users who have opted into that specific category (e.g., 'SDG 7 - Energy')."_

---

## 🚀 Setup & Installation

1. **Clone the repo**

   ```bash
   git clone [Blue Hacks Repository URL]
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory and add your Supabase and API keys:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   IQAIR_API_KEY=your_iqair_key
   GROQ_API_KEY=your_groq_key
   # ...and other keys
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

---

> **Team SDG — Smart Dito sa Globe.**  
> Taking Smart technology and applying it _Dito_ sa Globe to solve the SDGs.
