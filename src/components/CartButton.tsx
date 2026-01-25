/**
 * Example React component for cart functionality
 * 
 * This demonstrates React islands in Astro.
 * For full cart state management, consider using nanostores
 * as mentioned in the project rules.
 */

import { useState } from 'react';

interface CartButtonProps {
  productId: string;
  productName: string;
}

export default function CartButton({ productId, productName }: CartButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    
    // TODO: Implement actual cart API call
    // This is a placeholder for WooCommerce cart mutation
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setIsAdding(false);
    setAdded(true);
    
    setTimeout(() => setAdded(false), 3000);
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding || added}
      className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {isAdding ? 'Adding...' : added ? 'Added to Cart!' : 'Add to Cart'}
    </button>
  );
}
