
const API_KEY = "AIzaSyDPQ2Zzvw8jGWrPZ7EWtVttum8xA4PsmxA";
const MODEL = "gemini-3-pro-image-preview"; // Default image model
const PROMPT = "A vibrant, playful educational poster designed for young children, explaining complex concepts through simple, whimsical visuals. The overall layout is organic and flowing, resembling a magical storybook page. The central title, \"Quantum Wonders for Little Explorers!\", is large, bubbly, and set against a soft, glowing nebula background at the top.";

async function testImageGen() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    console.log(`Calling URL: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: PROMPT
                    }]
                }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        // console.log(`Response text: ${text}`); // Too long

        if (response.status !== 200) {
            console.error('Error:', text);
            return;
        }

        const data = JSON.parse(text);
        const candidates = data.candidates;
        if (!candidates || candidates.length === 0) {
            console.log('No candidates');
            return;
        }

        const content = candidates[0].content;
        if (!content || !content.parts) {
            console.log('No content parts');
            return;
        }

        let foundImage = false;
        for (const part of content.parts) {
            if (part.inline_data) {
                console.log('Found inline_data image!');
                foundImage = true;
            }
            if (part.inlineData) {
                console.log('Found inlineData image!');
                foundImage = true;
            }
        }

        if (!foundImage) {
            console.log('No image found in response');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testImageGen();
