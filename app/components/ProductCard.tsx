'use client';

import { useRouter } from 'next/navigation';

interface ProductResponse {
  id: string;
  name: string;
  code: string;
  sellerHospitalName: string;
  sellerHospitalId: number;
  sellerVerified?: boolean;
  unit: string;
  quantity: number;
  expiryDate: string;
  price: number;
  currency: string;
  manufacturer?: string;
  brandName?: string;
  lotNumber?: string;
  description?: string;
}

export default function ProductCard({ product }: { product: ProductResponse }) {
  const router = useRouter();
  
  // Format price to show euros and cents separately
  const priceWhole = Math.floor(product.price);
  const priceCents = Math.round((product.price - priceWhole) * 100);
  
  // Format expiry date
  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const handleViewProduct = () => {
    router.push(`/marketplace/product/${product.id}`);
  };

  return (
    <div className="bg-secondary rounded-2xl p-6 flex flex-col h-full border border-secondary-2">
      {/* Product Name */}
      <h3 className="text-lg font-semibold text-black mb-1">
        {product.name}
      </h3>
      
      {/* Seller */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-sm text-gray-600">by </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const formattedName = product.sellerHospitalName.replace(/\s+/g, '-');
            router.push(`/hospital/${formattedName}`);
          }}
          className="text-sm text-gray-900 hover:underline cursor-pointer font-medium"
        >
          {product.sellerHospitalName}
        </button>
        <svg 
            className="w-4 h-4 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
      </div>

      {/* Code */}
      {product.code && (
        <p className="text-sm text-gray-600 mb-4">
          Code: {product.code}
        </p>
      )}

      {/* Product Details Grid */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-6 text-sm">
        <div>
          <p className="text-gray-500 text-xs mb-1">Unit</p>
          <p className="text-gray-700 font-medium">{product.unit}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Quantity</p>
          <p className="text-gray-700 font-medium">{product.quantity}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-1">Expiry date</p>
          <p className="text-gray-700 font-medium">{formatExpiryDate(product.expiryDate)}</p>
        </div>
      </div>

      {/* Price and Button */}
      <div className="mt-auto flex items-center justify-between">
        <div className="text-2xl font-bold text-black">
          {priceWhole}
          <sup className="text-sm">{String(priceCents).padStart(2, '0')}</sup>
          <span className="text-base font-normal ml-1">{product.currency || 'euro'}</span>
        </div>
        <button
          onClick={handleViewProduct}
          className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          View
        </button>
      </div>
    </div>
  );
}

