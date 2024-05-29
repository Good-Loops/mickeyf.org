export default async function home() {
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

            // Fade in
            quoteElement.style.opacity = '0';
            setTimeout(() => {
                quoteElement.style.transition = 'opacity 2s';
                quoteElement.style.opacity = '.9';
            }, 100);

            // Fade out
            setTimeout(() => {
                quoteElement.style.transition = 'opacity 2s';
                quoteElement.style.opacity = '0';
                setTimeout(() => {
                    quoteElement.remove();
                }, 2000);
            }, 4000);
        }
    };

    // Quotes
    const quotes = [
        '"The only way to make sense out of change is to plunge into it." -Alan Watts',
        '"Man suffers only because he takes seriously what the gods made for fun." -Alan Watts',
        '"You are an aperture through which the universe is looking at and exploring itself." -Alan Watts',
        '"Trying to define yourself is like trying to bite your own teeth." -Alan Watts',
        '"Philosophy is man\'s expression of curiosity about everything." -Alan Watts',
        '"Our suffering is often caused by our thoughts." -Sam Harris',
        '"Mindfulness is a way to develop wisdom." -Sam Harris',
        '"You can\'t always control the world, but you can control your reaction." -Sam Harris',
        '"It\'s always now." -Sam Harris',
        '"The reality of your life is what you pay attention to." -Sam Harris',
        '"We suffer more often in imagination than in reality." -Seneca',
        '"Luck is what happens when preparation meets opportunity." -Seneca',
        '"He who fears death will never do anything worth of a man." -Seneca',
        '"Dwell on the beauty of life. Watch the stars." -Marcus Aurelius',
        '"The impediment to action advances action." -Marcus Aurelius',
        '"If it is not right, do not do it." -Marcus Aurelius',
        '"To be calm is the highest achievement of the self." -Zenon of Citium',
        '"Well-being is attained by little and little." -Zenon of Citium',
        '"Wealth consists not in having great possessions." -Epictetus',
        '"No man is free who is not master of himself." -Epictetus',
        '"The struggle itself...is enough to fill a man\'s heart." -Albert Camus',
        '"In the depth of winter, I found an invincible summer." -Albert Camus',
        '"Man stands face to face with the irrational." -Albert Camus',
        '"Life will be lived all the better if it has no meaning." -Albert Camus',
        '"The absurd is born of this confrontation between the human need and the unreasonable silence of the world." -Albert Camus',
        '"Man is the only creature who refuses to be what he is." -Albert Camus',
        '"The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion." -Albert Camus',
        '"What is called a reason for living is also an excellent reason for dying." -Albert Camus',
        '"Every act of rebellion expresses a nostalgia for innocence." -Albert Camus',
        '"Nature loves courage. The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion." -Terence McKenna',
        '"Culture is not your friend." -Terence McKenna',
        '"The imagination is the goal of history." -Terence McKenna',
        '"Find the others." -Terence McKenna',
        '"You have to take seriously the notion that understanding the universe is your responsibility." -Terence McKenna',
        '"The cost of sanity in this society is a certain level of alienation." -Terence McKenna',
        '"The syntactical nature of reality, the real secret of magic, is that the world is made of words." -Terence McKenna',
        '"The universe is a symphony of strings." -Michio Kaku',
        '"We are born scientists." -Michio Kaku',
        '"The impossible is often the untried." -Michio Kaku',
        '"The mind is more powerful than we can possibly imagine." -Michio Kaku',
        '"To become a scientist, you have to have a passionate curiosity." -Michio Kaku',
        '"If I have seen further, it is by standing on the shoulders of giants." -Isaac Newton',
        '"What we know is a drop, what we don\'t know is an ocean." -Isaac Newton',
        '"Gravity explains the motions of the planets, but it cannot explain who sets the planets in motion." -Isaac Newton',
        '"Truth is ever to be found in simplicity, and not in the multiplicity and confusion of things." -Isaac Newton',
        '"No great discovery was ever made without a bold guess." -Isaac Newton',
        '"We are a way for the cosmos to know itself." -Carl Sagan',
        '"Somewhere, something incredible is waiting to be known." -Carl Sagan',
        '"The cosmos is within us. We are made of star-stuff." -Carl Sagan',
        '"Extraordinary claims require extraordinary evidence." -Carl Sagan',
        '"Imagination will often carry us to worlds that never were. But without it we go nowhere." -Carl Sagan',
        '"For small creatures such as we, the vastness is bearable only through love." -Carl Sagan',
        '"I would rather have questions that can\'t be answered than answers that can\'t be questioned." -Richard Feynman',
        '"Physics is like sex: sure, it may give some practical results, but that\'s not why we do it." -Richard Feynman',
        '"The first principle is that you must not fool yourself and you are the easiest person to fool." -Richard Feynman',
        '"What I cannot create, I do not understand." -Richard Feynman',
        '"I\'m smart enough to know that I\'m dumb." -Richard Feynman',
        '"We can only see a short distance ahead, but we can see plenty there that needs to be done." -Alan Turing',
        '"Sometimes it is the people no one can imagine anything of who do the things no one can imagine." -Alan Turing',
        '"A computer would deserve to be called intelligent if it could deceive a human into believing that it was human." -Alan Turing',
        '"We can see only a short distance ahead, but we can see plenty there that needs to be done." -Alan Turing',
        '"Machines take me by surprise with great frequency." -Alan Turing',
        '"The present is theirs; the future, for which I really worked, is mine." -Nikola Tesla',
        '"If you want to find the secrets of the universe, think in terms of energy, frequency and vibration." -Nikola Tesla',
        '"The scientists of today think deeply instead of clearly." -Nikola Tesla',
        '"I don\'t care that they stole my idea... I care that they don\'t have any of their own." -Nikola Tesla',
        '"Our virtues and our failings are inseparable, like force and matter. When they separate, man is no more." -Nikola Tesla',
        '"The question isn\'t who is going to let me; it\'s who is going to stop me." -Ayn Rand',
        '"I am not afraid of storms, for I am learning how to sail my ship." -Louisa May Alcott',
        '"Do one thing every day that scares you." -Eleanor Roosevelt',
        '"No one can make you feel inferior without your consent." -Eleanor Roosevelt',
        '"The future belongs to those who believe in the beauty of their dreams." -Eleanor Roosevelt',
        '"I attribute my success to this: I never gave or took any excuse." -Florence Nightingale',
        '"Life shrinks or expands in proportion to one\'s courage." -Anais Nin',
        '"You must do the things you think you cannot do." -Eleanor Roosevelt',
        '"I can\'t change the direction of the wind, but I can adjust my sails to always reach my destination." -Jimmy Dean',
        '"It does not matter how slowly you go as long as you do not stop." -Confucius'
    ];


    const showQuote = () => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        addQuote(randomQuote);

        window.homeAnimationID = requestAnimationFrame(() => {
            setTimeout(showQuote, 5000); // Wait 5 seconds before showing the next quote
        });
    };

    showQuote();
}