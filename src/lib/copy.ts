export const copy = {
  appName: "EasyBiz",
  home: {
    summary:
      "Today you sold KES 24,500. You are owed KES 8,000. Two items are low in stock.",
    ctaPrimary: "New sale / invoice",
    ctaSecondary: "View money",
    offline: "You are offline. We will send this when you are back.",
  },
  activity: {
    examples: [
      { title: "Mary paid KES 2,000 via M-Pesa.", tone: "success" as const },
      { title: "Invoice sent to John. Waiting for payment.", tone: "info" as const },
      { title: "Sugar is running low. Reorder?", tone: "alert" as const },
    ],
  },
  labels: {
    cash: "Cash today",
    mpesa: "M-Pesa today",
    owed: "Owed to you",
    lowStock: "Low stock",
  },
};
