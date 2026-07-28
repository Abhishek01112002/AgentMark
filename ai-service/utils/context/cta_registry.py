"""
Contextual & Stage-Aware CTA Registry
Provides domain-tailored and buying-stage-aware Call-To-Action (CTA) recommendations.
Prevents high-friction B2B fallbacks ("Buy Now", "Schedule Demo") on cold top-of-funnel ads.
"""

from typing import Dict, Optional


class IndustryCTARegistry:
    """Registry mapping industry sectors, buying stages, and channels to contextual CTAs."""

    _STAGE_MAP: Dict[str, Dict[str, str]] = {
        "awareness": {
            "saas": "Download Benchmark Report, Read Industry Guide, Explore Interactive Architecture",
            "fantasy_sports": "See Live Leaderboards, Watch Match Preview, Explore Contests",
            "gaming": "Watch Gameplay Trailer, Read Lore Guide, Explore Universe",
            "healthcare": "Read Health Guide, Check Symptoms, Explore Care Options",
            "e_commerce": "View Lookbook, Discover Trends, Explore Collection",
        },
        "consideration": {
            "saas": "Claim Read-Only Audit, Try 14-Day Sandbox, Watch 5-Min Product Tour",
            "fantasy_sports": "Create Free Account, Join League, Play Free Contest",
            "gaming": "Join Closed Beta, Pre-Register Now, Claim Free Starter Item",
            "healthcare": "Schedule Consultation, Check Eligibility, Talk to Specialist",
            "e_commerce": "Claim 15% Welcome Discount, Join Loyalty Club, Save Selection",
        },
        "decision": {
            "saas": "Book Architecture Review, Request Custom Proposal, Start Enterprise Trial",
            "fantasy_sports": "Draft Your Team Now, Enter Weekly Tournament, Claim Deposit Match",
            "gaming": "Play Free Now, Download Game, Unlock Early Access",
            "healthcare": "Book Appointment, Consult Specialist Now, Start Care Plan",
            "e_commerce": "Shop Now, Claim Offer, Get Express Delivery Today",
        },
        "retention": {
            "saas": "Explore Beta Features, Unlock Advanced Analytics, Invite Team Members",
            "fantasy_sports": "Set Weekly Roster, Challenge Friends, Enter Playoff Contest",
            "gaming": "Join Battle Pass Season, Battle Guild Rivals, Claim Event Chest",
            "healthcare": "Manage Appointments, Access Patient Portal, Renew Prescription",
            "e_commerce": "Shop VIP Early Access, Redeem Rewards Points, View New Arrivals",
        },
    }

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
            "awareness": "Download Cloud Cost Benchmark, Explore Architecture Guide, Learn More",
            "lead_gen": "Claim Read-Only Cloud Audit, Start Free Trial, Download Case Study",
            "sales": "Book Architecture Review, Schedule Demo, Request Quote, Get Pricing",
            "retention": "Upgrade Plan, Access Beta Features, View Analytics",
            "engagement": "Try Interactive Tour, Book Architecture Review, Start Free Sandbox",
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
    def get_ctas(cls, industry: str, goal: str, stage: Optional[str] = None) -> str:
        """
        Get domain-tailored and stage-aware CTAs.
        """
        ind_clean = (industry or "").lower().strip().replace(" ", "_").replace("-", "_")
        canonical_ind = cls._ALIAS_MAP.get(ind_clean, ind_clean)

        stage_clean = (stage or "").lower().strip()
        if stage_clean and stage_clean in cls._STAGE_MAP:
            stage_entry = cls._STAGE_MAP[stage_clean].get(canonical_ind)
            if stage_entry:
                return stage_entry

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
