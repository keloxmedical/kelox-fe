'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { authenticatedFetch } from '@/lib/api';
import NavBar from '@/app/components/NavBar';

type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND' | 'SALE';

interface WalletTransactionResponse {
  id: number;
  hospitalId: number;
  hospitalName: string;
  type: TransactionType;
  amount: number;
  description: string;
  orderId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { jwtToken, hospitalProfile, isLoadingProfile } = useUser();
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'withdrawals'>('history');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingProfile && !hospitalProfile) {
      router.push('/');
      return;
    }

    if (hospitalProfile && jwtToken) {
      fetchTransactions();
    }
  }, [hospitalProfile, jwtToken, isLoadingProfile]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/api/hospitals/my-transactions');
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProfile || !hospitalProfile) {
    return (
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredTransactions = activeTab === 'withdrawals' 
    ? transactions.filter(t => t.type === 'WITHDRAWAL')
    : transactions;

  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Wallet Card */}
        <div className="mb-8 flex justify-center">
          <div className="relative rounded-3xl p-5 text-white shadow-xl w-full max-w-md h-44 overflow-hidden flex flex-col" style={{ background: 'linear-gradient(to bottom right, #000000, #6C6C6C)' }}>
            {/* Logo */}
            <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 opacity-10">
              <img src="/klxlogo.png" alt="Kelox" className="w-32 h-32 object-contain" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <h2 className="text-lg font-bold mb-3">Wallet</h2>
              
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className="text-2xl font-bold">
                  {hospitalProfile.balance.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).replace(',', ' ').replace('.', ',')} euro
                </p>
              </div>

              {/* <button className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors cursor-pointer text-sm mt-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-medium">Request Withdrawal</span>
              </button> */}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'history'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-4 px-2 font-medium transition-colors relative cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Withdrawals
            {activeTab === 'withdrawals' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 -mb-px"></div>
            )}
          </button>
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading transactions...</p>
            </div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const isPositive = transaction.type === 'DEPOSIT' || transaction.type === 'SALE' || transaction.type === 'REFUND';
              const displayAmount = transaction.amount.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              }).replace(',', ' ').replace('.', ',');

              return (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.type === 'WITHDRAWAL' && 'Withdrawal'}
                        {transaction.type === 'DEPOSIT' && 'Deposit'}
                        {transaction.type === 'PAYMENT' && 'Payment'}
                        {transaction.type === 'SALE' && `TX ID: ${transaction.orderId?.substring(0, 13)}-...`}
                        {transaction.type === 'REFUND' && 'Refund'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      on {new Date(transaction.createdAt).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                    {transaction.description && (
                      <p className="text-xs text-gray-600 mt-1">{transaction.description}</p>
                    )}
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className={`text-base font-semibold ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? '+' : '-'} {displayAmount} euro
                    </p>
                    {transaction.orderId && (
                      <button 
                        onClick={() => router.push(`/hospital/${hospitalProfile.name.replace(/\s+/g, '-')}?tab=sales`)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
                      >
                        View order &gt;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

