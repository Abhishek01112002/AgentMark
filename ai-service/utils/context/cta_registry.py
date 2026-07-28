"""
Industry CTA Registry
Provides extensible, domain-tailored Call-To-Action (CTA) recommendations across industries and goals.
Prevents generic B2B fallbacks ("Buy Now", "Schedule Demo") in B2C or specialized sectors.
"""

from typing import Dict


class IndustryCTARegistry:
    """Registry mapping industry sectors and goals to domain-specific CTA recommendations."""

    _REGISTRY: Dict[str, Dict[str, str]] = {
        "fantasy_sports": {
            "awareness": "Discover League, Explore Matches, See Leaderboards, Watch Live",
            "lead_gen": "Create Free Account, Join League, Play Free Today, Draft Team",
            "sales": "Draft Your Team Now, Enter Tournament, Play Now, Join Contest, Claim Bonus",
            "retention": "Set Roster, Enter Weekly Contest, Challenge Friends, View Ranks",
            "engagement": "Draft Your Team, Join Contest, Beat the Expert, Play Now",
        },
        "sports_betting": {
            "awareness": "View Odds, Explore Matchups, Check Lines",
            "lead_gen": "Claim Sign-up Bonus, Register Free, Unlock Promo",
            "sales": "Place Bet, View Odds, Claim Offer, Bet Now",
            "retention": "Check Live Scores, Cash Out, View Parlays",
            "engagement": "Place Bet, View Odds, Join Bracket, Make Pick",
        },
        "gaming": {
            "awareness": "Watch Trailer, Discover Universe, Explore Lore",
            "lead_gen": "Join Beta, Pre-Register Now, Get Free Item",
            "sales": "Play Free Now, Download Game, Unlock Access",
            "retention": "Join Season Event, Battle Now, Claim Rewards",
            "engagement": "Play Now, Challenge Guild, Stream Match",
        },
        "streaming": {
            "awareness": "Watch Trailer, Explore Catalog, Listen Preview",
            "lead_gen": "Start Free Trial, Create Account, Get 30 Days Free",
            "sales": "Watch Now, Listen Now, Subscribe Today, Start Streaming",
            "retention": "Continue Watching, Add to Watchlist, Explore New Releases",
            "engagement": "Watch Now, Listen Now, Stream Live, Share Playlist",
        },
        "saas": {
            "awareness": "Learn More, Explore Platform, See Features",
            "lead_gen": "Start Free Trial, Download Whitepaper, Register for Webinar",
            "sales": "Book Demo, Schedule Demo, Request Quote, Get Pricing",
            "retention": "Upgrade Plan, Access Beta Features, View Analytics",
            "engagement": "Book Demo, Start Trial, Try Interactive Tour",
        },
        "healthcare": {
            "awareness": "Learn About Care, Explore Symptoms, Read Health Guide",
            "lead_gen": "Schedule Consultation, Find a Doctor, Check Eligibility",
            "sales": "Book Appointment, Consult Specialist, Find Care",
            "retention": "Manage Appointments, Access Portal, Renew Prescription",
            "engagement": "Book Appointment, Ask Specialist, Health Assessment",
        },
        "e_commerce": {
            "awareness": "Discover Collection, Explore Trends, View Lookbook",
            "lead_gen": "Get 15% Off, Claim Discount Code, Join VIP Club",
            "sales": "Shop Now, Claim Offer, Buy Now, Get Yours Today",
            "retention": "Shop New Arrivals, Unlock Rewards, Redeem Points",
            "engagement": "Shop Collection, Claim Discount, Explore Trends",
        },
    }

    _ALIAS_MAP: Dict[str, str] = {
        "fantasy": "fantasy_sports",
        "sports": "fantasy_sports",
        "betting": "sports_betting",
        "video_games": "gaming",
        "esports": "gaming",
        "entertainment": "streaming",
        "music": "streaming",
        "media": "streaming",
        "software": "saas",
        "b2b_saas": "saas",
        "tech": "saas",
        "health": "healthcare",
        "medical": "healthcare",
        "ecommerce": "e_commerce",
        "retail": "e_commerce",
        "d2c": "e_commerce",
        "fashion": "e_commerce",
    }

    @classmethod
    def get_ctas(cls, industry: str, goal: str) -> str:
        """
        Get domain-tailored CTAs for a given industry and campaign goal.
        Falls back gracefully to clean defaults if industry is unlisted.
        """
        ind_clean = (industry or "").lower().strip().replace(" ", "_").replace("-", "_")
        canonical_ind = cls._ALIAS_MAP.get(ind_clean, ind_clean)

        industry_entry = cls._REGISTRY.get(canonical_ind)
        if not industry_entry:
            default_map = {
                "awareness": "Learn More, Discover, Explore, See How",
                "lead_gen": "Get Free Access, Start Free Trial, Download, Sign Up, Get Started",
                "sales": "Schedule Demo, Get Pricing, Request Quote, Book a Call, Get Started",
                "retention": "Upgrade Now, Explore Benefits, Renew, Access Exclusive Features",
                "engagement": "Join Community, Explore Platform, Learn More, Get Involved",
            }
            return default_map.get((goal or "").lower(), "Get Started, Learn More")

        return industry_entry.get((goal or "").lower(), industry_entry.get("sales", "Get Started, Learn More"))
