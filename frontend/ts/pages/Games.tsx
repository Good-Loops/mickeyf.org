import React from "react";

const Games: React.FC = () => {
    return (
        <section className="games">
            <h1 className="games__title">Games</h1>
            <div className="games__grid">
                <div className="games__grid-item">
                    <a href="/p4-Vega" onClick={(e) => { e.preventDefault(); }}>
                        <h3 className="games__grid-item--p4 floating">p4-Vega</h3>
                    </a>
                </div>
            </div>
        </section>
    );
}

export default Games;