/**
 * مفاتيح TanStack Query موحّدة لكل التطبيق.
 * استخدمها بدل كتابة مصفوفات المفاتيح يدويًا لضمان توافق الـ invalidation.
 *
 * الاستخدام:
 *   useQuery({ queryKey: qk.cards.mine(), queryFn: ... })
 *   qc.invalidateQueries({ queryKey: qk.cards.all })
 */
export const qk = {
  profile: {
    all: ["profile"] as const,
    me: () => [...qk.profile.all, "me"] as const,
    byUsername: (username: string) => [...qk.profile.all, "u", username] as const,
    stats: () => [...qk.profile.all, "stats"] as const,
    recent: () => [...qk.profile.all, "recent"] as const,
    analytics: () => [...qk.profile.all, "analytics"] as const,
  },
  links: {
    all: ["links"] as const,
    mine: () => [...qk.links.all, "mine"] as const,
    ofProfile: (profileId: string) => [...qk.links.all, profileId] as const,
  },
  cards: {
    all: ["cards"] as const,
    mine: () => [...qk.cards.all, "mine"] as const,
    events: () => [...qk.cards.all, "events"] as const,
    eventsAll: () => [...qk.cards.all, "events", "all"] as const,
  },
  leads: {
    all: ["leads"] as const,
    mine: (filters?: Record<string, unknown>) =>
      filters ? ([...qk.leads.all, "mine", filters] as const) : ([...qk.leads.all, "mine"] as const),
  },
  admin: {
    all: ["admin"] as const,
    overview: () => [...qk.admin.all, "overview"] as const,
    stats: () => [...qk.admin.all, "stats"] as const,
    users: (filters?: Record<string, unknown>) =>
      filters ? ([...qk.admin.all, "users", filters] as const) : ([...qk.admin.all, "users"] as const),
    usersPicker: (q: string) => [...qk.admin.all, "users-picker", q] as const,
    user: (userId: string) => [...qk.admin.all, "user", userId] as const,
    userDetail: (userId: string, filters?: Record<string, unknown>) =>
      filters
        ? ([...qk.admin.all, "user-detail", userId, filters] as const)
        : ([...qk.admin.all, "user-detail", userId] as const),
    leads: (filters?: Record<string, unknown>) =>
      filters ? ([...qk.admin.all, "leads", filters] as const) : ([...qk.admin.all, "leads"] as const),
    cards: (filters?: Record<string, unknown>) =>
      filters ? ([...qk.admin.all, "cards", filters] as const) : ([...qk.admin.all, "cards"] as const),
    scannerActions: () => [...qk.admin.all, "scanner-actions"] as const,
    settings: () => [...qk.admin.all, "settings"] as const,
    actions: (filters?: Record<string, unknown>) =>
      filters ? ([...qk.admin.all, "actions", filters] as const) : ([...qk.admin.all, "actions"] as const),
  },
  amIAdmin: () => ["am-i-admin"] as const,
} as const;
