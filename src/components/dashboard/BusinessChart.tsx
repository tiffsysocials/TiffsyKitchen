import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChartData } from '../../types/dashboard';
import { SectionHeader } from './SectionHeader';

interface BusinessChartProps {
  data: ChartData;
}

export const BusinessChart: React.FC<BusinessChartProps> = ({ data }) => {
  if (!data.points || data.points.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader title={data.title} />
        <Text style={{ textAlign: 'center', color: '#9ca3af', paddingVertical: 24 }}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.points.map((p) => p.value)) || 1;
  const maxSecondary = data.points[0]?.secondaryValue
    ? Math.max(...data.points.map((p) => p.secondaryValue || 0)) || 1
    : 0;

  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  return (
    <View style={styles.container}>
      <SectionHeader title={data.title} />

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: data.primaryColor }]} />
          <Text style={styles.legendText}>{data.primaryLabel}</Text>
        </View>
        {data.secondaryLabel && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: data.secondaryColor }]} />
            <Text style={styles.legendText}>{data.secondaryLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{formatValue(maxValue)}</Text>
          <Text style={styles.yAxisLabel}>{formatValue(maxValue / 2)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>

        <View style={styles.barsContainer}>
          {data.points.map((point) => (
            <View key={point.date} style={styles.barGroup}>
              <View style={styles.barsWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(point.value / maxValue) * 100}%`,
                      backgroundColor: data.primaryColor,
                    },
                  ]}
                />
                {point.secondaryValue !== undefined && maxSecondary > 0 && (
                  <View
                    style={[
                      styles.bar,
                      styles.secondaryBar,
                      {
                        height: `${(point.secondaryValue / maxSecondary) * 100}%`,
                        backgroundColor: data.secondaryColor,
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.xAxisLabel}>{point.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₹{(data.points.reduce((sum, p) => sum + p.value, 0) / 1000).toFixed(1)}k
          </Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
        {data.points[0]?.secondaryValue !== undefined && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {data.points.reduce((sum, p) => sum + (p.secondaryValue || 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Meals</Text>
          </View>
        )}
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₹{(data.points.reduce((sum, p) => sum + p.value, 0) / data.points.length / 1000).toFixed(1)}k
          </Text>
          <Text style={styles.summaryLabel}>Daily Avg</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
    marginBottom: 16,
  },
  yAxis: {
    width: 35,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingLeft: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 4,
  },
  bar: {
    width: 12,
    borderRadius: 4,
    marginHorizontal: 1,
    minHeight: 4,
  },
  secondaryBar: {
    opacity: 0.7,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 6,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

BusinessChart.displayName = 'BusinessChart';
