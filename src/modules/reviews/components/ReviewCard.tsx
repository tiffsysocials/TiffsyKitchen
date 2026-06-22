import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Review } from '../../../types/api.types';

interface ReviewCardProps {
  review: Review;
  // Show the kitchen name (useful in the admin all-kitchens view).
  showKitchen?: boolean;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const Stars: React.FC<{ value: number }> = ({ value }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Icon
        key={i}
        name={i <= value ? 'star' : 'star-border'}
        size={18}
        color={i <= value ? '#F59E0B' : '#D1D5DB'}
      />
    ))}
  </View>
);

const ReviewCard: React.FC<ReviewCardProps> = ({ review, showKitchen }) => {
  const itemsSummary = (review.items || [])
    .map((it) => (it.quantity > 1 ? `${it.name} x${it.quantity}` : it.name))
    .join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{review.customerName}</Text>
          <Text style={styles.orderNumber}>Order #{review.orderNumber}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Stars value={review.stars} />
          <Text style={styles.date}>{formatDate(review.ratedAt)}</Text>
        </View>
      </View>

      {showKitchen && review.kitchenName ? (
        <View style={styles.kitchenRow}>
          <Icon name="storefront" size={14} color="#6B7280" />
          <Text style={styles.kitchenName}>{review.kitchenName}</Text>
        </View>
      ) : null}

      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

      {review.tags && review.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {review.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {itemsSummary ? (
        <Text style={styles.items} numberOfLines={2}>
          {itemsSummary}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  orderNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  kitchenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  kitchenName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    marginTop: 10,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: '#FFF1E7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#FE8733',
    fontWeight: '500',
  },
  items: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});

export default ReviewCard;
