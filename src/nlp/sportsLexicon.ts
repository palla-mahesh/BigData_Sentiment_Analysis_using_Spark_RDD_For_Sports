export type SentimentPolarity = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export type EmotionScores = {
  joy: number;
  anger: number;
  sadness: number;
  excitement: number;
  fear: number;
  surprise: number;
  dominantEmotion: string;
};

export type AspectResult = {
  aspectName: 'Teams' | 'Players' | 'Performance' | 'Strategy' | 'Coaching' | 'Match Results';
  polarity: SentimentPolarity;
  score: number;
  confidence: number;
};

export type KeywordResult = {
  keyword: string;
  frequency: number;
  weight: number;
  polarity: SentimentPolarity;
};

export type NlpAnalysisResult = {
  rawText: string;
  normalizedText: string;
  tokens: string[];
  polarity: SentimentPolarity;
  score: number; // -100 to +100
  confidence: number; // 0 to 1
  matchedTokens: string[];
  emotions: EmotionScores;
  keywords: KeywordResult[];
  aspects: AspectResult[];
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'this', 'that', 'these',
  'those', 'it', 'its', 'they', 'them', 'their', 'he', 'she', 'his', 'her', 'we', 'our',
  'you', 'your', 'i', 'me', 'my', 'very', 'really', 'just', 'so', 'too', 'more', 'most',
  'about', 'into', 'over', 'after', 'before', 'during', 'today', 'tonight', 'match', 'game',
  'what', 'when', 'where', 'who', 'which', 'how', 'all', 'any', 'both', 'each', 'some',
  'such', 'than', 'then', 'there', 'here', 'only', 'also', 'well', 'much', 'even',
]);

const NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'hardly', 'barely', 'scarcely',
  'dont', "don't", 'didnt', "didn't", 'wasnt', "wasn't", 'werent', "weren't",
  'isnt', "isn't", 'arent', "aren't", 'cant', "can't", 'cannot', 'couldnt',
  "couldn't", 'wont', "won't", 'wouldnt', "wouldn't", 'lack', 'lacked', 'without',
]);

const INTENSIFIERS: Record<string, number> = {
  absolutely: 1.45,
  incredibly: 1.45,
  unbelievably: 1.5,
  extremely: 1.4,
  utterly: 1.4,
  totally: 1.3,
  completely: 1.35,
  truly: 1.25,
  massively: 1.35,
  insanely: 1.4,
  really: 1.2,
  very: 1.2,
  super: 1.25,
  slightly: 0.6,
  somewhat: 0.65,
  mildly: 0.6,
};

const SENTIMENT_LEXICON: Record<string, number> = {
  // Core positive
  brilliant: 3.2,
  outstanding: 3.3,
  phenomenal: 3.5,
  masterclass: 3.6,
  incredible: 3.1,
  unbelievable: 2.9,
  amazing: 2.8,
  awesome: 2.7,
  excellent: 2.9,
  superb: 3.0,
  dominant: 2.8,
  dominated: 2.9,
  unstoppable: 3.2,
  historic: 2.6,
  legendary: 3.2,
  clinical: 2.5,
  clutch: 3.1,
  sensational: 3.2,
  electric: 2.5,
  thrilling: 2.8,
  victory: 2.6,
  win: 2.2,
  won: 2.2,
  champion: 3.0,
  champions: 3.0,
  triumph: 3.0,
  comeback: 2.8,
  precision: 2.2,
  flawless: 3.3,
  fearless: 2.7,
  solid: 1.8,
  strong: 1.9,
  smart: 2.0,
  tactical: 1.8,
  genius: 3.0,
  heroic: 3.1,
  clean: 1.7,
  impressive: 2.4,
  great: 2.3,
  good: 1.6,
  love: 2.5,
  loved: 2.5,
  best: 2.6,
  perfect: 3.2,
  proud: 2.4,
  fast: 1.7,
  razor: 1.9,
  resilient: 2.5,
  disciplined: 2.2,

  // Sport-specific positive idioms & terms
  century: 2.4,
  yorker: 2.1,
  sixes: 1.9,
  hattrick: 3.2,
  'hat-trick': 3.2,
  cleansheet: 2.6,
  'clean-sheet': 2.6,
  buzzer: 2.3,
  dunk: 2.0,
  ace: 2.2,
  breakthrough: 2.4,
  pole: 2.1,
  overtake: 2.5,
  undercut: 2.1,
  podium: 2.6,
  superraid: 3.0,
  'high-five': 2.3,
  tackle: 1.6,
  headshot: 2.1,
  macro: 1.8,
  synergy: 2.2,
  carry: 2.0,
  mvp: 2.9,
  trophy: 2.5,
  goosebumps: 2.9,
  fire: 2.1,

  // Core negative
  terrible: -3.2,
  awful: -3.1,
  horrible: -3.2,
  disaster: -3.4,
  disastrous: -3.4,
  pathetic: -3.3,
  embarrassing: -3.2,
  collapse: -2.9,
  collapsed: -2.9,
  choke: -3.1,
  choked: -3.2,
  sloppy: -2.4,
  careless: -2.3,
  awfuly: -2.8,
  disappointing: -2.6,
  disappointed: -2.5,
  frustrating: -2.5,
  frustrated: -2.4,
  poor: -2.2,
  weak: -2.1,
  slow: -1.8,
  mistake: -2.1,
  mistakes: -2.3,
  blunder: -3.0,
  error: -2.0,
  errors: -2.2,
  worst: -3.2,
  bad: -2.0,
  hate: -2.9,
  lost: -2.0,
  loss: -2.2,
  defeat: -2.3,
  defeated: -2.1,
  useless: -3.0,
  unacceptable: -2.9,
  clueless: -3.0,
  boring: -2.0,
  predictable: -1.6,
  exhausted: -1.8,
  injury: -1.9,
  injured: -1.9,
  foul: -1.8,
  biased: -2.4,
  robbed: -2.7,
  heartbreaking: -2.8,
  painful: -2.4,
  nightmare: -3.1,
  broken: -2.2,
  wasted: -2.4,
  collapsedly: -2.6,
  fail: -2.5,
  failed: -2.5,
  failure: -2.8,

  // Sport-specific negative idioms
  dropped: -2.1,
  duck: -2.3,
  redcard: -2.8,
  penalty: -1.5,
  missed: -2.2,
  turnover: -2.0,
  turnovers: -2.2,
  doublefault: -2.4,
  dnf: -2.9,
  puncture: -2.3,
  pitstop: -0.4,
  allout: -1.8,
  throw: -2.3,
  threw: -2.4,
  int: -2.5,
  lag: -2.1,
  eliminated: -2.2,
  outplayed: -2.5,
};

const EMOTION_LEXICON: Record<keyof Omit<EmotionScores, 'dominantEmotion'>, Record<string, number>> = {
  joy: {
    love: 2.4, loved: 2.4, happy: 2.5, joy: 3.0, proud: 2.3, champion: 2.6, champions: 2.6,
    victory: 2.2, trophy: 2.3, celebration: 2.8, smiling: 2.2, brilliant: 2.0, amazing: 2.1,
    best: 2.0, perfect: 2.4, win: 1.8, won: 1.8, awesome: 2.0, historic: 1.9,
  },
  anger: {
    angry: 3.0, furious: 3.2, unacceptable: 2.8, pathetic: 2.7, clueless: 2.6, robbed: 2.9,
    biased: 2.6, blunder: 2.5, embarrassing: 2.4, useless: 2.7, terrible: 2.2, hate: 2.8,
    redcard: 2.0, foul: 1.9, disgusting: 3.0, disaster: 2.3,
  },
  sadness: {
    sad: 2.8, heartbreaking: 3.2, painful: 2.6, disappointed: 2.7, disappointing: 2.6,
    loss: 2.1, lost: 1.9, defeat: 2.2, collapse: 2.3, collapsed: 2.3, choked: 2.2,
    injured: 2.2, injury: 2.1, eliminated: 2.4, tears: 2.9, miss: 1.7, missed: 1.9,
  },
  excitement: {
    thrilling: 3.0, electric: 2.9, goosebumps: 3.1, buzzer: 2.7, comeback: 2.8, clutch: 2.9,
    unstoppable: 2.8, sensational: 2.8, overtake: 2.6, superraid: 2.8, hattrick: 2.9,
    'hat-trick': 2.9, fire: 2.4, insane: 2.5, unbelievable: 2.4, roar: 2.5, pace: 1.8,
  },
  fear: {
    nervous: 2.7, worried: 2.6, anxious: 2.8, scared: 2.9, panic: 3.0, pressure: 2.1,
    risk: 1.9, vulnerable: 2.4, fragile: 2.3, danger: 2.5, tense: 2.2, collapse: 1.6,
    injury: 1.8, dnf: 1.7,
  },
  surprise: {
    unbelievable: 2.6, shocked: 3.0, shocking: 3.0, unexpected: 2.9, upset: 2.6,
    twist: 2.7, miracle: 3.1, stunned: 2.9, turnaround: 2.6, comeback: 2.0,
    unpredictable: 2.5, speechless: 2.8, wow: 2.5,
  },
};

const ASPECT_KEYWORDS: Record<AspectResult['aspectName'], string[]> = {
  Teams: ['team', 'squad', 'lineup', 'franchise', 'club', 'roster', 'side', 'unit', 'defense', 'attack', 'midfield', 'constructor'],
  Players: ['player', 'players', 'captain', 'striker', 'bowler', 'batsman', 'keeper', 'driver', 'raider', 'defender', 'mvp', 'rookie', 'veteran', 'carry', 'star', 'serve', 'aim'],
  Performance: ['performance', 'form', 'execution', 'pace', 'speed', 'accuracy', 'stamina', 'fitness', 'consistency', 'finishing', 'batting', 'bowling', 'fielding', 'shooting', 'passing', 'lap', 'mechanics'],
  Strategy: ['strategy', 'tactics', 'tactical', 'plan', 'gameplan', 'formation', 'rotation', 'undercut', 'draft', 'macro', 'setup', 'substitution', 'drs', 'powerplay', 'pressing'],
  Coaching: ['coach', 'coaching', 'manager', 'management', 'staff', 'mentality', 'leadership', 'selection', 'decisions', 'pitwall', 'principal'],
  'Match Results': ['result', 'results', 'win', 'won', 'loss', 'lost', 'victory', 'defeat', 'draw', 'score', 'scoreline', 'final', 'qualifier', 'podium', 'title', 'trophy', 'championship', 'eliminated'],
};

export function normalizeText(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[@#]([a-zA-Z0-9_]+)/g, '$1')
    .replace(/[^\w\s'!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function tokenize(normalized: string): string[] {
  return normalized
    .replace(/!/g, '')
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter((t) => t.length > 0);
}

export function analyzeCommentDeterministic(rawText: string): NlpAnalysisResult {
  const normalizedText = normalizeText(rawText);
  const tokens = tokenize(normalizedText);

  let rawScore = 0;
  let hits = 0;
  const matchedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!Object.hasOwn(SENTIMENT_LEXICON, token)) continue;
    const baseWeight = SENTIMENT_LEXICON[token];

    let weight = baseWeight;

    // Check degree intensifiers in previous 2 tokens
    for (let j = Math.max(0, i - 2); j < i; j++) {
      const prev = tokens[j];
      if (Object.hasOwn(INTENSIFIERS, prev)) {
        weight *= INTENSIFIERS[prev];
      }
    }

    // Check negation window (previous 3 tokens)
    let negated = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATIONS.has(tokens[j])) {
        negated = true;
        break;
      }
    }
    if (negated) {
      weight = -weight * 0.8;
    }

    rawScore += weight;
    hits += 1;
    matchedTokens.push(negated ? `not:${token}` : token);
  }

  // Exclamation emphasis
  const exclamations = (rawText.match(/!/g) || []).length;
  if (exclamations > 0 && rawScore !== 0) {
    const boost = 1 + Math.min(exclamations, 3) * 0.08;
    rawScore *= boost;
  }

  // Scale rawScore smoothly to [-100, +100]
  const safeRaw = Number.isFinite(rawScore) ? rawScore : 0;
  const scaledScore = Math.max(
    -100,
    Math.min(100, Number((Math.tanh(safeRaw / 4.2) * 100).toFixed(1))),
  );

  let polarity: SentimentPolarity = 'NEUTRAL';
  if (scaledScore >= 12) polarity = 'POSITIVE';
  else if (scaledScore <= -12) polarity = 'NEGATIVE';

  const confidence = Number(
    Math.min(0.98, Math.max(0.52, 0.54 + Math.min(hits, 5) * 0.075 + Math.abs(scaledScore) / 650)).toFixed(2),
  );

  // Emotion Detection across all 6 emotions
  const emotionsRaw: Record<keyof Omit<EmotionScores, 'dominantEmotion'>, number> = {
    joy: 0,
    anger: 0,
    sadness: 0,
    excitement: 0,
    fear: 0,
    surprise: 0,
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const negated =
      (i > 0 && NEGATIONS.has(tokens[i - 1])) || (i > 1 && NEGATIONS.has(tokens[i - 2]));

    (Object.keys(EMOTION_LEXICON) as Array<keyof typeof EMOTION_LEXICON>).forEach((emotionKey) => {
      const emoDict = EMOTION_LEXICON[emotionKey];
      const val = Object.hasOwn(emoDict, token) ? emoDict[token] : 0;
      if (val) {
        if (negated) {
          if (emotionKey === 'joy') emotionsRaw.sadness += val * 0.6;
          else if (emotionKey === 'anger') emotionsRaw.joy += val * 0.3;
        } else {
          emotionsRaw[emotionKey] += val;
        }
      }
    });
  }

  // Baseline alignment with sentiment polarity when emotion words are subtle
  if (polarity === 'POSITIVE') {
    emotionsRaw.joy += 0.7;
    emotionsRaw.excitement += 0.6;
  } else if (polarity === 'NEGATIVE') {
    emotionsRaw.anger += 0.5;
    emotionsRaw.sadness += 0.6;
  } else {
    emotionsRaw.surprise += 0.35;
    emotionsRaw.fear += 0.25;
  }

  const totalEmotion = Object.values(emotionsRaw).reduce((acc, v) => acc + v, 0) || 1;
  const emotionsNormalized = {
    joy: Number(((emotionsRaw.joy / totalEmotion) * 100).toFixed(1)),
    anger: Number(((emotionsRaw.anger / totalEmotion) * 100).toFixed(1)),
    sadness: Number(((emotionsRaw.sadness / totalEmotion) * 100).toFixed(1)),
    excitement: Number(((emotionsRaw.excitement / totalEmotion) * 100).toFixed(1)),
    fear: Number(((emotionsRaw.fear / totalEmotion) * 100).toFixed(1)),
    surprise: Number(((emotionsRaw.surprise / totalEmotion) * 100).toFixed(1)),
  };

  const emotionEntries = Object.entries(emotionsNormalized) as Array<[string, number]>;
  emotionEntries.sort((a, b) => b[1] - a[1]);
  const dominantRaw = emotionEntries[0][0];
  const dominantEmotion = dominantRaw.charAt(0).toUpperCase() + dominantRaw.slice(1);

  // Keyword Extraction (stopword filtered, frequency + lexicon weight)
  const kwCounts = new Map<string, number>();
  for (const token of tokens) {
    if (
      token.length < 3 ||
      STOP_WORDS.has(token) ||
      NEGATIONS.has(token) ||
      Object.hasOwn(INTENSIFIERS, token)
    ) {
      continue;
    }
    kwCounts.set(token, (kwCounts.get(token) || 0) + 1);
  }

  const keywords: KeywordResult[] = Array.from(kwCounts.entries())
    .map(([keyword, frequency]) => {
      const lex = Object.hasOwn(SENTIMENT_LEXICON, keyword) ? SENTIMENT_LEXICON[keyword] : 0;
      const kwPolarity: SentimentPolarity =
        lex > 0.3 ? 'POSITIVE' : lex < -0.3 ? 'NEGATIVE' : polarity;
      const weight = Number((frequency * (1 + Math.abs(lex) * 0.45)).toFixed(2));
      return { keyword, frequency, weight, polarity: kwPolarity };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  // Aspect-Based Sentiment Analysis
  const aspects: AspectResult[] = [];
  const tokenSet = new Set(tokens);
  (Object.keys(ASPECT_KEYWORDS) as Array<AspectResult['aspectName']>).forEach((aspectName) => {
    const cues = ASPECT_KEYWORDS[aspectName];
    const matchedCues = cues.filter((cue) => tokenSet.has(cue));
    if (matchedCues.length > 0) {
      // Localized window sentiment around aspect mentions
      let localScore = 0;
      let localHits = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (matchedCues.includes(tokens[i])) {
          const start = Math.max(0, i - 4);
          const end = Math.min(tokens.length - 1, i + 4);
          for (let k = start; k <= end; k++) {
            const tok = tokens[k];
            if (Object.hasOwn(SENTIMENT_LEXICON, tok)) {
              const w = SENTIMENT_LEXICON[tok];
              const neg =
                (k > 0 && NEGATIONS.has(tokens[k - 1])) ||
                (k > 1 && NEGATIONS.has(tokens[k - 2]));
              localScore += neg ? -w * 0.8 : w;
              localHits += 1;
            }
          }
        }
      }
      const aspectScore =
        localHits > 0
          ? Number(Math.max(-100, Math.min(100, Math.tanh(localScore / 2.8) * 100)).toFixed(1))
          : scaledScore;
      const aspectPolarity: SentimentPolarity =
        aspectScore >= 12 ? 'POSITIVE' : aspectScore <= -12 ? 'NEGATIVE' : 'NEUTRAL';
      aspects.push({
        aspectName,
        polarity: aspectPolarity,
        score: aspectScore,
        confidence: Number(Math.min(0.96, 0.62 + matchedCues.length * 0.08).toFixed(2)),
      });
    }
  });

  // Always guarantee at least 1 primary aspect (Performance or Match Results)
  if (aspects.length === 0) {
    aspects.push({
      aspectName: 'Performance',
      polarity,
      score: scaledScore,
      confidence: Number((confidence * 0.92).toFixed(2)),
    });
  }

  return {
    rawText,
    normalizedText,
    tokens,
    polarity,
    score: scaledScore,
    confidence,
    matchedTokens,
    emotions: {
      ...emotionsNormalized,
      dominantEmotion,
    },
    keywords,
    aspects,
  };
}
