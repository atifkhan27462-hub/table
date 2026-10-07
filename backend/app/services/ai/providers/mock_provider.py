import time
from typing import Any, Dict, Optional
from app.services.ai.providers.base import AIProvider, ProviderImageResponse, ProviderTextResponse


class MockProvider(AIProvider):
    """
    Deterministic Mock AI Provider for testing, local offline development,
    and automatic failover when cloud AI providers are unavailable.
    """

    def __init__(self, model_name: str = "mock-culinary-ai-v1"):
        self.model_name = model_name
        self.custom_responses: Dict[str, str] = {}

    def set_mock_response(self, prompt_substring: str, response: str) -> None:
        """Helper to inject specific responses during unit testing."""
        self.custom_responses[prompt_substring.lower()] = response

    def clear_mock_responses(self) -> None:
        self.custom_responses.clear()

    def get_provider_name(self) -> str:
        return "mock"

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> ProviderTextResponse:
        start_time = time.time()
        p_lower = prompt.lower()
        sys_lower = (system_instruction or "").lower()

        # Check for explicitly injected mock responses in tests
        for key, val in self.custom_responses.items():
            if key in p_lower:
                latency = int((time.time() - start_time) * 1000)
                return ProviderTextResponse(
                    content=val,
                    tokens_used=len(val.split()) * 2,
                    model_name=self.model_name,
                    latency_ms=max(1, latency),
                )

        # 1. Personalized Visual Content (Ambiance)
        if "surface art" in sys_lower or "ambiance" in p_lower or "theme" in p_lower or "visual themes" in sys_lower:
            content = (
                "✨ **Table Ambiance Preset Activated**:\n\n"
                "Theme: **Midnight Starlight Romance**\n"
                "Ambient Palette: Deep Obsidian, Warm Amber Candlelight, and Soft Celestial Gold accents.\n"
                "Interactive Surface: Floating bioluminescent particles responsive to touch glassware."
            )

        # 2. Restaurant Campaign
        elif "hospitality campaigns" in sys_lower or "campaign" in p_lower or "marketing" in p_lower:
            content = (
                "### CAMPAIGN: Autumn Truffle & Vintage Cabernet Tasting\n\n"
                "**Headline**: Elevate Your Palate: An Evening of Foraged Truffles & Cellar Reserves\n\n"
                "**Body Copy**: Step into an extraordinary sensory journey this weekend. Indulge in hand-carved Alba white truffles, "
                "45-day dry-aged cuts, and sommelier-curated cellar selections displayed interactively at your table.\n\n"
                "**Social Captions**:\n"
                "• 'Immerse your senses in culinary perfection. Interactive dining meets artisanal gastronomy. #FineDining #TruffleSeason'\n"
                "• 'Where culinary artistry meets interactive luxury. Reserve your smart table tonight. #GourmetExperience'\n\n"
                "**Call to Action**: Reserve Your Interactive Table Experience Today."
            )

        # 3. Promotional Content
        elif "marketing copywriter" in sys_lower or "promo" in p_lower or "happy hour" in p_lower or "sunset hour" in p_lower:
            content = (
                "🍸 **Sunset Hour at the Smart Table**:\n\n"
                "Join us daily from 4:30 PM to 6:30 PM for artisanal craft cocktails and half-dozen oysters at our interactive lounge tables. "
                "Touch your table screen to browse our live mixology catalog and enjoy 25% off signature cellar reserves."
            )

        # 4. Customer Assistant / Dining Concierge
        elif "smart dining concierge" in sys_lower or "guest seated" in p_lower or "dietary" in p_lower or "allergy" in p_lower or "concierge:" in p_lower:
            if "gluten" in p_lower:
                content = (
                    "Welcome! Our **Pan-Seared Chilean Sea Bass** with saffron velouté and our **Truffle Mashed Potatoes** "
                    "are completely gluten-free. For dessert, our **Vanilla Bean Crème Brûlée** is also prepared without gluten. "
                    "Would you like me to inform our chef about your gluten sensitivity when your order is placed?"
                )
            elif "wine" in p_lower or "pair" in p_lower:
                content = (
                    "For a sublime pairing with your dinner, our Executive Sommelier suggests our **2019 Caymus Cabernet Sauvignon** "
                    "for red meat cuts, or a crisp **2021 Louis Latour Chardonnay** for seafood. We also have artisanal mocktails "
                    "like our Rosemary Citrus Spritz."
                )
            elif "game" in p_lower:
                content = (
                    "Your 32-inch smart dining surface features interactive touch games! Tap the **Games** tab on your table screen "
                    "to launch Tabletop Air Hockey, Chef's Memory Match, or Trivia Challenge while your appetizers are prepared."
                )
            else:
                content = (
                    "Hello and welcome to our dining table! I am your AI Dining Concierge. I can help guide you through our artisanal "
                    "menu, offer wine and cocktail pairings, highlight allergen details, or assist with interactive games on your table."
                )

        # 5. Sommelier Recommendation (Default fallback)
        else:
            if "steak" in p_lower or "ribeye" in p_lower or "beef" in p_lower:
                content = (
                    "🍷 **Executive Sommelier Recommendation**:\n\n"
                    "For your **Prime Dry-Aged Ribeye**, we recommend pairing with a **2019 Caymus Napa Valley Cabernet Sauvignon**. "
                    "The deep cassis, rich blackberry notes, and firm velvety tannins cut through the marbling of the white oak-grilled steak, "
                    "elevating the charred crust and black truffle compound butter.\n\n"
                    "• *Serving Temperature*: 17°C (63°F)\n"
                    "• *Decanting Time*: 25 minutes"
                )
            elif "sea bass" in p_lower or "fish" in p_lower or "seafood" in p_lower:
                content = (
                    "🍸 **Executive Sommelier Recommendation**:\n\n"
                    "To accompany the **Pan-Seared Chilean Sea Bass with Saffron Velouté**, we suggest a crisp **2021 Louis Latour Meursault Premier Cru Chardonnay**. "
                    "Its bright minerality and buttery lemon finish harmonize delicately with the richness of the sweet corn purée without overpowering the sea bass.\n\n"
                    "• *Serving Temperature*: 11°C (52°F)"
                )
            else:
                content = (
                    f"🥂 **Artisanal Pairing Suggestion**:\n\n"
                    f"Based on your query: *'{prompt}'*, our sommelier recommends our house-smoked **Woodford Reserve Old Fashioned** "
                    "infused with charred rosemary and smoked Vermont maple syrup."
                )

        latency = int((time.time() - start_time) * 1000)
        return ProviderTextResponse(
            content=content,
            tokens_used=len(content.split()) * 2,
            model_name=self.model_name,
            latency_ms=max(1, latency),
        )

    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> ProviderImageResponse:
        start_time = time.time()
        enhanced_prompt = (
            f"Commercial culinary photography of {prompt}, Michelin star plating on matte ceramic plate, "
            "warm directional rim lighting, macro focus with delicate depth of field, 8k resolution, photorealistic"
        )
        # High quality placeholder gourmet image URL
        image_url = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80"

        latency = int((time.time() - start_time) * 1000)
        return ProviderImageResponse(
            image_url=image_url,
            enhanced_prompt=enhanced_prompt,
            model_name=self.model_name,
            latency_ms=max(1, latency),
            photography_notes="Macro shot, 85mm f/1.4 lens, warm directional softbox key light, golden hour rim fill.",
        )
