import React from "react";

const Animations: React.FC = () => {
    return (
        <section className="animations">
            <h1 className="animations__title">Animations</h1>
            <div className="animations__grid">
                <div className="animations__grid-item">
                    <a href="/dancing-circles">
                        <h3 className="animations__grid-item--dancing-circles floating">Dancing Circles</h3>
                    </a>
                </div> 
                <div className="animations__grid-item">
                    <a href="/dancing-fractals">
                        <h3 className="animations__grid-item--dancing-circles floating">Dancing Fractals</h3>
                    </a>
                </div>
            </div>
        </section>
    );
}

export default Animations;