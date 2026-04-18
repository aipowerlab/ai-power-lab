import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/utils/api';
import { openRazorpayCheckout, openNativePayment, startPayment } from '../../src/utils/razorpay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { useDrawer } from './_layout';

export default function WalletScreen() {
  const { openDrawer } = useDrawer();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [tab, setTab] = useState<'wallet' | 'withdraw'>('wallet');
  const [wdAmount, setWdAmount] = useState('');
  const [wdUpi, setWdUpi] = useState('');
  const [wdLoading, setWdLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ type: 'success' | 'failed'; message: string; balance?: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bal, txns, wds] = await Promise.all([
        api.getWalletBalance(),
        api.getWalletTransactions(),
        api.getWithdrawalHistory(),
      ]);
      setBalance(bal.balance || 0);
      setTransactions(txns.transactions || []);
      setWithdrawals(wds.withdrawals || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTopup = async () => {
    const amt = parseInt(topupAmount);
    if (!amt || amt < 50 || amt > 10000) {
      Alert.alert('Invalid Amount', 'Enter between ₹50 and ₹10,000');
      return;
    }
    setTopupLoading(true);
    setPaymentResult(null);
    try {
      if (Platform.OS === 'web') {
        const orderData = await api.walletTopup(amt);
        await startPayment({
          type: 'wallet_topup',
          amount: amt,
          orderData,
          onWebSuccess: async (response) => {
            try {
              const result = await api.verifyWalletTopup({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setBalance(result.balance || 0);
              setTopupAmount('');
              setPaymentResult({ type: 'success', message: result.message, balance: result.balance });
              fetchData();
            } catch (e: any) {
              setPaymentResult({ type: 'failed', message: e.message });
            }
            finally { setTopupLoading(false); }
          },
          onFailure: (error) => { setPaymentResult({ type: 'failed', message: error }); setTopupLoading(false); },
          onDismiss: () => setTopupLoading(false),
        });
      } else {
        await openNativePayment({
          type: 'wallet_topup',
          amount: amt,
          onSuccess: () => {
            setTopupAmount('');
            setPaymentResult({ type: 'success', message: `₹${amt} added to wallet!` });
            fetchData();
            setTopupLoading(false);
          },
          onFailure: (error) => { setPaymentResult({ type: 'failed', message: error }); setTopupLoading(false); },
          onDismiss: () => setTopupLoading(false),
        });
      }
    } catch (e: any) { setPaymentResult({ type: 'failed', message: e.message }); setTopupLoading(false); }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(wdAmount);
    if (!amt || amt < 500) { Alert.alert('Error', 'Minimum withdrawal is ₹500'); return; }
    if (amt > balance) { Alert.alert('Error', 'Insufficient balance'); return; }
    if (!wdUpi) { Alert.alert('Error', 'Please enter UPI ID'); return; }
    setWdLoading(true);
    try {
      const result = await api.requestWithdrawal({ amount: amt, upi_id: wdUpi });
      Alert.alert('Success', result.message);
      setWdAmount(''); setWdUpi('');
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setWdLoading(false); }
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={Colors.dark.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={openDrawer} style={s.menuBtn}><Ionicons name="menu" size={26} color={Colors.dark.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Wallet</Text>
        <View style={s.menuBtn} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.dark.primary} />}>
        {/* Balance Card */}
        <LinearGradient colors={[Colors.dark.primary, Colors.dark.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.balanceCard}>
          <Text style={s.balanceLabel}>Wallet Balance</Text>
          <Text style={s.balanceAmount}>₹{balance}</Text>
          <View style={s.balanceActions}>
            <TouchableOpacity style={s.balAction} onPress={() => setTab('wallet')}><Ionicons name="add-circle" size={20} color="#FFF" /><Text style={s.balActionText}>Add Money</Text></TouchableOpacity>
            <TouchableOpacity style={s.balAction} onPress={() => setTab('withdraw')}><Ionicons name="arrow-up-circle" size={20} color="#FFF" /><Text style={s.balActionText}>Withdraw</Text></TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Payment Result Banner */}
        {paymentResult && (
          <TouchableOpacity
            style={[s.resultBanner, paymentResult.type === 'success' ? s.resultSuccess : s.resultFailed]}
            onPress={() => setPaymentResult(null)}
          >
            <Ionicons name={paymentResult.type === 'success' ? 'checkmark-circle' : 'close-circle'} size={28} color={paymentResult.type === 'success' ? '#22C55E' : '#EF4444'} />
            <View style={{ flex: 1 }}>
              <Text style={s.resultTitle}>{paymentResult.type === 'success' ? 'Payment Successful!' : 'Payment Failed'}</Text>
              <Text style={s.resultMsg}>{paymentResult.message}</Text>
              {paymentResult.balance !== undefined && <Text style={s.resultBalance}>New Balance: ₹{paymentResult.balance}</Text>}
            </View>
            <Ionicons name="close" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={s.tabs}>
          {(['wallet', 'withdraw'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'wallet' ? 'Add Money' : 'Withdraw'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'wallet' ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Top-up Wallet</Text>
            <View style={s.quickAmounts}>
              {[100, 200, 500, 1000].map(a => (
                <TouchableOpacity key={a} style={[s.quickAmt, topupAmount === String(a) && s.quickAmtActive]} onPress={() => setTopupAmount(String(a))}>
                  <Text style={[s.quickAmtText, topupAmount === String(a) && s.quickAmtTextActive]}>₹{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="Enter amount (₹50 - ₹10,000)" placeholderTextColor={Colors.dark.textMuted} keyboardType="numeric" value={topupAmount} onChangeText={setTopupAmount} />
            <TouchableOpacity style={s.primaryBtn} onPress={handleTopup} disabled={topupLoading}>
              {topupLoading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="card" size={18} color="#FFF" /><Text style={s.primaryBtnText}>Pay with Razorpay</Text></>}
            </TouchableOpacity>
            <View style={s.methodsRow}><Text style={s.methodLabel}>UPI</Text><Text style={s.dot}>·</Text><Text style={s.methodLabel}>Card</Text><Text style={s.dot}>·</Text><Text style={s.methodLabel}>Netbanking</Text></View>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>Withdraw Earnings</Text>
            <Text style={s.cardDesc}>Minimum withdrawal: ₹500. Admin approves within 24-48 hrs.</Text>
            <TextInput style={s.input} placeholder="Amount (min ₹500)" placeholderTextColor={Colors.dark.textMuted} keyboardType="numeric" value={wdAmount} onChangeText={setWdAmount} />
            <TextInput style={s.input} placeholder="UPI ID (e.g., name@upi)" placeholderTextColor={Colors.dark.textMuted} value={wdUpi} onChangeText={setWdUpi} />
            <TouchableOpacity style={s.primaryBtn} onPress={handleWithdraw} disabled={wdLoading}>
              {wdLoading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="arrow-up-circle" size={18} color="#FFF" /><Text style={s.primaryBtnText}>Request Withdrawal</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* Transactions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={s.empty}><Ionicons name="receipt-outline" size={32} color={Colors.dark.textMuted} /><Text style={s.emptyText}>No transactions yet</Text></View>
          ) : transactions.map((tx: any, i: number) => (
            <View key={i} style={s.txRow}>
              <View style={[s.txIcon, { backgroundColor: tx.type === 'credit' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                <Ionicons name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'} size={16} color={tx.type === 'credit' ? Colors.dark.success : Colors.dark.error} />
              </View>
              <View style={s.txInfo}>
                <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={s.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={[s.txAmount, { color: tx.type === 'credit' ? Colors.dark.success : Colors.dark.error }]}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </Text>
            </View>
          ))}
        </View>

        {withdrawals.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Withdrawal History</Text>
            {withdrawals.map((wd: any, i: number) => (
              <View key={i} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: wd.status === 'approved' ? 'rgba(34,197,94,0.15)' : wd.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)' }]}>
                  <Ionicons name={wd.status === 'approved' ? 'checkmark' : wd.status === 'rejected' ? 'close' : 'time'} size={16} color={wd.status === 'approved' ? Colors.dark.success : wd.status === 'rejected' ? Colors.dark.error : Colors.dark.warning} />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txDesc}>₹{wd.amount} via {wd.upi_id || 'Bank'}</Text>
                  <Text style={s.txDate}>{wd.status.toUpperCase()} · {new Date(wd.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  loading: { flex: 1, backgroundColor: Colors.dark.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border, backgroundColor: Colors.dark.paper },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.dark.text },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  balanceCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.md, alignItems: 'center' },
  balanceLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balanceAmount: { fontSize: 44, fontWeight: '900', color: '#FFF', marginVertical: Spacing.sm },
  balanceActions: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.sm },
  balAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full },
  balActionText: { color: '#FFF', fontWeight: '600', fontSize: FontSize.sm },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border },
  tabActive: { backgroundColor: Colors.dark.primary + '20', borderColor: Colors.dark.primary },
  tabText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.dark.primary },
  card: { backgroundColor: Colors.dark.cardBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark.text, marginBottom: Spacing.sm },
  cardDesc: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.md },
  quickAmounts: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  quickAmt: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.dark.background, borderWidth: 1, borderColor: Colors.dark.border },
  quickAmtActive: { borderColor: Colors.dark.primary, backgroundColor: Colors.dark.primary + '15' },
  quickAmtText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.textMuted },
  quickAmtTextActive: { color: Colors.dark.primary },
  input: { backgroundColor: Colors.dark.inputBg, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSize.md, marginBottom: Spacing.md },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.dark.primary },
  primaryBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },
  methodsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  methodLabel: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  dot: { color: Colors.dark.textMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.dark.textMuted },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: FontSize.md, fontWeight: '600', color: Colors.dark.text },
  txDate: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  txAmount: { fontSize: FontSize.md, fontWeight: '700' },
  resultBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1 },
  resultSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  resultFailed: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  resultTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.dark.text },
  resultMsg: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, marginTop: 2 },
  resultBalance: { fontSize: FontSize.md, fontWeight: '800', color: Colors.dark.success, marginTop: 4 },
});
