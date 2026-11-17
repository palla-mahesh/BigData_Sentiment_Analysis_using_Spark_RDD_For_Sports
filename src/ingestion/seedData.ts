import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  analysisJobs,
  analyticsSnapshots,
  aspects,
  auditLogs,
  comments,
  dataSources,
  emotionResults,
  keywords,
  sentimentResults,
  sports,
} from '../db/schema.ts';
import { ensureBaseRoles } from '../db/users.ts';
import { runSparkRddSentimentPipeline } from '../spark/rddPipeline.ts';

export const SPORTS_CATALOG = [
  {
    slug: 'cricket',
    name: 'Cricket',
    category: 'Bat & Ball',
    description: 'International Tests, ODIs, T20 leagues, death-over bowling, and captaincy tactics.',
    imagePath: '/src/assets/images/sport_cricket_arena_1794930557217.jpg',
    accentColor: '#3B82F6',
  },
  {
    slug: 'football',
    name: 'Football',
    category: 'Association',
    description: 'Global club competitions, tactical pressing, xG conversion, VAR calls, and clean sheets.',
    imagePath: '/src/assets/images/sport_football_pitch_1794930557270.jpg',
    accentColor: '#10B981',
  },
  {
    slug: 'basketball',
    name: 'Basketball',
    category: 'Court Sports',
    description: 'Playoff series, clutch fourth-quarter shooting, perimeter defense, and coaching rotations.',
    imagePath: '/src/assets/images/sport_basketball_court_1794930557870.jpg',
    accentColor: '#06B6D4',
  },
  {
    slug: 'tennis',
    name: 'Tennis',
    category: 'Racquet Sports',
    description: 'Grand Slam five-setters, first-serve velocity, break-point conversions, and mental resilience.',
    imagePath: '/src/assets/images/sport_tennis_court_1794930558053.jpg',
    accentColor: '#8B5CF6',
  },
  {
    slug: 'hockey',
    name: 'Hockey',
    category: 'Turf & Ice',
    description: 'Penalty corner execution, goalkeeper reflexes, midfield transitions, and tournament grit.',
    imagePath: '/src/assets/images/sport_hockey_turf_1794930559162.jpg',
    accentColor: '#0EA5E9',
  },
  {
    slug: 'formula-1',
    name: 'Formula 1',
    category: 'Motorsport',
    description: 'Qualifying pace, pit-wall undercut strategy, tire degradation, and telemetry reliability.',
    imagePath: '/src/assets/images/sport_formula1_circuit_1794930559442.jpg',
    accentColor: '#EF4444',
  },
  {
    slug: 'kabaddi',
    name: 'Kabaddi',
    category: 'Contact & Raid',
    description: 'Super raids, ankle holds, do-or-die raid strategy, and mat defensive coordination.',
    imagePath: '/src/assets/images/sport_kabaddi_mat_1794930558516.jpg',
    accentColor: '#F59E0B',
  },
  {
    slug: 'esports',
    name: 'Esports',
    category: 'Competitive Gaming',
    description: 'Championship LAN stages, draft synergy, macro objective control, and clutch plays.',
    imagePath: '/src/assets/images/sport_esports_stage_1794930559626.jpg',
    accentColor: '#22D3EE',
  },
];

export const DATA_SOURCES_CATALOG = [
  {
    slug: 'academic-demo-corpus',
    name: 'Academic Demo Corpus (Labeled)',
    providerType: 'DEMO_CORPUS',
    isDemo: true,
    isEnabled: true,
    configNotes: 'Curated multi-sport benchmark corpus for Big Data Tools & Techniques (5CSE24) validation.',
  },
  {
    slug: 'manual-entry',
    name: 'Manual Comment Analyzer',
    providerType: 'MANUAL',
    isDemo: false,
    isEnabled: true,
    configNotes: 'Direct analyst input processed in real time via Spark RDD pipeline.',
  },
  {
    slug: 'csv-upload',
    name: 'CSV Batch Ingestion',
    providerType: 'CSV',
    isDemo: false,
    isEnabled: true,
    configNotes: 'Structured CSV comment datasets uploaded by analysts.',
  },
  {
    slug: 'txt-upload',
    name: 'TXT Corpus Ingestion',
    providerType: 'TXT',
    isDemo: false,
    isEnabled: true,
    configNotes: 'Line-delimited raw sports commentary files.',
  },
  {
    slug: 'youtube-sports-adapter',
    name: 'YouTube Sports Comments Adapter',
    providerType: 'YOUTUBE_API',
    isDemo: true,
    isEnabled: Boolean(process.env.YOUTUBE_API_KEY),
    configNotes: process.env.YOUTUBE_API_KEY
      ? 'Authorized via YOUTUBE_API_KEY environment variable.'
      : 'Requires YOUTUBE_API_KEY in environment variables; falls back to CSV/demo ingestion.',
  },
  {
    slug: 'reddit-sports-adapter',
    name: 'Reddit Match Threads Adapter',
    providerType: 'REDDIT_API',
    isDemo: true,
    isEnabled: Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
    configNotes:
      process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
        ? 'Authorized via REDDIT_CLIENT_ID environment variable.'
        : 'Requires REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET; falls back to CSV/demo ingestion.',
  },
];

const SEED_COMMENTS_BY_SPORT: Record<string, string[]> = {
  cricket: [
    'Unbelievable death bowling yorker spell! The captain strategy and execution were a complete masterclass!',
    'Brilliant unbeaten century under immense pressure, our batting performance looked unstoppable today!',
    'Heartbreaking middle-order collapse after a solid start, terrible shot selection cost us the match.',
    'Sloppy fielding and dropped catches ruined a strong bowling effort; very frustrating loss.',
    'Superb coaching decisions in the powerplay gave the squad a historic victory over the champions.',
    'The DRS strategy call was smart and clinical, turning the match result into a thrilling comeback!',
    'Worried about our fragile pace attack and injury concerns ahead of the semifinal.',
    'Steady opening partnership and disciplined bowling kept the run rate balanced throughout the session.',
    'Awful team selection and clueless batting against spin led to an embarrassing defeat.',
    'Electric crowd atmosphere and fearless finishing with towering sixes made it a joyful win!',
    'The pitch behaved fairly evenly, giving both bowlers and batters a balanced contest today.',
    'Shocked by the unexpected turnaround in the final over, pure goosebumps watching that victory!',
  ],
  football: [
    'Phenomenal high pressing tactics and a clinical hat-trick secured a dominant clean-sheet victory!',
    'Embarrassing defensive blunder and a careless red card ruined the entire team performance.',
    'The manager substitution strategy changed the tempo completely, leading to a thrilling comeback win!',
    'Frustrating missed penalty and sloppy midfield passing cost our club three vital points.',
    'Goalkeeper made heroic saves under relentless pressure, proud of the resilient squad mentality.',
    'Biased refereeing and terrible VAR mistakes robbed our players of a fair match result.',
    'Balanced possession in the first half with compact defensive shape from both clubs.',
    'Unstoppable counter-attacking speed and razor-sharp finishing gave fans pure joy tonight!',
    'Disappointing lack of creativity in attack; the coaching plan looked slow and predictable.',
    'Shocked by the last-minute stoppage-time equalizer, an unexpected twist in the title race!',
    'Solid tactical discipline by the back four kept the rival striker quiet all evening.',
    'Painful injury to our star playmaker leaves the team vulnerable before the knockout leg.',
  ],
  basketball: [
    'Clutch buzzer-beater three-pointer to seal a historic playoff victory! Pure MVP performance!',
    'Terrible fourth-quarter collapse with careless turnovers and poor coaching timeout decisions.',
    'Unbelievable rim protection and dominant rebounding from the bench unit won the game.',
    'Exhausted starters looked slow on perimeter defense, resulting in a painful home defeat.',
    'Smart defensive rotation strategy shut down their star shooter in the final two minutes!',
    'Electric alley-oop dunk ignited the arena crowd; incredible team chemistry and joyful energy!',
    'Very anxious watching the final free throws under intense championship pressure.',
    'Both rosters traded buckets evenly through three quarters in a competitive, steady matchup.',
    'Awful shooting efficiency and clueless offensive spacing made it a frustrating night.',
    'Shocking upset victory on the road thanks to fearless rookie scoring and crisp passing!',
    'Clean ball movement and disciplined defense delivered an impressive conference win.',
    'Weak bench production and foul trouble hurt our momentum during the third quarter.',
  ],
  tennis: [
    'Flawless five-set comeback with fearless baseline winners and dominant first-serve velocity!',
    'Heartbreaking double fault on match point after an exhausting four-hour battle.',
    'Clinical tactical precision at the net and smart return strategy dismantled the top seed.',
    'Frustrating unforced errors and weak second serves led to an unexpected early exit.',
    'Legend status confirmed! Proud of the resilient champion mentality and historic trophy win!',
    'Very tense tiebreak with nervous moments, stunned by how quickly momentum shifted.',
    'Consistent rally depth and solid footwork kept the opening set tightly balanced.',
    'Disappointing injury retirement cut short what promised to be a thrilling semifinal.',
    'Unbelievable defensive lob and ace under pressure gave the stadium pure goosebumps!',
    'Sloppy court positioning and slow recovery cost control of the deciding break.',
    'Coaching adjustments between sets sparked a brilliant turnaround in return accuracy.',
    'Clean serving hold to love kept the scoreboard steady without drama.',
  ],
  hockey: [
    'Heroic goalkeeper saves and razor-sharp penalty corner execution brought home the gold trophy!',
    'Careless defensive marking and a costly mistake gifted the opponent an easy late goal.',
    'Unstoppable midfield speed and disciplined team structure produced a dominant victory!',
    'Disappointing failure to convert six penalty corners; our finishing strategy needs urgent work.',
    'Thrilling shootout triumph! Pure joy watching our captain lead this fearless squad!',
    'Anxious final five minutes defending a one-goal lead against relentless turf attacks.',
    'Structured passing triangles in midfield maintained steady possession through the third quarter.',
    'Embarrassing discipline lapse and yellow card penalties broke our defensive rhythm.',
    'Brilliant coaching timeout reset our pressing shape and sparked an impressive comeback.',
    'Shocked by the sudden counter-attacking goal against the run of play.',
    'Strong physical conditioning and clean aerial balls controlled the tempo effectively.',
    'Painful defeat in the qualifier despite solid effort from the young forward line.',
  ],
  'formula-1': [
    'Genius pit-wall undercut strategy and flawless tire management secured a dominant Grand Prix win!',
    'Disastrous pitstop blunder and terrible reliability DNF ruined a guaranteed podium finish!',
    'Unbelievable qualifying lap precision and fearless late-braking overtake into the hairpin!',
    'Frustrating strategy error left our driver on worn tires with slow pace and zero grip.',
    'Electric pole position and historic double podium celebration for the constructor team!',
    'Worried about engine overheating and fragile gearbox telemetry ahead of the final stint.',
    'Consistent long-run race pace kept the championship gap steady during the safety car.',
    'Painful puncture on the final lap stole a brilliant victory, truly heartbreaking result.',
    'Shocked by the rookie podium finish in wet conditions, an unforgettable racing twist!',
    'Weak aerodynamic balance in high-speed corners made the car unpredictable all weekend.',
    'Smart wet-weather tire call by the race engineer delivered maximum points.',
    'Clean start off the grid and disciplined defense held off faster cars cleanly.',
  ],
  kabaddi: [
    'Sensational five-point super raid in a do-or-die situation! Unstoppable agility and fearless spirit!',
    'Sloppy ankle-hold attempt and careless defensive errors caused an embarrassing all-out.',
    'Brilliant coaching strategy and high-five defensive synergy sealed a dominant mat victory!',
    'Frustrating raid mistakes in the final minute threw away a comfortable lead.',
    'Thrilling last-second tackle! Pure goosebumps and loud crowd celebration across the arena!',
    'Tense final raid with huge pressure on the young raider to avoid an elimination.',
    'Balanced defensive line and cautious empty raids kept the half-time score close.',
    'Disappointing injury to the lead defender left the left corner vulnerable all night.',
    'Heroic comeback from ten points down showed incredible team resilience and pride!',
    'Weak coordination between cover defenders resulted in a painful defeat.',
    'Clinical bonus-point execution and disciplined clock management secured the match result.',
    'Stunned by the unexpected super tackle that flipped momentum completely!',
  ],
  esports: [
    'Unbelievable clutch ace on the final map! Flawless aim, smart macro strategy, and championship trophy!',
    'Terrible draft choices and clueless objective control led to a disastrous sweep.',
    'Phenomenal team synergy and crisp utility setups dominated the international LAN stage!',
    'Frustrating server lag and careless throw in the deciding round ruined a great run.',
    'Historic reverse-sweep comeback! Pure excitement and pride for the entire roster!',
    'Very nervous watching the overtime retake with zero utility left on site.',
    'Standard default setups and balanced economy trades throughout the opening half.',
    'Embarrassing mechanical mistakes and poor coaching timeout timing cost the series.',
    'Genius flank timing and fearless entry fragging secured an unforgettable upset victory!',
    'Disappointing communication breakdown during crucial late-game baron fights.',
    'Solid macro discipline and clean vision control closed out the match cleanly.',
    'Shocked by the unexpected off-meta pick that completely dismantled the defending champions!',
  ],
};

export async function ensureSeededDatabase() {
  await ensureBaseRoles();

  // Upsert 8 Sports
  for (const sport of SPORTS_CATALOG) {
    await db
      .insert(sports)
      .values(sport)
      .onConflictDoUpdate({
        target: sports.slug,
        set: {
          name: sport.name,
          category: sport.category,
          description: sport.description,
          imagePath: sport.imagePath,
          accentColor: sport.accentColor,
        },
      });
  }

  // Upsert 6 Data Sources
  for (const src of DATA_SOURCES_CATALOG) {
    await db
      .insert(dataSources)
      .values(src)
      .onConflictDoUpdate({
        target: dataSources.slug,
        set: {
          name: src.name,
          providerType: src.providerType,
          isDemo: src.isDemo,
          isEnabled: src.isEnabled,
          configNotes: src.configNotes,
        },
      });
  }

  const [{ value: existingComments }] = await db.select({ value: count() }).from(comments);
  if (Number(existingComments) > 0) {
    return;
  }

  const sportRows = await db.select().from(sports);
  const sourceRows = await db.select().from(dataSources);
  const demoSource = sourceRows.find((s) => s.slug === 'academic-demo-corpus') || sourceRows[0];

  const [seedJob] = await db
    .insert(analysisJobs)
    .values({
      jobUid: `spark-seed-${Date.now()}`,
      sourceId: demoSource.id,
      status: 'RUNNING',
      totalRecords: 96,
      processedRecords: 0,
      rddPartitions: 8,
    })
    .returning();

  const rawBatch = [];
  const now = Date.now();
  let idx = 0;

  for (const sport of sportRows) {
    const texts = SEED_COMMENTS_BY_SPORT[sport.slug] || [];
    for (let t = 0; t < texts.length; t++) {
      // Spread timestamps across last 30 days & recent 24 hours for rich Hours/Days/Weeks/Months trends & heatmaps
      const offsetHours = t < 4 ? t * 3 + (idx % 3) : (t - 3) * 62 + (idx % 12);
      const commentedAt = new Date(now - offsetHours * 3600 * 1000);
      rawBatch.push({
        sportId: sport.id,
        sportSlug: sport.slug,
        authorHandle: `@analyst_${sport.slug.slice(0, 4)}_${t + 1}`,
        rawText: texts[t],
        commentedAt,
      });
      idx++;
    }
  }

  const rddResult = runSparkRddSentimentPipeline(rawBatch, undefined, 8);

  for (const rec of rddResult.records) {
    const [insertedComment] = await db
      .insert(comments)
      .values({
        sportId: rec.sportId,
        sourceId: demoSource.id,
        jobId: seedJob.id,
        authorHandle: rec.authorHandle || '@demo_fan',
        rawText: rec.rawText,
        normalizedText: rec.analysis.normalizedText,
        tokenCount: rec.analysis.tokens.length,
        isDemo: true,
        commentedAt: rec.commentedAt || new Date(),
      })
      .returning();

    await db.insert(sentimentResults).values({
      commentId: insertedComment.id,
      polarity: rec.analysis.polarity,
      score: rec.analysis.score,
      confidence: rec.analysis.confidence,
      matchedTokens: rec.analysis.matchedTokens,
    });

    await db.insert(emotionResults).values({
      commentId: insertedComment.id,
      joy: rec.analysis.emotions.joy,
      anger: rec.analysis.emotions.anger,
      sadness: rec.analysis.emotions.sadness,
      excitement: rec.analysis.emotions.excitement,
      fear: rec.analysis.emotions.fear,
      surprise: rec.analysis.emotions.surprise,
      dominantEmotion: rec.analysis.emotions.dominantEmotion,
    });

    if (rec.analysis.keywords.length > 0) {
      await db.insert(keywords).values(
        rec.analysis.keywords.map((kw) => ({
          commentId: insertedComment.id,
          sportId: rec.sportId,
          keyword: kw.keyword,
          frequency: kw.frequency,
          weight: kw.weight,
          polarity: kw.polarity,
        })),
      );
    }

    if (rec.analysis.aspects.length > 0) {
      await db.insert(aspects).values(
        rec.analysis.aspects.map((asp) => ({
          commentId: insertedComment.id,
          sportId: rec.sportId,
          aspectName: asp.aspectName,
          polarity: asp.polarity,
          score: asp.score,
          confidence: asp.confidence,
        })),
      );
    }
  }

  await db
    .update(analysisJobs)
    .set({
      status: 'COMPLETED',
      totalRecords: rddResult.records.length,
      processedRecords: rddResult.records.length,
      durationMs: rddResult.totalDurationMs,
      stageMetrics: { stages: rddResult.stageMetrics },
      updatedAt: new Date(),
    })
    .where(eq(analysisJobs.id, seedJob.id));

  await db.insert(analyticsSnapshots).values({
    totalComments: rddResult.records.length,
    positiveCount: rddResult.sentimentTotals.POSITIVE,
    negativeCount: rddResult.sentimentTotals.NEGATIVE,
    neutralCount: rddResult.sentimentTotals.NEUTRAL,
    avgScore: Number(
      (
        rddResult.records.reduce((acc, r) => acc + r.analysis.score, 0) /
        Math.max(1, rddResult.records.length)
      ).toFixed(1),
    ),
    dominantEmotion: 'Excitement',
    topKeyword: rddResult.keywordFrequencies[0]?.keyword || 'victory',
  });

  await db.insert(auditLogs).values({
    actorEmail: 'system',
    action: 'SEED_ACADEMIC_CORPUS',
    resourceType: 'analysis_jobs',
    resourceId: seedJob.jobUid,
    details: {
      records: rddResult.records.length,
      partitions: rddResult.partitions,
      durationMs: rddResult.totalDurationMs,
    },
  });
}
