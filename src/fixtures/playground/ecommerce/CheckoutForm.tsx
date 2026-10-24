'use client';

import React, { useState } from 'react';

export function CheckoutForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handlePlaceOrder = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // BUG: Missing route handler at /api/checkout causes 404
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 'item_1', qty: 2 }] }),
    });

    if (!res.ok) {
      throw new Error(`Checkout failed with status: ${res.status}`);
    }

    const data = await res.json();
    setOrderId(data.orderId);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-xl text-white">
      <h2 className="text-xl font-bold mb-4">Complete Purchase</h2>
      {orderId ? (
        <div id="order-success" className="p-4 bg-emerald-950 text-emerald-400 rounded-lg">
          Order Confirmed! ID: {orderId}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-slate-800 rounded-lg">Total: $59.99 (2 Items)</div>
          {error && <div className="text-rose-400 text-sm">{error}</div>}
          <button
            id="place-order-btn"
            type="button"
            disabled={loading}
            onClick={handlePlaceOrder}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
          >
            {loading ? 'Processing...' : 'Place Order Now'}
          </button>
        </div>
      )}
    </div>
  );
}
