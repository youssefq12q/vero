import React from "react";
import { Gem, Award, Users, ShieldCheck, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PILLARS_DATA = [
  {
    icon: Gem,
    title: "Quality",
    description: "Exceptional Standards",
    details: "Only the most exceptional conflict-free precious stones and recycled 18k solid gold pass our rigorous 21-point luxury quality verification. Every piece is made to last generations without losing a molecule of its majestic brilliance."
  },
  {
    icon: Award,
    title: "Elegance",
    description: "Artisanal Grace",
    details: "Restraint is our primary design guideline. We reject ostentation and massive logos in favor of calculated geometry, hand-engraved filigree, and soft matte-brushed textures. Timeless grace for quiet individuals."
  },
  {
    icon: Users,
    title: "Unisex",
    description: "Transcending Borders",
    details: "Elegance knows no gender boundaries. Every VERO piece is designed to seamlessly flow and complement your personal anatomy, regardless of convention. Universal forms, styled by you."
  },
  {
    icon: ShieldCheck,
    title: "Timeless",
    description: "Sustainable Restraint",
    details: "We build companion items for a lifetime. Guided by an eco-conscious philosophy, we use 100% recycled precious metals and certified green production methods in our Florence workshops. Restraint that preserves tomorrow."
  }
];

export default function BrandPillars() {
  const [activePillar, setActivePillar] = React.useState<number | null>(null);

  return (
    <section className="py-20 bg-brand-surface-container relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-16">
          <span className="text-[10px] tracking-[0.2em] font-medium text-brand-gold uppercase block mb-3">
            VERO STANDARDS
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-brand-umber">
            Details Define You
          </h2>
          <div className="w-12 h-0.5 bg-brand-gold mx-auto mt-6"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {PILLARS_DATA.map((pillar, index) => {
            const Icon = pillar.icon;
            const isOpen = activePillar === index;

            return (
              <div key={index} className="flex flex-col items-center">
                <motion.button
                  layout
                  onClick={() => setActivePillar(isOpen ? null : index)}
                  whileHover={{ y: -4 }}
                  className={`w-full p-6 md:p-8 flex flex-col items-center text-center border transition-all duration-500 rounded-sm ${
                    isOpen
                      ? "bg-brand-linen border-brand-gold/40 shadow-md"
                      : "bg-[#fff8f3] border-brand-outline-variant/20 hover:border-brand-gold/30"
                  }`}
                >
                  <motion.div
                    layout
                    className={`p-4 rounded-full mb-4 transition-colors duration-300 ${
                      isOpen ? "bg-brand-gold/10 text-brand-gold" : "text-brand-outline"
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                  </motion.div>

                  <motion.h4
                    layout
                    className="font-serif text-base text-brand-umber tracking-wide mb-1"
                  >
                    {pillar.title}
                  </motion.h4>
                  
                  <motion.p
                    layout
                    className="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-brand-outline mb-2"
                  >
                    {pillar.description}
                  </motion.p>

                  <span className="text-[10px] text-brand-gold underline underline-offset-4 tracking-wider uppercase font-medium mt-1">
                    {isOpen ? "Close details" : "Learn more"}
                  </span>
                </motion.button>

                {/* Animated Drawer Detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden w-full max-w-md mx-auto z-10"
                    >
                      <div className="bg-brand-linen p-5 border-x border-b border-brand-gold/20 text-xs font-light text-brand-outline leading-relaxed text-center rounded-b-sm shadow-sm">
                        <p>{pillar.details}</p>
                        <div className="flex items-center justify-center gap-1.5 text-[9px] font-semibold text-brand-gold tracking-widest uppercase mt-4">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          VERO Certified
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
