import { Product, Review } from "./types";

export const CATEGORIES = [
  { id: "all", name: "All Collections" },
  { id: "fine-jewelry", name: "Fine Jewelry" },
  { id: "timepieces", name: "Timepieces" },
  { id: "necklaces", name: "Necklaces" },
  { id: "rings", name: "Rings" },
  { id: "earrings", name: "Earrings" },
  { id: "bracelets", name: "Bracelets" },
  { id: "leather-goods", name: "Leather Goods" },
  { id: "accessories", name: "Accessories" },
];

export const PRODUCTS: Product[] = [
  {
    id: "sculpted-aurelian-ring",
    name: "Sculpted Aurelian Ring",
    categoryName: "Rings",
    categoryId: "rings",
    price: 4200,
    image: "images/sculpted-aurelian-ring.jpg",
    secondaryImages: [
      "images/sculpted-aurelian-ring.jpg",
      "images/sculpted-aurelian-ring-2.jpg",
      "images/sculpted-aurelian-ring-3.jpg",
      "images/sculpted-aurelian-ring-4.jpg",
    ],
    tagline:
      '"A masterwork of 18k yellow gold sculpted to absolute perfection."',
    description:
      "Hand-finished 18k yellow gold ring with fluid organic ripples inspired by classic Roman aurelians. Exudes eternal luxury and understated power.",
    materialOptions: ["#E5D5BC", "#E5E4E2", "#E6C280"], // Yellow Gold, White Gold, Rose Gold
    sizeOptions: ["US 6", "US 7", "US 8", "US 9"],
    details: [
      "18k Solid Yellow Gold (750/1000 purity)",
      "Average width: 6.5mm",
      "Individually hand-polished with micro-suede",
      "Laser-engraved serial code and hallmark",
      "Designed and made inside our private Florence workshop",
    ],
    craftsmanship:
      "Each ring is meticulously forged and finished by master goldsmiths under 40x magnification. We treat each aurelian curve with absolute devotion, preserving ancient European techniques.",
  },
  {
    id: "baguette-solitaire",
    name: "Baguette Diamond Solitaire Ring",
    categoryName: "Fine Jewelry",
    categoryId: "fine-jewelry",
    price: 18500,
    image: "images/baguette-solitaire.jpg",
    secondaryImages: [
      "images/baguette-solitaire.jpg",
      "images/sculpted-aurelian-ring-2.jpg",
    ],
    tagline: '"A dazzling solitaire ring with an exquisite emerald cut."',
    description:
      "An extraordinary cushion-cut centerpiece diamond flanked by pure ice-clear baguette diamonds on a solid 18k white gold band.",
    materialOptions: ["#E5E4E2", "#E5D5BC"],
    sizeOptions: ["US 5", "US 6", "US 7", "US 8"],
    details: [
      "VVS1 Clarity Cushion-cut center diamond (1.2 Carats)",
      "F-G Color certified premium baguettes",
      "18k White Gold high-mirror polish band",
      "Includes original GIA Certification dossier",
    ],
    craftsmanship:
      "Precision diamond-setting by master gemologists inside our state-of-the-art laboratory.",
  },
  {
    id: "vero-chronos",
    name: "Vero Chronos Luxury Watch",
    categoryName: "Timepieces",
    categoryId: "timepieces",
    price: 24000,
    image: "images/vero-chronos.jpg",
    secondaryImages: ["images/vero-chronos.jpg", "images/heritage-watch-4.jpg"],
    tagline:
      '"Premium chronograph with solid platinum bezel and sapphire crystal."',
    description:
      "A high-complication mechanical chronograph with custom-engraved Arabic numbers, solid platinum bezel, sapphire exhibition caseback, and handmade alligator-grain strap.",
    materialOptions: ["#211B12", "#E5E4E2"],
    sizeOptions: ["40mm Case", "42mm Case"],
    details: [
      "Custom Swiss Automatic chronometer movement",
      "Double anti-reflective scratch-proof sapphire crystal",
      "Water-resistant up to 50 meters (5 ATM)",
      "Alligator-grain premium leather strap with custom deployment buckle",
    ],
    craftsmanship:
      "Assembled by certified master watchmakers, requiring over 120 hours of micro-engineering testing.",
  },
  {
    id: "lucent-chain",
    name: "Lucent Diamond Chain Necklace",
    categoryName: "Necklaces",
    categoryId: "necklaces",
    price: 9500,
    image: "images/lucent-chain.jpg",
    secondaryImages: ["images/lucent-chain.jpg"],
    tagline:
      '"Delicate 18k white gold chain adorned with sparkling micro-diamonds."',
    description:
      "A slender, high-sparkle chain designed to catch the candlelight of the grandest galas. Features pavé-set diamonds that trace the collarbone elegantly.",
    materialOptions: ["#E5E4E2", "#E5D5BC"],
    sizeOptions: ["40cm Length", "45cm Length"],
    details: [
      "18k White Gold solid link construction",
      "0.75 Carats total weight brilliant-cut micro diamonds",
      "Sleek secure micro-hinge clasp",
      "Hand-assembled and balanced for premium comfort",
    ],
    craftsmanship:
      "Hand-linked chains crafted in Vicenza, Italy, renowned for historical gold forging.",
  },
  {
    id: "geometric-aura",
    name: "Geometric Aura Earrings",
    categoryName: "Earrings",
    categoryId: "earrings",
    price: 3800,
    image: "images/geometric-aura.jpg",
    secondaryImages: ["images/geometric-aura.jpg"],
    tagline: '"Stunning hand-sculpted earrings with fine symmetrical balance."',
    description:
      "Symmetric hand-finished earrings with faceted geometric panels that catch and reflect natural light beautifully. A modern architectural statement.",
    materialOptions: ["#E5D5BC", "#E5E4E2"],
    sizeOptions: ["One Size"],
    details: [
      "18k Yellow Gold or Platinum plating",
      "Post-back secure closure for pierced ears",
      "Ultra-lightweight hollow-core construction",
      "Overall drop: 32mm",
    ],
  },
  {
    id: "eternal-bangle",
    name: "Eternal Platinum Bangle",
    categoryName: "Bracelets",
    categoryId: "bracelets",
    price: 7200,
    image: "images/eternal-bangle.jpg",
    secondaryImages: ["images/eternal-bangle.jpg"],
    tagline: '"A seamless, minimalist wrist sculpture in pure platinum."',
    description:
      "A continuous, solid loop representing infinity. Minimalist engineering yields a perfectly balanced weight that feels like a second skin.",
    materialOptions: ["#E5E4E2", "#E5D5BC"],
    sizeOptions: ["Small", "Medium", "Large"],
    details: [
      "950 Solid Platinum construction",
      "Width: 4.5mm",
      "Sleek integrated pressure clasp with safety lock",
      "Suede gift box and certification booklet included",
    ],
  },
  {
    id: "classic-heirloom-timepiece",
    name: "Classic Heirloom Timepiece",
    categoryName: "Timepieces",
    categoryId: "timepieces",
    price: 32000,
    image: "images/classic-heirloom-timepiece.jpg",
    secondaryImages: ["images/classic-heirloom-timepiece.jpg"],
    tagline:
      '"An enduring legacy watch crafted with premium mechanical movement."',
    description:
      "An extraordinary masterpiece timepiece with a vintage-inspired dial, hand-painted numbering, and high-beat automatic movement that ticks with timeless precision.",
    materialOptions: ["#E5D5BC"],
    sizeOptions: ["38mm Case", "40mm Case"],
    details: [
      "Mechanical self-winding 28,800 vph movement",
      "Sapphire dome crystal back and front",
      "Genuine vintage leather strap in deep chestnut",
      "Lifetime warranty on movement alignment",
    ],
  },
  {
    id: "v-signature-bracelet",
    name: "V-Signature Gold Bracelet",
    categoryName: "Bracelets",
    categoryId: "bracelets",
    price: 6800,
    image: "images/v-signature-bracelet.jpg",
    secondaryImages: ["images/v-signature-bracelet.jpg"],
    tagline: '"Our signature sleek gold link bracelet with micro-hinge clasp."',
    description:
      "Interlocking flat V-links sculpted from pure 18k gold. The perfect companion for both formal evenings and daily professional wear.",
    materialOptions: ["#E5D5BC", "#625E56"],
    sizeOptions: ["17cm Length", "19cm Length"],
    details: [
      "Solid 18k yellow gold flat V-links",
      "Weight: approx 24.5 grams",
      "Hidden pressure release clasp",
      "Individually serial-numbered inside buckle",
    ],
  },
  {
    id: "heritage-watch-4",
    name: "Heritage Automatic Watch",
    categoryName: "Timepieces",
    categoryId: "timepieces",
    price: 29500,
    image: "images/heritage-watch-4.jpg",
    secondaryImages: ["images/heritage-watch-4.jpg"],
    tagline:
      '"Vintage-inspired automatic watch with deep dark face and leather strap."',
    description:
      "A stunning tribute to twentieth-century horology. Features a deep charcoal dial, luminescent numerals, and high-frequency movement.",
    materialOptions: ["#5F5E5B", "#E5D5BC"],
    sizeOptions: ["41mm Case"],
    details: [
      "25-Jewel automatic winding calibre",
      "Deep charcoal matte dial with cream markers",
      "Scratch-resistant sapphire crystal case",
      "Hand-stitched Tuscan calf leather band",
    ],
  },
  {
    id: "artisan-watch-roll",
    name: "Artisan Leather Watch Roll",
    categoryName: "Accessories",
    categoryId: "accessories",
    price: 1200,
    image: "images/artisan-watch-roll.jpg",
    secondaryImages: ["images/artisan-watch-roll.jpg"],
    tagline:
      '"Travel case crafted in vegetable-tanned leather to shield your timepieces."',
    description:
      "Hand-stitched three-slot luxury travel case lined with premium micro-suede to secure and preserve your delicate timepieces while traveling.",
    materialOptions: ["#625E56", "#211B12"],
    sizeOptions: ["3-Slot Roll"],
    details: [
      "100% full-grain vegetable-tanned Tuscan leather",
      "Interior lined with ultra-soft protective suede",
      "Removable padded watch cushions with secure snaps",
      "Solid brass premium buckles and closures",
    ],
  },
  {
    id: "essential-cardholder",
    name: "Essential Leather Cardholder",
    categoryName: "Leather Goods",
    categoryId: "leather-goods",
    price: 650,
    image: "images/essential-cardholder.jpg",
    secondaryImages: ["images/essential-cardholder.jpg"],
    tagline:
      '"Sleek, hand-stitched leather cardholder made of premium calfskin."',
    description:
      "Ultra-slim luxury pocket cardholder hand-crafted from the finest vegetable-tanned calfskin. Features 4 card slots and an elegant central pocket.",
    materialOptions: ["#211B12", "#625E56"],
    sizeOptions: ["Classic Slim"],
    details: [
      "Premium full-grain French calfskin",
      "4 exterior card slots and 1 central compartment",
      "Hand-painted edge finishing with wax treatment",
      "Subtle heat-embossed VERO insignia",
    ],
  },
  {
    id: "trinity-stack",
    name: "Trinity Diamond Stack Rings",
    categoryName: "Fine Jewelry",
    categoryId: "fine-jewelry",
    price: 14500,
    image: "images/trinity-stack.jpg",
    secondaryImages: ["images/trinity-stack.jpg"],
    tagline: '"Three interlocking bands of gold, rose gold, and platinum."',
    description:
      "Three entwined bands representing friendship, fidelity, and love, set with micro-pavé diamonds of pristine clarity and unmatched brilliance.",
    materialOptions: ["#E5D5BC", "#E5E4E2"],
    sizeOptions: ["US 6", "US 7", "US 8"],
    details: [
      "Three entwined bands (Yellow Gold, White Gold, Rose Gold)",
      "Pave-set brilliant-cut diamonds (0.98 Carats)",
      "Comfort-fit curved interior edge profile",
      "Hand-made in Paris, France",
    ],
  },
];

export const STORIES = [
  {
    title: "Software Craftsmanship Philosophy",
    quote:
      "Our brand stands for digital restraint. True software elegance is felt in the architecture, loading speed, and clean code—not the loudness of marketing or massive boilerplate frameworks. It's a dialogue between the system and the browser.",
    image: "images/story-luxury.jpg",
  },
  {
    title: "Artisanal Digital Engineering",
    quote:
      "Every VERO creation is custom-crafted from scratch, utilizing the finest modern paradigms. We dedicate a minimum of 40 focused development hours to compile, refactor, and thoroughly audit every single codebase.",
    image: "images/sculpted-aurelian-ring-4.jpg",
  },
  {
    title: "Eco-Conscious Digital Footprint",
    quote:
      "100% of our code templates and backend architectures are optimized for minimum CPU utilization and green-energy hosting compliance, ensuring highly sustainable software that respects the future.",
    image: "images/story-eco.jpg",
  },
];

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    author: "Elena R.",
    rating: 5,
    date: "July 12, 2026",
    comment:
      "An absolute masterpiece. The performance and semantic structure of their React template is flawless. It completely elevated our startup's page load speed!",
  },
  {
    id: "rev-2",
    author: "Marcello D.",
    rating: 5,
    date: "June 28, 2026",
    comment:
      "Exquisite code quality and secure Django APIs. It's clear that master-level developers spent serious engineering hours crafting this architecture. Outstanding.",
  },
];
