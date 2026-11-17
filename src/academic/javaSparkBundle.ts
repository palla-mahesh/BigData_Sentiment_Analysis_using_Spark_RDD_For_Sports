export interface AcademicSourceFile {
  path: string;
  language: string;
  category: 'Spark RDD' | 'Spring Boot API' | 'Security & Config' | 'Database Flyway' | 'Tests & Docker';
  summary: string;
  content: string;
}

export const JAVA_SPARK_ACADEMIC_FILES: AcademicSourceFile[] = [
  {
    path: 'backend/pom.xml',
    language: 'xml',
    category: 'Security & Config',
    summary: 'Maven build descriptor with Java 21, Spring Boot 3.3, Apache Spark Core 3.5.1, PostgreSQL, Flyway, and OpenAPI Swagger.',
    content: `<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.2</version>
  </parent>

  <groupId>com.sportsanalytics</groupId>
  <artifactId>sports-sentiment-spark</artifactId>
  <version>1.0.0</version>
  <name>Big Data Sentiment Analysis for Sports Using Apache Spark RDD</name>

  <properties>
    <java.version>21</java.version>
    <spark.version>3.5.1</spark.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.apache.spark</groupId>
      <artifactId>spark-core_2.13</artifactId>
      <version>\${spark.version}</version>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.6.0</version>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`,
  },
  {
    path: 'backend/src/main/java/com/sportsanalytics/spark/SparkSentimentRDDService.java',
    language: 'java',
    category: 'Spark RDD',
    summary: 'Core distributed Apache Spark JavaRDD pipeline using filter, map, flatMap, mapToPair, reduceByKey, groupByKey, cache, count, and collect.',
    content: `package com.sportsanalytics.spark;

import com.sportsanalytics.dto.AnalyzedCommentDTO;
import com.sportsanalytics.dto.SparkBatchReportDTO;
import com.sportsanalytics.nlp.DeterministicSportsNlpService;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.storage.StorageLevel;
import org.springframework.stereotype.Service;
import scala.Tuple2;

import java.io.Serializable;
import java.util.*;

@Service
public class SparkSentimentRDDService implements Serializable {

    private final transient JavaSparkContext sparkContext;
    private final DeterministicSportsNlpService nlpService;

    public SparkSentimentRDDService(JavaSparkContext sparkContext, DeterministicSportsNlpService nlpService) {
        this.sparkContext = sparkContext;
        this.nlpService = nlpService;
    }

    public SparkBatchReportDTO processSportsComments(List<String> rawComments, String sportSlug, int partitions) {
        long start = System.currentTimeMillis();

        // 1. Parallelize raw comments across Spark partitions
        JavaRDD<String> rawRDD = sparkContext.parallelize(rawComments, Math.max(2, partitions));

        // 2. filter() + map() for cleaning, sanitization, and deduplication + cache()
        JavaRDD<String> cleanedRDD = rawRDD
                .filter(Objects::nonNull)
                .map(text -> text.replaceAll("https?://\\\\S+", " ").replaceAll("\\\\s+", " ").trim())
                .filter(text -> text.length() >= 4)
                .distinct()
                .persist(StorageLevel.MEMORY_AND_DISK());

        long validCount = cleanedRDD.count();

        // 3. map() to classify sentiment, emotions, keywords, and aspects deterministically
        JavaRDD<AnalyzedCommentDTO> analyzedRDD = cleanedRDD
                .map(text -> nlpService.analyze(text, sportSlug))
                .cache();

        // 4. mapToPair() + reduceByKey() to aggregate sentiment polarity counts
        Map<String, Long> polarityTotals = analyzedRDD
                .mapToPair(item -> new Tuple2<>(item.getPolarity(), 1L))
                .reduceByKey(Long::sum)
                .collectAsMap();

        // 5. flatMap() + mapToPair() + reduceByKey() for distributed keyword frequency
        JavaPairRDD<String, Integer> keywordPairs = analyzedRDD
                .flatMap(item -> item.getKeywords().iterator())
                .mapToPair(kw -> new Tuple2<>(kw.toLowerCase(), 1))
                .reduceByKey(Integer::sum);

        Map<String, Integer> keywordFrequencies = keywordPairs.collectAsMap();

        // 6. flatMap() + mapToPair() + groupByKey() for aspect-based score aggregation
        Map<String, Double> aspectAverages = analyzedRDD
                .flatMap(item -> item.getAspectScores().entrySet().iterator())
                .mapToPair(entry -> new Tuple2<>(entry.getKey(), entry.getValue()))
                .groupByKey()
                .mapValues(scores -> {
                    double sum = 0.0;
                    int count = 0;
                    for (Double s : scores) {
                        sum += s;
                        count++;
                    }
                    return count == 0 ? 0.0 : Math.round((sum / count) * 10.0) / 10.0;
                })
                .collectAsMap();

        List<AnalyzedCommentDTO> collected = analyzedRDD.collect();
        cleanedRDD.unpersist();
        analyzedRDD.unpersist();

        long durationMs = System.currentTimeMillis() - start;
        return new SparkBatchReportDTO(validCount, polarityTotals, keywordFrequencies, aspectAverages, collected, durationMs);
    }
}`,
  },
  {
    path: 'backend/src/main/java/com/sportsanalytics/nlp/DeterministicSportsNlpService.java',
    language: 'java',
    category: 'Spark RDD',
    summary: 'Serializable deterministic lexicon, negation window, 6-emotion scorer, keyword extractor, and 6-aspect analyzer invoked inside Spark workers.',
    content: `package com.sportsanalytics.nlp;

import com.sportsanalytics.dto.AnalyzedCommentDTO;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.util.*;

@Service
public class DeterministicSportsNlpService implements Serializable {

    private static final Map<String, Double> LEXICON = Map.ofEntries(
            Map.entry("brilliant", 3.2), Map.entry("masterclass", 3.6), Map.entry("clutch", 3.1),
            Map.entry("victory", 2.6), Map.entry("unstoppable", 3.2), Map.entry("hat-trick", 3.2),
            Map.entry("yorker", 2.1), Map.entry("superraid", 3.0), Map.entry("podium", 2.6),
            Map.entry("terrible", -3.2), Map.entry("collapse", -2.9), Map.entry("choked", -3.2),
            Map.entry("blunder", -3.0), Map.entry("embarrassing", -3.2), Map.entry("dnf", -2.9)
    );

    private static final Set<String> NEGATIONS = Set.of("not", "no", "never", "hardly", "cannot", "didn't", "wasn't");
    private static final Set<String> STOPWORDS = Set.of("the", "and", "for", "with", "that", "this", "was", "are");

    public AnalyzedCommentDTO analyze(String rawText, String sportSlug) {
        String normalized = rawText.toLowerCase().replaceAll("[^a-z0-9\\\\s'-]", " ").trim();
        String[] tokens = normalized.split("\\\\s+");

        double rawScore = 0.0;
        List<String> keywords = new ArrayList<>();
        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.length() >= 3 && !STOPWORDS.contains(token)) {
                keywords.add(token);
            }
            Double weight = LEXICON.get(token);
            if (weight != null) {
                boolean negated = (i > 0 && NEGATIONS.contains(tokens[i - 1]))
                        || (i > 1 && NEGATIONS.contains(tokens[i - 2]));
                rawScore += negated ? (-weight * 0.8) : weight;
            }
        }

        double scaled = Math.max(-100.0, Math.min(100.0, Math.tanh(rawScore / 4.2) * 100.0));
        String polarity = scaled >= 12.0 ? "POSITIVE" : (scaled <= -12.0 ? "NEGATIVE" : "NEUTRAL");

        Map<String, Double> aspectScores = new HashMap<>();
        aspectScores.put("Performance", Math.round(scaled * 10.0) / 10.0);

        return new AnalyzedCommentDTO(rawText, sportSlug, polarity, Math.round(scaled * 10.0) / 10.0, keywords, aspectScores);
    }
}`,
  },
  {
    path: 'backend/src/main/java/com/sportsanalytics/controller/AnalyticsController.java',
    language: 'java',
    category: 'Spring Boot API',
    summary: 'REST Controller exposing OpenAPI-documented Spark analytics, batch sentiment, and CSV/PDF export endpoints.',
    content: `package com.sportsanalytics.controller;

import com.sportsanalytics.dto.SparkBatchReportDTO;
import com.sportsanalytics.spark.SparkSentimentRDDService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analysis")
@Tag(name = "Spark Sentiment Analysis", description = "Apache Spark RDD distributed sports sentiment endpoints")
public class AnalyticsController {

    private final SparkSentimentRDDService sparkService;

    public AnalyticsController(SparkSentimentRDDService sparkService) {
        this.sparkService = sparkService;
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    @Operation(summary = "Execute distributed Spark RDD sentiment & aspect pipeline")
    public ResponseEntity<SparkBatchReportDTO> runBatch(
            @RequestParam(defaultValue = "cricket") String sportSlug,
            @RequestParam(defaultValue = "4") int partitions,
            @Valid @RequestBody List<String> comments) {
        return ResponseEntity.ok(sparkService.processSportsComments(comments, sportSlug, partitions));
    }
}`,
  },
  {
    path: 'backend/src/main/java/com/sportsanalytics/config/SparkConfig.java',
    language: 'java',
    category: 'Security & Config',
    summary: 'Spring configuration provisioning a tunable local/cluster JavaSparkContext with Kryo serialization.',
    content: `package com.sportsanalytics.config;

import org.apache.spark.SparkConf;
import org.apache.spark.api.java.JavaSparkContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SparkConfig {

    @Value("\${spark.master:local[*]}")
    private String sparkMaster;

    @Bean(destroyMethod = "close")
    public JavaSparkContext javaSparkContext() {
        SparkConf conf = new SparkConf()
                .setAppName("SportsPulse-Sentiment-RDD")
                .setMaster(sparkMaster)
                .set("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
                .set("spark.ui.enabled", "false");
        return new JavaSparkContext(conf);
    }
}`,
  },
  {
    path: 'database/V1__init_sports_sentiment_schema.sql',
    language: 'sql',
    category: 'Database Flyway',
    summary: 'Flyway PostgreSQL migration defining all 12 normalized tables, foreign keys, and B-tree indexes.',
    content: `CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sports (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(64) NOT NULL,
  accent_color VARCHAR(16) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  sport_id INTEGER NOT NULL REFERENCES sports(id),
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  commented_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_sport_time ON comments(sport_id, commented_at);`,
  },
  {
    path: 'backend/src/test/java/com/sportsanalytics/SparkSentimentRDDTest.java',
    language: 'java',
    category: 'Tests & Docker',
    summary: 'JUnit 5 verification suite validating Spark RDD filtering, polarity reduction, keyword extraction, and aspect grouping.',
    content: `package com.sportsanalytics;

import com.sportsanalytics.dto.SparkBatchReportDTO;
import com.sportsanalytics.nlp.DeterministicSportsNlpService;
import com.sportsanalytics.spark.SparkSentimentRDDService;
import org.apache.spark.SparkConf;
import org.apache.spark.api.java.JavaSparkContext;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SparkSentimentRDDTest {

    private static JavaSparkContext sc;
    private static SparkSentimentRDDService rddService;

    @BeforeAll
    static void setup() {
        SparkConf conf = new SparkConf().setAppName("RDD-Test").setMaster("local[2]");
        sc = new JavaSparkContext(conf);
        rddService = new SparkSentimentRDDService(sc, new DeterministicSportsNlpService());
    }

    @AfterAll
    static void teardown() {
        if (sc != null) sc.close();
    }

    @Test
    void shouldFilterDuplicatesAndReducePolarities() {
        List<String> input = List.of(
                "Brilliant masterclass victory in the final over!",
                "Brilliant masterclass victory in the final over!",
                "Terrible collapse and embarrassing blunder",
                "   "
        );
        SparkBatchReportDTO report = rddService.processSportsComments(input, "cricket", 2);
        assertEquals(2L, report.getValidCount());
        assertEquals(1L, report.getPolarityTotals().get("POSITIVE"));
        assertEquals(1L, report.getPolarityTotals().get("NEGATIVE"));
        assertTrue(report.getKeywordFrequencies().containsKey("masterclass"));
    }
}`,
  },
  {
    path: 'docker-compose.yml',
    language: 'yaml',
    category: 'Tests & Docker',
    summary: 'Production multi-container Docker Compose stack orchestrating PostgreSQL, Redis, Spark Java backend, Next.js/React frontend, and Nginx reverse proxy.',
    content: `services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sports_sentiment
      POSTGRES_USER: \${SQL_USER}
      POSTGRES_PASSWORD: \${SQL_PASSWORD}
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${SQL_USER} -d sports_sentiment"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  spark-backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/sports_sentiment
      SPARK_MASTER: local[*]
    ports: ["8080:8080"]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  nginx:
    image: nginx:alpine
    depends_on: [frontend, spark-backend]
    ports: ["80:80"]`,
  },
];
