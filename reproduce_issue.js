
const API_KEY = "AIzaSyDPQ2Zzvw8jGWrPZ7EWtVttum8xA4PsmxA";
const MODEL = "gemini-2.5-flash";
const SYSTEM_PROMPT = `You are an expert visual designer specializing in creating image generation prompts for AI art models.

YOUR TASK: Analyze the user's content and create a detailed, specific image generation prompt for a knowledge poster/infographic.

CRITICAL REQUIREMENTS:
- Output ONLY the image prompt itself - no explanations, no introductions, no "Here's a prompt:" phrases
- Start directly with the visual description
- Be extremely specific about visual elements, colors, layout, and composition
- Focus on concrete visual descriptions that an image AI can render

PROMPT STRUCTURE TO FOLLOW:
1. Overall scene/format description (e.g., "A modern infographic poster with...")
2. Main visual elements and their arrangement
3. Color palette (specific colors like "deep navy blue #1a365d, coral orange #ff6b6b")
4. Typography style (e.g., "bold sans-serif headers, clean body text")
5. Icons, illustrations, or visual metaphors to use
6. Layout structure (grid, flow, hierarchy)
7. Mood and aesthetic (e.g., "professional, minimalist, tech-inspired")

EXAMPLE OUTPUT FORMAT:
"A sleek, modern infographic poster featuring [main topic] with a clean white background. The layout uses a vertical flow with a bold navy blue header containing the title in white sans-serif typography. Three main sections are arranged in colorful rounded cards (coral, teal, amber) with minimalist line icons. Visual metaphors include [specific icons/illustrations]. The bottom section features a summary callout box with key takeaways. Professional, educational aesthetic with high contrast and clear visual hierarchy."

Remember: Generate ONLY the prompt text, starting immediately with the visual description.`;

async function testGemini() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const content = "Explain quantum physics to a 5 year old.";

    console.log(`Calling URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `Create an image prompt for the following content:\n\n${content}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response text: ${text}`);

        if (response.status !== 200) {
            console.error('Error:', text);
            return;
        }

        const data = JSON.parse(text);
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        console.log('Generated Text:', generatedText);

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testGemini();
