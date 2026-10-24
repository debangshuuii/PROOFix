import React from 'react';
import { CheckoutForm } from './CheckoutForm';

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white text-center mb-8">
          NextStore Express Checkout
        </h1>
        <CheckoutForm />
      </div>
    </main>
  );
}
