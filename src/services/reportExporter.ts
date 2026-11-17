import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AnalyticsBundle, AnalyticsFilterState } from '../types/analytics';

export type ReportType =
  | 'overall'
  | 'sentiment-distribution'
  | 'sports-comparison'
  | 'emotion-analysis'
  | 'keyword-analysis'
  | 'aspect-analysis';

const REPORT_TITLES: Record<ReportType, string> = {
  overall: 'Overall Sports Sentiment Analytics Report',
  'sentiment-distribution': 'Sentiment Distribution Report',
  'sports-comparison': 'Sport-Wise Sentiment Comparison Report',
  'emotion-analysis': 'Human Emotion Detection Report',
  'keyword-analysis': 'Trending Keyword Frequency Report',
  'aspect-analysis': 'Aspect-Based Sentiment Report',
};

export function exportReportCsv(bundle: AnalyticsBundle, filter: AnalyticsFilterState, reportType: ReportType) {
  let csv = '';
  const meta = `# ${REPORT_TITLES[reportType]}\n# Sport Filter: ${filter.sport} | Granularity: ${filter.granularity} | Source: ${filter.sourceFilter} | Generated: ${new Date().toISOString()}\n`;

  if (reportType === 'sports-comparison') {
    csv = meta + 'Sport,TotalComments,Positive,Negative,Neutral,PositivePct,NegativePct,AvgScore\n';
    csv += bundle.sportsComparison
      .map((s) => `${s.sport},${s.total},${s.positive},${s.negative},${s.neutral},${s.positivePct}%,${s.negativePct}%,${s.avgScore}`)
      .join('\n');
  } else if (reportType === 'emotion-analysis') {
    csv = meta + 'Emotion,AverageIntensityPct\n';
    csv += bundle.emotionsRadar.map((e) => `${e.emotion},${e.value}%`).join('\n');
  } else if (reportType === 'keyword-analysis') {
    csv = meta + 'Keyword,Frequency,WeightedScore,Polarity\n';
    csv += bundle.topKeywords.map((k) => `${k.keyword},${k.count},${k.value},${k.polarity}`).join('\n');
  } else if (reportType === 'aspect-analysis') {
    csv = meta + 'Aspect,TotalMentions,Positive,Negative,Neutral,AvgScore\n';
    csv += bundle.aspectAnalysis
      .map((a) => `${a.aspect},${a.total},${a.positive},${a.negative},${a.neutral},${a.avgScore}`)
      .join('\n');
  } else if (reportType === 'sentiment-distribution') {
    csv = meta + 'Polarity,Count,Percentage\n';
    const total = Math.max(1, bundle.kpis.totalComments);
    csv += bundle.distribution
      .map((d) => `${d.name},${d.value},${((d.value / total) * 100).toFixed(1)}%`)
      .join('\n');
  } else {
    csv = meta + 'CommentID,Sport,Polarity,Score,Confidence,DominantEmotion,Source,IsDemo,Comment\n';
    csv += bundle.recentComments
      .map((c) => `${c.commentId},${c.sportName},${c.polarity},${c.score},${c.confidence},${c.dominantEmotion},"${c.sourceName}",${c.isDemo},"${c.rawText.replace(/"/g, '""')}"`)
      .join('\n');
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sportspulse_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportReportExcel(bundle: AnalyticsBundle, filter: AnalyticsFilterState, reportType: ReportType) {
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet([
    { Metric: 'Report Title', Value: REPORT_TITLES[reportType] },
    { Metric: 'Sport Filter', Value: filter.sport },
    { Metric: 'Source Scope', Value: filter.sourceFilter },
    { Metric: 'Total Comments Analyzed', Value: bundle.kpis.totalComments },
    { Metric: 'Positive Comments', Value: `${bundle.kpis.positiveCount} (${bundle.kpis.positivePct}%)` },
    { Metric: 'Negative Comments', Value: `${bundle.kpis.negativeCount} (${bundle.kpis.negativePct}%)` },
    { Metric: 'Neutral Comments', Value: `${bundle.kpis.neutralCount} (${bundle.kpis.neutralPct}%)` },
    { Metric: 'Overall Sentiment Score', Value: bundle.kpis.overallSentimentScore },
    { Metric: 'Most Discussed Sport', Value: bundle.kpis.mostDiscussedSport },
    { Metric: 'Dominant Emotion', Value: bundle.kpis.dominantEmotion },
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bundle.sportsComparison),
    'SportsComparison',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bundle.emotionsRadar),
    'Emotions',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bundle.topKeywords),
    'Keywords',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(bundle.aspectAnalysis),
    'Aspects',
  );

  XLSX.writeFile(wb, `sportspulse_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportReportPdf(bundle: AnalyticsBundle, filter: AnalyticsFilterState, reportType: ReportType) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.setFillColor(6, 11, 24);
  doc.rect(0, 0, 595, 92, 'F');
  doc.setTextColor(241, 245, 249);
  doc.setFontSize(16);
  doc.text('SportsPulse RDD — Big Data Sports Sentiment Intelligence', 40, 38);
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(REPORT_TITLES[reportType], 40, 58);
  doc.setFontSize(9);
  doc.text(
    `Scope: ${filter.sport.toUpperCase()} | Granularity: ${filter.granularity} | Source: ${filter.sourceFilter} | Generated: ${new Date().toLocaleString()}`,
    40,
    76,
  );

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Executive KPI Summary', 40, 120);

  autoTable(doc, {
    startY: 130,
    head: [['Metric', 'Value']],
    body: [
      ['Total Comments Analyzed', String(bundle.kpis.totalComments)],
      ['Positive Sentiment', `${bundle.kpis.positiveCount} (${bundle.kpis.positivePct}%)`],
      ['Negative Sentiment', `${bundle.kpis.negativeCount} (${bundle.kpis.negativePct}%)`],
      ['Neutral Sentiment', `${bundle.kpis.neutralCount} (${bundle.kpis.neutralPct}%)`],
      ['Overall Sentiment Score (-100..+100)', String(bundle.kpis.overallSentimentScore)],
      ['Most Discussed Sport', bundle.kpis.mostDiscussedSport],
      ['Most Trending Keyword', bundle.kpis.mostTrendingKeyword],
      ['Dominant Emotion', bundle.kpis.dominantEmotion],
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 19, 36] },
  });

  const afterSummaryY = (doc as any).lastAutoTable.finalY + 24;

  if (reportType === 'emotion-analysis') {
    doc.text('Emotion Distribution', 40, afterSummaryY);
    autoTable(doc, {
      startY: afterSummaryY + 10,
      head: [['Emotion', 'Average Intensity (%)']],
      body: bundle.emotionsRadar.map((e) => [e.emotion, `${e.value}%`]),
      headStyles: { fillColor: [30, 64, 175] },
    });
  } else if (reportType === 'keyword-analysis') {
    doc.text('Top Extracted Keywords', 40, afterSummaryY);
    autoTable(doc, {
      startY: afterSummaryY + 10,
      head: [['Keyword', 'Frequency', 'Weighted Score', 'Polarity']],
      body: bundle.topKeywords.slice(0, 18).map((k) => [k.keyword, String(k.count), String(k.value), k.polarity]),
      headStyles: { fillColor: [30, 64, 175] },
    });
  } else if (reportType === 'aspect-analysis') {
    doc.text('Aspect-Based Sentiment Breakdown', 40, afterSummaryY);
    autoTable(doc, {
      startY: afterSummaryY + 10,
      head: [['Aspect', 'Mentions', 'Positive', 'Negative', 'Neutral', 'Avg Score']],
      body: bundle.aspectAnalysis.map((a) => [
        a.aspect,
        String(a.total),
        String(a.positive),
        String(a.negative),
        String(a.neutral),
        String(a.avgScore),
      ]),
      headStyles: { fillColor: [30, 64, 175] },
    });
  } else {
    doc.text('Sport-Wise Sentiment Comparison', 40, afterSummaryY);
    autoTable(doc, {
      startY: afterSummaryY + 10,
      head: [['Sport', 'Total', 'Positive %', 'Negative %', 'Neutral %', 'Avg Score']],
      body: bundle.sportsComparison.map((s) => [
        s.sport,
        String(s.total),
        `${s.positivePct}%`,
        `${s.negativePct}%`,
        `${s.neutralPct}%`,
        String(s.avgScore),
      ]),
      headStyles: { fillColor: [30, 64, 175] },
    });
  }

  doc.save(`sportspulse_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
