/**
 * CMS section registry — source of truth for page/section schemas and seed defaults.
 * Used for: D1 seeding, admin field schemas, merge defaults on edit (not public fallback).
 */
import { M } from "./media-paths.js";

/** @typedef {{ key: string, label: string, type: 'text'|'textarea'|'url', media?: boolean }} FieldDef */

/**
 * @type {Record<string, { title: string, sections: Record<string, { sortOrder: number, fields: FieldDef[], defaultContent: object }> }>}
 */
export const PAGE_REGISTRY = {
  site: {
    title: "Site (global)",
    sections: {
      brand: {
        sortOrder: 0,
        fields: [
          { key: "logoUrl", label: "Logo URL", type: "url", media: true },
          { key: "tagline", label: "Tagline", type: "text" },
          { key: "footerDescription", label: "Footer description", type: "textarea" },
        ],
        defaultContent: {
          logoUrl: M.logo,
          tagline: "Time is the real flex.",
          footerDescription:
            "For those who've earned their freedom through hard work, service, and dedication. This is more than apparel — it's a badge of the life you've built.",
        },
      },
    },
  },
  home: {
    title: "Home",
    sections: {
      hero: {
        sortOrder: 0,
        fields: [
          { key: "titleLine1", label: "Title line 1", type: "text" },
          { key: "titleLine2", label: "Title line 2 (emphasis)", type: "text" },
          { key: "subheadline", label: "Subheadline", type: "textarea" },
          { key: "ctaLabel", label: "CTA label", type: "text" },
          { key: "ctaHref", label: "CTA link", type: "text" },
          { key: "glbUrl", label: "3D model URL", type: "url", media: true },
        ],
        defaultContent: {
          titleLine1: "TIME IS THE",
          titleLine2: "REAL HORSEPOWER",
          subheadline:
            "For those who've earned their freedom — on two wheels, four wheels, water, or in the garage.",
          ctaLabel: "Explore More",
          ctaHref: "/shop",
          glbUrl: M.glbEmblem,
        },
      },
      manifesto: {
        sortOrder: 1,
        fields: [
          { key: "line1", label: "Title line 1", type: "text" },
          { key: "highlight1", label: "Highlight word 1", type: "text" },
          { key: "line2", label: "Title line 2", type: "text" },
          { key: "highlight2", label: "Highlight word 2", type: "text" },
          { key: "body1", label: "Paragraph 1", type: "textarea" },
          { key: "body2", label: "Paragraph 2", type: "textarea" },
          { key: "body3", label: "Paragraph 3 (emphasis)", type: "textarea" },
          { key: "imageUrl", label: "Side image", type: "url", media: true },
        ],
        defaultContent: {
          line1: "Some chase",
          highlight1: "horsepower.",
          line2: "We chase",
          highlight2: "hours.",
          body1:
            "Fuel & Free Time isn't about how fast you go — it's about finally having the time to go at all.",
          body2:
            "Born in a Lafayette garage, built for those who've earned their freedom. Whether you're a veteran who's done your time, a weekend warrior stealing moments, or a young gun working toward that first real ride.",
          body3: "You get it. Time is everything money can't buy back.",
          imageUrl: M.coreCollection,
        },
      },
      collections: {
        sortOrder: 2,
        fields: [
          { key: "badge", label: "Badge", type: "text" },
          { key: "title", label: "Section title", type: "text" },
          { key: "card1.name", label: "Card 1 name", type: "text" },
          { key: "card1.description", label: "Card 1 description", type: "text" },
          { key: "card1.imageUrl", label: "Card 1 image", type: "url", media: true },
          { key: "card1.href", label: "Card 1 link", type: "text" },
          { key: "card2.name", label: "Card 2 name", type: "text" },
          { key: "card2.description", label: "Card 2 description", type: "text" },
          { key: "card2.imageUrl", label: "Card 2 image", type: "url", media: true },
          { key: "card2.href", label: "Card 2 link", type: "text" },
          { key: "card3.name", label: "Card 3 name", type: "text" },
          { key: "card3.description", label: "Card 3 description", type: "text" },
          { key: "card3.imageUrl", label: "Card 3 image", type: "url", media: true },
          { key: "card3.href", label: "Card 3 link", type: "text" },
        ],
        defaultContent: {
          badge: "Limited Drops",
          title: "Fuel Your Style",
          card1: {
            name: "High Octane",
            description: "Performance gear for redline living",
            imageUrl: M.highOctane,
            href: "/collections/high-octane-performance-gear",
          },
          card2: {
            name: "Masters",
            description: "For those who've earned their stripes",
            imageUrl: M.masters,
            href: "/collections/masters",
          },
          card3: {
            name: "Essentials",
            description: "Daily drivers for the daily grind",
            imageUrl: M.goneFishing,
            href: "/collections/essentials",
          },
        },
      },
      values: {
        sortOrder: 3,
        fields: [
          { key: "title", label: "Section title", type: "text" },
          { key: "v1.title", label: "Value 1 title", type: "text" },
          { key: "v1.description", label: "Value 1 description", type: "textarea" },
          { key: "v2.title", label: "Value 2 title", type: "text" },
          { key: "v2.description", label: "Value 2 description", type: "textarea" },
          { key: "v3.title", label: "Value 3 title", type: "text" },
          { key: "v3.description", label: "Value 3 description", type: "textarea" },
        ],
        defaultContent: {
          title: "More Than Merch",
          v1: {
            title: "Earned Not Given",
            description:
              "Every thread tells a story of hard work and dedication. This isn't fast fashion — it's a lifestyle earned through years of grinding.",
          },
          v2: {
            title: "Built in Lafayette",
            description:
              "Proudly designed, cut, and sewn in Louisiana. Supporting local means building something real in a world of dropshipped dreams.",
          },
          v3: {
            title: "Community First",
            description:
              "From garage nights to poker runs, we're building connections that matter. Real people, real stories, real freedom.",
          },
        },
      },
      community: {
        sortOrder: 4,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Subtitle", type: "textarea" },
          { key: "f1.title", label: "Feature 1 title", type: "text" },
          { key: "f1.text", label: "Feature 1 text", type: "text" },
          { key: "f2.title", label: "Feature 2 title", type: "text" },
          { key: "f2.text", label: "Feature 2 text", type: "text" },
          { key: "f3.title", label: "Feature 3 title", type: "text" },
          { key: "f3.text", label: "Feature 3 text", type: "text" },
          { key: "f4.title", label: "Feature 4 title", type: "text" },
          { key: "f4.text", label: "Feature 4 text", type: "text" },
        ],
        defaultContent: {
          title: "Join the Movement",
          subtitle: "Where every mile has a story and every hour is earned",
          f1: { title: "Hunt Drops", text: "Exclusive scavenger hunts for limited gear" },
          f2: { title: "Garage Nights", text: "Monthly meetups in Lafayette and beyond" },
          f3: { title: "Fuel Stops", text: "Pop-ups where stories meet the road" },
          f4: { title: "Early Access", text: "First dibs on every limited release" },
        },
      },
      comingSoon: {
        sortOrder: 5,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "dateLabel", label: "Date label", type: "text" },
        ],
        defaultContent: {
          title: "The Clock is Ticking",
          dateLabel: "First Drop • November 3rd, 2025",
        },
      },
      newsletter: {
        sortOrder: 6,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Description", type: "textarea" },
          { key: "buttonLabel", label: "Button label", type: "text" },
        ],
        defaultContent: {
          title: "Stay Fueled Up",
          text: "Get first access to drops, event invites, and the stories that matter.",
          buttonLabel: "Join",
        },
      },
    },
  },
  shop: {
    title: "Shop",
    sections: {
      hero: {
        sortOrder: 0,
        fields: [
          { key: "eyebrow", label: "Eyebrow", type: "text" },
          { key: "headline", label: "Headline", type: "text" },
          { key: "subheadline", label: "Subheadline", type: "textarea" },
          { key: "imageUrl", label: "Hero image URL", type: "url", media: true },
          { key: "ctaPrimary.label", label: "Primary CTA label", type: "text" },
          { key: "ctaPrimary.href", label: "Primary CTA link", type: "text" },
          { key: "ctaSecondary.label", label: "Secondary CTA label", type: "text" },
          { key: "ctaSecondary.href", label: "Secondary CTA link", type: "text" },
        ],
        defaultContent: {
          eyebrow: "Collections",
          headline: "A lifestyle built from grit — and time.",
          subheadline:
            "Shop High Octane, Masters, and Essentials. Clean grid. Real stories. Fire-orange attitude.",
          imageUrl: M.highOctane,
          ctaPrimary: { label: "Shop All", href: "#fft-grid" },
          ctaSecondary: { label: "Browse Collections", href: "#fft-collections" },
        },
      },
      collections: {
        sortOrder: 1,
        fields: [
          { key: "title", label: "Section title", type: "text" },
          { key: "card1.name", label: "Tile 1 name", type: "text" },
          { key: "card1.imageUrl", label: "Tile 1 image", type: "url", media: true },
          { key: "card1.href", label: "Tile 1 link", type: "text" },
          { key: "card2.name", label: "Tile 2 name", type: "text" },
          { key: "card2.imageUrl", label: "Tile 2 image", type: "url", media: true },
          { key: "card2.href", label: "Tile 2 link", type: "text" },
          { key: "card3.name", label: "Tile 3 name", type: "text" },
          { key: "card3.imageUrl", label: "Tile 3 image", type: "url", media: true },
          { key: "card3.href", label: "Tile 3 link", type: "text" },
        ],
        defaultContent: {
          title: "Collections",
          card1: { name: "High Octane Collection", imageUrl: M.highOctane, href: "#fft-grid" },
          card2: { name: "Masters Collection", imageUrl: M.masters, href: "#fft-grid" },
          card3: { name: "Everyday Essentials", imageUrl: M.goneFishing, href: "#fft-grid" },
        },
      },
      stories: {
        sortOrder: 2,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
          { key: "imageUrl", label: "Image", type: "url", media: true },
        ],
        defaultContent: {
          title: "Built for the long haul",
          body: "Every piece is designed for people who've earned their hours — not given them.",
          imageUrl: M.fuelUp,
        },
      },
      newsletter: {
        sortOrder: 3,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "buttonLabel", label: "Button label", type: "text" },
        ],
        defaultContent: {
          title: "Stay fueled. Don't miss drops, meetups, or giveaways.",
          buttonLabel: "Join the Movement",
        },
      },
    },
  },
  about: {
    title: "About",
    sections: {
      hero: {
        sortOrder: 0,
        fields: [
          { key: "meta1", label: "Meta line 1", type: "text" },
          { key: "meta2", label: "Meta line 2", type: "text" },
          { key: "headline", label: "Headline", type: "text" },
          { key: "subheadline", label: "Subheadline", type: "textarea" },
        ],
        defaultContent: {
          meta1: "Est. 2025",
          meta2: "Made in Lafayette, Louisiana",
          headline: "Built in the Garage",
          subheadline:
            "Born from blood, sweat, and years of earning our freedom. This is more than a brand — it's a brotherhood.",
        },
      },
      moment: {
        sortOrder: 1,
        fields: [
          { key: "headline", label: "Headline", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
          { key: "videoUrl", label: "Video URL", type: "url", media: true },
        ],
        defaultContent: {
          headline: "The Moment That Started It All",
          body: "Late nights in the garage. Engines cooling. Stories flowing. That's where Fuel & Free Time was born.",
          videoUrl: M.videoAbout1,
        },
      },
      collections: {
        sortOrder: 2,
        fields: [
          { key: "title", label: "Section title", type: "text" },
          { key: "card1.title", label: "Card 1 title", type: "text" },
          { key: "card1.imageUrl", label: "Card 1 image", type: "url", media: true },
          { key: "card2.title", label: "Card 2 title", type: "text" },
          { key: "card2.imageUrl", label: "Card 2 image", type: "url", media: true },
          { key: "card3.title", label: "Card 3 title", type: "text" },
          { key: "card3.imageUrl", label: "Card 3 image", type: "url", media: true },
        ],
        defaultContent: {
          title: "Three Collections. One Brotherhood.",
          card1: { title: "Fuel & Free Time Core Collection", imageUrl: M.coreCollection },
          card2: { title: "High Octane Performance Collection", imageUrl: M.vette },
          card3: { title: "Masters Series Limited Edition", imageUrl: M.fuelUp },
        },
      },
      origins: {
        sortOrder: 3,
        fields: [
          { key: "headline", label: "Headline", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
          { key: "imageUrl", label: "Image", type: "url", media: true },
          { key: "videoUrl", label: "Video URL", type: "url", media: true },
        ],
        defaultContent: {
          headline: "Fuel & Free Time Origins",
          body: "From Lafayette garages to open roads — every design starts with a story worth wearing.",
          imageUrl: M.coreCollection,
          videoUrl: M.videoAbout2,
        },
      },
      lifestyle: {
        sortOrder: 4,
        fields: [
          { key: "headline", label: "Headline", type: "text" },
          { key: "imageUrl", label: "Image", type: "url", media: true },
        ],
        defaultContent: {
          headline: "High Octane Lifestyle",
          imageUrl: M.highOctane,
        },
      },
    },
  },
  community: {
    title: "Community",
    sections: {
      hero: {
        sortOrder: 0,
        fields: [
          { key: "headline", label: "Headline (before accent)", type: "text" },
          { key: "headlineAccent", label: "Headline accent", type: "text" },
          { key: "subheadline", label: "Subheadline", type: "textarea" },
          { key: "stat1Value", label: "Stat 1 value", type: "text" },
          { key: "stat1Label", label: "Stat 1 label", type: "text" },
          { key: "stat2Value", label: "Stat 2 value", type: "text" },
          { key: "stat2Label", label: "Stat 2 label", type: "text" },
          { key: "stat3Value", label: "Stat 3 value", type: "text" },
          { key: "stat3Label", label: "Stat 3 label", type: "text" },
          { key: "stat4Value", label: "Stat 4 value", type: "text" },
          { key: "stat4Label", label: "Stat 4 label", type: "text" },
        ],
        defaultContent: {
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
      join: {
        sortOrder: 1,
        fields: [
          { key: "headline", label: "Headline", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
          { key: "ctaLabel", label: "CTA label", type: "text" },
          { key: "ctaHref", label: "CTA link", type: "text" },
        ],
        defaultContent: {
          headline: "Ready to Ride With Us?",
          body: "Join the movement. Get early access to drops, event invites, and the stories that matter.",
          ctaLabel: "Join the Movement",
          ctaHref: "#newsletter",
        },
      },
    },
  },
};

export const PAGE_SLUGS = Object.keys(PAGE_REGISTRY);

export function getRegistryPage(slug) {
  const def = PAGE_REGISTRY[slug];
  if (!def) return null;
  const sections = Object.entries(def.sections)
    .map(([key, sec]) => ({
      key,
      sort_order: sec.sortOrder,
      status: "published",
      content: structuredClone(sec.defaultContent),
      updated_at: null,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    slug,
    title: def.title,
    status: "published",
    sections,
    source: "registry",
  };
}

export function listRegistryPages() {
  return PAGE_SLUGS.filter((s) => s !== "site").map((slug) => ({
    slug,
    title: PAGE_REGISTRY[slug].title,
    status: "published",
    section_count: Object.keys(PAGE_REGISTRY[slug].sections).length,
    updated_at: null,
    source: "registry",
  }));
}

export function mergeWithRegistry(slug, sections) {
  const def = PAGE_REGISTRY[slug];
  if (!def) return sections;

  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  return Object.entries(def.sections)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([key, sec]) => {
      const existing = byKey[key];
      if (!existing) {
        return {
          key,
          sort_order: sec.sortOrder,
          status: "draft",
          content: structuredClone(sec.defaultContent),
          source: "registry",
        };
      }
      return {
        ...existing,
        content: deepMerge(structuredClone(sec.defaultContent), existing.content || {}),
      };
    });
}

function deepMerge(base, over) {
  if (!over || typeof over !== "object") return base;
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") {
      deepMerge(base[k], v);
    } else if (v !== undefined && v !== null && v !== "") {
      base[k] = v;
    }
  }
  return base;
}

export function registryForAdmin() {
  const pages = {};
  for (const [slug, def] of Object.entries(PAGE_REGISTRY)) {
    pages[slug] = {
      title: def.title,
      sections: Object.fromEntries(
        Object.entries(def.sections).map(([key, sec]) => [
          key,
          { sortOrder: sec.sortOrder, fields: sec.fields },
        ])
      ),
    };
  }
  return {
    ok: true,
    pages,
    pageSlugs: PAGE_SLUGS,
    storefrontSlugs: PAGE_SLUGS.filter((s) => s !== "site"),
  };
}
