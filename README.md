# SportsPulse RDD — Big Data Sentiment Analysis for Sports Using Apache Spark RDD

**Academic Mini-Project**
- **Subject**: Big Data Tools and Techniques
- **Section**: 5CSE24
- **Team Members**:
  1. P Komal Kumar
  2. P V Mahesh
  3. P Sresti Rahul
  4. P Ravi Sankar
  5. P Kiran Kumar

## Architecture Overview

1. **Live Full-Stack Web Platform (Port 3000)**
   - **Frontend**: React 19, TypeScript, Tailwind CSS v4, Three.js WebGL (3D Sports Globe, Sentiment Spheres, 3D Comparison Bars), Recharts & Apache ECharts (12 synchronized visualizations), jsPDF & SheetJS (CSV/PDF/Excel exports).
   - **Backend**: Express REST API (`server.ts`) with Firebase Admin ID token verification, Role-Based Access Control (`ADMIN`, `ANALYST`, `USER`), Server-Sent Events (`/api/stream/jobs`), and a partitioned MapReduce/RDD pipeline (`src/spark/rddPipeline.ts`) implementing `filter()`, `map()`, `flatMap()`, `mapToPair()`, `reduceByKey()`, `groupByKey()`, `cache()`, `count()`, and `collect()`.
   - **NLP Engine**: Deterministic sports lexicon & rule engine (`src/nlp/sportsLexicon.ts`) with negation-window inversion, degree intensifiers, 6-emotion scoring, keyword extraction, and 6-aspect sentiment scoring.
   - **Database**: Cloud SQL PostgreSQL with 12 relational tables managed via Drizzle ORM (`src/db/schema.ts`).

2. **Academic Java 21 + Spring Boot + Apache Spark RDD Codebase**
   - Full Maven, `SparkSentimentRDDService.java` (`JavaRDD`), `DeterministicSportsNlpService.java`, `AnalyticsController.java`, Flyway SQL migrations, JUnit 5 RDD tests, and `docker-compose.yml` available inside the **Admin & Spark Code** explorer in the UI and in `src/academic/javaSparkBundle.ts`.

## Supported Sports
Cricket · Football · Basketball · Tennis · Hockey · Formula 1 · Kabaddi · Esports

## Environment Variables
See `.env.example` for optional external connector credentials (`YOUTUBE_API_KEY`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`). Cloud SQL runtime credentials (`SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`) are injected automatically by the platform.
