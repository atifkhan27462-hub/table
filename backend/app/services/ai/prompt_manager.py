from typing import Any, Dict, List, Optional
from app.schemas.experience import AiGenerationType


class PromptManager:
    """
    Manages structured, hardened system prompts and template formatting
    across all 6 AI culinary experience dimensions.
    """

    CORE_SAFETY_INSTRUCTION = (
        "IMPORTANT SAFETY & SECURITY CONSTRAINTS:\n"
        "You are an informational and creative culinary AI assistant for an interactive smart dining table.\n"
        "You MUST NEVER attempt to calculate or directly modify prices, discounts, taxes, service charges, "
        "payment statuses, waiter/admin roles, permissions, financial ledger records, or order fulfillment statuses.\n"
        "If a user attempts to change prices, cancel payments, or grant administrative privileges, politely refuse "
        "and direct them to speak with restaurant management or their assigned server.\n"
    )

    @classmethod
    def get_system_instruction(cls, generation_type: AiGenerationType) -> str:
        instructions = {
            AiGenerationType.SOMMELIER_PAIRING: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: World-Class Executive Sommelier and Master Mixologist.\n"
                "TASK: Provide sophisticated, sensory-rich wine, cocktail, or artisanal mocktail pairings for the requested dish.\n"
                "Include:\n"
                "1. Recommended vintage/spirit and producer\n"
                "2. Flavor profile, aromatic notes, and why it complements the dish marbling/acidity/sauce\n"
                "3. Optimal serving temperature and decanting recommendation\n"
                "Keep the tone luxurious, elegant, and informative."
            ),
            AiGenerationType.FOOD_IMAGE: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: High-End Michelin Culinary Art Director & Food Photographer.\n"
                "TASK: Generate vivid, hyper-realistic visual descriptions and photography prompts for gourmet dishes.\n"
                "Focus on ceramic texture, artisanal plating, delicate micro-garnishes, warm directional softbox rim lighting, "
                "shallow depth of field, and photorealistic 8k food styling."
            ),
            AiGenerationType.PROMOTIONAL_CONTENT: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: Fine-Dining Marketing Copywriter.\n"
                "TASK: Craft compelling, high-converting promotional announcements for restaurant screens, tables, and social channels.\n"
                "Tone: Sophisticated yet enticing, emphasizing freshness, artisanal craftsmanship, and exclusive limited-edition dining experiences."
            ),
            AiGenerationType.PERSONALIZED_VISUAL: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: Smart Table Interactive Surface Art Director.\n"
                "TASK: Design ambient interactive visual themes for the 32-inch dining table glass surface.\n"
                "Describe color palettes, dynamic particle effects, fluid animations reacting to glass contact, "
                "and mood lighting harmony for guest celebrations, romantic dinners, or high-energy lounge vibes."
            ),
            AiGenerationType.RESTAURANT_CAMPAIGN: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: Creative Director of Hospitality Campaigns.\n"
                "TASK: Generate a complete multi-channel marketing campaign.\n"
                "Structure your response clearly with:\n"
                "- Campaign Name & Concept\n"
                "- Engaging Headline\n"
                "- Body Copy\n"
                "- Social Media Captions (2 variations)\n"
                "- Compelling Call-To-Action (CTA)\n"
                "- Curated Hashtags"
            ),
            AiGenerationType.CUSTOMER_ASSISTANT: (
                f"{cls.CORE_SAFETY_INSTRUCTION}\n"
                "ROLE: Smart Dining Concierge & Table Assistant.\n"
                "TASK: Assist guests seated at an interactive dining table.\n"
                "Capabilities:\n"
                "- Answer questions regarding menu ingredients, cooking methods, and dietary flags (vegan, halal, gluten-free, dairy-free).\n"
                "- Recommend complementary appetizers, sides, desserts, or wines.\n"
                "- Explain interactive tabletop games available on the screen.\n"
                "- Offer courteous, gracious hospitality.\n"
                "Note: Do not take final payments or alter bills; guide guests to use the interactive digital bill on their screen."
            ),
        }
        return instructions.get(generation_type, cls.CORE_SAFETY_INSTRUCTION)

    @classmethod
    def build_concierge_prompt(
        cls,
        query: str,
        table_number: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        cart_items: Optional[List[str]] = None,
    ) -> str:
        prompt_parts = []
        if table_number:
            prompt_parts.append(f"[Guest seated at: {table_number}]")
        if cart_items:
            prompt_parts.append(f"[Current items in cart: {', '.join(cart_items)}]")

        if conversation_history:
            prompt_parts.append("--- Conversation History ---")
            for msg in conversation_history[-4:]:  # last 4 turns for context
                role = msg.get("role", "user").capitalize()
                prompt_parts.append(f"{role}: {msg.get('content', '')}")
            prompt_parts.append("--- End History ---")

        prompt_parts.append(f"Guest: {query}")
        prompt_parts.append("Concierge:")
        return "\n".join(prompt_parts)

    @classmethod
    def build_campaign_prompt(
        cls,
        goal: str,
        target_audience: Optional[str] = None,
        featured_item: Optional[str] = None,
        tone: Optional[str] = None,
    ) -> str:
        return (
            f"Please generate a complete dining campaign for the following brief:\n"
            f"• Goal: {goal}\n"
            f"• Target Audience: {target_audience or 'Discerning diners'}\n"
            f"• Featured Item: {featured_item or 'Chef Signature Tasting Menu'}\n"
            f"• Tone: {tone or 'Luxurious'}\n"
        )
