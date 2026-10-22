import React, { createContext, useContext, useState, useEffect } from 'react';

const DateRangeContext = createContext();

export function DateRangeProvider({ children }) {
  const [dateRange, setDateRange] = useState(() => {
    // Default to THIS_MONTH up to Today (no future dates)
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const to = now.toISOString().split('T')[0];
    return {
      from,
      to,
      preset: 'THIS_MONTH',
    };
  });

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
