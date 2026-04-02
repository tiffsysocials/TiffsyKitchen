import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Order, StatusTimelineStep } from '../models/types';
import { StatusBadge, SectionHeader, TimelineStep } from '../components';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatRelativeTime,
  getPlanDisplayName,
  getPackagingDisplayName,
  generateStatusTimeline,
  orderStatusColors,
} from '../utils/orderUtils';
import {
  loadOrderNotes,
  saveOrderNotes,
  loadOrderSections,
  saveOrderSections,
  OrderSectionsState,
} from '../storage/orderNotesStorage';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';

interface OrderDetailScreenProps {
  order: Order;
  onBack: () => void;
  fromUserProfile?: boolean;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  order,
  onBack,
  fromUserProfile = false,
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [sections, setSections] = useState<OrderSectionsState>({
    customer: true,
    items: true,
    subscription: true,
    delivery: true,
    payment: true,
    support: true,
    notes: true,
    audit: true,
  });
  const { showInfo } = useAlert();

  const statusTimeline = generateStatusTimeline(order);
  const isFailed = ['FAILED', 'CANCELLED', 'REFUNDED'].includes(order.status);

  // Load saved notes and section states
  useEffect(() => {
    const loadData = async () => {
      const [savedNotes, savedSections] = await Promise.all([
        loadOrderNotes(order.id),
        loadOrderSections(order.id),
      ]);
      setAdminNotes(savedNotes);
      setSections(savedSections);
    };
    loadData();
  }, [order.id]);

  // Auto-save notes with debounce
  useEffect(() => {
    setNotesSaved(false);
    const timer = setTimeout(async () => {
      await saveOrderNotes(order.id, adminNotes);
      setNotesSaved(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [adminNotes, order.id]);

  // Toggle section visibility
  const toggleSection = useCallback(async (section: keyof OrderSectionsState) => {
    const newSections = { ...sections, [section]: !sections[section] };
    setSections(newSections);
    await saveOrderSections(order.id, newSections);
  }, [sections, order.id]);

  // View customer profile
  const handleViewCustomerProfile = () => {
    showInfo('Navigate', 'Would navigate to customer profile');
  };

  // Render failure banner
  const renderFailureBanner = () => {
    if (!isFailed || !order.failureBanner) return null;

    return (
      <View style={styles.failureBanner}>
        <MaterialIcons name="error" size={20} color={colors.white} />
        <Text style={styles.failureBannerText}>{order.failureBanner}</Text>
      </View>
    );
  };

  // Render order summary card
  const renderSummaryCard = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.pricing.finalTotal)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Payment</Text>
          <StatusBadge status={order.payment.status} type="payment" size="medium" />
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Plan</Text>
          <Text style={styles.summaryValueSmall}>
            {order.subscription ? getPlanDisplayName(order.subscription.planName) : 'One-time order'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Voucher</Text>
          <Text style={styles.summaryValueSmall}>
            {order.voucher
              ? `${order.voucher.sequenceNumber} / ${order.subscription?.totalVouchers || '-'}`
              : 'N/A'}
          </Text>
        </View>
      </View>
      <View style={styles.deliverySlotRow}>
        <MaterialIcons name="schedule" size={16} color={colors.textMuted} />
        <Text style={styles.deliverySlotText}>{order.deliverySlot.label}</Text>
      </View>
    </View>
  );

  // Render customer section
  const renderCustomerSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Customer"
        collapsible
        isCollapsed={!sections.customer}
        onToggleCollapse={() => toggleSection('customer')}
        actionLabel="View Profile"
        onActionPress={handleViewCustomerProfile}
      />
      {sections.customer && (
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>{order.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="phone" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>{order.customer.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={18} color={colors.textMuted} />
            <View style={styles.addressContainer}>
              <Text style={styles.infoText}>{order.deliveryAddress.line1}</Text>
              {order.deliveryAddress.line2 && (
                <Text style={styles.infoTextSecondary}>{order.deliveryAddress.line2}</Text>
              )}
              <Text style={styles.infoTextSecondary}>
                {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}
              </Text>
            </View>
          </View>
          {order.customer.dietaryPreferences.length > 0 && (
            <View style={styles.tagsRow}>
              {order.customer.dietaryPreferences.map((pref) => (
                <View key={pref} style={styles.dietaryTag}>
                  <Text style={styles.dietaryTagText}>{pref}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Render items & pricing section
  const renderItemsSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Items & Pricing"
        collapsible
        isCollapsed={!sections.items}
        onToggleCollapse={() => toggleSection('items')}
      />
      {sections.items && (
        <>
          {/* Items List */}
          <View style={styles.card}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.dishName}</Text>
                  <View style={styles.itemTags}>
                    {item.dietaryTags.map((tag) => (
                      <Text key={tag} style={styles.itemTag}>{tag}</Text>
                    ))}
                    {item.isAddon && <Text style={styles.addonTag}>Add-on</Text>}
                  </View>
                </View>
                <View style={styles.itemPricing}>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Packaging */}
          <View style={styles.packagingRow}>
            <MaterialIcons
              name={order.packagingType === 'STEEL_DABBA' ? 'eco' : 'takeout-dining'}
              size={18}
              color={colors.textMuted}
            />
            <Text style={styles.packagingText}>
              Packaging: {getPackagingDisplayName(order.packagingType)}
            </Text>
            {order.packagingType === 'STEEL_DABBA' && order.subscription && order.subscription.totalVouchers > 14 && (
              <Text style={styles.packagingNote}>Auto-enabled for plans 14+ days</Text>
            )}
          </View>

          {/* Price Breakdown */}
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Items Subtotal</Text>
              <Text style={styles.priceValue}>{formatCurrency(order.pricing.itemsSubtotal)}</Text>
            </View>
            {order.pricing.addonsTotal > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Add-ons</Text>
                <Text style={styles.priceValue}>{formatCurrency(order.pricing.addonsTotal)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Packaging</Text>
              <Text style={styles.priceValue}>{formatCurrency(order.pricing.packagingFee)}</Text>
            </View>
            {order.pricing.discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelDiscount}>
                  Discount {order.pricing.discountCode && `(${order.pricing.discountCode})`}
                </Text>
                <Text style={styles.priceValueDiscount}>-{formatCurrency(order.pricing.discount)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax ({order.pricing.taxRate}%)</Text>
              <Text style={styles.priceValue}>{formatCurrency(order.pricing.tax)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(order.pricing.finalTotal)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  // Render subscription & voucher section
  const renderSubscriptionSection = () => {
    if (!order.subscription) return null;

    return (
      <View style={styles.section}>
        <SectionHeader
          title="Subscription & Voucher"
          collapsible
          isCollapsed={!sections.subscription}
          onToggleCollapse={() => toggleSection('subscription')}
        />
        {sections.subscription && (
          <View style={styles.card}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.planName}>{getPlanDisplayName(order.subscription.planName)}</Text>
              <StatusBadge
                status={order.subscription.status === 'ACTIVE' ? 'DELIVERED' : 'PENDING'}
                type="order"
                size="small"
              />
            </View>
            <Text style={styles.planDates}>
              {formatDate(order.subscription.startDate)} - {formatDate(order.subscription.endDate)}
            </Text>
            <View style={styles.voucherProgress}>
              <Text style={styles.voucherText}>
                Vouchers: {order.subscription.usedVouchers} / {order.subscription.totalVouchers} used
              </Text>
              <View style={styles.voucherBar}>
                <View
                  style={[
                    styles.voucherBarFill,
                    { width: `${(order.subscription.usedVouchers / order.subscription.totalVouchers) * 100}%` },
                  ]}
                />
              </View>
            </View>
            {order.voucher && (
              <View style={styles.voucherInfo}>
                <MaterialIcons name="confirmation-number" size={16} color={colors.textMuted} />
                <Text style={styles.voucherInfoText}>
                  Voucher #{order.voucher.sequenceNumber} redeemed at {formatTime(order.voucher.redeemedAt || '')}
                </Text>
              </View>
            )}
            {order.voucher?.ruleExplanation && (
              <View style={styles.ruleExplanation}>
                <MaterialIcons name="info-outline" size={14} color={colors.info} />
                <Text style={styles.ruleExplanationText}>{order.voucher.ruleExplanation}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render delivery section
  const renderDeliverySection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Delivery & Logistics"
        collapsible
        isCollapsed={!sections.delivery}
        onToggleCollapse={() => toggleSection('delivery')}
      />
      {sections.delivery && (
        <>
          {/* Delivery Partner */}
          {order.deliveryAssignment && (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Delivery Partner</Text>
              <View style={styles.partnerRow}>
                <View style={styles.partnerAvatar}>
                  <Text style={styles.partnerInitial}>
                    {order.deliveryAssignment.partner.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{order.deliveryAssignment.partner.name}</Text>
                  <Text style={styles.partnerPhone}>{order.deliveryAssignment.partner.phone}</Text>
                  <Text style={styles.partnerStats}>
                    On-time: {order.deliveryAssignment.partner.onTimePercentage}% • {order.deliveryAssignment.partner.totalDeliveries} deliveries
                  </Text>
                </View>
              </View>
              {order.deliveryAssignment.deliveryInstructions.length > 0 && (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsLabel}>Instructions:</Text>
                  <View style={styles.instructionsTags}>
                    {order.deliveryAssignment.deliveryInstructions.map((instruction) => (
                      <View key={instruction} style={styles.instructionTag}>
                        <Text style={styles.instructionTagText}>{instruction}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Status Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Status Timeline</Text>
            {statusTimeline.map((step, index) => (
              <TimelineStep
                key={step.status}
                step={step}
                isLast={index === statusTimeline.length - 1}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );

  // Render payment section
  const renderPaymentSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Payment & Refund"
        collapsible
        isCollapsed={!sections.payment}
        onToggleCollapse={() => toggleSection('payment')}
      />
      {sections.payment && (
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentMethod}>
                {order.payment.method} Payment
              </Text>
              <StatusBadge status={order.payment.status} type="payment" size="small" />
            </View>
            <Text style={styles.paymentAmount}>{formatCurrency(order.payment.amount)}</Text>
          </View>
          {order.payment.transactionRef && (
            <Text style={styles.transactionRef}>Ref: {order.payment.transactionRef}</Text>
          )}
          {order.payment.paidAt && (
            <Text style={styles.paymentTime}>Paid at {formatDate(order.payment.paidAt, true)}</Text>
          )}

          {order.refund && (
            <View style={styles.refundCard}>
              <View style={styles.refundHeader}>
                <MaterialIcons name="currency-exchange" size={18} color={colors.error} />
                <Text style={styles.refundTitle}>Refund Issued</Text>
              </View>
              <Text style={styles.refundAmount}>{formatCurrency(order.refund.amount)}</Text>
              <Text style={styles.refundReason}>{order.refund.reasonText || order.refund.reason}</Text>
              <Text style={styles.refundMeta}>
                Processed by {order.refund.processedBy} at {formatDate(order.refund.processedAt, true)}
              </Text>
              {order.refund.refundRef && (
                <Text style={styles.refundRef}>Ref: {order.refund.refundRef}</Text>
              )}
            </View>
          )}

          {!order.refund && (
            <Text style={styles.noRefundText}>No refund issued for this order</Text>
          )}
        </View>
      )}
    </View>
  );

  // Render support section
  const renderSupportSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Support & Feedback"
        collapsible
        isCollapsed={!sections.support}
        onToggleCollapse={() => toggleSection('support')}
      />
      {sections.support && (
        <>
          {/* Feedback */}
          {order.feedback ? (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Customer Rating</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= order.feedback!.rating ? 'star' : 'star-border'}
                    size={24}
                    color={star <= order.feedback!.rating ? '#fbbf24' : colors.textMuted}
                  />
                ))}
                <Text style={styles.ratingValue}>{order.feedback.rating}/5</Text>
              </View>
              {order.feedback.tags.length > 0 && (
                <View style={styles.feedbackTags}>
                  {order.feedback.tags.map((tag) => (
                    <View key={tag} style={styles.feedbackTag}>
                      <Text style={styles.feedbackTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              {order.feedback.comment && (
                <Text style={styles.feedbackComment}>"{order.feedback.comment}"</Text>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.noDataText}>No feedback received yet</Text>
            </View>
          )}

          {/* Linked Tickets */}
          {order.linkedTickets.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Linked Tickets</Text>
              {order.linkedTickets.map((ticket) => (
                <TouchableOpacity key={ticket.id} style={styles.ticketRow}>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                    <Text style={styles.ticketTitle}>{ticket.title}</Text>
                  </View>
                  <View style={[styles.ticketStatus, { backgroundColor: ticket.status === 'RESOLVED' ? colors.successLight : colors.warningLight }]}>
                    <Text style={[styles.ticketStatusText, { color: ticket.status === 'RESOLVED' ? colors.success : colors.warning }]}>
                      {ticket.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );

  // Render admin notes section
  const renderAdminNotesSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Admin Notes"
        collapsible
        isCollapsed={!sections.notes}
        onToggleCollapse={() => toggleSection('notes')}
      />
      {sections.notes && (
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="Write internal notes about this order (visible only to admins)..."
            placeholderTextColor={colors.textMuted}
            value={adminNotes}
            onChangeText={setAdminNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.notesSavedIndicator}>
            <MaterialIcons
              name={notesSaved ? 'cloud-done' : 'cloud-upload'}
              size={14}
              color={notesSaved ? colors.success : colors.textMuted}
            />
            <Text style={[styles.notesSavedText, { color: notesSaved ? colors.success : colors.textMuted }]}>
              {notesSaved ? 'Saved' : 'Saving...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // Render audit trail section
  const renderAuditSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Activity Log"
        collapsible
        isCollapsed={!sections.audit}
        onToggleCollapse={() => toggleSection('audit')}
      />
      {sections.audit && (
        <View style={styles.card}>
          {order.auditLog.map((log) => (
            <View key={log.id} style={styles.auditRow}>
              <View style={styles.auditDot} />
              <View style={styles.auditContent}>
                <Text style={styles.auditDescription}>{log.description}</Text>
                <View style={styles.auditMeta}>
                  <Text style={styles.auditActor}>{log.actorName || log.actor}</Text>
                  <Text style={styles.auditTime}>{formatRelativeTime(log.timestamp)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>
            {order.mealType === 'lunch' ? 'Lunch' : 'Dinner'} • {formatDate(order.createdAt)}
          </Text>
        </View>
        <StatusBadge status={order.status} type="order" size="medium" showIcon />
      </GradientBox>

      {/* Failure Banner */}
      {renderFailureBanner()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSummaryCard()}
        {renderCustomerSection()}
        {renderItemsSection()}
        {renderSubscriptionSection()}
        {renderDeliverySection()}
        {renderPaymentSection()}
        {renderSupportSection()}
        {renderAdminNotesSection()}
        {renderAuditSection()}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  failureBanner: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  failureBannerText: {
    fontSize: 13,
    color: colors.white,
    marginLeft: spacing.sm,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deliverySlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  deliverySlotText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  infoTextSecondary: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addressContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  dietaryTag: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: spacing.xs,
  },
  dietaryTagText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  itemTag: {
    fontSize: 10,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  addonTag: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  packagingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  packagingText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  packagingNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  priceLabelDiscount: {
    fontSize: 13,
    color: colors.success,
  },
  priceValueDiscount: {
    fontSize: 13,
    color: colors.success,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  planDates: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  voucherProgress: {
    marginBottom: spacing.md,
  },
  voucherText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  voucherBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  voucherBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  voucherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  voucherInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  ruleExplanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
  },
  ruleExplanationText: {
    fontSize: 11,
    color: colors.info,
    marginLeft: spacing.xs,
    flex: 1,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  partnerInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  partnerPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  partnerStats: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  instructionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  instructionsLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  instructionsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  instructionTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: spacing.xs,
  },
  instructionTagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transactionRef: {
    fontSize: 11,
    color: colors.textMuted,
  },
  paymentTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refundCard: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.md,
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginLeft: spacing.xs,
  },
  refundAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  refundReason: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  refundMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  refundRef: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  noRefundText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  feedbackTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  feedbackTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  feedbackTagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  feedbackComment: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ticketTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ticketStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ticketStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
  },
  notesSavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  notesSavedText: {
    fontSize: 11,
    marginLeft: 4,
  },
  auditRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginTop: 6,
    marginRight: spacing.md,
  },
  auditContent: {
    flex: 1,
  },
  auditDescription: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  auditMeta: {
    flexDirection: 'row',
    marginTop: 2,
  },
  auditActor: {
    fontSize: 11,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  auditTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomSpacing: {
    height: spacing.xxxl,
  },
});

OrderDetailScreen.displayName = 'OrderDetailScreen';

export default OrderDetailScreen;
