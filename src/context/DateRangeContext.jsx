import React, { createContext, useContext, useState, useEffect } from 'react';

const DateRangeContext = createContext();

export function DateRangeProvider({ children }) {
  const [dateRange, setDateRange] = useState(() => {
    // Default: last 7 days including today (local dates, never future)
    const now = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { from: fmt(from), to: fmt(now), preset: 'LAST_7_DAYS' };
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
