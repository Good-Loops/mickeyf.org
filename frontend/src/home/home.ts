export default function home() {
    const addQuote = (quote: string) => {
        const quotesContainer = document.getElementById('quotes-container');

        if (quotesContainer) {
            const quoteElement = document.createElement('div');
            quoteElement.className = 'quote';
            quoteElement.textContent = quote;

            // Position the quote at a random location
            const x = Math.random() * (window.innerWidth - 200);
            const y = Math.random() * (window.innerHeight - 100);

            quoteElement.style.position = 'absolute';
            quoteElement.style.left = `${x}px`;
            quoteElement.style.top = `${y}px`;

            quotesContainer.appendChild(quoteElement);

            // Fade in and out effect
            quoteElement.style.opacity = '0';
            setTimeout(() => {
                quoteElement.style.transition = 'opacity 2s';
                quoteElement.style.opacity = '1';
            }, 100);

            setTimeout(() => {
                quoteElement.style.transition = 'opacity 2s';
                quoteElement.style.opacity = '0';
                setTimeout(() => {
                    quoteElement.remove();
                }, 2000);
            }, 4000);
        }
    };

    // Example quotes
    const quotes = [
        "The only way to do great work is to love what you do.",
        "Success is not the key to happiness. Happiness is the key to success.",
        "Believe you can and you're halfway there."
    ];

    setInterval(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        addQuote(randomQuote);
    }, 5000);
}