import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsBundle } from '../types/analytics';
import { ChartCard } from './ChartCard';
import { EChartBox } from './EChartBox';

interface AnalyticsChartsSuiteProps {
  bundle: AnalyticsBundle | null;
  loading: boolean;
  onExportChartCsv: (
    reportType:
      | 'overall'
      | 'sentiment-distribution'
      | 'sports-comparison'
      | 'emotion-analysis'
      | 'keyword-analysis'
      | 'aspect-analysis',
  ) => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0B1324',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '8px',
  color: '#F1F5F9',
  fontSize: '12px',
};

export function AnalyticsChartsSuite({
  bundle,
  loading,
  onExportChartCsv,
}: AnalyticsChartsSuiteProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const empty = !bundle || bundle.kpis.totalComments === 0;

  // Emotion Analysis — ECharts Radar
  const emotionRadarOption = useMemo(() => {
    const items = bundle?.emotionsRadar || [];
    const maxVal = Math.max(35, ...items.map((i) => Math.ceil(i.value + 5)));
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
      },
      radar: {
        indicator: items.map((e) => ({ name: e.emotion, max: maxVal })),
        splitNumber: 4,
        axisName: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.14)' } },
        splitArea: { areaStyle: { color: ['rgba(15,23,42,0.3)', 'rgba(15,23,42,0.1)'] } },
      },
      series: [
        {
          name: 'Emotion Intensity',
          type: 'radar',
          data: [
            {
              value: items.map((e) => e.value),
              name: 'Avg Emotion Share (%)',
              areaStyle: { color: 'rgba(59, 130, 246, 0.28)' },
              lineStyle: { color: '#38BDF8', width: 2 },
              itemStyle: { color: '#38BDF8' },
            },
          ],
        },
      ],
    };
  }, [bundle]);

  // Sentiment Heatmap — ECharts Heatmap
  const heatmapOption = useMemo(() => {
    const hm = bundle?.heatmap;
    if (!hm || hm.buckets.length === 0) return {};
    const seriesData: Array<[number, number, number]> = [];
    hm.cells.forEach((cell) => {
      const xIdx = hm.buckets.indexOf(cell.bucket);
      const yIdx = hm.sports.indexOf(cell.sport);
      if (xIdx >= 0 && yIdx >= 0) {
        seriesData.push([xIdx, yIdx, cell.score]);
      }
    });
    return {
      tooltip: {
        position: 'top',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (params: any) => {
          const [bx, sy, score] = params.value;
          return `${hm.sports[sy]} · ${hm.buckets[bx]}<br/>Avg Score: <b>${score}</b>`;
        },
      },
      grid: { height: '72%', top: '8%', left: '18%', right: '5%' },
      xAxis: {
        type: 'category',
        data: hm.buckets,
        axisLabel: { color: '#94A3B8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'category',
        data: hm.sports,
        axisLabel: { color: '#CBD5E1', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      visualMap: {
        min: -100,
        max: 100,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: '#94A3B8', fontSize: 10 },
        inRange: {
          color: ['#EF4444', '#F59E0B', '#10B981'],
        },
      },
      series: [
        {
          name: 'Sentiment Score',
          type: 'heatmap',
          data: seriesData,
          label: { show: true, color: '#F8FAFC', fontSize: 10 },
        },
      ],
    };
  }, [bundle]);

  // Sentiment Score Gauge (-100 to +100)
  const gaugeOption = useMemo(() => {
    const score = bundle?.kpis.overallSentimentScore ?? 0;
    return {
      tooltip: {
        formatter: '{a}: {c}',
        backgroundColor: '#0B1324',
        textStyle: { color: '#F1F5F9' },
      },
      series: [
        {
          name: 'Overall Sentiment',
          type: 'gauge',
          min: -100,
          max: 100,
          splitNumber: 4,
          progress: { show: true, width: 14 },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.44, '#EF4444'],
                [0.56, '#F59E0B'],
                [1, '#10B981'],
              ],
            },
          },
          pointer: { itemStyle: { color: '#38BDF8' } },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { width: 2, color: '#475569' } },
          axisLabel: { distance: 20, color: '#94A3B8', fontSize: 10 },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 600,
            color: '#F8FAFC',
            offsetCenter: [0, '68%'],
            formatter: (val: number) => (val > 0 ? `+${val}` : `${val}`),
          },
          data: [{ value: score, name: 'Index (-100 to +100)' }],
          title: { offsetCenter: [0, '90%'], color: '#94A3B8', fontSize: 11 },
        },
      ],
    };
  }, [bundle]);

  // Keyword Frequency — ECharts Treemap
  const treemapOption = useMemo(() => {
    const kws = (bundle?.topKeywords || []).slice(0, 20);
    return {
      tooltip: {
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: { show: true, formatter: '{b}\n{c}', color: '#F8FAFC', fontSize: 11 },
          itemStyle: { borderColor: '#060B18', borderWidth: 2, gapWidth: 2 },
          data: kws.map((k) => ({
            name: k.keyword,
            value: k.count,
            itemStyle: {
              color:
                k.polarity === 'POSITIVE'
                  ? '#059669'
                  : k.polarity === 'NEGATIVE'
                    ? '#DC2626'
                    : '#2563EB',
            },
          })),
        },
      ],
    };
  }, [bundle]);

  // Correlation Analysis — ECharts Scatter Plot
  const scatterOption = useMemo(() => {
    const pts = bundle?.correlationScatter || [];
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (p: any) => `${p.data[2]}<br/>Volume: ${p.data[0]} · Avg Score: ${p.data[1]}`,
      },
      grid: { top: 24, right: 24, bottom: 38, left: 48 },
      xAxis: {
        name: 'Volume',
        nameLocation: 'middle',
        nameGap: 24,
        type: 'value',
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } },
      },
      yAxis: {
        name: 'Score',
        type: 'value',
        min: -100,
        max: 100,
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } },
      },
      series: [
        {
          symbolSize: 11,
          type: 'scatter',
          data: pts.map((p) => [p.volume, p.avgScore, p.sport]),
          itemStyle: {
            color: (params: any) =>
              params.data[1] >= 12 ? '#10B981' : params.data[1] <= -12 ? '#EF4444' : '#38BDF8',
          },
        },
      ],
    };
  }, [bundle]);

  // Box Plot — ECharts Boxplot (Min, Q1, Median, Q3, Max per Sport)
  const boxplotOption = useMemo(() => {
    const boxes = bundle?.sportBoxPlots || [];
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (param: any) => {
          const idx = param.dataIndex;
          const row = boxes[idx];
          if (!row) return '';
          const [min, q1, median, q3, max] = row.stats;
          return `<b>${row.sport}</b> (n=${row.count})<br/>Max: ${max}<br/>Q3: ${q3}<br/>Median: ${median}<br/>Q1: ${q1}<br/>Min: ${min}`;
        },
      },
      grid: { top: 24, right: 20, bottom: 52, left: 48 },
      xAxis: {
        type: 'category',
        data: boxes.map((b) => b.sport),
        axisLabel: { color: '#CBD5E1', fontSize: 10, rotate: 18 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        name: 'Sentiment Score',
        min: -100,
        max: 100,
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
      },
      series: [
        {
          name: 'Score Box Plot',
          type: 'boxplot',
          data: boxes.map((b) => b.stats),
          itemStyle: {
            color: 'rgba(56, 189, 248, 0.24)',
            borderColor: '#38BDF8',
            borderWidth: 1.8,
          },
        },
      ],
    };
  }, [bundle]);

  // Violin Plot — ECharts Custom KDE Hull + IQR/Median Overlay per Sport
  const violinOption = useMemo(() => {
    const violins = bundle?.sportViolins || [];
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (param: any) => {
          const v = violins[param.dataIndex];
          if (!v) return '';
          return `<b>${v.sport}</b> (n=${v.count})<br/>Max: ${v.max}<br/>Q3: ${v.q3} · Median: ${v.median}<br/>Q1: ${v.q1} · Min: ${v.min}`;
        },
      },
      grid: { top: 24, right: 20, bottom: 52, left: 48 },
      xAxis: {
        type: 'category',
        data: violins.map((v) => v.sport),
        axisLabel: { color: '#CBD5E1', fontSize: 10, rotate: 18 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        name: 'Density Range',
        min: -100,
        max: 100,
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
      },
      series: [
        {
          name: 'Violin KDE',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const idx = params.dataIndex;
            const v = violins[idx];
            if (!v || v.kde.length === 0) return null;

            const centerPt = api.coord([idx, 0]);
            const xCenter = centerPt[0];
            const bandWidth = api.size([1, 0])[0];
            const halfWidth = Math.max(10, Math.min(34, bandWidth * 0.38));

            const rightPts = v.kde.map((pt) => {
              const p = api.coord([idx, pt.y]);
              return [xCenter + pt.density * halfWidth, p[1]];
            });
            const leftPts = [...v.kde].reverse().map((pt) => {
              const p = api.coord([idx, pt.y]);
              return [xCenter - pt.density * halfWidth, p[1]];
            });

            const yMin = api.coord([idx, v.min])[1];
            const yMax = api.coord([idx, v.max])[1];
            const yQ1 = api.coord([idx, v.q1])[1];
            const yQ3 = api.coord([idx, v.q3])[1];
            const yMed = api.coord([idx, v.median])[1];

            return {
              type: 'group',
              children: [
                {
                  type: 'polygon',
                  shape: { points: [...rightPts, ...leftPts] },
                  style: {
                    fill: `${v.accentColor}38`,
                    stroke: v.accentColor,
                    lineWidth: 1.5,
                  },
                },
                {
                  type: 'line',
                  shape: { x1: xCenter, y1: yMax, x2: xCenter, y2: yMin },
                  style: { stroke: '#94A3B8', lineWidth: 1.2 },
                },
                {
                  type: 'rect',
                  shape: {
                    x: xCenter - 4,
                    y: Math.min(yQ1, yQ3),
                    width: 8,
                    height: Math.max(2, Math.abs(yQ1 - yQ3)),
                  },
                  style: { fill: v.accentColor },
                },
                {
                  type: 'line',
                  shape: { x1: xCenter - 7, y1: yMed, x2: xCenter + 7, y2: yMed },
                  style: { stroke: '#F8FAFC', lineWidth: 2.2 },
                },
              ],
            };
          },
          data: violins.map((v, idx) => [idx, v.median, v.min, v.q1, v.q3, v.max]),
        },
      ],
    };
  }, [bundle]);

  // Bubble Chart — ECharts Multi-Metric Sport Bubble Chart
  const bubbleOption = useMemo(() => {
    const bubbles = bundle?.bubbleData || [];
    const maxVol = Math.max(1, ...bubbles.map((b) => b.volume));
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0B1324',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#F1F5F9', fontSize: 12 },
        formatter: (p: any) => {
          const [vol, score, conf, posPct, name] = p.data.value;
          return `<b>${name}</b><br/>Volume: ${vol} comments<br/>Avg Score: ${score > 0 ? `+${score}` : score}<br/>Avg Confidence: ${conf}%<br/>Positive Share: ${posPct}%`;
        },
      },
      grid: { top: 28, right: 32, bottom: 42, left: 52 },
      xAxis: {
        name: 'Comment Volume',
        nameLocation: 'middle',
        nameGap: 26,
        type: 'value',
        min: 0,
        max: Math.ceil(maxVol * 1.25),
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } },
      },
      yAxis: {
        name: 'Avg Score',
        type: 'value',
        min: -100,
        max: 100,
        axisLabel: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } },
      },
      series: [
        {
          name: 'Sport Metrics',
          type: 'scatter',
          data: bubbles.map((b) => ({
            value: [b.volume, b.avgScore, b.avgConfidence, b.positivePct, b.sport],
            symbolSize: Math.max(18, Math.min(54, (b.avgConfidence - 45) * 0.95)),
            itemStyle: {
              color: `${b.accentColor}B8`,
              borderColor: b.accentColor,
              borderWidth: 2,
            },
          })),
          label: {
            show: true,
            position: 'top',
            color: '#E2E8F0',
            fontSize: 10,
            formatter: (p: any) => p.data.value[4],
          },
        },
      ],
    };
  }, [bundle]);

  const maxKwCount = Math.max(1, ...(bundle?.topKeywords || []).map((k) => k.count));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 01. Histogram: Sentiment Score Frequency Distribution */}
      <ChartCard
        title="01. Sentiment Score Histogram"
        subtitle="Frequency distribution of comment polarity scores across 8 intensity bins (-100 to +100)"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bundle?.scoreHistogram || []}
              barCategoryGap={1}
              margin={{ top: 10, right: 12, left: -16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="range" stroke="#94A3B8" fontSize={10} interval={0} />
              <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Comments" radius={[2, 2, 0, 0]}>
                {(bundle?.scoreHistogram || []).map((bin) => (
                  <Cell
                    key={bin.range}
                    fill={
                      bin.zone === 'POSITIVE'
                        ? '#10B981'
                        : bin.zone === 'NEGATIVE'
                          ? '#EF4444'
                          : '#F59E0B'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 02. Pie Chart: Dominant Emotion Share */}
      <ChartCard
        title="02. Dominant Emotion Pie Chart"
        subtitle="Proportional breakdown of primary human emotions detected across analyzed comments"
        loading={loading}
        isEmpty={empty || (bundle?.emotionPie.length ?? 0) === 0}
        onExport={() => onExportChartCsv('emotion-analysis')}
      >
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bundle?.emotionPie || []}
                dataKey="value"
                nameKey="name"
                innerRadius={0}
                outerRadius={104}
                paddingAngle={1.5}
              >
                {(bundle?.emotionPie || []).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#0B1324" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 03. Donut Chart: Sentiment Distribution */}
      <ChartCard
        title="03. Sentiment Polarity Donut Chart"
        subtitle="Positive, Negative, and Neutral share across filtered records"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('sentiment-distribution')}
      >
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={bundle?.distribution || []}
                dataKey="value"
                nameKey="name"
                innerRadius={66}
                outerRadius={104}
                paddingAngle={3}
              >
                {(bundle?.distribution || []).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#0B1324" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#CBD5E1' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 04. Gauge Chart: Overall Sentiment Index */}
      <ChartCard
        title="04. Overall Sentiment Gauge"
        subtitle="Calibrated net polarity index (-100 negative to +100 positive)"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <EChartBox option={gaugeOption as any} height={290} />
      </ChartCard>

      {/* 05. Line Chart (Multi-Series): Sentiment Trends Over Time */}
      <ChartCard
        title="05. Sentiment Polarity Line Chart"
        subtitle="Temporal Positive, Negative, and Neutral trajectory aligned to selected granularity"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <div className="h-[295px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bundle?.trends || []} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="bucket" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="positive" name="Positive" stroke="#10B981" strokeWidth={2.2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="negative" name="Negative" stroke="#EF4444" strokeWidth={2.2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 06. Line Chart (Index Trajectory): Net Sentiment Score Over Time */}
      <ChartCard
        title="06. Net Sentiment Score Line Chart"
        subtitle="Mean polarity score trajectory over time with neutral baseline reference"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <div className="h-[295px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bundle?.trends || []} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="bucket" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={[-100, 100]} stroke="#94A3B8" fontSize={11} />
              <ReferenceLine y={0} stroke="#64748B" strokeDasharray="4 4" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="avgScore"
                name="Avg Sentiment Score"
                stroke="#38BDF8"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#38BDF8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 07. Bar Chart (Grouped): Sports-Wise Comparison */}
      <ChartCard
        title="07. Sports-Wise Grouped Bar Chart"
        subtitle="Polarity volume across all 8 sports categories"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('sports-comparison')}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bundle?.sportsComparison || []} margin={{ top: 10, right: 10, left: -16, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="sport" stroke="#94A3B8" fontSize={10} interval={0} angle={-18} textAnchor="end" height={48} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="positive" name="Positive" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="negative" name="Negative" fill="#EF4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="neutral" name="Neutral" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 08. Box Plot: Sentiment Score Quartiles by Sport */}
      <ChartCard
        title="08. Sentiment Score Box Plot"
        subtitle="Five-number statistical summary (Min, Q1, Median, Q3, Max) per sport"
        loading={loading}
        isEmpty={empty || (bundle?.sportBoxPlots.length ?? 0) === 0}
        onExport={() => onExportChartCsv('sports-comparison')}
      >
        <EChartBox option={boxplotOption as any} height={300} />
      </ChartCard>

      {/* 09. Violin Plot: Kernel Density Distribution by Sport */}
      <ChartCard
        title="09. Sentiment Density Violin Plot"
        subtitle="Gaussian KDE probability density hull with IQR box and median marker per sport"
        loading={loading}
        isEmpty={empty || (bundle?.sportViolins.length ?? 0) === 0}
        onExport={() => onExportChartCsv('sports-comparison')}
        className="lg:col-span-2"
      >
        <EChartBox option={violinOption as any} height={320} />
      </ChartCard>

      {/* 10. Heat Map: Sport × Time Sentiment Matrix */}
      <ChartCard
        title="10. Sport × Time Sentiment Heat Map"
        subtitle="Net polarity intensity across sports and recent time buckets"
        loading={loading}
        isEmpty={empty || (bundle?.heatmap.buckets.length ?? 0) === 0}
        onExport={() => onExportChartCsv('sports-comparison')}
      >
        <EChartBox option={heatmapOption as any} height={300} />
      </ChartCard>

      {/* 11. Bubble Chart: Volume × Score × Confidence */}
      <ChartCard
        title="11. Multi-Metric Sport Bubble Chart"
        subtitle="Volume (X) vs Avg Score (Y) with bubble radius scaled by deterministic NLP confidence"
        loading={loading}
        isEmpty={empty || (bundle?.bubbleData.length ?? 0) === 0}
        onExport={() => onExportChartCsv('sports-comparison')}
      >
        <EChartBox option={bubbleOption as any} height={300} />
      </ChartCard>

      {/* 12. Scatter Plot: Volume vs Sentiment Correlation */}
      <ChartCard
        title="12. Volume vs Sentiment Scatter Plot"
        subtitle="Daily sport-bucket scatter distribution of ingestion volume against net score"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <EChartBox option={scatterOption as any} height={300} />
      </ChartCard>

      {/* 13. Tree Map: Keyword Frequency Hierarchy */}
      <ChartCard
        title="13. Keyword Frequency Tree Map"
        subtitle="Hierarchical dominance of extracted players, tactics, and event tokens"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('keyword-analysis')}
      >
        <EChartBox option={treemapOption as any} height={300} />
      </ChartCard>

      {/* 14. Radar Chart: Emotion Intensity */}
      <ChartCard
        title="14. Emotion Analysis Radar"
        subtitle="Joy, Excitement, Surprise, Fear, Sadness, and Anger intensity profile"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('emotion-analysis')}
      >
        <EChartBox option={emotionRadarOption as any} height={300} />
      </ChartCard>

      {/* 15. Stacked Bar Chart: Aspect-Based Sentiment Analysis */}
      <ChartCard
        title="15. Aspect-Based Stacked Bar Chart"
        subtitle="Opinion breakdown across Teams, Players, Performance, Strategy, Coaching, Match Results"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('aspect-analysis')}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bundle?.aspectAnalysis || []} margin={{ top: 10, right: 10, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="aspect" stroke="#94A3B8" fontSize={10} interval={0} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="positive" stackId="a" name="Positive" fill="#10B981" />
              <Bar dataKey="neutral" stackId="a" name="Neutral" fill="#F59E0B" />
              <Bar dataKey="negative" stackId="a" name="Negative" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 16. Horizontal Bar Chart: Positive vs Negative Balance */}
      <ChartCard
        title="16. Polarity Balance Horizontal Bar Chart"
        subtitle="Horizontal positive vs negative percentage comparison by sport"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('sports-comparison')}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={bundle?.sportsComparison || []}
              margin={{ top: 5, right: 16, left: 16, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis type="number" stroke="#94A3B8" fontSize={11} />
              <YAxis type="category" dataKey="sport" stroke="#CBD5E1" fontSize={11} width={74} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="positivePct" name="Positive %" fill="#10B981" radius={[0, 3, 3, 0]} />
              <Bar dataKey="negativePct" name="Negative %" fill="#EF4444" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 17. Area Chart: Comment Ingestion Volume */}
      <ChartCard
        title="17. Comment Ingestion Area Chart"
        subtitle="Volume of sports comments processed over time"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('overall')}
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bundle?.trends || []} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="bucket" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="volume" name="Comments" stroke="#38BDF8" strokeWidth={2} fill="url(#volGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* 18. Interactive Word Cloud */}
      <ChartCard
        title="18. Keyword Analysis Word Cloud"
        subtitle="Proportional frequency sizing from Spark RDD flatMap().reduceByKey()"
        loading={loading}
        isEmpty={empty}
        onExport={() => onExportChartCsv('keyword-analysis')}
        className="lg:col-span-2"
      >
        <div className="min-h-[240px] flex flex-wrap items-center justify-center gap-x-5 gap-y-3 p-5 rounded-lg bg-[#070E1E] border border-slate-800/70">
          {(bundle?.topKeywords || []).slice(0, 32).map((kw) => {
            const ratio = kw.count / maxKwCount;
            const fontSize = Math.round(13 + ratio * 20);
            const colorClass =
              kw.polarity === 'POSITIVE'
                ? 'text-emerald-400 hover:text-emerald-300'
                : kw.polarity === 'NEGATIVE'
                  ? 'text-rose-400 hover:text-rose-300'
                  : 'text-sky-300 hover:text-cyan-200';
            return (
              <button
                key={kw.keyword}
                type="button"
                onClick={() => setSelectedKeyword(`${kw.keyword} (${kw.count} mentions · ${kw.polarity})`)}
                style={{ fontSize: `${fontSize}px` }}
                className={`font-display font-semibold transition-transform hover:scale-105 cursor-pointer ${colorClass}`}
              >
                {kw.keyword}
              </button>
            );
          })}
        </div>
        {selectedKeyword && (
          <p className="mt-2.5 text-xs font-mono-tabular text-cyan-300">
            Selected token: {selectedKeyword}
          </p>
        )}
      </ChartCard>
    </div>
  );
}
