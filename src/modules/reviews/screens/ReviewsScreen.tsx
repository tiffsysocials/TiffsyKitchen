import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAuth } from '../../../context/AuthContext';
import { reviewsService } from '../../../services/reviews.service';
import { Review, ReviewStats } from '../../../types/api.types';
import ReviewCard from '../components/ReviewCard';

interface ReviewsScreenProps {
  onMenuPress?: () => void;
}

const RATING_FILTERS: { label: string; value: number | null }[] = [
  { label: 'All', value: null },
  { label: '5', value: 5 },
  { label: '4', value: 4 },
  { label: '3', value: 3 },
  { label: '2', value: 2 },
  { label: '1', value: 1 },
];

const ReviewsScreen: React.FC<ReviewsScreenProps> = ({ onMenuPress }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const {
    data,
    isLoading,
    refetch,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['reviews', isAdmin, ratingFilter],
    queryFn: ({ pageParam = 1 }) =>
      reviewsService.getReviews(isAdmin, {
        page: pageParam,
        limit: 15,
        sortBy: 'recent',
        ...(ratingFilter ? { rating: ratingFilter } : {}),
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const reviews: Review[] = useMemo(
    () => data?.pages?.flatMap((p) => p.reviews) ?? [],
    [data],
  );
  const stats: ReviewStats | undefined = data?.pages?.[0]?.stats;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const renderHeader = () => (
    <View>
      {/* Stats summary */}
      <View style={styles.statsCard}>
        <View style={styles.statsLeft}>
          <Text style={styles.avgValue}>
            {stats ? stats.averageRating.toFixed(1) : '—'}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Icon
                key={i}
                name={stats && i <= Math.round(stats.averageRating) ? 'star' : 'star-border'}
                size={16}
                color="#F59E0B"
              />
            ))}
          </View>
          <Text style={styles.totalText}>
            {stats ? `${stats.totalRatings} review${stats.totalRatings === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <View style={styles.statsRight}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats?.distribution?.[star] ?? 0;
            const total = stats?.totalRatings ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distStar}>{star}</Text>
                <Icon name="star" size={12} color="#F59E0B" />
                <View style={styles.distBarBg}>
                  <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Rating filter pills */}
      <View style={styles.filterRow}>
        {RATING_FILTERS.map((f) => {
          const active = ratingFilter === f.value;
          return (
            <TouchableOpacity
              key={String(f.value)}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setRatingFilter(f.value)}
              activeOpacity={0.7}
            >
              {f.value !== null && (
                <Icon name="star" size={12} color={active ? '#FFFFFF' : '#F59E0B'} />
              )}
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () =>
    isLoading ? null : (
      <View style={styles.emptyState}>
        <Icon name="rate-review" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>No reviews yet</Text>
      </View>
    );

  return (
    <SafeAreaScreen style={{ flex: 1 }} backgroundColor="#FE8733">
      {onMenuPress && (
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Reviews</Text>
          <View style={{ width: 24 }} />
        </GradientBox>
      )}

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#FE8733" />
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.orderId}
            renderItem={({ item }) => <ReviewCard review={item} showKitchen={isAdmin} />}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color="#FE8733" />
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} />
            }
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
          />
        )}
      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  menuButton: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  body: { flex: 1, backgroundColor: '#F9FAFB' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  statsLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#F1F1F1',
    width: 110,
  },
  avgValue: { fontSize: 36, fontWeight: '700', color: '#111827' },
  starsRow: { flexDirection: 'row', marginTop: 4 },
  totalText: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  statsRight: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  distStar: { fontSize: 11, color: '#6B7280', width: 10, textAlign: 'right' },
  distBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  distBarFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  distCount: { fontSize: 11, color: '#9CA3AF', width: 22 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: { backgroundColor: '#FE8733', borderColor: '#FE8733' },
  pillText: { fontSize: 13, color: '#6B7280', marginLeft: 2, fontWeight: '500' },
  pillTextActive: { color: '#FFFFFF' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
});

export default ReviewsScreen;
