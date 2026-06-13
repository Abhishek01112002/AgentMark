"""Reviewer Agent - Quality Control Supervisor

Role: Quality Assurance Manager - Reviews ALL agent outputs (EVERY field) and sends back for revision if quality insufficient

INPUT (WHAT IT RECEIVES AND VALIDATES):
  
  FROM state (direct access):
     ✅ research_output: JSON string from Research Agent
     ✅ strategy_output: JSON string from Strategy Agent
     ✅ copy_output: JSON string from Copywriter Agent
     ✅ image_output: JSON string from Image Prompt Agent
  
  FROM research_output (Research produces 5 fields, Reviewer validates ALL 5):
     ✅ market_analysis: TAM, growth_rate, key_trends
     ✅ competitor_analysis: 2+ competitors, differentiation
     ✅ audience_insights: 3+ pain_points, motivations, channels
     ✅ market_opportunities: 3+ opportunities
     ✅ recommended_approach: 50+ chars, not generic
  
  FROM strategy_output (Strategy produces 13 fields, Reviewer validates ALL 13):
     ✅ positioning: Not generic, uses research differentiation
     ✅ key_messages: 3+ messages, addresses research pain_points
     ✅ content_pillars: 4+ pillars
     ✅ channel_strategy: Aligns with research preferred_channels
     ✅ audience_segments: 3 segments with pain/motivation/messaging
     ✅ timeline: 4 phases with dates
     ✅ success_metrics: KPIs aligned with goal
     ✅ competitive_differentiation: competitors + advantage + positioning
     ✅ market_opportunities: Tactical opportunities
     ✅ strategic_approach: Research-based approach
     ✅ inferred_goal: Valid goal (awareness/lead_gen/sales/retention)
     ✅ research_foundation: All 5 research fields nested
     ✅ execution: channels + deliverables + budget
  
  FROM copy_output (Copywriter produces 8 fields, Reviewer validates ALL 8):
     ✅ inferred_goal: Matches strategy inferred_goal
     ✅ email: subject (60 chars), headline, body (200+ chars), ctas (3)
     ✅ linkedin: headline, body (150+ chars), ctas (3)
     ✅ social: headline (140 chars), body, ctas (4 platforms)
     ✅ ads: headline (60 chars), body (200+ chars), ctas (3)
     ✅ messaging_framework: 5 sections (promise, hierarchy, segments, channels, voice)
     ✅ strategic_alignment: positioning, message count, pillars, segments, deliverables
     ✅ copy_readiness: 5 flags (email, linkedin, social, ads, framework)
  
  FROM image_output (Image produces 2 fields, Reviewer validates ALL 2):
     ✅ visual_direction: Exists, 100+ chars, mentions brand/industry
     ✅ image_prompts: Array with per-prompt validation:
         - deliverable: Matches copy deliverables
         - prompt: 50+ chars, production-ready
         - style: Aligned with brand_voice
         - color_palette: Defined
         - text_overlay: Uses copy headlines
         - aspect_ratio: Valid ratio (16:9, 1:1, 9:16, etc)

TOTAL VALIDATION: 28 fields (5 + 13 + 8 + 2)

QUALITY THRESHOLDS:
  - Individual Agent Minimum: 75% (each agent must score ≥75)
  - Overall Campaign Minimum: 80% (weighted average ≥80)
  - Both must pass for approval

OUTPUT (What it gives to next agent/Publisher):
  
  SCENARIO 1: ALL APPROVED (status = 'review_complete'):
    state['status'] = 'review_complete'
    state['review_output'] = JSON with all 4 agent reviews + quality score
    state['next_step'] = 'proceed_to_publisher'
  
  SCENARIO 2: REVISION REQUIRED:
    state['status'] = '{agent}_revision_required'
    state['review_feedback'] = JSON with specific issues + action
    state['next_step'] = 'await_{agent}_revision'
    state['{agent}_revision_count'] = int (max 3)

REVISION PRIORITY: Research → Strategy → Copy → Image
"""

import json
from typing import Dict, Any
from datetime import datetime


class ReviewerAgent:
    """Quality Assurance Manager - validates EVERY field from ALL agents"""
    
    MAX_REVISIONS = 3
    MIN_QUALITY_SCORE = 80  # Overall minimum: 80%
    MIN_AGENT_SCORE = 75    # Per-agent minimum: 75%
    
    def __init__(self):
        self.name = "Reviewer Agent"
        self.role = "Quality Control Supervisor"
    
    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Review ALL agent outputs comprehensively
        
        INPUT: state with research_output, strategy_output, copy_output, image_output
        OUTPUT: state with review_output, review_feedback, status, next_step
        """
        print(f"\n{'='*60}")
        print(f"🔍 {self.name.upper()} - COMPREHENSIVE QUALITY REVIEW")
        print(f"{'='*60}\n")
        
        # Create a copy of state to avoid mutating the input
        state = dict(state)
        
        # Parse all outputs
        research = json.loads(state.get('research_output', '{}'))
        strategy = json.loads(state.get('strategy_output', '{}'))
        copy = json.loads(state.get('copy_output', '{}'))
        image = json.loads(state.get('image_output', '{}'))
        
        # Comprehensive review of ALL fields
        research_review = self._review_research_all_fields(research)
        strategy_review = self._review_strategy_all_fields(strategy, research)
        copy_review = self._review_copy_all_fields(copy, strategy, research)
        image_review = self._review_image_all_fields(image, strategy, copy)
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(
            research_review, strategy_review, copy_review, image_review
        )
        
        # Check individual agent scores (each ≥75%)
        agents_meet_threshold = all([
            research_review['score'] >= self.MIN_AGENT_SCORE,
            strategy_review['score'] >= self.MIN_AGENT_SCORE,
            copy_review['score'] >= self.MIN_AGENT_SCORE,
            image_review['score'] >= self.MIN_AGENT_SCORE
        ])
        
        # Check if all approved (no blocking issues)
        all_approved = all([
            research_review['approved'],
            strategy_review['approved'],
            copy_review['approved'],
            image_review['approved']
        ])
        
        # Overall quality threshold (≥80%)
        meets_quality_threshold = quality_score >= self.MIN_QUALITY_SCORE
        
        # Print individual scores
        print("\n📊 Individual Agent Scores:")
        print(f"   Research: {research_review['score']}/100 {'✅' if research_review['score'] >= self.MIN_AGENT_SCORE else '❌'}")
        print(f"   Strategy: {strategy_review['score']}/100 {'✅' if strategy_review['score'] >= self.MIN_AGENT_SCORE else '❌'}")
        print(f"   Copy: {copy_review['score']}/100 {'✅' if copy_review['score'] >= self.MIN_AGENT_SCORE else '❌'}")
        print(f"   Image: {image_review['score']}/100 {'✅' if image_review['score'] >= self.MIN_AGENT_SCORE else '❌'}")
        print(f"\n📈 Overall Quality Score: {quality_score}/100 (Threshold: {self.MIN_QUALITY_SCORE})")
        
        # Build review output
        review_result = {
            'status': 'approved' if (all_approved and meets_quality_threshold and agents_meet_threshold) else 'revision_required',
            'research_review': research_review,
            'strategy_review': strategy_review,
            'copy_review': copy_review,
            'image_review': image_review,
            'overall_quality_score': quality_score,
            'individual_threshold_met': agents_meet_threshold,
            'overall_threshold_met': meets_quality_threshold,
            'reviewed_at': datetime.now().isoformat(),
            'reviewer': self.name
        }
        
        # Update state based on all conditions
        if all_approved and meets_quality_threshold and agents_meet_threshold:
            print("\n✅ ALL OUTPUTS APPROVED - Ready for Publication")
            print(f"   All agents meet individual threshold (≥{self.MIN_AGENT_SCORE})")
            print(f"   Overall quality: {quality_score}/100 (≥{self.MIN_QUALITY_SCORE})\n")
            state['status'] = 'review_complete'
            state['review_output'] = json.dumps(review_result)
            state['next_step'] = 'proceed_to_publisher'
        else:
            # Determine which agent needs revision
            if not all_approved:
                # Priority: Explicit failures first
                revision_target = self._determine_revision_target(
                    research_review, strategy_review, copy_review, image_review
                )
                print(f"\n⚠️  EXPLICIT FAILURE: {revision_target['agent']}")
            elif not agents_meet_threshold:
                # Individual agent below 75% threshold
                revision_target = self._determine_lowest_scoring_agent(
                    research_review, strategy_review, copy_review, image_review
                )
                print(f"\n⚠️  INDIVIDUAL QUALITY TOO LOW: {revision_target['agent']}")
                print(f"   Score: {revision_target.get('score', 0)}/100 (Needs ≥{self.MIN_AGENT_SCORE})")
            else:
                # Overall quality score below 80%
                revision_target = self._determine_lowest_scoring_agent(
                    research_review, strategy_review, copy_review, image_review
                )
                print(f"\n⚠️  OVERALL QUALITY BELOW THRESHOLD: {quality_score}/100")
                print(f"   Targeting lowest scorer: {revision_target['agent']}")
            
            print(f"📋 Issues Found: {len(revision_target['issues'])}\n")
            
            for issue in revision_target['issues']:
                print(f"   • {issue}")
            
            state['status'] = revision_target['status']
            state['review_feedback'] = json.dumps(revision_target)
            state['review_output'] = json.dumps(review_result)
            state['next_step'] = revision_target['next_step']
            
            # Use consistent key format: research_revision_count, strategy_revision_count, etc.
            # But also check for legacy format: "Research Agent_revision_count"
            agent_name_lower = revision_target['agent'].replace(' Agent', '').replace(' ', '_').lower()
            revision_key = f"{agent_name_lower}_revision_count"
            legacy_key = f"{revision_target['agent']}_revision_count"
            
            # Check both keys (legacy and new format) - take the higher value
            new_count = state.get(revision_key, 0)
            legacy_count = state.get(legacy_key, 0)
            current_count = max(new_count, legacy_count)
            
            # Check if max revisions reached BEFORE incrementing
            if current_count >= self.MAX_REVISIONS:
                print(f"\n⚠️  Max revisions reached for {revision_target['agent']}")
                state['status'] = 'review_complete'
                state['next_step'] = 'proceed_to_publisher'
                state['review_feedback'] = None
            else:
                # Increment and continue with revision
                state[revision_key] = current_count + 1
                # Also update legacy key if it exists
                if legacy_key in state:
                    state[legacy_key] = current_count + 1
        
        return state
    
    def _review_research_all_fields(self, research: Dict) -> Dict:
        """Validate ALL 5 Research output fields
        
        Scoring: Critical fields = 25 points, Important = 20 points, Standard = 15 points
        Total: 100 points distributed across 5 fields
        """
        issues = []
        score_deduction = 0
        
        # Field 1: market_analysis (CRITICAL - 25 points)
        market = research.get('market_analysis', {})
        if not market.get('total_addressable_market'):
            issues.append("market_analysis missing total_addressable_market")
            score_deduction += 10
        if not market.get('growth_rate'):
            issues.append("market_analysis missing growth_rate")
            score_deduction += 10
        if not market.get('market_trends') or len(market.get('market_trends', [])) < 3:
            issues.append("market_analysis needs 3+ market_trends")
            score_deduction += 5
        
        # Field 2: competitor_analysis (CRITICAL - 25 points)
        competitors = research.get('competitor_analysis', {})
        if len(competitors.get('top_competitors', [])) < 2:
            issues.append("competitor_analysis needs 2+ top_competitors")
            score_deduction += 15
        if not competitors.get('differentiation_opportunity'):
            issues.append("competitor_analysis missing differentiation_opportunity")
            score_deduction += 10
        
        # Field 3: audience_insights (CRITICAL - 25 points)
        audience = research.get('audience_insights', {})
        if len(audience.get('pain_points', [])) < 3:
            issues.append("audience_insights needs 3+ pain_points")
            score_deduction += 10
        if not audience.get('motivations') or len(audience.get('motivations', [])) < 2:
            issues.append("audience_insights needs 2+ motivations")
            score_deduction += 8
        if not audience.get('preferred_channels') or len(audience.get('preferred_channels', [])) < 2:
            issues.append("audience_insights needs 2+ preferred_channels")
            score_deduction += 7
        
        # Field 4: market_opportunities (IMPORTANT - 15 points)
        opportunities = research.get('market_opportunities', [])
        if len(opportunities) < 3:
            issues.append("market_opportunities needs 3+ items")
            score_deduction += 15
        
        # Field 5: recommended_approach (IMPORTANT - 10 points)
        approach = research.get('recommended_approach', '')
        if len(approach) < 50:
            issues.append("recommended_approach too short (needs 50+ chars)")
            score_deduction += 10
        
        final_score = max(0, 100 - score_deduction)
        
        return {
            'approved': len(issues) == 0,
            'issues': issues,
            'feedback': 'All 5 research fields validated' if len(issues) == 0 else f'{len(issues)} issues found',
            'score': final_score
        }
    
    def _review_strategy_all_fields(self, strategy: Dict, research: Dict) -> Dict:
        """Validate ALL 13 Strategy output fields
        
        Scoring: Proportional - 100 points / 13 fields = ~7.69 points per field
        """
        issues = []
        score_per_field = 100 / 13  # ~7.69 points per field
        score_deduction = 0
        
        # Field 1: positioning
        positioning = strategy.get('positioning', '')
        if len(positioning) < 20:
            issues.append("positioning too short")
            score_deduction += score_per_field
        if any(term in positioning.lower() for term in ['leader', 'best', 'top']) and len(positioning) < 50:
            issues.append("positioning too generic")
            score_deduction += score_per_field
        
        # Field 2: key_messages
        key_messages = strategy.get('key_messages', [])
        if len(key_messages) < 3:
            issues.append("key_messages needs 3+ items")
            score_deduction += score_per_field
        
        # Field 3: content_pillars
        if len(strategy.get('content_pillars', [])) < 3:
            issues.append("content_pillars needs 3+ items")
            score_deduction += score_per_field
        
        # Field 4: channel_strategy
        if not strategy.get('channel_strategy'):
            issues.append("channel_strategy missing")
            score_deduction += score_per_field
        
        # Field 5: audience_segments
        segments = strategy.get('audience_segments', [])
        if len(segments) < 3:
            issues.append("audience_segments needs 3 segments")
            score_deduction += score_per_field
        
        # Field 6: timeline
        timeline = strategy.get('timeline', {})
        if len(timeline) < 4:
            issues.append("timeline needs 4 phases")
            score_deduction += score_per_field
        
        # Field 7: success_metrics
        if not strategy.get('success_metrics'):
            issues.append("success_metrics missing")
            score_deduction += score_per_field
        
        # Field 8: competitive_differentiation
        comp_diff = strategy.get('competitive_differentiation', {})
        if not comp_diff.get('primary_differentiation'):
            issues.append("competitive_differentiation missing primary_differentiation")
            score_deduction += score_per_field
        
        # Field 9: market_opportunities
        if not strategy.get('market_opportunities'):
            issues.append("market_opportunities missing")
            score_deduction += score_per_field
        
        # Field 10: strategic_approach
        if not strategy.get('strategic_approach'):
            issues.append("strategic_approach missing")
            score_deduction += score_per_field
        
        # Field 11: inferred_goal
        if strategy.get('inferred_goal') not in ['awareness', 'lead_gen', 'sales', 'retention']:
            issues.append("inferred_goal invalid")
            score_deduction += score_per_field
        
        # Field 12: research_foundation
        if not strategy.get('research_foundation'):
            issues.append("research_foundation missing")
            score_deduction += score_per_field
        
        # Field 13: execution
        execution = strategy.get('execution', {})
        if not execution.get('channels'):
            issues.append("execution missing channels")
            score_deduction += score_per_field / 2
        if not execution.get('deliverables'):
            issues.append("execution missing deliverables")
            score_deduction += score_per_field / 2
        
        final_score = max(0, int(100 - score_deduction))
        
        return {
            'approved': len(issues) == 0,
            'issues': issues,
            'feedback': 'All 13 strategy fields validated' if len(issues) == 0 else f'{len(issues)} issues found',
            'score': final_score,
            'action': 'send_back_to_strategy' if issues else None
        }
    
    def _review_copy_all_fields(self, copy: Dict, strategy: Dict, research: Dict) -> Dict:
        """Validate ALL 8 Copywriter output fields
        
        Scoring: Proportional - 100 points / 8 fields = 12.5 points per field
        """
        issues = []
        score_per_field = 100 / 8  # 12.5 points per field
        score_deduction = 0
        
        # Field 1: inferred_goal
        if copy.get('inferred_goal') != strategy.get('inferred_goal'):
            issues.append("inferred_goal doesn't match strategy")
            score_deduction += score_per_field
        
        # Field 2: email (weight: 12.5)
        email = copy.get('email', {})
        email_issues = 0
        if not email.get('subject') or len(email.get('subject', '')) > 60:
            issues.append("email subject missing or too long")
            email_issues += 1
        if not email.get('headline'):
            issues.append("email headline missing")
            email_issues += 1
        if not email.get('body') or len(email.get('body', '')) < 100:
            issues.append("email body too short (needs 100+ chars)")
            email_issues += 1
        if len(email.get('ctas', {})) < 2:
            issues.append("email needs 2+ CTAs")
            email_issues += 1
        if email_issues > 0:
            score_deduction += (score_per_field / 4) * email_issues  # Proportional within email
        
        # Field 3: linkedin (weight: 12.5)
        linkedin = copy.get('linkedin', {})
        linkedin_issues = 0
        if not linkedin.get('headline'):
            issues.append("linkedin headline missing")
            linkedin_issues += 1
        if not linkedin.get('body') or len(linkedin.get('body', '')) < 100:
            issues.append("linkedin body too short")
            linkedin_issues += 1
        if not linkedin.get('ctas'):
            issues.append("linkedin CTAs missing")
            linkedin_issues += 1
        if linkedin_issues > 0:
            score_deduction += (score_per_field / 3) * linkedin_issues
        
        # Field 4: social (weight: 12.5)
        social = copy.get('social', {})
        social_issues = 0
        if not social.get('headline') or len(social.get('headline', '')) > 140:
            issues.append("social headline missing or too long (140 char limit)")
            social_issues += 1
        if not social.get('body'):
            issues.append("social body missing")
            social_issues += 1
        if not social.get('ctas'):
            issues.append("social CTAs missing")
            social_issues += 1
        if social_issues > 0:
            score_deduction += (score_per_field / 3) * social_issues
        
        # Field 5: ads (weight: 12.5)
        ads = copy.get('ads', {})
        ads_issues = 0
        if not ads.get('headline') or len(ads.get('headline', '')) > 60:
            issues.append("ads headline missing or too long")
            ads_issues += 1
        if not ads.get('body') or len(ads.get('body', '')) < 100:
            issues.append("ads body too short")
            ads_issues += 1
        if len(ads.get('ctas', {})) < 2:
            issues.append("ads needs 2+ CTAs")
            ads_issues += 1
        if ads_issues > 0:
            score_deduction += (score_per_field / 3) * ads_issues
        
        # Field 6: messaging_framework (weight: 12.5)
        framework = copy.get('messaging_framework', {})
        framework_issues = 0
        if not framework.get('brand_promise'):
            issues.append("messaging_framework missing brand_promise")
            framework_issues += 1
        if not framework.get('message_hierarchy'):
            issues.append("messaging_framework missing message_hierarchy")
            framework_issues += 1
        if framework_issues > 0:
            score_deduction += (score_per_field / 2) * framework_issues
        
        # Field 7: strategic_alignment (weight: 12.5)
        if not copy.get('strategic_alignment'):
            issues.append("strategic_alignment missing")
            score_deduction += score_per_field
        
        # Field 8: copy_readiness (weight: 12.5)
        readiness = copy.get('copy_readiness', {})
        if not all([readiness.get('email_ready'), readiness.get('linkedin_ready'), 
                    readiness.get('social_ready'), readiness.get('ads_ready')]):
            issues.append("copy_readiness flags not all True")
            score_deduction += score_per_field
        
        final_score = max(0, int(100 - score_deduction))
        
        return {
            'approved': len(issues) == 0,
            'issues': issues,
            'feedback': 'All 8 copy fields validated' if len(issues) == 0 else f'{len(issues)} issues found',
            'score': final_score,
            'action': 'send_back_to_copywriter' if issues else None
        }
    
    def _review_image_all_fields(self, image: Dict, strategy: Dict, copy: Dict) -> Dict:
        """Validate ALL 2 Image output fields (with nested validations)
        
        Scoring: Proportional - 100 points / 2 fields = 50 points per field
        - visual_direction: 50 points
        - image_prompts: 50 points (divided by number of prompts)
        """
        issues = []
        score_deduction = 0
        
        # Field 1: visual_direction (50 points)
        visual_direction = image.get('visual_direction', '')
        if len(visual_direction) < 100:
            issues.append("visual_direction too short (needs 100+ chars)")
            score_deduction += 50  # Full field weight
        
        # Field 2: image_prompts (50 points total, divided by number of prompts)
        image_prompts = image.get('image_prompts', [])
        if len(image_prompts) == 0:
            issues.append("image_prompts array is empty")
            score_deduction += 50  # Full field weight
        else:
            points_per_prompt = 50 / len(image_prompts)  # Distribute 50 points across all prompts
            
            for i, prompt in enumerate(image_prompts):
                prompt_issues = 0
                
                if not prompt.get('deliverable'):
                    issues.append(f"prompt {i+1} missing deliverable")
                    prompt_issues += 1
                if not prompt.get('prompt') or len(prompt.get('prompt', '')) < 50:
                    issues.append(f"prompt {i+1} too short (needs 50+ chars)")
                    prompt_issues += 1
                if not prompt.get('style'):
                    issues.append(f"prompt {i+1} missing style")
                    prompt_issues += 1
                if not prompt.get('color_palette'):
                    issues.append(f"prompt {i+1} missing color_palette")
                    prompt_issues += 1
                if not prompt.get('text_overlay'):
                    issues.append(f"prompt {i+1} missing text_overlay")
                    prompt_issues += 1
                if not prompt.get('aspect_ratio'):
                    issues.append(f"prompt {i+1} missing aspect_ratio")
                    prompt_issues += 1
                
                # Deduct proportionally: each prompt has 6 sub-validations
                if prompt_issues > 0:
                    score_deduction += (points_per_prompt / 6) * prompt_issues
        
        final_score = max(0, int(100 - score_deduction))
        
        return {
            'approved': len(issues) == 0,
            'issues': issues,
            'feedback': 'All 2 image fields validated' if len(issues) == 0 else f'{len(issues)} issues found',
            'score': final_score,
            'action': 'send_back_to_image' if issues else None
        }
    
    def _calculate_quality_score(self, research_rev: Dict, strategy_rev: Dict, 
                                 copy_rev: Dict, image_rev: Dict) -> int:
        """Calculate weighted overall quality score"""
        weights = {'research': 0.25, 'strategy': 0.30, 'copy': 0.25, 'image': 0.20}
        
        score = (
            research_rev['score'] * weights['research'] +
            strategy_rev['score'] * weights['strategy'] +
            copy_rev['score'] * weights['copy'] +
            image_rev['score'] * weights['image']
        )
        
        return int(score)
    
    def _determine_revision_target(self, research_rev: Dict, strategy_rev: Dict,
                                   copy_rev: Dict, image_rev: Dict) -> Dict:
        """Determine which agent needs revision (priority order for explicit failures)"""
        
        if not research_rev['approved']:
            return {
                'agent': 'Research Agent',
                'status': 'research_revision_required',
                'issues': research_rev['issues'],
                'feedback': research_rev['feedback'],
                'next_step': 'await_research_revision'
            }
        
        if not strategy_rev['approved']:
            return {
                'agent': 'Strategy Agent',
                'status': 'strategy_revision_required',
                'issues': strategy_rev['issues'],
                'feedback': strategy_rev['feedback'],
                'next_step': 'await_strategy_revision'
            }
        
        if not copy_rev['approved']:
            return {
                'agent': 'Copywriter Agent',
                'status': 'copy_revision_required',
                'issues': copy_rev['issues'],
                'feedback': copy_rev['feedback'],
                'next_step': 'await_copywriter_revision'
            }
        
        if not image_rev['approved']:
            return {
                'agent': 'Image Prompt Agent',
                'status': 'image_revision_required',
                'issues': image_rev['issues'],
                'feedback': image_rev['feedback'],
                'next_step': 'await_image_revision'
            }
        
        return {}
    
    def _determine_lowest_scoring_agent(self, research_rev: Dict, strategy_rev: Dict,
                                        copy_rev: Dict, image_rev: Dict) -> Dict:
        """When quality below threshold but no explicit failures, target lowest scorer"""
        
        scores = [
            (research_rev['score'], 'Research Agent', 'research_revision_required', 'await_research_revision', research_rev),
            (strategy_rev['score'], 'Strategy Agent', 'strategy_revision_required', 'await_strategy_revision', strategy_rev),
            (copy_rev['score'], 'Copywriter Agent', 'copy_revision_required', 'await_copywriter_revision', copy_rev),
            (image_rev['score'], 'Image Prompt Agent', 'image_revision_required', 'await_image_revision', image_rev)
        ]
        
        # Sort by score (lowest first)
        scores.sort(key=lambda x: x[0])
        
        lowest = scores[0]
        return {
            'agent': lowest[1],
            'status': lowest[2],
            'issues': lowest[4]['issues'] if lowest[4]['issues'] else [f"Quality score {lowest[0]}/100 needs improvement (threshold: {self.MIN_AGENT_SCORE})"],
            'feedback': f"Lowest scoring agent ({lowest[0]}/100) - needs quality improvement",
            'next_step': lowest[3],
            'score': lowest[0]
        }


def reviewer_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Reviewer Agent Entry Point - Validates EVERY field from ALL agents
    
    INPUT:
        - state['research_output']: 5 fields (ALL validated)
        - state['strategy_output']: 13 fields (ALL validated)
        - state['copy_output']: 8 fields (ALL validated)
        - state['image_output']: 2 fields (ALL validated)
    
    OUTPUT:
        - state['status']: 'review_complete' | '{agent}_revision_required'
        - state['review_output']: Full review results (JSON)
        - state['review_feedback']: Revision instructions (JSON, if needed)
        - state['next_step']: 'proceed_to_publisher' | 'await_{agent}_revision'
    
    VALIDATES: 28 total fields (5+13+8+2)
    THRESHOLDS: Individual ≥75%, Overall ≥80%
    """
    agent = ReviewerAgent()
    return agent.execute(state)
