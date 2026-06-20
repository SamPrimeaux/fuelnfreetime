/**
 * Default page/section content — used when D1/KV have no published snapshot yet.
 * Mirrors current static HTML so the CMS pipeline works before first seed/publish.
 */

export const CMS_STUBS = {
  home: {
    title: "Home",
    sections: {
      hero: {
        titleLine1: "TIME IS THE",
        titleLine2: "REAL HORSEPOWER",
        subheadline:
          "For those who've earned their freedom — on two wheels, four wheels, water, or in the garage.",
        ctaLabel: "Explore More",
        ctaHref: "./shop.html",
      },
    },
  },
  shop: {
    title: "Shop",
    sections: {
      hero: {
        eyebrow: "Collections",
        headline: "A lifestyle built from grit — and time.",
        subheadline:
          "Shop High Octane, Masters, and Essentials. Clean grid. Real stories. Fire-orange attitude.",
        imageUrl:
          "https://cdn.shopify.com/s/files/1/0666/4060/9411/files/high_octane.jpg?v=1756307558",
        ctaPrimary: { label: "Shop All", href: "#fft-grid" },
        ctaSecondary: { label: "Browse Collections", href: "#fft-collections" },
      },
    },
  },
  about: {
    title: "About",
    sections: {
      hero: {
        meta1: "Est. 2025",
        meta2: "Made in Lafayette, Louisiana",
        headline: "Built in the Garage",
        subheadline:
          "Born from blood, sweat, and years of earning our freedom. This is more than a brand — it's a brotherhood.",
      },
    },
  },
  community: {
    title: "Community",
    sections: {
      hero: {
        headline: "Join the",
        headlineAccent: "Movement",
        subheadline:
          "Where every mile has a story, every hour is earned, and every member is family. This is more than a brand — it's a brotherhood of freedom seekers.",
        stat1Value: "5K+",
        stat1Label: "Members Strong",
        stat2Value: "23",
        stat2Label: "Cities Connected",
        stat3Value: "150+",
        stat3Label: "Events Hosted",
        stat4Value: "∞",
        stat4Label: "Stories Shared",
      },
    },
  },
};

export function getStubPage(slug) {
  const stub = CMS_STUBS[slug];
  if (!stub) return null;
  return {
    slug,
    title: stub.title,
    status: "published",
    sections: Object.entries(stub.sections).map(([key, content], index) => ({
      key,
      sort_order: index,
      status: "published",
      content,
      updated_at: null,
    })),
    source: "stub",
  };
}

export function listStubPages() {
  return Object.keys(CMS_STUBS).map((slug) => ({
    slug,
    title: CMS_STUBS[slug].title,
    status: "published",
    section_count: Object.keys(CMS_STUBS[slug].sections).length,
    updated_at: null,
    source: "stub",
  }));
}
